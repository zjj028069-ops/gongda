/**
 * C1c · 设置补全 6 叶验收（仅 Playwright，≤768）
 * 前置：npm run dev && 已有 .local/dev-credentials.txt
 * 截图输出：docs/verification/mobile-c1c-settings-gap/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c1c-settings-gap');
mkdirSync(outDir, { recursive: true });
const results = [];

const FORBIDDEN = [
  '同源 API 暂无数据',
  '硬约束',
  '夹具',
  '临时皮',
  '临时版',
  'PC path',
  '（皮）',
  '(皮)',
  '待 Allen',
  '卖点',
];

const LEAVES = [
  {
    key: 'produce-dict-menu',
    title: '基础配置',
    path: '/setting/produce/dictionary',
    shot: '01-produce-dict-menu',
    plus: ['新增配置', '从模板导入'],
  },
  {
    key: 'perf-pay',
    title: '绩效工资设置',
    path: '/setting/PerformancePay/list',
    shot: '02-perf-pay',
    plus: ['新增方案', '从模板复制'],
  },
  {
    key: 'auto-stock',
    title: '自动出入库设置',
    path: '/setting/auto_stock_manage',
    shot: '03-auto-stock',
    plus: ['新增规则', '从模板复制'],
  },
  {
    key: 'station',
    title: '工作站设置',
    path: '/setting/produce/station',
    shot: '04-station',
    plus: ['新增工作站', '从机台导入'],
  },
  {
    key: 'stock-setting',
    title: '基础设置',
    path: '/setting/stock/setting',
    shot: '05-stock-setting',
    plus: null,
    save: true,
  },
  {
    key: 'stock-audit',
    title: '审核设置',
    path: '/setting/stock/audit_setting',
    shot: '06-stock-audit',
    plus: ['新增审核流程'],
  },
];

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

function leafUrl(leaf) {
  return `${WEB}/ms/leaf?key=${encodeURIComponent(leaf.key)}&title=${encodeURIComponent(leaf.title)}&path=${encodeURIComponent(leaf.path)}`;
}

function assertNoForbidden(text, where) {
  for (const word of FORBIDDEN) {
    if (text.includes(word)) throw new Error(`${where} 含禁字「${word}」`);
  }
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

await step('C1c-0', '窄屏四栏壳仍在', async () => {
  await page.goto(`${WEB}/ms/settings`);
  await page.locator('[data-testid="ms-shell"]').waitFor({ timeout: 20000 });
  const labels = await page.locator('.ms-tab span').allTextContents();
  if (labels.join('|') !== '消息|联系人|功能|设置') throw new Error(`底栏: ${labels.join('|')}`);
  await shot(page, '00-settings-entry');
  return labels.join('|');
});

for (const [i, leaf] of LEAVES.entries()) {
  await step(`C1c-${i + 1}`, `叶可达 · ${leaf.key}`, async () => {
    await page.goto(leafUrl(leaf));
    const root = page.locator(`[data-testid="ms-leaf"][data-key="${leaf.key}"]`);
    await root.waitFor({ timeout: 20000 });
    const title = await root.locator('.ms-c1c-title').innerText();
    if (title !== leaf.title) throw new Error(`标题期望 ${leaf.title}，实际 ${title}`);
    // 禁止标题下长搜索条 + 查询按钮
    const queryBtn = await root.locator('button:has-text("查询")').count();
    if (queryBtn) throw new Error('出现标题区「查询」按钮');
    const longBar = await root.locator('.ms-c1c-body > .m-search, .search-bar, input[placeholder*="查询"]').count();
    if (longBar) throw new Error('出现标题下长搜索/查询条');
    // 顶栏须有细线放大镜
    await root.getByRole('button', { name: `${leaf.title}搜索` }).waitFor();
    if (leaf.plus) {
      await root.getByRole('button', { name: '加号菜单' }).click();
      await root.locator('.ms-plus-panel').waitFor();
      const items = (await root.locator('.ms-plus-item').allTextContents()).map((t) => t.trim());
      for (const need of leaf.plus) {
        if (!items.some((t) => t.includes(need))) throw new Error(`＋菜单缺「${need}」: ${items.join('|')}`);
      }
      await root.locator('.ms-c1c-title').click();
    } else if (leaf.save) {
      const saveCount = await root.locator('.ms-c1c-save, .ms-c1c-save-block').count();
      if (!saveCount) throw new Error('stock-setting 应有保存');
      const plus = await root.getByRole('button', { name: '加号菜单' }).count();
      if (plus) throw new Error('stock-setting 不应有＋菜单');
    }
    const bodyText = await root.innerText();
    assertNoForbidden(bodyText, leaf.key);
    // 禁止页内大 FAB
    if (await root.locator('.ms-fab, .ant-float-btn, button.fab').count()) {
      throw new Error('出现页内 FAB');
    }
    await shot(page, leaf.shot);
    return title;
  });
}

await step('C1c-7', '设置入口可点入生产/仓库 6 叶', async () => {
  await page.goto(`${WEB}/ms/settings`);
  await page.locator('[data-testid="ms-settings"]').waitFor();
  const keys = LEAVES.map((l) => l.key);
  for (const key of keys) {
    const row = page.locator(`[data-leaf-key="${key}"]`);
    if (!(await row.count())) throw new Error(`设置页缺少入口 ${key}`);
  }
  await page.locator('[data-leaf-key="produce-dict-menu"]').click();
  await page.locator('[data-testid="ms-leaf"][data-key="produce-dict-menu"]').waitFor({ timeout: 15000 });
  await shot(page, '07-from-settings');
  return keys.join('|');
});

await step('C1c-8', '功能树生产设置/仓库设置可点入', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  await page.locator('.ms-fn-block[data-l1="produce"] .ms-fn-row').click();
  await page.locator('.ms-fn-block[data-l1="produce"] .ms-fn-group-title', { hasText: '生产设置' }).waitFor();
  const produceLeaves = await page.locator('.ms-fn-block[data-l1="produce"] .ms-fn-sub').allTextContents();
  for (const name of ['基础配置', '绩效工资设置', '自动出入库设置', '工作站设置']) {
    if (!produceLeaves.some((t) => t.includes(name))) throw new Error(`功能树生产设置缺 ${name}`);
  }
  await page.locator('.ms-fn-block[data-l1="produce"] .ms-fn-sub', { hasText: '工作站设置' }).click();
  await page.locator('[data-testid="ms-leaf"][data-key="station"]').waitFor({ timeout: 15000 });
  await page.goBack();
  await page.locator('[data-testid="ms-functions"]').waitFor();
  await page.locator('.ms-fn-block[data-l1="warehouse"] .ms-fn-row').click();
  await page.locator('.ms-fn-block[data-l1="warehouse"] .ms-fn-group-title', { hasText: '仓库设置' }).waitFor();
  await page.locator('.ms-fn-block[data-l1="warehouse"] .ms-fn-sub', { hasText: '审核设置' }).click();
  await page.locator('[data-testid="ms-leaf"][data-key="stock-audit"]').waitFor({ timeout: 15000 });
  await shot(page, '08-from-functions');
  return 'produce+warehouse';
});

await step('C1c-9', '宽屏不挂手机壳', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${WEB}/ms/settings`);
  await page.waitForTimeout(500);
  const shell = await page.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('≥769 仍显示 ms-shell');
  await shot(page, '09-desktop-unchanged');
  return 'ok';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const failed = results.length - passed;
const report = [
  '# mobile-c1c-settings-gap 验收',
  '',
  `- 版本：SEDRIC01 v1.0.102 / mobile-c1c-settings-gap`,
  `- 基线：GitHub main = v1.0.92（未 rebase/合入 C0～C7、C1b）`,
  `- 结果：${passed}/${results.length} 通过` + (failed ? ` · ${failed} 失败` : ''),
  `- 禁字：${FORBIDDEN.join(' / ')}`,
  '',
  '| 编号 | 项 | 结果 | 备注 |',
  '|---|---|---|---|',
  ...results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '/')} |`),
  '',
];
writeFileSync(path.join(outDir, 'REPORT.md'), report.join('\n'));
console.log(report.join('\n'));
if (failed) process.exit(1);
