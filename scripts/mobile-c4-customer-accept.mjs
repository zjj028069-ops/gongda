/**
 * C4 客户管理手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c4-customer/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c4-customer');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'customer-list', title: '客户管理', path: '/customer/list', layout: 'v1-sparse', plus: true },
  { key: 'linkman', title: '客户联系人', path: '/linkman/list', layout: 'v1-sparse', plus: true },
  { key: 'follow', title: '客户跟单', path: '/follow/list', layout: 'v4-detail', plus: true },
  { key: 'quote', title: '合同报价单', path: '/contract_quotation_bill/list', layout: 'v4-detail', plus: true },
  { key: 'contract', title: '合同订单', path: '/customer_contract/list', layout: 'v4-detail', plus: true },
  { key: 'cash', title: '收支记录', path: '/customer_financier/list', layout: 'v4-detail', plus: true },
  { key: 'invoice', title: '发票管理', path: '/customer_invoice/list', layout: 'v4-detail', plus: true },
  { key: 'sales-fee', title: '销售费用', path: '/selling_expenses/list', layout: 'v4-detail', plus: true },
  { key: 'customer-sea', title: '客户公海', path: '/customer_sea/list', layout: 'v1-sparse', plus: true },
  { key: 'customer-base', title: '基础设置', path: '/customer/setting/base_setting', layout: 'v1-settings', plus: false },
  { key: 'customer-audit', title: '审核设置', path: '/customer/setting/audit_setting', layout: 'v1-sparse', plus: true },
  { key: 'sales-price', title: '销售价格追踪', path: '/customer/salesPriceTrack', layout: 'v4-track', plus: false },
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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: 'customer' });
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
  const n = `C4-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c4-customer-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c4-customer-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c4-list"] [data-testid="c4-card"]').first().waitFor({ timeout: 10000 });
    const plusCount = await page.locator('[data-testid="c4-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('设置/追踪不应有业务＋');
    if (leaf.key === 'sales-price') await page.locator('[data-testid="c4-track-banner"]').waitFor();
    if (leaf.key === 'customer-sea') await page.locator('[data-testid="c4-sea-banner"]').waitFor();
    if (leaf.key === 'quote') await page.locator('[data-testid="c4-hard-quote"]').waitFor();
    if (leaf.key === 'contract') await page.locator('[data-testid="c4-hard-contract"]').waitFor();
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount}`;
  });
}

await step('C4-PLUS-QUOTE', '报价＋下拉（新增报价｜从合同复制）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'quote');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增报价') || !joined.includes('从合同复制')) {
    throw new Error(`报价＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-quote');
  return joined;
});

await step('C4-PLUS-CONTRACT', '合同＋下拉（直接创建｜报价单创建）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'contract');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('直接创建') || !joined.includes('报价单创建')) {
    throw new Error(`合同＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-contract');
  return joined;
});

await step('C4-PLUS-SEA', '公海＋下拉（领取客户｜分配销售）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'customer-sea');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('领取客户') || !joined.includes('分配销售')) {
    throw new Error(`公海＋项缺失: ${joined}`);
  }
  if (joined.includes('新增客户')) throw new Error('公海不应空白新增客户');
  await shot(page, 'plus-sea');
  return joined;
});

await step('C4-UP-QUOTE-COPY', '报价从合同复制 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=quote&kind=contract&title=${encodeURIComponent('选择合同订单')}&mode=from-contract&scope=c4`);
  await page.locator('[data-testid="c4-upstream-pick"][data-kind="contract"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c4-pick-row"]').first().click();
  const selected = await page.locator('[data-testid="c4-pick-selected"]').innerText();
  if (!selected.includes('已选 1')) throw new Error(`已选文案错误: ${selected}`);
  const done = page.locator('[data-testid="c4-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-quote-from-contract');
  await done.click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="quote"]').waitFor();
  return selected;
});

await step('C4-UP-CONTRACT-QUOTE', '合同报价单创建上游 · 左勾顶已选右上完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=contract&kind=quotation&title=${encodeURIComponent('选择上游报价')}&mode=from-quote&scope=c4`);
  await page.locator('[data-testid="c4-upstream-pick"][data-kind="quotation"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c4-quote-upstream-hint"]').waitFor();
  await page.locator('[data-testid="c4-pick-row"]').first().click();
  await page.locator('[data-testid="c4-pick-row"]').nth(1).click();
  const label = await page.locator('[data-testid="c4-pick-done"]').innerText();
  if (!label.includes('完成(2)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-contract-from-quote');
  await page.locator('[data-testid="c4-pick-done"]').click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor();
  return label;
});

await step('C4-SEA-CLAIM', '公海领取入口', async () => {
  await page.goto(`${WEB}/ms/pick?key=customer-sea&kind=sea_customer&title=${encodeURIComponent('领取客户')}&mode=claim&scope=c4`);
  await page.locator('[data-testid="c4-upstream-pick"][data-kind="sea_customer"]').waitFor();
  await page.locator('[data-testid="c4-pick-row"]').first().click();
  const label = await page.locator('[data-testid="c4-pick-done"]').innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-sea-claim');
  await page.locator('[data-testid="c4-pick-done"]').click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="customer-sea"]').waitFor();
  return label;
});

await step('C4-TREE', '功能树可达客户管理 12 叶子（含报价/合同）', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const block = page.locator('.ms-fn-block[data-l1="customer"]');
  const open = await block.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await block.locator('.ms-fn-row').click();
  await block.locator('.ms-fn-subs').waitFor();
  const missing = [];
  for (const leaf of LEAVES) {
    const n = await block.locator(`[data-leaf-key="${leaf.key}"]`).count();
    if (!n) missing.push(leaf.key);
  }
  if (missing.length) throw new Error(`功能树缺少叶子: ${missing.join(',')}`);
  await block.locator('.ms-fn-sub', { hasText: '合同报价单' }).first().click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="quote"]').waitFor();
  await shot(page, 'functions-customer');
  return `leaves=${LEAVES.length}`;
});

await step('C4-PC-REDIRECT', '窄屏 PC path 重定向 /ms', async () => {
  await page.goto(`${WEB}/customer/list`);
  await page.locator('[data-testid="c4-customer-leaf"][data-key="customer-list"]').waitFor({ timeout: 20000 });
  if (!page.url().includes('/ms/leaf')) throw new Error(`未进 /ms: ${page.url()}`);
  await shot(page, 'pc-redirect-customer');
  return page.url();
});

await step('C4-QUOTE-CONTRACT-SAFE', '报价/合同入口与上游链路未丢', async () => {
  await page.goto(leafUrl(LEAVES.find((x) => x.key === 'quote')));
  await page.locator('[data-testid="c4-customer-leaf"][data-key="quote"]').waitFor();
  await page.locator('[data-testid="c4-hard-quote"]').waitFor();
  await page.locator('.c4-link', { hasText: '生成合同' }).first().waitFor();
  await page.goto(leafUrl(LEAVES.find((x) => x.key === 'contract')));
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor();
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  await page.locator('.ms-plus-item', { hasText: '报价单创建' }).click();
  await page.locator('[data-testid="c4-upstream-pick"][data-kind="quotation"]').waitFor();
  await shot(page, 'quote-contract-safe');
  return 'ok';
});

await mobile.close();

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const desk = await desktop.newPage();
await asUser(desk, session);

await step('C4-DESKTOP', '≥769 PC 侧栏未坏', async () => {
  await desk.goto(`${WEB}/customer/list`);
  await desk.locator('.kgd-sidebar').waitFor({ timeout: 20000 });
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('桌面误开四栏壳');
  const sidebar = await desk.locator('.kgd-sidebar').isVisible();
  if (!sidebar) throw new Error('侧栏不可见');
  await shot(desk, 'desktop-sidebar');
  return 'sidebar-ok';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const total = results.length;
const summary = {
  version: 'SEDRIC01 v1.0.97 mobile-c4-customer',
  playwright: `${passed}/${total}`,
  leafLists: `${leafPass}/${LEAVES.length}`,
  routes: LEAVES.map((leaf) => ({
    leaf: leaf.title,
    key: leaf.key,
    pc: leaf.path,
    ms: `/ms/leaf?key=${leaf.key}&path=${leaf.path}`,
    layout: leaf.layout,
    plus: leaf.plus,
  })),
  results,
  note: '未 merge、未上腾讯云、未重建库、未改密码、未动 garment；临时皮待 Allen 重选；空数据用夹具；业务写回为皮提示',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
const md = [
  '# C4 客户管理手机镜像验收',
  '',
  `- 版本：${summary.version}`,
  `- Playwright：${summary.playwright}`,
  `- 叶子列表：${summary.leafLists}`,
  '',
  '| # | 项 | 结果 | 说明 |',
  '|---|----|------|------|',
  ...results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '/')} |`),
  '',
  '## 叶子→路由',
  '',
  '| 叶子 | key | PC | /ms | 定版 | ＋ |',
  '|------|-----|----|-----|------|---|',
  ...summary.routes.map((r) => `| ${r.leaf} | ${r.key} | ${r.pc} | /ms/leaf?key=${r.key} | ${r.layout} | ${r.plus ? '有' : '无'} |`),
  '',
  '## 已知限制',
  '',
  '- 基线 main v1.0.92；未 rebase/merge PR#3/#4/#5/#6',
  '- 只改排版/交互皮，不改业务语义/权限/审核流/价格计算',
  '- 新增/上游完成 → toast 皮提示，不落库（对齐 C2/C3）',
  '- 空库用夹具；有 API 数据时优先现网',
  '- 临时定版皮待 Allen 重选',
  '- 未 merge、未上腾讯云、不重建库、不改密码、不动 garment',
];
writeFileSync(path.join(outDir, 'SUMMARY.md'), md.join('\n'));
console.log(JSON.stringify({ playwright: summary.playwright, leafLists: summary.leafLists }, null, 2));
if (passed < total) process.exitCode = 1;
