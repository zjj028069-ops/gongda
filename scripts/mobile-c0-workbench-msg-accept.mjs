/**
 * 阶段 C0 · 手机工作台 + 消息列表 验收（仅 Playwright）
 * 前置：npm run dev && 已有 .local/dev-credentials.txt
 * 截图输出：docs/verification/mobile-c0-workbench-msg/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c0-workbench-msg');
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

async function ensureL1Open(page, key) {
  const block = page.locator(`.ms-fn-block[data-l1="${key}"]`);
  const open = await block.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await block.locator('.ms-fn-row').click();
  await block.locator('.ms-fn-subs').waitFor();
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

await step('C0-1', '≤768 工作台今日要点+快捷', async () => {
  await page.goto(`${WEB}/ms/staging/area`);
  await waitShell(page);
  await page.locator('[data-testid="ms-workbench"]').waitFor();
  const brand = await page.locator('.ms-wb-brand').innerText();
  if (brand !== '赛德瑞克MES') throw new Error(`品牌标题错误: ${brand}`);
  await page.getByText('今日要点', { exact: true }).waitFor();
  for (const name of ['待审合同', '待开票', '逾期加工单']) {
    await page.getByText(name, { exact: true }).waitFor();
  }
  for (const key of ['pending_contracts', 'pending_invoices', 'overdue_work_orders']) {
    await page.locator(`[data-testid="ms-wb-point-${key}"]`).waitFor();
  }
  await page.getByText('快捷', { exact: true }).waitFor();
  for (const key of ['contract_add', 'work_order_add', 'report', 'cash']) {
    await page.locator(`[data-testid="ms-wb-shortcut-${key}"]`).waitFor();
  }
  // 底栏在叶子页应隐藏
  if (await page.locator('.ms-tabbar').isVisible().catch(() => false)) {
    throw new Error('工作台叶子页不应显示四栏底栏');
  }
  await shot(page, '01-workbench');
  return '要点3+快捷4';
});

await step('C0-2', '工作台要点可点进叶子入口（非假死链）', async () => {
  await page.goto(`${WEB}/ms/staging/area`);
  await waitShell(page);
  await page.locator('[data-testid="ms-wb-point-pending_contracts"]').click();
  await page.locator('[data-testid="ms-leaf"]').waitFor();
  const meta = await page.locator('.ms-leaf-meta').innerText();
  if (!meta.includes('/customer_contract/list')) throw new Error(`待审合同深链路径不对: ${meta}`);
  await shot(page, '02-workbench-todo-leaf');
  await page.locator('.ms-back').click();
  await page.locator('[data-testid="ms-workbench"]').waitFor();
  await page.locator('[data-testid="ms-wb-shortcut-contract_add"]').click();
  await page.locator('[data-testid="ms-leaf"]').waitFor();
  await shot(page, '03-workbench-shortcut-leaf');
  return 'ok';
});

await step('C0-3', '消息列表 Tabs + 未读/已读 + 保留三月', async () => {
  await page.goto(`${WEB}/ms/message/list`);
  await waitShell(page);
  await page.locator('[data-testid="ms-message-list"]').waitFor();
  for (const kind of ['all', 'alarm', 'todo', 'notice']) {
    await page.locator(`[data-testid="ms-msg-kind-${kind}"]`).waitFor();
  }
  // 切到待办再切回全部
  await page.locator('[data-testid="ms-msg-kind-todo"]').click();
  await page.locator('[data-testid="ms-msg-kind-all"]').click();
  await page.locator('[data-testid="ms-msg-read-filter"]').click();
  await page.getByRole('menuitem', { name: '已读' }).click();
  await page.locator('[data-testid="ms-msg-read-filter"]').click();
  await page.getByRole('menuitem', { name: '未读' }).click();
  const retain = await page.locator('.ms-msglist-retain').innerText();
  if (!retain.includes('三个月')) throw new Error(`缺少保留说明: ${retain}`);
  // 无业务「新增消息」
  const bodyText = await page.locator('[data-testid="ms-message-list"]').innerText();
  if (bodyText.includes('新增消息')) throw new Error('消息列表不应出现新增消息');
  await shot(page, '04-message-list');
  return 'tabs-ok';
});

await step('C0-4', '消息深链点进只读页', async () => {
  // 先用 API 造一条带 link_path 的未读（若已有则直接用列表）
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant_slug: 'demo-a', username: 'admin.local', password: adminPass }),
  });
  const loginJson = await loginRes.json();
  const cookie = loginRes.headers.getSetCookie?.()?.[0]?.split(';')[0] ?? session.cookie;
  // 拉列表
  const listRes = await fetch(`${API}/api/messages/center?category=all&kind=all&read=all`, {
    headers: { cookie, 'x-csrf-token': loginJson.csrf_token },
  });
  const listJson = await listRes.json();
  const withLink = (listJson.items ?? []).find((item) => item.link_path);
  const any = withLink || (listJson.items ?? [])[0];

  await page.goto(`${WEB}/ms/message/list`);
  await waitShell(page);
  await page.locator('[data-testid="ms-msg-read-filter"]').click();
  await page.getByRole('menuitem', { name: '全部' }).click();
  await page.waitForTimeout(400);

  if (any) {
    const row = page.locator(`[data-testid="ms-msg-row-${any.id}"]`);
    if (await row.count()) {
      await row.click();
    } else {
      // 筛选可能导致不在 DOM；点第一行
      const first = page.locator('.ms-msg-row').first();
      if (!(await first.count())) throw new Error('无消息行可点');
      await first.click();
    }
  } else {
    // 无消息时走合成深链 URL 仍验收路由
    await page.goto(`${WEB}/ms/deeplink?id=demo&title=${encodeURIComponent('开票申请')}&path=${encodeURIComponent('/customer_invoice/list')}&body=${encodeURIComponent('测试深链')}`);
    await waitShell(page);
  }
  await page.locator('[data-testid="ms-deeplink"]').waitFor({ timeout: 15000 });
  const pathText = await page.locator('[data-testid="ms-deeplink"]').innerText();
  if (!pathText.includes('只读深链') && !pathText.includes('PC path') && !pathText.includes('未附带')) {
    throw new Error(`深链页文案异常: ${pathText.slice(0, 120)}`);
  }
  if (await page.locator('[data-testid="ms-deeplink-open"]').count()) {
    await page.locator('[data-testid="ms-deeplink-open"]').click();
    await page.locator('[data-testid="ms-leaf"]').waitFor();
  }
  await shot(page, '05-message-deeplink');
  return any ? `msg=${any.id}` : 'synthetic-deeplink';
});

await step('C0-5', '功能树能进消息列表；壳消息会话仍在', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await waitShell(page);
  await ensureL1Open(page, 'message');
  const msgLeaf = page.locator('.ms-fn-block[data-l1="message"] .ms-fn-sub', { hasText: '消息列表' });
  await msgLeaf.click();
  await page.locator('[data-testid="ms-message-list"]').waitFor();
  await shot(page, '06-functions-to-message-list');

  // 壳消息 Tab 仍为会话列表
  await page.goto(`${WEB}/ms/messages`);
  await waitShell(page);
  await page.locator('[data-testid="ms-messages"]').waitFor();
  await page.getByText('审批助手').waitFor();
  const on = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (on !== 'messages') throw new Error(`壳消息高亮错误 ${on}`);
  await shot(page, '07-shell-messages-sessions');

  // 功能树工作台叶子
  await page.goto(`${WEB}/ms/functions`);
  await ensureL1Open(page, 'workplace');
  await page.locator('.ms-fn-block[data-l1="workplace"] .ms-fn-sub', { hasText: '工作台' }).click();
  await page.locator('[data-testid="ms-workbench"]').waitFor();
  await shot(page, '08-functions-to-workbench');
  return 'both-reachable';
});

await step('C0-6', '任务书别名 /m/staging/area · /m/message/list 重定向', async () => {
  await page.goto(`${WEB}/m/staging/area`);
  await waitShell(page);
  await page.locator('[data-testid="ms-workbench"]').waitFor();
  if (!page.url().includes('/ms/staging/area')) throw new Error(`未重定向到 /ms/staging/area: ${page.url()}`);
  await page.goto(`${WEB}/m/message/list`);
  await waitShell(page);
  await page.locator('[data-testid="ms-message-list"]').waitFor();
  if (!page.url().includes('/ms/message/list')) throw new Error(`未重定向到 /ms/message/list: ${page.url()}`);
  return 'aliases-ok';
});

await step('C0-7', '≥769 PC 侧栏未坏', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${WEB}/staging/area`);
  await page.waitForTimeout(800);
  const shellVisible = await page.locator('[data-testid="ms-shell"]').isVisible().catch(() => false);
  if (shellVisible) throw new Error('宽屏仍显示 ms-shell');
  await page.locator('.kgd-sidebar').waitFor({ timeout: 15000 });
  await page.goto(`${WEB}/message/list`);
  await page.waitForTimeout(600);
  const shell2 = await page.locator('[data-testid="ms-shell"]').isVisible().catch(() => false);
  if (shell2) throw new Error('宽屏消息列表仍显示 ms-shell');
  await page.locator('.kgd-sidebar').waitFor({ timeout: 15000 });
  await shot(page, '09-desktop-sidebar');
  return 'pc-ok';
});

await browser.close();

const failed = results.filter((r) => r.result !== '通过');
const report = [
  '# 阶段 C0 · 工作台 + 消息列表 验收',
  '',
  `- 版本：SEDRIC01 v1.0.93 mobile-c0-workbench-msg`,
  `- 时间：${new Date().toISOString()}`,
  `- 视口：390×844（≤768） / 1280×800（≥769）`,
  `- 结果：${failed.length ? '未通过' : '通过'}（${results.length - failed.length}/${results.length}）`,
  `- 未 merge、未上腾讯云`,
  '',
  '| 编号 | 项 | 结果 | 说明 |',
  '| --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '\\|')} |`),
  '',
  '截图目录：`docs/verification/mobile-c0-workbench-msg/`',
].join('\n');
writeFileSync(path.join(outDir, 'REPORT.md'), report);
console.log(report);
if (failed.length) process.exit(1);
