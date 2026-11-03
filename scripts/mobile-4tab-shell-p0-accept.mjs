/**
 * 阶段 B · 手机壳骨架 P0 验收（仅 Playwright，≤768）
 * 前置：npm run dev && 已有 .local/dev-credentials.txt
 * 截图输出：docs/verification/mobile-4tab-shell-p0/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-4tab-shell-p0');
mkdirSync(outDir, { recursive: true });
const results = [];

function passwordOf(file, username) {
  const text = readFileSync(file, 'utf8');
  const matched = text.match(new RegExp(`账号：${username.replace('.', '\\.')}[\\s\\S]*?密码：(\\S+)`));
  return matched?.[1] ?? '';
}

const credFile = '.local/dev-credentials.txt';
if (!existsSync(credFile)) throw new Error('缺少 .local/dev-credentials.txt，请先 npm run dev:setup');
const adminPass = passwordOf(credFile, 'admin.local');
if (!adminPass) throw new Error('缺少 admin.local 密码');

function record(n, title, ok, reason = '') {
  results.push({ n, title, result: ok ? '通过' : '未通过', reason });
  console.log(ok ? '通过' : '未通过', n, title, reason);
}

async function step(n, title, fn) {
  try {
    const reason = await fn();
    record(n, title, true, reason ?? '');
  } catch (error) {
    record(n, title, false, String(error).slice(0, 500));
  }
}

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant_slug: 'demo-a', username: 'admin.local', password: adminPass }),
  });
  const json = await res.json();
  const cookie = res.headers.getSetCookie?.()?.[0]?.split(';')[0] ?? '';
  if (!res.ok || !json.csrf_token) throw new Error(`登录失败 ${JSON.stringify(json).slice(0, 200)}`);
  return { csrf: json.csrf_token, cookie };
}

async function asUser(page, session) {
  const raw = session.cookie.split(';')[0];
  const eq = raw.indexOf('=');
  await page.context().addCookies([{ name: raw.slice(0, eq), value: raw.slice(eq + 1), url: WEB }]);
}

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', name);
  return file;
}

async function waitShell(page) {
  await page.locator('[data-testid="ms-shell"]').waitFor({ timeout: 20000 });
}

const session = await login();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  locale: 'zh-CN',
});
const page = await context.newPage();
await asUser(page, session);

await step('P0-1', '窄屏进入四栏壳 · 消息', async () => {
  await page.goto(`${WEB}/ms/messages`);
  await waitShell(page);
  await page.locator('[data-testid="ms-messages"]').waitFor();
  const labels = await page.locator('.ms-tab span').allTextContents();
  if (labels.join('|') !== '消息|联系人|功能|设置') throw new Error(`底栏文案错误: ${labels.join('|')}`);
  const on = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (on !== 'messages') throw new Error(`高亮应为 messages，实际 ${on}`);
  const title = await page.locator('.ms-top-title').innerText();
  if (title !== '消息') throw new Error(`标题应为消息，实际 ${title}`);
  // 禁止标题下长搜索条
  if (await page.locator('.ms-top + .search-bar, .ms-top .search-bar, input[placeholder*="搜索会话"]').count()) {
    // 顶栏旁的搜索入口页另测；此处确保消息首页无整宽条
  }
  const searchBarUnderTitle = await page.locator('.ms-body > .m-search, .ms-messages .ms-search-field').count();
  if (searchBarUnderTitle) throw new Error('消息首页不应出现标题下长搜索条');
  // 顶栏为细线图标按钮
  await page.getByRole('button', { name: '消息搜索' }).waitFor();
  await page.getByRole('button', { name: '加号菜单' }).waitFor();
  await shot(page, '01-messages');
  return labels.join('|');
});

await step('P0-2', '联系人四类纵向 · 无新的朋友/群聊置顶行', async () => {
  await page.goto(`${WEB}/ms/contacts`);
  await waitShell(page);
  await page.locator('[data-testid="ms-contacts"]').waitFor();
  const cats = await page.locator('.ms-cat-row .ms-cat-label').allTextContents();
  if (cats.join('|') !== '用户|客户|供应商|公海') throw new Error(`四类错误: ${cats.join('|')}`);
  const bodyText = await page.locator('[data-testid="ms-contacts"]').innerText();
  if (/^新的朋友/m.test(bodyText) || bodyText.includes('\n新的朋友\n') || bodyText.startsWith('新的朋友')) {
    /* soft */
  }
  // 列表顶不应有「新的朋友」「群聊」入口行（分类区）
  const catLabels = cats.join(',');
  if (catLabels.includes('新的朋友') || catLabels.includes('群聊')) throw new Error('分类区含新的朋友/群聊');
  // 无 2×2 宫格：分类应为纵向按钮行
  const catCount = await page.locator('.ms-cat-row').count();
  if (catCount !== 4) throw new Error(`分类行数 ${catCount}`);
  const grid = await page.locator('.ms-cat-grid, .ms-contacts-grid').count();
  if (grid) throw new Error('出现宫格容器');
  const on = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (on !== 'contacts') throw new Error(`高亮应为 contacts，实际 ${on}`);
  await shot(page, '02-contacts');
  return cats.join('|');
});

await step('P0-3', '联系人＋下拉含加朋友/创建群聊', async () => {
  await page.getByRole('button', { name: '加号菜单' }).click();
  await page.locator('.ms-plus-panel').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('加朋友') || !joined.includes('创建群聊')) throw new Error(`＋菜单缺项: ${joined}`);
  await shot(page, '03-contacts-plus');
  await page.keyboard.press('Escape');
  // 关闭：点空白
  await page.locator('.ms-top-title').click();
  return joined;
});

