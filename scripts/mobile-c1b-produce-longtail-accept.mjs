/**
 * C1b 生产长尾手机镜像验收（仅 Playwright）
 * Allen 硬规矩：页面不得出现夹具/硬约束/同源 API/临时皮/PC path/（皮）/定版说明；
 * 顶栏仅放大镜图标，禁止标题下长搜索条＋查询。
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c1b-produce-longtail/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c1b-produce-longtail');
mkdirSync(outDir, { recursive: true });
const results = [];

const FORBIDDEN = [
  '夹具', '硬约束', '同源 API', '同源API', '临时皮', '待 Allen',
  '（皮）', '(皮)', 'PC path', '定版', '展示版型', '不改业务语义',
  '使用夹具', '业务写回后续', '验收话术', 'C1b皮',
];

const LEAVES = [
  { key: 'project', title: '项目管理', path: '/production_project/list', layout: 'v4-detail-lines', plus: true },
  { key: 'material-analysis', title: '物料分析', path: '/MaterialAnalysis/list', layout: 'v1-sparse', plus: true },
  { key: 'qc-full', title: '全检', path: '/work_quality_testing/list', layout: 'v2-result', plus: true },
  { key: 'qc-spot', title: '抽检', path: '/spot_check/list', layout: 'v3-status-tabs', plus: true },
  { key: 'qc-spot-line', title: '抽检明细', path: '/spot_check_item/list', layout: 'v4-detail-lines', plus: true },
  { key: 'os-order', title: '外协工单', path: '/OutWorkOrder/list', layout: 'v4-detail-lines', plus: true },
  { key: 'os-receipt', title: '外协验收', path: '/outsourcing_receipt/list', layout: 'v2-result', plus: true },
  { key: 'os-settle', title: '外协结算', path: '/Outsourcing_settlement/list', layout: 'v2-amt', plus: true },
  { key: 'os-content', title: '验收内容', path: '/outsourcing_content/list', layout: 'v1-sparse', plus: true },
  { key: 'cost', title: '成本分摊', path: '/apportioned_cost/list', layout: 'v4-detail-lines', plus: true },
  { key: 'defect', title: '不良品项', path: '/waste_item/list', layout: 'v1-sparse', plus: true },
  { key: 'trace', title: '溯源码管理', path: '/product_traceability/list', layout: 'v1-expand', plus: true },
];

const CLEAN_SHOTS = ['project', 'qc-full', 'os-order', 'os-settle', 'trace'];

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
  const q = new URLSearchParams({ key: leaf.key, title: leaf.title, path: leaf.path, l1: 'produce' });
  return `${WEB}/ms/leaf?${q}`;
}

async function assertCleanUi(page) {
  const root = page.locator('[data-testid="c1b-produce-leaf"]').first();
  await root.waitFor({ timeout: 20000 });
  const text = await root.innerText();
  for (const bad of FORBIDDEN) {
    if (text.includes(bad)) throw new Error(`页面出现禁止文案「${bad}」`);
  }
  const bannedNodes = await page.locator(
    '.c1b-search-row, .c1b-query-btn, .c1b-fixture-hint, .c1b-hard-hint, .c1b-leaf-foot',
  ).count();
  if (bannedNodes) throw new Error('禁止夹具/硬约束横幅、页脚或标题下长搜索条');
  const searching = await page.locator('.c1b-inline-search').count();
  if (!searching) {
    const topSearch = await page.locator('[data-testid="c1b-leaf-top"] [aria-label$="搜索"]').count();
    if (!topSearch) throw new Error('顶栏缺少放大镜搜索图标');
  }
  return text.slice(0, 40);
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
  const n = `C1B-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c1b-produce-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c1b-produce-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    await page.locator('[data-testid="c1b-list"] [data-testid="c1b-card"]').first().waitFor({ timeout: 10000 });
    const plusCount = await page.locator('[data-testid="c1b-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('不应有业务＋');
    if (leaf.key === 'qc-spot') await page.locator('[data-testid="c1b-status-tabs"]').waitFor();
    if (leaf.key === 'trace') {
      await page.locator('[data-testid="c1b-expand-toggle"]').first().click();
      await page.locator('[data-testid="c1b-expand-body"]').first().waitFor();
    }
    if (leaf.layout === 'v4-detail-lines') {
      const lines = await page.locator('[data-testid="c1b-detail-lines"]').count();
      if (!lines) throw new Error('版4 应有明细行');
    }
    await assertCleanUi(page);
    if (CLEAN_SHOTS.includes(leaf.key) || index < 3) {
      await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    }
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};clean=1`;
  });
}

await step('C1B-NO-DEV-COPY', '全叶子无夹具/硬约束/同源API/临时皮等禁字', async () => {
  const notes = [];
  for (const leaf of LEAVES) {
    await page.goto(leafUrl(leaf));
    await assertCleanUi(page);
    notes.push(leaf.key);
  }
  await shot(page, 'clean-scan-last');
  return notes.join(',');
});

await step('C1B-PLUS-UPSTREAM', '外协工单＋→从加工单→完成(N)', async () => {
  const leaf = LEAVES.find((x) => x.key === 'os-order');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c1b-plus"]').click();
  await page.locator('[data-testid="c1b-plus-panel"]').waitFor();
  await page.locator('[data-plus-key="from-work-order"]').click();
  await page.locator('[data-testid="c1b-upstream-pick"]').waitFor();
  await page.locator('[data-testid="c1b-pick-row"]').first().click();
  const done = page.locator('[data-testid="c1b-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成文案异常: ${label}`);
  await shot(page, 'upstream-os-order');
  await done.click();
  await page.locator('[data-testid="c1b-produce-leaf"][data-key="os-order"]').waitFor();
  await page.locator('[data-testid="c1b-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c1b-toast"]').innerText();
  for (const bad of FORBIDDEN) {
    if (toast.includes(bad)) throw new Error(`toast 含禁字「${bad}」`);
  }
  return toast.slice(0, 40);
});

await step('C1B-FUNCTIONS', '功能树生产管理可点进 12 叶', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"] [data-l1="produce"]').waitFor();
  const block = page.locator('[data-l1="produce"]');
  if (!(await block.getAttribute('class'))?.includes('is-open')) {
    await block.locator('.ms-fn-row').click();
  }
  const missing = [];
  for (const leaf of LEAVES) {
    const btn = page.locator(`[data-l1="produce"] [data-leaf-key="${leaf.key}"]`);
    if (!(await btn.count())) missing.push(leaf.key);
  }
  if (missing.length) throw new Error(`功能树缺失: ${missing.join(',')}`);
  await shot(page, 'functions-produce');
  await page.locator('[data-l1="produce"] [data-leaf-key="defect"]').click();
  await page.locator('[data-testid="c1b-produce-leaf"][data-key="defect"]').waitFor();
  return `reachable=${LEAVES.length}`;
});

await step('C1B-PC-REDIRECT', '窄屏 PC path 重定向到 /ms/leaf', async () => {
  await page.goto(`${WEB}/OutWorkOrder/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c1b-produce-leaf"][data-key="os-order"]').waitFor();
  await shot(page, 'pc-redirect-os-order');
  return page.url();
});

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const desk = await desktop.newPage();
await asUser(desk, session);

await step('C1B-DESKTOP', '≥769 PC 侧栏不动、无四栏壳', async () => {
  await desk.goto(`${WEB}/OutWorkOrder/list`);
  await desk.waitForTimeout(1500);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏不应出现四栏壳');
  await shot(desk, 'desktop-sidebar');
  return 'no-ms-shell';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const summary = {
  feature: 'mobile-c1b-produce-longtail',
  version: '1.0.101',
  baseline: '1.0.92',
  leafPass: `${leafPass}/${LEAVES.length}`,
  total: `${passed}/${results.length}`,
  results,
  pendingSkinReselect: [
    'project 临时版4',
    'material-analysis 临时版1',
    'qc-spot 临时版3 状态Tabs',
    'qc-spot-line 临时版4',
    'os-content 临时版1',
    'cost 临时版4',
    'defect 临时版1',
  ],
  notDeployed: true,
  noMerge: true,
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  [
    '# C1b 生产长尾手机镜像验收',
    '',
    `- 版本：SEDRIC01 v1.0.101 / mobile-c1b-produce-longtail`,
    `- 基线：main = v1.0.92`,
    `- 叶子：${leafPass}/${LEAVES.length}`,
    `- 合计：${passed}/${results.length}`,
    `- 未 merge、未上腾讯云`,
    `- 待 Allen 重选临时皮：见 SUMMARY.json pendingSkinReselect`,
    '',
    ...results.map((r) => `- ${r.result} ${r.n} ${r.title}${r.reason ? ` · ${r.reason}` : ''}`),
    '',
  ].join('\n'),
);

console.log(JSON.stringify(summary, null, 2));
if (passed !== results.length) process.exit(1);
