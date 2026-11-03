/**
 * C2 仓库管理手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c2-warehouse/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c2-warehouse');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'stock', title: '库存管理', path: '/goods_stock/list', layout: 'v4-alarm', plus: false },
  { key: 'in-purchase', title: '采购入库单', path: '/purchase_stock_in_bill/list', layout: 'v4-detail', plus: true },
  { key: 'in-fg', title: '成品入库单', path: '/produce_stock_in_bill/list', layout: 'v4-detail', plus: true },
  { key: 'in-semi', title: '半成品入库单', path: '/semi_finished_products_stock_in_bill/list', layout: 'v4-detail', plus: true },
  { key: 'in-return', title: '生产退料单', path: '/produce_return_materiel_bill/list', layout: 'v1-sparse', plus: true },
  { key: 'in-sale-return', title: '销售退货单', path: '/salesReturnOrder/list', layout: 'v4-detail', plus: true },
  { key: 'in-other', title: '其他入库单', path: '/else_stock_in_bill/list', layout: 'v4-detail', plus: true },
  { key: 'out-sale', title: '销售出库单', path: '/sale_stock_out_bill/list', layout: 'v2-qty', plus: true },
  { key: 'out-produce', title: '生产出库单', path: '/production_out_of_storage/list', layout: 'v4-detail', plus: true },
  { key: 'out-purchase', title: '采购退货单', path: '/purchase_return_bill/list', layout: 'v4-detail', plus: true },
  { key: 'out-other', title: '其他出库单', path: '/else_stock_out_bill/list', layout: 'v4-detail', plus: true },
  { key: 'transfer', title: '调拨单', path: '/stock_allocate_bill/list', layout: 'v4-detail', plus: true },
  { key: 'check', title: '库存盘点', path: '/stock_taking_bill/list', layout: 'v4-detail', plus: true },
  { key: 'flow', title: '出入库流水', path: '/stock_item/list', layout: 'v4-detail', plus: false },
  { key: 'warehouse-list', title: '仓库档案', menuLabel: '仓库管理', path: '/ware/list', layout: 'v1-sparse', plus: true },
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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: 'warehouse' });
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
  const n = `C2-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c2-warehouse-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c2-warehouse-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c2-list"] [data-testid="c2-card"]').first().waitFor({ timeout: 10000 });
    const plusCount = await page.locator('[data-testid="c2-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('流水/库存不应有业务＋');
    // 禁止标题下长搜索条
    const longSearch = await page.locator('.c2-leaf > .search-bar, .c2-leaf-top + input[type="search"]').count();
    if (longSearch) throw new Error('出现标题下长搜索条');
    if (leaf.key === 'stock') {
      await page.locator('[data-testid="c2-alarm-capsules"]').waitFor();
    }
    if (leaf.key === 'flow') {
      await page.locator('[data-testid="c2-flow-summary"]').waitFor();
    }
    if (leaf.key === 'in-return') {
      const text = await page.locator('[data-testid="c2-list"]').innerText();
      if (!text.includes('领料数') || !text.includes('退料数')) throw new Error('退料卡缺领料/退料数');
    }
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount}`;
  });
}

await step('C2-PLUS-SEMI', '半成品入库＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'in-semi');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c2-plus"]').click();
  await page.locator('[data-testid="c2-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('从加工单入库') || !joined.includes('新增') || !joined.includes('扫码')) {
    throw new Error(`半成品＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-in-semi');
  return joined;
});

await step('C2-PLUS-PURCHASE', '采购入库＋下拉', async () => {
  const leaf = LEAVES.find((x) => x.key === 'in-purchase');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c2-plus"]').click();
  await page.locator('[data-testid="c2-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('空白新增') || !joined.includes('从采购单入库') || !joined.includes('扫码')) {
    throw new Error(`采购＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-in-purchase');
  return joined;
});

await step('C2-PLUS-SALE', '销售出库＋下拉（合同出库必留）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'out-sale');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c2-plus"]').click();
  await page.locator('[data-testid="c2-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('合同出库') || !joined.includes('空白新增') || !joined.includes('扫码')) {
    throw new Error(`销售出库＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-out-sale');
  return joined;
});

await step('C2-UP-SEMI', '半成品上游选单 · 左勾顶已选右上完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=in-semi&kind=work_order&title=${encodeURIComponent('选择加工单')}&mode=from-wo`);
  await page.locator('[data-testid="c2-upstream-pick"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c2-pick-row"]').first().click();
  const selected = await page.locator('[data-testid="c2-pick-selected"]').innerText();
  if (!selected.includes('已选 1')) throw new Error(`已选文案错误: ${selected}`);
  const done = page.locator('[data-testid="c2-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-semi');
  await done.click();
  await page.locator('[data-testid="c2-warehouse-leaf"][data-key="in-semi"]').waitFor();
  return selected;
});

await step('C2-UP-PURCHASE', '采购入库上游选单', async () => {
  await page.goto(`${WEB}/ms/pick?key=in-purchase&kind=purchase_order&title=${encodeURIComponent('选择采购单')}&mode=from-po`);
  await page.locator('[data-testid="c2-upstream-pick"][data-kind="purchase_order"]').waitFor();
  await page.locator('[data-testid="c2-pick-row"]').first().click();
  await page.locator('[data-testid="c2-pick-row"]').nth(1).click();
  const label = await page.locator('[data-testid="c2-pick-done"]').innerText();
  if (!label.includes('完成(2)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-purchase');
  return label;
});

await step('C2-UP-SALE', '销售出库合同上游选单', async () => {
  await page.goto(`${WEB}/ms/pick?key=out-sale&kind=contract&title=${encodeURIComponent('选择合同')}&mode=from-contract`);
  await page.locator('[data-testid="c2-upstream-pick"][data-kind="contract"]').waitFor();
  await page.locator('[data-testid="c2-pick-row"]').first().click();
  const label = await page.locator('[data-testid="c2-pick-done"]').innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-sale-contract');
  return label;
});

await step('C2-FLOW-NO-PLUS', '流水无＋', async () => {
  const leaf = LEAVES.find((x) => x.key === 'flow');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c2-warehouse-leaf"][data-key="flow"]').waitFor();
  const plus = await page.locator('[data-testid="c2-plus"]').count();
  if (plus) throw new Error('流水不应有＋');
  await shot(page, 'flow-no-plus');
  return 'no-plus';
});

await step('C2-TREE', '功能树可达仓库叶子', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const block = page.locator('.ms-fn-block[data-l1="warehouse"]');
  const open = await block.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await block.locator('.ms-fn-row').click();
  await block.locator('.ms-fn-subs').waitFor();
  const missing = [];
  for (const leaf of LEAVES) {
    const byKey = block.locator(`[data-leaf-key="${leaf.key}"]`);
    const n = await byKey.count();
    if (!n) missing.push(leaf.key);
  }
  if (missing.length) throw new Error(`功能树缺少叶子: ${missing.join(',')}`);
  await block.locator('.ms-fn-sub', { hasText: '半成品入库单' }).first().click();
  await page.locator('[data-testid="c2-warehouse-leaf"][data-key="in-semi"]').waitFor();
  await shot(page, 'functions-warehouse');
  return `leaves=${LEAVES.length}`;
});

await step('C2-PC-REDIRECT', '窄屏 PC path 重定向 /ms', async () => {
  await page.goto(`${WEB}/goods_stock/list`);
  await page.locator('[data-testid="c2-warehouse-leaf"][data-key="stock"]').waitFor({ timeout: 20000 });
  if (!page.url().includes('/ms/leaf')) throw new Error(`未进 /ms: ${page.url()}`);
  await shot(page, 'pc-redirect-stock');
  return page.url();
});

await step('C2-QUOTE-SAFE', '报价/合同入口未破坏', async () => {
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

await step('C2-DESKTOP', '≥769 PC 侧栏未坏', async () => {
  await desk.goto(`${WEB}/goods_stock/list`);
  await desk.locator('.kgd-sidebar').waitFor({ timeout: 20000 });
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('桌面误开四栏壳');
  await desk.locator('.kgd-sidebar-primary[data-primary="warehouse"], .kgd-sidebar [data-primary="warehouse"]').first().waitFor({ timeout: 10000 }).catch(() => {});
  const sidebar = await desk.locator('.kgd-sidebar').isVisible();
  if (!sidebar) throw new Error('侧栏不可见');
  await shot(desk, 'desktop-sidebar');
  return 'sidebar-ok';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const total = results.length;
const summary = {
  version: 'SEDRIC01 v1.0.95 mobile-c2-warehouse',
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
  note: '未 merge、未上腾讯云、未重建库、未改密码、未动 garment；空数据用夹具',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
const md = [
  '# C2 仓库手机镜像验收',
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
