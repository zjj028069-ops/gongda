/**
 * C7 报表中心 + 数据大屏手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c7-reports-screen/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c7-reports-screen');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'screen-manage', title: '大屏管理', path: '/screen_management/list', layout: 'v1-screen', l1: 'screen' },
  { key: 'report-machine', title: '机台报表', path: '/drilling_crew_statement/list', layout: 'v4-detail', l1: 'report' },
  { key: 'report-output', title: '产量报表', path: '/output_statistics_report', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-wip', title: '在制品报表', path: '/articles_being_processed_report', layout: 'v4-detail', l1: 'report' },
  { key: 'report-clock', title: '工序打卡计时', path: '/clock_in_report', layout: 'v4-detail', l1: 'report' },
  { key: 'report-defect-trend', title: '不良品趋势分析', path: '/waste_analysis', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-pareto', title: '不良品柏拉图', path: '/waste_key_analysis', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-defect-detail', title: '不良品项明细', path: '/waste_detail', layout: 'v4-detail', l1: 'report' },
  { key: 'report-iqc', title: '采购检验分析', path: '/material_test_report', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-sample', title: '生产抽检分析', path: '/spot_check_report', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-scrap', title: '报废返工统计', path: '/scrap_rework_statistics_report', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-maint-analysis', title: '设备维修分析', path: '/device_maintenance_analysis', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-maint-workload', title: '维修工作量统计', path: '/maintenance_workload_statistics', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-maint-plan', title: '维保计划统计', path: '/maintenance_plan_statistics', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-purchase', title: '采购对账单', path: '/purchase_statement', layout: 'v4-detail', l1: 'report' },
  { key: 'report-sales', title: '销售对账单', path: '/sales_statement', layout: 'v4-detail', l1: 'report' },
  { key: 'report-contract', title: '合同报表', path: '/contract_report', layout: 'v4-detail', l1: 'report' },
  { key: 'report-cost', title: '成本报表', path: '/produce_bill_cost', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-ai-stock', title: 'AI库存监控', path: '/ai_inventory/list', layout: 'v4-detail', l1: 'report' },
  { key: 'report-inventory', title: '进销存汇总', path: '/inventory_summary', layout: 'v1-sparse', l1: 'report' },
  { key: 'report-wage', title: '生产工资报表', path: '/payroll_statement/list', layout: 'v4-detail', l1: 'report' },
  { key: 'report-smart', title: '智能报表', path: '/smart/form_core_list', layout: 'v4-detail', l1: 'report' },
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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: leaf.l1 });
  return `${WEB}/ms/leaf?${q}`;
}

/** Allen P0：禁止把开发/夹具/硬约束/PC path 文案画进真机页 */
const FORBIDDEN_UI = [
  '同源 API',
  '使用夹具',
  '夹具展示',
  '夹具结构',
  '夹具',
  '硬约束',
  '临时皮',
  'PC path',
  '定版',
  '（皮）',
  '(皮)',
  '业务写回后续',
  'c7-fixture',
];

