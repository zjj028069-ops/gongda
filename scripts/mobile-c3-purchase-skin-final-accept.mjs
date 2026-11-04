/**
 * C3 供应/采购定版改皮验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c3-purchase-skin-final/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c3-purchase-skin-final');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'supplier', title: '供应商管理', path: '/supplier/list', layout: 'v2-keyfields', plus: ['新增供应商'], marks: ['联系人', '拨号', '企业名'], switches: 0 },
  { key: 'purchase-plan', title: '采购计划', path: '/produce_plan/list', layout: 'v4-detail-lines', plus: ['新建计划', '从需求转入'], marks: ['计划号', '物料', '需求量'], switches: 0 },
  { key: 'purchase-order', title: '采购单', path: '/purchase_order/list', layout: 'v4-detail-lines', plus: ['新增', '选择采购商品', '选择采购计划商品', '选择合同商品'], marks: ['数量', '金额'], switches: 0 },
  { key: 'purchase-pay', title: '付款记录', path: '/purchase_pay_record/list', layout: 'v2-amount', plus: ['登记付款', '关联采购单'], marks: ['金额', '供应商', '付款日', 'CNY'], switches: 0 },
  { key: 'purchase-invoice', title: '发票管理', path: '/purchase_pay_invoice/list', layout: 'v2-amount', plus: ['新增发票', '从采购单开票'], marks: ['发票金额', '供应商', '开票日'], switches: 0 },
  { key: 'mt-list', title: '采购检验单', path: '/material_test/list', layout: 'v2-result', plus: ['新建检验', '扫码报检'], marks: ['检验结果', '物料名称', '批次号'], switches: 0 },
  { key: 'mt-lines', title: '采购检验明细', path: '/material_test_item_list/list', layout: 'v4-detail-lines', plus: [], marks: ['项目', '方法', '标准', '实测', '判定'], switches: 0 },
  { key: 'mt-spec', title: '检验规范', path: '/material_test_content/list', layout: 'v5-minimal', plus: ['新增检验规范'], marks: ['规范名', '状态'], switches: 0 },
  { key: 'purchase-audit', title: '审核设置', path: '/setting/supplier_purchase/audit_setting', layout: 'v5-switch', plus: ['新增审核流程'], marks: ['启用审核流程', '分级审核'], switches: 4 },
  { key: 'purchase-base', title: '采购设置', path: '/setting/purchase/setting', layout: 'v5-switch', plus: [], marks: ['基本设置', '启用采购申请审批'], switches: 4 },
  { key: 'supplier-setting', title: '供应商设置', path: '/setting/supplier/setting', layout: 'v5-switch', plus: [], marks: ['启用供应商门户', '启用评分功能'], switches: 4 },
  { key: 'purchase-price', title: '采购价格追踪', path: '/setting/purchasePriceTrack', layout: 'v2-price', plus: [], marks: ['最新单价', '涨跌幅', '物料'], switches: 0 },
];

const BANNED = [
  '同源 API', '同源API', '夹具', '硬约束', '临时皮', '待 Allen', 'Allen 已定版',
  'PC path', '（皮）', '(皮)', '不改业务语义', '定版说明', '定版', 'Playwright', '临时版', '业务写回',
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
  const n = `C3F-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c3-purchase-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const root = page.locator('[data-testid="c3-purchase-leaf"]');
    const layout = await root.getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    if (leaf.switches) {
      const switches = await page.locator('[data-testid="c3-switch"]').count();
      if (switches < leaf.switches) throw new Error(`开关行不足: ${switches}`);
    } else {
      await page.locator('[data-testid="c3-list"] [data-testid="c3-card"]').first().waitFor({ timeout: 10000 });
    }
    const plusCount = await page.locator('[data-testid="c3-plus"]').count();
    if (leaf.plus.length && !plusCount) throw new Error('应有＋');
    if (!leaf.plus.length && plusCount) throw new Error('本页不应有业务＋');
    const bodyText = await root.innerText();
    for (const mark of leaf.marks) {
      if (!bodyText.includes(mark)) throw new Error(`缺版型文案: ${mark}`);
    }
    const hit = BANNED.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`出现禁字: ${hit}`);
    if (await page.getByRole('button', { name: '查询' }).count()) throw new Error('禁止标题下查询按钮');
    const longSearch = await page.locator('.c3-search-row, button.c3-query-btn').count();
    if (longSearch) throw new Error('禁止标题下长搜索条');
    if (!(await page.locator('[data-testid="c3-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少细线放大镜');
    }
    const width = await page.evaluate(() => window.innerWidth);
    if (width > 768) throw new Error(`视口过宽: ${width}`);
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount}`;
  });
}

await step('C3F-PLUS', '采购单＋三入口贴在加号下方', async () => {
  const leaf = LEAVES.find((item) => item.key === 'purchase-order');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  const panel = page.locator('[data-testid="c3-plus-panel"]');
  await panel.waitFor();
  const joined = (await page.locator('.ms-plus-item').allTextContents()).join('|');
  for (const label of ['选择采购商品', '选择采购计划商品', '选择合同商品']) {
    if (!joined.includes(label)) throw new Error(`缺三入口: ${joined}`);
  }
  const plusBox = await page.locator('[data-testid="c3-plus"]').boundingBox();
  const panelBox = await panel.boundingBox();
  if (!plusBox || !panelBox) throw new Error('无法测量＋气泡');
  if (panelBox.y < plusBox.y + plusBox.height - 2) throw new Error(`气泡未贴加号下 y=${panelBox.y} plus=${plusBox.y}`);
  const hit = BANNED.find((w) => joined.includes(w));
  if (hit) throw new Error(`＋菜单禁字: ${hit}`);
  await shot(page, 'plus-purchase-order');
  return joined;
});

await step('C3F-UPSTREAM', '选择采购计划商品 → 完成(N)', async () => {
  const leaf = LEAVES.find((item) => item.key === 'purchase-order');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-plus"]').click();
  await page.locator('.ms-plus-item', { hasText: '选择采购计划商品' }).click();
  await page.locator('[data-testid="c3-upstream-pick"][data-kind="purchase_plan"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="c3-pick-row"]').first().click();
  const done = page.locator('[data-testid="c3-pick-done"]');
  const label = await done.innerText();
  if (!/完成\(1\)/.test(label)) throw new Error(`完成按钮不对: ${label}`);
  await shot(page, 'upstream-plan-goods');
  await done.click();
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="purchase-order"]').waitFor();
  await page.locator('[data-testid="c3-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c3-toast"]').innerText();
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  return `${label} ${toast}`;
});

await step('C3F-GOODS', '选择采购商品与选择合同商品可进入上游', async () => {
  const leaf = LEAVES.find((item) => item.key === 'purchase-order');
  const got = [];
  for (const [label, kind] of [['选择采购商品', 'purchase_goods'], ['选择合同商品', 'contract_goods']]) {
    await page.goto(leafUrl(leaf));
    await page.locator('[data-testid="c3-plus"]').click();
    await page.locator('.ms-plus-item', { hasText: label }).click();
    await page.locator(`[data-testid="c3-upstream-pick"][data-kind="${kind}"]`).waitFor({ timeout: 10000 });
    const title = await page.locator('.c3-pick-title-wrap h1').innerText();
    if (!title.includes(label)) throw new Error(`上游标题不对: ${title}`);
    got.push(title);
  }
  await shot(page, 'upstream-contract-goods');
  return got.join('|');
});

await step('C3F-LINES-PLUS', '检验明细无业务＋', async () => {
  const leaf = LEAVES.find((item) => item.key === 'mt-lines');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="mt-lines"]').waitFor();
  if (await page.locator('[data-testid="c3-plus"]').count()) throw new Error('检验明细不应有＋');
  await shot(page, 'mt-lines-no-plus');
  return 'no-plus';
});

await step('C3F-SWITCH', '采购设置开关 toast', async () => {
  const leaf = LEAVES.find((item) => item.key === 'purchase-base');
  await page.goto(leafUrl(leaf));
  const sw = page.locator('[data-testid="c3-switch"]').first();
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  await page.locator('[data-testid="c3-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c3-toast"]').innerText();
  const after = await sw.getAttribute('aria-checked');
  if (before === after) throw new Error('开关未切换');
  if (!/已开启|已关闭/.test(toast)) throw new Error(`toast 不对: ${toast}`);
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  await shot(page, 'switch-purchase-base');
  return `${before}->${after} ${toast}`;
});

await step('C3F-CALL', '供应商拨号与复制', async () => {
  const leaf = LEAVES.find((item) => item.key === 'supplier');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c3-call"]').first().click();
  await page.locator('[data-testid="c3-toast"]').waitFor();
  const call = await page.locator('[data-testid="c3-toast"]').innerText();
  if (!/拨打|暂无电话/.test(call)) throw new Error(`拨号 toast: ${call}`);
  await page.locator('[data-testid="c3-copy"]').first().click();
  await page.waitForTimeout(200);
  const copied = await page.locator('[data-testid="c3-toast"]').innerText();
  if (!copied.includes('已复制')) throw new Error(`复制 toast: ${copied}`);
  await shot(page, 'supplier-call');
  return `${call} / ${copied}`;
});

await step('C3F-FN', '功能树供应/采购 12 叶', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const block = page.locator('[data-l1="supply"]');
  if (!(await block.locator('.ms-fn-row').getAttribute('aria-expanded'))?.includes('true')) {
    await block.locator('.ms-fn-row').click();
  }
  for (const leaf of LEAVES) {
    await page.locator(`[data-leaf-key="${leaf.key}"]`).waitFor({ timeout: 5000 });
  }
  await shot(page, 'functions-supply');
  return 'supply-12';
});

await step('C3F-PC', '窄屏 PC path → /ms/leaf', async () => {
  await page.goto(`${WEB}/supplier/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c3-purchase-leaf"][data-key="supplier"]').waitFor();
  const layout = await page.locator('[data-testid="c3-purchase-leaf"]').getAttribute('data-layout');
  if (layout !== 'v2-keyfields') throw new Error(`重定向后版型 ${layout}`);
  await shot(page, 'pc-redirect-supplier');
  return page.url();
});

await step('C3F-QUOTE', '客户合同报价入口仍在', async () => {
  await page.goto(`${WEB}/ms/leaf?key=contract&title=${encodeURIComponent('合同订单')}&path=${encodeURIComponent('/customer_contract/list')}&l1=customer`);
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor({ timeout: 15000 });
  await page.locator('[data-testid="c4-plus"]').click();
  const joined = (await page.locator('.ms-plus-item').allTextContents()).join('|');
  if (!joined.includes('报价单创建') || !joined.includes('直接创建')) throw new Error(`合同＋被改动: ${joined}`);
  await page.locator('.ms-plus-item', { hasText: '报价单创建' }).click();
  await page.locator('[data-testid="c4-upstream-pick"]').waitFor({ timeout: 10000 });
  const title = await page.locator('h1').first().innerText();
  if (!title.includes('选择上游报价')) throw new Error(`报价上游标题: ${title}`);
  await shot(page, 'quote-contract-safe');
  return title;
});

await mobile.close();

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
const desk = await desktop.newPage();
await asUser(desk, session);
await step('C3F-DESKTOP', '≥769 不挂四栏壳', async () => {
  await desk.goto(`${WEB}/supplier/list`);
  await desk.waitForTimeout(1500);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏不应出现 ms-shell');
  const sidebar = await desk.locator('.kgd-sidebar').count();
  if (!sidebar) throw new Error('宽屏应保留 PC 侧栏');
  await shot(desk, 'desktop-sidebar');
  return `shell=${shell};sidebar=${sidebar}`;
});

await desktop.close();
await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const summary = {
  version: 'SEDRIC01 v1.0.108 / mobile-c3-purchase-skin-final',
  baseline: 'v1.0.107',
  total: results.length,
  passed,
  leafPass,
  leafTotal: LEAVES.length,
  results,
  note: '未 merge、未上腾讯云、未重建库、未改密码',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
const lines = results.map((r) => `- ${r.result} ${r.n} ${r.title}${r.reason ? ` · ${r.reason.replace(/\n/g, ' ')}` : ''}`);
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  `# mobile-c3-purchase-skin-final 验收\n\n- 版本：SEDRIC01 v1.0.108 / mobile-c3-purchase-skin-final\n- 基线：main = v1.0.107\n- 通过 ${passed} / ${results.length}（叶子 ${leafPass}/${LEAVES.length}）\n- 未 merge、未上腾讯云、未重建库、未改密码\n\n${lines.join('\n')}\n`,
);
console.log(JSON.stringify({ passed, total: results.length, leafPass }, null, 2));
if (passed !== results.length) process.exit(1);