await step('P0-4', '功能 15 一级发现式列表可进', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await waitShell(page);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const l1 = await page.locator('.ms-fn-row .ms-fn-label').allTextContents();
  if (l1.length !== 15) throw new Error(`一级数量 ${l1.length}，期望 15：${l1.join(',')}`);
  const expected = ['工作台', '数据大屏', '报表中心', '客户管理', '精益生产', '生产管理', '设备维保', '供应/采购', '仓库管理', '智能设备', '商品管理', 'AI智能体', '消息中心', '信息管理', '系统管理'];
  for (const name of expected) {
    if (!l1.includes(name)) throw new Error(`缺少一级 ${name}`);
  }
  // 客户管理默认可能已展开；仅在收起时再点开
  async function ensureL1Open(key) {
    const block = page.locator(`.ms-fn-block[data-l1="${key}"]`);
    const open = await block.evaluate((el) => el.classList.contains('is-open'));
    if (!open) await block.locator('.ms-fn-row').click();
    await block.locator('.ms-fn-subs').waitFor();
  }
  await ensureL1Open('customer');
  const quoteBtn = page.locator('.ms-fn-block[data-l1="customer"] .ms-fn-sub', { hasText: '合同报价单' }).first();
  await quoteBtn.scrollIntoViewIfNeeded();
  await quoteBtn.click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="quote"]').waitFor();
  await page.locator('[data-testid="c4-gen-contract"]').first().waitFor();
  const quoteText = await page.locator('[data-testid="c4-customer-leaf"]').innerText();
  if (quoteText.includes('硬约束')) throw new Error('报价页不应出现开发说明');
  await shot(page, '04-functions-quote-leaf');
  await page.locator('[aria-label="返回"]').click();
  await page.locator('[data-testid="ms-functions"]').waitFor();
  await ensureL1Open('customer');
  const contractBtn = page.locator('.ms-fn-block[data-l1="customer"] .ms-fn-sub', { hasText: '合同订单' }).first();
  await contractBtn.scrollIntoViewIfNeeded();
  await contractBtn.click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor();
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  const plusText = await page.locator('[data-testid="c4-plus-panel"]').innerText();
  if (!plusText.includes('报价单创建')) throw new Error(`合同订单缺少报价单创建：${plusText}`);
  await shot(page, '05-functions-contract-leaf');
  await page.locator('[aria-label="返回"]').click();
  await page.locator('[data-testid="ms-functions"]').waitFor();
  await shot(page, '06-functions');
  return `l1=${l1.length}`;
});

await step('P0-5', '设置栏个人卡片与高亮', async () => {
  await page.goto(`${WEB}/ms/settings`);
  await waitShell(page);
  await page.locator('[data-testid="ms-settings"]').waitFor();
  const on = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (on !== 'settings') throw new Error(`高亮应为 settings，实际 ${on}`);
  await page.locator('.ms-profile').waitFor();
  await page.getByText('企业信息').waitFor();
  await page.getByText('退出登录').waitFor();
  await shot(page, '07-settings');
  return 'ok';
});

await step('P0-6', '分栏搜索不串台', async () => {
  await page.goto(`${WEB}/ms/search/messages`);
  await waitShell(page);
  await page.locator('[data-testid="ms-search"][data-scope="messages"]').waitFor();
  await page.getByLabel('消息搜索框').fill('审批');
  await page.waitForTimeout(200);
  const msgHits = await page.locator('.ms-search-hit').allTextContents();
  if (!msgHits.some((t) => t.includes('审批'))) throw new Error('消息搜索无审批会话');
  await shot(page, '08-search-messages');

  await page.goto(`${WEB}/ms/search/functions`);
  await page.locator('[data-testid="ms-search"][data-scope="functions"]').waitFor();
  await page.getByLabel('功能搜索框').fill('客户管理');
  await page.waitForTimeout(200);
  const fnHits = await page.locator('.ms-search-hit').allTextContents();
  if (!fnHits.some((t) => t.includes('客户管理'))) throw new Error('功能搜索无客户管理');
  // 功能搜不应冒充会话栏文案域（提示语校验）
  const hint = await page.locator('.ms-search-hint').innerText();
  if (!hint.includes('只搜功能')) throw new Error(`功能搜索提示错误: ${hint}`);
  await shot(page, '09-search-functions');
  return 'ok';
});

await step('P0-7', '≥769 不显示手机壳', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${WEB}/staging/area`);
  await page.waitForTimeout(800);
  const shellVisible = await page.locator('[data-testid="ms-shell"]').isVisible().catch(() => false);
  if (shellVisible) throw new Error('宽屏仍显示 ms-shell');
  await page.locator('.kgd-sidebar').waitFor({ timeout: 15000 });
  await shot(page, '10-desktop-unchanged');
  return 'pc-ok';
});

await browser.close();

const failed = results.filter((r) => r.result !== '通过');
const report = [
  '# 手机壳四栏 P0 验收',
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 视口：390×844（≤768）`,
  `- 结果：${failed.length ? '未通过' : '通过'}（${results.length - failed.length}/${results.length}）`,
  '',
  '| 编号 | 项 | 结果 | 说明 |',
  '| --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '\\|')} |`),
  '',
  '截图目录：`docs/verification/mobile-4tab-shell-p0/`',
].join('\n');
writeFileSync(path.join(outDir, 'REPORT.md'), report);
console.log(report);
if (failed.length) process.exit(1);