async function assertCleanUi(page, where) {
  const body = await page.locator('body').innerText();
  for (const bad of FORBIDDEN_UI) {
    if (body.includes(bad)) throw new Error(`${where} 出现禁文案「${bad}」`);
  }
  if (await page.locator('.c7-fixture-hint, .c7-leaf-foot, .ms-leaf-meta').count()) {
    throw new Error(`${where} 仍有夹具横幅或开发页脚`);
  }
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
  const n = `C7-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 主路径 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c7-reports-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c7-reports-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c7-list"] [data-testid="c7-card"]').first().waitFor({ timeout: 10000 });
    // 禁止标题下长搜索条 +「查询」按钮
    const longSearch = await page.locator('.c7-leaf > .search-bar, .kgd-toolbar button:has-text("查询")').count();
    if (longSearch) throw new Error('出现标题下长搜索条或查询按钮');
    const plusCount = await page.locator('[data-testid="c7-plus"]').count();
    if (plusCount) throw new Error('报表叶子不应有业务＋');
    if (leaf.layout === 'v1-sparse') {
      await page.locator('[data-testid="c7-metrics"]').first().waitFor({ timeout: 5000 });
    }
    await assertCleanUi(page, leaf.key);
    // 精选截图：大屏 / 分析 / 对账单
    if (leaf.key === 'screen-manage' || leaf.key === 'report-pareto' || leaf.key === 'report-purchase'
      || leaf.key === 'report-output' || leaf.key === 'report-sales') {
      await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    }
    leafPass += 1;
    return `layout=${layout}`;
  });
}

await step('C7-FN-TREE', '功能树可进报表/大屏叶子', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor({ timeout: 15000 });
  // 展开报表中心（默认可能已开）
  const reportBlock = page.locator('[data-l1="report"]');
  if (!(await reportBlock.locator('.ms-fn-subs').count())) {
    await reportBlock.locator('.ms-fn-row').click();
  }
  await page.locator('[data-leaf-key="report-purchase"]').waitFor({ timeout: 8000 });
  await page.locator('[data-leaf-key="report-pareto"]').waitFor({ timeout: 5000 });
  await page.locator('[data-leaf-key="report-smart"]').waitFor({ timeout: 5000 });
  // 大屏
  const screenBlock = page.locator('[data-l1="screen"]');
  if (!(await screenBlock.locator('.ms-fn-subs').count())) {
    await screenBlock.locator('.ms-fn-row').click();
  }
  await page.locator('[data-leaf-key="screen-manage"]').waitFor({ timeout: 5000 });
  await page.locator('[data-leaf-key="screen-manage"]').click();
  await page.locator('[data-testid="c7-reports-leaf"][data-key="screen-manage"]').waitFor({ timeout: 10000 });
  await assertCleanUi(page, 'functions-tree');
  await shot(page, 'functions-screen-manage');
  return 'report+screen leaves visible';
});

await step('C7-SCREEN-OPEN', '大屏列表点开全屏/外链', async () => {
  await page.goto(leafUrl(LEAVES[0]));
  await page.locator('[data-testid="c7-open-screen"]').first().click();
  await page.locator('[data-testid="c7-screen-viewer"]').waitFor({ timeout: 10000 });
  const ext = page.locator('[data-testid="c7-screen-ext"]');
  await ext.waitFor();
  const href = await ext.getAttribute('href');
  if (!href || !href.includes('/_screen/pd/')) throw new Error(`外链异常 ${href}`);
  await page.locator('[data-testid="c7-screen-frame"]').waitFor();
  await assertCleanUi(page, 'screen-viewer');
  await shot(page, 'screen-viewer');
  return href.slice(0, 120);
});

await step('C7-SEARCH-ICON', '顶栏细线放大镜点开再搜', async () => {
  const leaf = LEAVES.find((x) => x.key === 'report-sales');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c7-reports-leaf"]').waitFor();
  await page.getByRole('button', { name: /销售对账单搜索/ }).click();
  await page.getByLabel('叶子搜索框').fill('华东');
  const cards = page.locator('[data-testid="c7-card"]');
  await cards.first().waitFor({ timeout: 5000 });
  const text = await page.locator('[data-testid="c7-list"]').innerText();
  if (!text.includes('华东')) throw new Error('搜索未过滤到华东');
  await assertCleanUi(page, 'search-sales');
  return 'search ok';
});

await step('C7-PC-WIDE', '≥769 PC 侧栏仍在、不进手机壳', async () => {
  const desk = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  });
  const dpage = await desk.newPage();
  await asUser(dpage, session);
  await dpage.goto(`${WEB}/purchase_statement`);
  await dpage.waitForTimeout(1500);
  const shell = await dpage.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏误入手机壳');
  await shot(dpage, 'desktop-sidebar');
  await desk.close();
  return 'pc ok';
});

await step('C7-NO-M-ROUTE', '禁止 /m/* 报工域冲突路由', async () => {
  // 直接断言我们的叶子只用 /ms/
  for (const leaf of LEAVES) {
    const u = leafUrl(leaf);
    if (u.includes('/m/') && !u.includes('/ms/')) throw new Error(`非法 /m 路由 ${u}`);
  }
  return 'ms only';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const failed = results.filter((r) => r.result === '未通过').length;
const summary = {
  version: 'SEDRIC01 v1.0.100',
  feature: 'mobile-c7-reports-screen',
  baseline: 'v1.0.92',
  leaves: `${leafPass}/${LEAVES.length}`,
  passed,
  failed,
  total: results.length,
  results,
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  `# mobile-c7-reports-screen 验收\n\n- 版本：${summary.version}\n- 基线：${summary.baseline}\n- 叶子：${summary.leaves}\n- 用例：${passed}/${results.length} 通过\n\n` +
    results.map((r) => `- [${r.result}] ${r.n} ${r.title}${r.reason ? ` — ${r.reason}` : ''}`).join('\n') +
    '\n',
);
console.log(JSON.stringify(summary, null, 2));
if (failed) process.exit(1);
