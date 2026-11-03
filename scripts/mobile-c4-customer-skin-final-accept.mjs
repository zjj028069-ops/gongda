/**
 * C4 客户组定版落地验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c4-customer-skin-final/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c4-customer-skin-final');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'customer-list', title: '客户管理', path: '/customer/list', layout: 'v2-keyfields', plus: ['新增客户'], marks: ['拨打'], call: true },
  { key: 'linkman', title: '客户联系人', path: '/linkman/list', layout: 'wx-row', plus: ['新增对接人', '关联客户'], marks: [] },
  { key: 'follow', title: '客户跟单', path: '/follow/list', layout: 'wx-row', plus: ['新增跟单', '快速记录'], marks: [] },
  { key: 'quote', title: '合同报价单', path: '/contract_quotation_bill/list', layout: 'v2-amount', plus: ['新增报价', '从合同复制'], marks: ['报价金额', '生成合同', '改审', '报价编号'] },
  { key: 'contract', title: '合同订单', path: '/customer_contract/list', layout: 'v2-amount', plus: ['直接创建', '报价单创建'], marks: ['合同金额', '欠款'] },
  { key: 'cash', title: '收支记录', path: '/customer_financier/list', layout: 'v2-amount', plus: ['新增收支', '关联合同订单'], marks: ['累计收入', '累计支出'] },
  { key: 'invoice', title: '发票管理', path: '/customer_invoice/list', layout: 'v2-overview', plus: ['新增发票', '从订单导入'], marks: ['发票总览', '发票总额', '本月开票金额'] },
  { key: 'sales-fee', title: '销售费用', path: '/selling_expenses/list', layout: 'v2-amount', plus: ['新增销售费用', '关联客户'], marks: ['本月销售费用合计', '费用列表'] },
  { key: 'customer-sea', title: '客户公海', path: '/customer_sea/list', layout: 'v2-idle', plus: ['领取客户', '分配销售'], marks: ['未跟进', '认领客户'] },
  { key: 'customer-base', title: '基础设置', path: '/customer/setting/base_setting', layout: 'v5-switch', plus: [], marks: ['生产订单自动编号', '物料编码规则', '班次管理', '数据保留期限'] },
  { key: 'customer-audit', title: '审核设置', path: '/customer/setting/audit_setting', layout: 'v5-audit', plus: ['新增审核流程'], marks: ['文档类型', '合同报价单', '合同订单', '需审核', '免审'] },
  { key: 'sales-price', title: '销售价格追踪', path: '/customer/salesPriceTrack', layout: 'v2-price', plus: [], marks: ['当前销售价格', '较上次变化', '上次价格'] },
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
  const n = `C4F-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c4-customer-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c4-customer-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    if (leaf.layout === 'v5-switch') {
      const switches = await page.locator('[data-testid="c4-switch"]').count();
      if (switches < 4) throw new Error(`开关行不足: ${switches}`);
    } else if (leaf.layout === 'v5-audit') {
      const pills = await page.locator('[data-testid="c4-audit-pill"]').count();
      if (pills < 3) throw new Error(`审核行不足: ${pills}`);
    } else {
      await page.locator('[data-testid="c4-list"] [data-testid="c4-card"]').first().waitFor({ timeout: 10000 });
    }
    const plusCount = await page.locator('[data-testid="c4-plus"]').count();
    if (leaf.plus.length && !plusCount) throw new Error('应有＋');
    if (!leaf.plus.length && plusCount) throw new Error('本页不应有业务＋');
    if (leaf.call) {
      const calls = await page.locator('[data-testid="c4-call"]').count();
      if (!calls) throw new Error('客户列表缺少拨打按钮');
    }
    const bodyText = await page.locator('[data-testid="c4-customer-leaf"]').innerText();
    for (const mark of leaf.marks) {
      if (mark === '拨打') continue;
      if (!bodyText.includes(mark)) throw new Error(`缺版型文案: ${mark}`);
    }
    const hit = BANNED.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`出现禁字: ${hit}`);
    const queryBtn = await page.getByRole('button', { name: '查询' }).count();
    if (queryBtn) throw new Error('禁止标题下查询按钮');
    const longSearch = await page.locator('.c4-search-row, button.c4-query-btn').count();
    if (longSearch) throw new Error('禁止标题下长搜索条');
    if (!(await page.locator('[data-testid="c4-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少细线放大镜');
    }
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount}`;
  });
}

await step('C4F-UPSTREAM', '合同订单＋报价单创建 → 选择上游报价 → 完成(N)', async () => {
  const leaf = LEAVES.find((item) => item.key === 'contract');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c4-plus"]').click();
  await page.locator('[data-testid="c4-plus-panel"]').waitFor();
  const joined = (await page.locator('.ms-plus-item').allTextContents()).join('|');
  if (!joined.includes('直接创建') || !joined.includes('报价单创建')) throw new Error(`＋项不对: ${joined}`);
  await shot(page, 'plus-contract');
  await page.locator('.ms-plus-item', { hasText: '报价单创建' }).click();
  await page.locator('[data-testid="c4-upstream-pick"]').waitFor({ timeout: 10000 });
  const title = await page.locator('.c4-pick-title-wrap h1').innerText();
  if (!title.includes('选择上游报价')) throw new Error(`选单标题不对: ${title}`);
  const rows = page.locator('[data-testid="c4-pick-row"]');
  if (!(await rows.count())) throw new Error('没有可选报价');
  await rows.nth(0).click();
  const done = page.locator('[data-testid="c4-pick-done"]');
  const label = await done.innerText();
  if (!/完成\(1\)/.test(label)) throw new Error(`完成按钮不对: ${label}`);
  if (await done.isDisabled()) throw new Error('完成(1) 不应禁用');
  await shot(page, 'upstream-quote');
  await done.click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor();
  await page.locator('[data-testid="c4-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c4-toast"]').innerText();
  if (!toast.includes('已选')) throw new Error(`toast 不对: ${toast}`);
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  return `${joined} → ${title} ${label} ${toast}`;
});

await step('C4F-GEN', '报价行生成合同进入合同订单', async () => {
  const leaf = LEAVES.find((item) => item.key === 'quote');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c4-gen-contract"]').first().click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="contract"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="c4-plus"]').click();
  const plus = await page.locator('[data-testid="c4-plus-panel"]').innerText();
  if (!plus.includes('报价单创建')) throw new Error('合同订单缺少报价单创建');
  await shot(page, 'quote-to-contract');
  return '生成合同→合同订单';
});

await step('C4F-BASE', '基础设置开关 toast', async () => {
  const leaf = LEAVES.find((item) => item.key === 'customer-base');
  await page.goto(leafUrl(leaf));
  const sw = page.locator('[data-testid="c4-switch"]').first();
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  await page.locator('[data-testid="c4-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c4-toast"]').innerText();
  const after = await sw.getAttribute('aria-checked');
  if (before === after) throw new Error('开关未切换');
  if (!/已开启|已关闭/.test(toast)) throw new Error(`toast 不对: ${toast}`);
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  await shot(page, 'base-switch-toast');
  return `${before}->${after} ${toast}`;
});

await step('C4F-WX', '联系人栏加朋友/建群仍在；联系人叶子为纵向一行', async () => {
  await page.goto(`${WEB}/ms/contacts`);
  await page.locator('[data-testid="ms-shell"]').waitFor();
  await page.getByRole('button', { name: '加号菜单' }).click();
  const menu = await page.locator('.ms-plus-panel').innerText();
  if (!menu.includes('加朋友') || !menu.includes('创建群聊')) throw new Error(`联系人＋不对: ${menu}`);
  await shot(page, 'contacts-plus-wechat');
  await page.goto(leafUrl(LEAVES[1]));
  const layout = await page.locator('[data-testid="c4-customer-leaf"]').getAttribute('data-layout');
  if (layout !== 'wx-row') throw new Error(`联系人 layout ${layout}`);
  await page.locator('.c4-wx').first().waitFor();
  await page.goto(leafUrl(LEAVES[2]));
  const followLayout = await page.locator('[data-testid="c4-customer-leaf"]').getAttribute('data-layout');
  if (followLayout !== 'wx-row') throw new Error(`跟单 layout ${followLayout}`);
  return '加朋友/创建群聊 + wx-row';
});

await step('C4F-FN', '功能树客户 12 叶可达', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor({ timeout: 15000 });
  const block = page.locator('[data-l1="customer"]');
  if (!(await block.locator('.ms-fn-sub').count())) await block.locator('.ms-fn-row').click();
  const text = await block.innerText();
  for (const label of ['客户管理', '客户联系人', '客户跟单', '合同报价单', '合同订单', '收支记录', '发票管理', '销售费用', '客户公海', '基础设置', '审核设置', '销售价格追踪']) {
    if (!text.includes(label)) throw new Error(`功能树缺: ${label}`);
  }
  const hit = BANNED.find((w) => text.includes(w));
  if (hit) throw new Error(`功能树禁字: ${hit}`);
  await shot(page, 'functions-customer');
  await block.getByRole('button', { name: '合同报价单' }).click();
  await page.locator('[data-testid="c4-customer-leaf"][data-key="quote"]').waitFor();
  return 'functions-12';
});

await step('C4F-PC', '窄屏 PC path → /ms/leaf', async () => {
  await page.goto(`${WEB}/customer/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c4-customer-leaf"][data-key="customer-list"]').waitFor();
  await shot(page, 'pc-redirect-customer');
  return page.url();
});

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
const desk = await desktop.newPage();
await asUser(desk, session);
await step('C4F-DESKTOP', '≥769 不挂四栏壳', async () => {
  await desk.goto(`${WEB}/`);
  await desk.waitForTimeout(1200);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('桌面宽度不应出现四栏壳');
  await shot(desk, 'desktop-sidebar');
  return 'desktop-ok';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const failed = results.filter((r) => r.result === '未通过').length;
const summary = {
  version: 'SEDRIC01 v1.0.106 / mobile-c4-customer-skin-final',
  baseline: 'main = v1.0.105',
  leafPass,
  passed,
  failed,
  total: results.length,
  note: '未 merge、未上腾讯云、未重建库、未改密码',
  results,
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(path.join(outDir, 'SUMMARY.md'), [
  '# mobile-c4-customer-skin-final 验收',
  '',
  `- 版本：${summary.version}`,
  `- 基线：${summary.baseline}`,
  `- 通过 ${passed} / ${results.length}（叶子 ${leafPass}/12）`,
  `- ${summary.note}`,
  '',
  ...results.map((r) => `- ${r.result} ${r.n} ${r.title}${r.reason ? ` · ${r.reason}` : ''}`),
  '',
].join('\n'));

console.log(JSON.stringify(summary, null, 2));
if (failed) process.exit(1);
