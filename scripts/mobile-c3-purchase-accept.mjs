/**
 * C3 供应/采购手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c3-purchase/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c3-purchase');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'supplier', title: '供应商管理', path: '/supplier/list', layout: 'v1-sparse', plus: true },
  { key: 'purchase-plan', title: '采购计划', path: '/produce_plan/list', layout: 'v4-detail', plus: true },
  { key: 'purchase-order', title: '采购单', path: '/purchase_order/list', layout: 'v4-detail', plus: true },
  { key: 'purchase-pay', title: '付款记录', path: '/purchase_pay_record/list', layout: 'v4-detail', plus: true },
  { key: 'purchase-invoice', title: '发票管理', path: '/purchase_pay_invoice/list', layout: 'v4-detail', plus: true },
  { key: 'mt-list', title: '采购检验单', path: '/material_test/list', layout: 'v4-detail', plus: true },
  { key: 'mt-lines', title: '采购检验明细', path: '/material_test_item_list/list', layout: 'v4-detail', plus: false },
  { key: 'mt-spec', title: '检验规范', path: '/material_test_content/list', layout: 'v1-sparse', plus: true },
  { key: 'purchase-audit', title: '审核设置', path: '/setting/supplier_purchase/audit_setting', layout: 'v1-sparse', plus: true },
  { key: 'purchase-base', title: '采购设置', path: '/setting/purchase/setting', layout: 'v1-settings', plus: false },
  { key: 'supplier-setting', title: '供应商设置', path: '/setting/supplier/setting', layout: 'v1-settings', plus: false },
  { key: 'purchase-price', title: '采购价格追踪', path: '/setting/purchasePriceTrack', layout: 'v4-track', plus: false },
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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: 'supply' });
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
  const n = `C3-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c3-purchase-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c3-purchase-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c3-list"] [data-testid="c3-card"]').first().waitFor({ timeout: 10000 });
    const plusCount = await page.locator('[data-testid="c3-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('只读/设置不应有业务＋');
    if (leaf.key === 'purchase-price') {
      await page.locator('[data-testid="c3-track-banner"]').waitFor();
    }
    // Allen 硬规矩：叶子页禁止开发说明文案；顶栏仅细线放大镜，禁止标题下长搜索条＋查询
    const bodyText = await page.locator('[data-testid="c3-purchase-leaf"]').innerText();
    const banned = ['同源 API', '夹具', '硬约束', '不改业务语义', '临时皮', '待 Allen', 'Allen 已定版', 'PC path', '（皮）', '业务写回'];
    const hit = banned.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`叶子页出现违禁开发文案: ${hit}`);
    if (await page.locator('.c3-fixture-hint, .c3-leaf-foot').count()) {
      throw new Error('仍残留夹具提示或页脚开发说明');
    }
    const longSearch = await page.locator('.c3-search-row, button.c3-query-btn, .c3-leaf > .search-bar').count();
    if (longSearch) throw new Error('禁止标题下长搜索条＋查询按钮');
    if (!(await page.locator('[data-testid="c3-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少图标按钮（细线放大镜）');
    }
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};ui-clean`;
  });
}

await step('C3-PLUS-ORDER', '采购单＋下拉（加商品三选必留）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'purchase-order');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('[data-testid="c3-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增') || !joined.includes('选择采购商品') || !joined.includes('选择采购计划商品') || !joined.includes('选择合同商品')) {
    throw new Error(`采购单＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-purchase-order');
  return joined;
});

await step('C3-PLUS-PLAN', '采购计划＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'purchase-plan');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('[data-testid="c3-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新建计划') || !joined.includes('从需求转入')) {
    throw new Error(`计划＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-purchase-plan');
  return joined;
});

await step('C3-PLUS-PAY', '付款＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'purchase-pay');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('[data-testid="c3-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('登记付款') || !joined.includes('关联采购单')) {
    throw new Error(`付款＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-purchase-pay');
  return joined;
});

await step('C3-PLUS-INV', '发票＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'purchase-invoice');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('[data-testid="c3-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增发票') || !joined.includes('从采购单开票')) {
    throw new Error(`发票＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-purchase-invoice');
  return joined;
});

await step('C3-PLUS-QC', '检验单＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'mt-list');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('[data-testid="c3-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新建检验') || !joined.includes('扫码报检')) {
    throw new Error(`检验＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-mt-list');
  return joined;
});

await step('C3-UP-ORDER-GOODS', '采购单加商品上游 · 选择采购计划商品', async () => {
  await page.goto(`${WEB}/ms/pick?key=purchase-order&kind=purchase_plan&title=${encodeURIComponent('选择采购计划商品')}&mode=pick-plan-goods&scope=c3`);
  await page.locator('[data-testid="c3-upstream-pick"][data-kind="purchase_plan"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c3-pick-row"]').first().click();
  const selected = await page.locator('[data-testid="c3-pick-selected"]').innerText();
  if (!selected.includes('已选 1')) throw new Error(`已选文案错误: ${selected}`);
  const done = page.locator('[data-testid="c3-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-plan-goods');
  await done.click();
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="purchase-order"]').waitFor();
  return selected;
});

await step('C3-UP-QC', '检验新建上游选采购单 · 左勾顶已选右上完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=mt-list&kind=purchase_order&title=${encodeURIComponent('选择采购单')}&mode=from-po&scope=c3`);
  await page.locator('[data-testid="c3-upstream-pick"][data-kind="purchase_order"]').waitFor();
  await page.locator('[data-testid="c3-pick-row"]').first().click();
  await page.locator('[data-testid="c3-pick-row"]').nth(1).click();
  const label = await page.locator('[data-testid="c3-pick-done"]').innerText();
  if (!label.includes('完成(2)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-qc-purchase');
  await page.locator('[data-testid="c3-pick-done"]').click();
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="mt-list"]').waitFor();
  return label;
});

await step('C3-LINES-NO-PLUS', '检验明细只读无＋', async () => {
  const leaf = LEAVES.find((x) => x.key === 'mt-lines');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="mt-lines"]').waitFor();
  const plus = await page.locator('[data-testid="c3-plus"]').count();
  if (plus) throw new Error('检验明细不应有＋');
  await shot(page, 'mt-lines-no-plus');
  return 'no-plus';
});

await step('C3-TREE', '功能树可达供应/采购叶子', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const block = page.locator('.ms-fn-block[data-l1="supply"]');
  const open = await block.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await block.locator('.ms-fn-row').click();
  await block.locator('.ms-fn-subs').waitFor();
  const missing = [];
  for (const leaf of LEAVES) {
    const n = await block.locator(`[data-leaf-key="${leaf.key}"]`).count();
    if (!n) missing.push(leaf.key);
  }
  if (missing.length) throw new Error(`功能树缺少叶子: ${missing.join(',')}`);
  await block.locator('.ms-fn-sub', { hasText: '采购单' }).first().click();
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="purchase-order"]').waitFor();
  await shot(page, 'functions-supply');
  return `leaves=${LEAVES.length}`;
});

await step('C3-PC-REDIRECT', '窄屏 PC path 重定向 /ms', async () => {
  await page.goto(`${WEB}/supplier/list`);
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="supplier"]').waitFor({ timeout: 20000 });
  if (!page.url().includes('/ms/leaf')) throw new Error(`未进 /ms: ${page.url()}`);
  await shot(page, 'pc-redirect-supplier');
  return page.url();
});

await step('C3-QUOTE-SAFE', '报价/合同入口未破坏', async () => {
  await page.goto(`${WEB}/ms/functions`);
  const customer = page.locator('.ms-fn-block[data-l1="customer"]');
  if (!(await customer.evaluate((el) => el.classList.contains('is-open')))) {
    await customer.locator('.ms-fn-row').click();
  }
  await customer.locator('.ms-fn-sub', { hasText: '合同报价单' }).first().click();
  await page.locator('[data-testid="ms-leaf"]').waitFor();
  const note = await page.locator('.ms-leaf-note').innerText();
  if (!note.includes('硬约束')) throw new Error('报价硬约束丢失');
  await page.locator('.ms-back').click();
  if (!(await customer.evaluate((el) => el.classList.contains('is-open')))) {
    await customer.locator('.ms-fn-row').click();
  }
  await customer.locator('.ms-fn-sub', { hasText: '合同订单' }).first().click();
  await page.locator('[data-testid="ms-leaf"]').waitFor();
  await page.locator('.ms-btn.primary', { hasText: '报价单创建' }).waitFor();
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

await step('C3-DESKTOP', '≥769 PC 侧栏未坏', async () => {
  await desk.goto(`${WEB}/supplier/list`);
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
  version: 'SEDRIC01 v1.0.96 mobile-c3-purchase',
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
  note: '未 merge、未上腾讯云、未重建库、未改密码、未动 garment；UI 已清夹具/开发说明；空数据仍用夹具数据但不进真机文案',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
const md = [
  '# C3 供应/采购手机镜像验收',
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
];
writeFileSync(path.join(outDir, 'SUMMARY.md'), md.join('\n'));
console.log(JSON.stringify({ playwright: summary.playwright, leafLists: summary.leafLists }, null, 2));
if (passed < total) process.exitCode = 1;
