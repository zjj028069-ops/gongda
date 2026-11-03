/**
 * C9 智能设备 · 物联手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c9-iot/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c9-iot');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'iot-scene', title: '物联场景', path: '/device_iot/list', layout: 'v4-detail-lines', plus: true, plusLabels: ['新建场景', '导入模板'], tabs: false },
  { key: 'iot-sensor', title: '传感器', path: '/device_sensor/list', layout: 'v4-detail-lines', plus: true, plusLabels: ['新增测点', '批量导入'], tabs: false },
  { key: 'iot-alarm', title: '报警记录', path: '/alarm_record/list', layout: 'v3-status-tabs', plus: true, plusLabels: ['手动录入', '导出'], tabs: true },
  { key: 'iot-base', title: '基础设置', path: '/setting/smart_device/setting', layout: 'v1-settings', plus: false, plusLabels: [], tabs: false },
];

const BANNED = [
  '同源 API', '同源API', '夹具', '硬约束', '临时皮', '待 Allen', 'Allen 已定版',
  'PC path', '（皮）', '(皮)', '不改业务语义', '定版', '业务写回',
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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: 'iot' });
  return `${WEB}/ms/leaf?${q}`;
}

const session = await login();
const browser = await chromium.launch({ headless: true });

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  locale: 'zh-CN',
});
const page = await mobile.newPage();
await asUser(page, session);

let leafPass = 0;
for (const [index, leaf] of LEAVES.entries()) {
  const n = `C9-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c9-iot-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c9-iot-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c9-list"] [data-testid="c9-card"]').first().waitFor({ timeout: 10000 });
    const plusCount = await page.locator('[data-testid="c9-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('设置页不应有业务＋');
    if (leaf.tabs) {
      await page.locator('[data-testid="c9-status-tabs"]').waitFor();
      const tabText = await page.locator('[data-testid="c9-status-tabs"]').innerText();
      for (const label of ['全部', '未处理', '处理中', '已关闭']) {
        if (!tabText.includes(label)) throw new Error(`缺状态 Tab: ${label}`);
      }
    }
    const bodyText = await page.locator('[data-testid="c9-iot-leaf"]').innerText();
    const hit = BANNED.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`叶子页出现违禁开发文案: ${hit}`);
    const foodHit = ['面包', '蛋糕', '奶茶', '烧烤', '披萨', '寿司', '甜品'].find((w) => bodyText.includes(w));
    if (foodHit) throw new Error(`出现食品文案: ${foodHit}`);
    const longSearch = await page.locator('.c9-search-row, .c6-search-row, button.c9-query-btn, button.c6-query-btn').count();
    if (longSearch) throw new Error('禁止标题下长搜索条＋查询按钮');
    if (!(await page.locator('[data-testid="c9-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少图标按钮（细线放大镜）');
    }
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};ui-clean`;
  });
}

await step('C9-PLUS-SCENE', '物联场景＋下拉（新建场景｜导入模板）', async () => {
  const leaf = LEAVES[0];
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c9-plus"]').click();
  await page.locator('[data-testid="c9-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  for (const label of leaf.plusLabels) {
    if (!joined.includes(label)) throw new Error(`＋项缺失: ${label} / ${joined}`);
  }
  await shot(page, 'plus-iot-scene');
  await page.locator('.ms-plus-item').first().click();
  await page.locator('[data-testid="c9-toast"]').waitFor({ timeout: 5000 });
  return joined;
});

await step('C9-PLUS-SENSOR', '传感器＋下拉（新增测点｜批量导入）', async () => {
  const leaf = LEAVES[1];
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c9-plus"]').click();
  await page.locator('[data-testid="c9-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  for (const label of leaf.plusLabels) {
    if (!joined.includes(label)) throw new Error(`＋项缺失: ${label} / ${joined}`);
  }
  await shot(page, 'plus-iot-sensor');
  return joined;
});

await step('C9-PLUS-ALARM', '报警记录＋下拉（手动录入｜导出）', async () => {
  const leaf = LEAVES[2];
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c9-plus"]').click();
  await page.locator('[data-testid="c9-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  for (const label of leaf.plusLabels) {
    if (!joined.includes(label)) throw new Error(`＋项缺失: ${label} / ${joined}`);
  }
  await shot(page, 'plus-iot-alarm');
  return joined;
});

await step('C9-ALARM-TABS', '报警状态 Tabs 切换过滤', async () => {
  const leaf = LEAVES[2];
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c9-status-tabs"]').waitFor();
  await page.getByRole('tab', { name: '未处理' }).click();
  const openCount = await page.locator('[data-testid="c9-card"]').count();
  if (!openCount) throw new Error('未处理 Tab 无卡片');
  await page.getByRole('tab', { name: '已关闭' }).click();
  const closedCount = await page.locator('[data-testid="c9-card"]').count();
  if (!closedCount) throw new Error('已关闭 Tab 无卡片');
  await shot(page, 'alarm-tabs-closed');
  return `open=${openCount};closed=${closedCount}`;
});

await step('C9-FN-IOT', '功能树 · 智能设备入口抽检', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor({ timeout: 15000 });
  const block = page.locator('[data-l1="iot"]');
  await block.waitFor();
  if (!(await block.locator('.ms-fn-sub').count())) {
    await block.locator('.ms-fn-row').click();
  }
  const text = await block.innerText();
  for (const label of ['物联场景', '传感器', '报警记录', '基础设置']) {
    if (!text.includes(label)) throw new Error(`功能树缺入口: ${label}`);
  }
  await shot(page, 'functions-iot');
  await block.getByRole('button', { name: /物联场景/ }).click();
  await page.locator('[data-testid="c9-iot-leaf"][data-key="iot-scene"]').waitFor({ timeout: 10000 });
  return 'functions-iot-ok';
});

await step('C9-PC-REDIRECT', '窄屏 PC path → /ms/leaf', async () => {
  await page.goto(`${WEB}/device_iot/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c9-iot-leaf"][data-key="iot-scene"]').waitFor({ timeout: 10000 });
  await shot(page, 'pc-redirect-scene');
  return page.url();
});

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const desk = await desktop.newPage();
await asUser(desk, session);

await step('C9-DESKTOP', '≥769 不挂四栏壳', async () => {
  await desk.goto(`${WEB}/`);
  await desk.waitForTimeout(1500);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('桌面宽度不应出现 ms-shell');
  await shot(desk, 'desktop-sidebar');
  return 'desktop-ok';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const failed = results.filter((r) => r.result === '未通过').length;
const summary = {
  version: 'SEDRIC01 v1.0.104 / mobile-c9-iot',
  baseline: 'main = v1.0.92',
  leafPass,
  passed,
  failed,
  total: results.length,
  note: '待 Allen 重选皮；未 merge、未上腾讯云、未 rebase C0～C8',
  results,
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  [
    '# mobile-c9-iot 验收',
    '',
    `- 版本：${summary.version}`,
    `- 基线：${summary.baseline}`,
    `- 通过 ${passed} / ${results.length}（叶子 ${leafPass}/4）`,
    `- ${summary.note}`,
    '',
    ...results.map((r) => `- ${r.result} ${r.n} ${r.title}${r.reason ? ` · ${r.reason}` : ''}`),
    '',
  ].join('\n'),
);

console.log(JSON.stringify(summary, null, 2));
if (failed) process.exit(1);
