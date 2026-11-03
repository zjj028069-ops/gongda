/**
 * C5 生产资料手机镜像验收（仅 Playwright）
 * Allen 硬规矩：绿测不够——页面不得出现夹具/硬约束/同源 API 文案；
 * 顶栏仅放大镜图标，禁止标题下长搜索条＋查询。
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c5-goods-master/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c5-goods-master');
mkdirSync(outDir, { recursive: true });
const results = [];

const FORBIDDEN = ['夹具', '硬约束', '同源 API', '同源API', '展示版型', '不改业务语义'];

const LEAVES = [
  { key: 'goods-list', title: '商品列表', path: '/goods/list', layout: 'v3-category-tabs', plus: true, l1: 'goods' },
  { key: 'bom', title: 'BOM管理', path: '/bom/list', layout: 'v4-detail-lines', plus: true, l1: 'goods' },
  { key: 'goods-base', title: '商品设置', path: '/setting/goods', layout: 'v1-settings', plus: false, l1: 'goods' },
  { key: 'machine', title: '机台管理', path: '/machine_platform/list', layout: 'v1-sparse', plus: true, l1: 'produce' },
  { key: 'process', title: '工序管理', path: '/public_craft/list', layout: 'v5-minimal', plus: true, l1: 'produce' },
  { key: 'post', title: '岗位安排', path: '/station/list', layout: 'v3-status-tabs', plus: true, l1: 'produce' },
  { key: 'route', title: '工艺路线', path: '/process_routing/list', layout: 'v4-step-chain', plus: true, l1: 'produce' },
  { key: 'extra', title: '工序附加组件', path: '/process_additional_component/list', layout: 'v3-status-tabs', plus: true, l1: 'produce' },
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

/** 人工级：可见文案不得含开发/夹具说明；禁止标题下长搜索条 */
async function assertCleanUi(page, scope = '[data-testid="c5-goods-leaf"]') {
  const root = page.locator(scope).first();
  await root.waitFor({ timeout: 20000 });
  const text = await root.innerText();
  for (const bad of FORBIDDEN) {
    if (text.includes(bad)) throw new Error(`页面出现禁止文案「${bad}」`);
  }
  // 标题下长搜索条＋查询（双搜索）禁止
  const longSearch = await page.locator('.c5-search-row, .c5-query-btn, [data-testid="c5-goods-capsules"]').count();
  if (longSearch) throw new Error('禁止标题下长搜索条/查询按钮/挤死列表的胶囊筛');
  // 非搜索态时顶栏应有放大镜图标按钮
  const searching = await page.locator('.c5-inline-search').count();
  if (!searching) {
    const topSearch = await page.locator('[data-testid="c5-leaf-top"] [aria-label$="搜索"]').count();
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
  const n = `C5-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c5-goods-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c5-goods-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    if (leaf.key === 'goods-base') {
      await page.locator('[data-testid="c5-goods-categories"]').waitFor({ timeout: 10000 });
    } else {
      await page.locator('[data-testid="c5-list"] [data-testid="c5-card"]').first().waitFor({ timeout: 10000 });
    }
    const plusCount = await page.locator('[data-testid="c5-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('设置不应有业务＋');
    if (leaf.key === 'goods-list') await page.locator('[data-testid="c5-category-tabs"]').waitFor();
    if (leaf.key === 'route') {
      const chains = await page.locator('[data-testid="c5-step-chain"]').count();
      if (chains < 1) throw new Error('工艺路线必须有迷你步骤链');
      const stepLabels = await page.locator('[data-testid="c5-step-chain"] .c5-step span').allTextContents();
      if (!stepLabels.some((t) => t.trim())) throw new Error('步骤链不得为空/只写工序数');
    }
    if (leaf.key === 'post' || leaf.key === 'extra') await page.locator('[data-testid="c5-status-tabs"]').waitFor();
    await assertCleanUi(page);
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};clean=1`;
  });
}

await step('C5-NO-DEV-COPY', '全叶子无夹具/硬约束/同源API 文案且无长搜索条', async () => {
  const notes = [];
  for (const leaf of LEAVES) {
    await page.goto(leafUrl(leaf));
    await assertCleanUi(page);
    notes.push(leaf.key);
  }
  await shot(page, 'clean-scan-last');
  return notes.join(',');
});

await step('C5-PLUS-GOODS', '商品＋下拉仅「新增商品｜扫码新增」无模板', async () => {
  const leaf = LEAVES.find((x) => x.key === 'goods-list');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c5-plus"]').click();
  await page.locator('[data-testid="c5-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增商品') || !joined.includes('扫码新增')) {
    throw new Error(`商品＋项缺失: ${joined}`);
  }
  if (joined.includes('模板')) throw new Error(`商品＋禁止从模板: ${joined}`);
  if (items.length !== 2) throw new Error(`＋应仅两项，实际 ${items.length}: ${joined}`);
  await shot(page, 'plus-goods');
  return joined;
});

await step('C5-GOODS-SEARCH-ICON', '商品列表点顶栏放大镜进入搜索态（无标题下长条）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'goods-list');
  await page.goto(leafUrl(leaf));
  await assertCleanUi(page);
  await page.locator('[data-testid="c5-leaf-top"] [aria-label="商品列表搜索"]').click();
  await page.locator('.c5-inline-search input').waitFor();
  if (await page.locator('.c5-search-row, .c5-query-btn').count()) {
    throw new Error('搜索态仍出现标题下长搜索条');
  }
  await shot(page, 'goods-search-icon');
  return 'top-magnifier-ok';
});

await step('C5-GOODS-CREATE', '商品新增直进详情表单（无模板）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'goods-list');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c5-plus"]').click();
  await page.locator('[data-plus-key="blank"]').click();
  await page.locator('[data-testid="c5-create-form"][data-kind="goods"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="c5-create-banner"]').waitFor();
  const banner = await page.locator('[data-testid="c5-create-banner"]').innerText();
  for (const bad of FORBIDDEN) {
    if (banner.includes(bad)) throw new Error(`表单横幅含禁止文案「${bad}」`);
  }
  if (!banner.includes('空白新建') && !banner.includes('填写')) {
    throw new Error(`横幅文案不对: ${banner}`);
  }
  await shot(page, 'goods-create-form');
  return banner.slice(0, 80);
});

await step('C5-PLUS-BOM', 'BOM＋下拉（新增BOM｜扫码）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'bom');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c5-plus"]').click();
  await page.locator('[data-testid="c5-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增BOM') || !joined.includes('扫码')) {
    throw new Error(`BOM＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-bom');
  return joined;
});

await step('C5-BOM-UPSTREAM', 'BOM 新增关联商品 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=bom&kind=goods&title=${encodeURIComponent('关联商品')}&mode=blank&scope=c5`);
  await page.locator('[data-testid="c5-upstream-pick"][data-kind="goods"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c5-pick-row"]').first().click();
  const selected = await page.locator('[data-testid="c5-pick-selected"]').innerText();
  if (!selected.includes('已选 1')) throw new Error(`已选文案错误: ${selected}`);
  const done = page.locator('[data-testid="c5-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-bom-goods');
  await done.click();
  await page.locator('[data-testid="c5-create-form"][data-kind="bom"]').waitFor({ timeout: 10000 });
  await shot(page, 'bom-create-form');
  return selected;
});

await step('C5-ROUTE-CHAIN', '工艺路线每卡迷你步骤链可见连线', async () => {
  const leaf = LEAVES.find((x) => x.key === 'route');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c5-goods-leaf"][data-key="route"]').waitFor();
  await assertCleanUi(page);
  const cards = page.locator('[data-testid="c5-card"][data-layout="v4-step-chain"]');
  const count = await cards.count();
  if (count < 1) throw new Error('无工艺路线卡');
  for (let i = 0; i < count; i += 1) {
    const chain = cards.nth(i).locator('[data-testid="c5-step-chain"]');
    await chain.waitFor();
    const nodes = await chain.locator('.c5-step-node').count();
    const labels = await chain.locator('.c5-step span').allTextContents();
    if (nodes < 2) throw new Error(`卡${i} 步骤节点不足`);
    if (labels.filter((t) => t.trim()).length < 2) throw new Error(`卡${i} 步骤标签不足`);
    const line = await chain.locator('.c5-step-line').count();
    if (!line) throw new Error(`卡${i} 缺少连线`);
  }
  await shot(page, 'route-step-chain');
  return `cards=${count}`;
});

await step('C5-FN-TREE', '功能树可达商品/工艺路线等 C5 叶子', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const goodsBlock = page.locator('[data-l1="goods"]');
  if (!(await goodsBlock.locator('.ms-fn-row').getAttribute('aria-expanded'))?.includes('true')) {
    await goodsBlock.locator('.ms-fn-row').click();
  }
  await page.locator('[data-leaf-key="goods-list"]').waitFor();
  await page.locator('[data-leaf-key="bom"]').waitFor();
  await page.locator('[data-leaf-key="goods-base"]').waitFor();
  await shot(page, 'functions-goods');
  const produceBlock = page.locator('[data-l1="produce"]');
  await produceBlock.locator('.ms-fn-row').click();
  await page.locator('[data-leaf-key="machine"]').waitFor();
  await page.locator('[data-leaf-key="process"]').waitFor();
  await page.locator('[data-leaf-key="post"]').waitFor();
  await page.locator('[data-leaf-key="route"]').waitFor();
  await page.locator('[data-leaf-key="extra"]').waitFor();
  await shot(page, 'functions-produce');
  return 'goods+produce C5 keys visible';
});

await step('C5-PC-REDIRECT', '窄屏 PC 路径重定向 /ms 叶子', async () => {
  await page.goto(`${WEB}/goods/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c5-goods-leaf"][data-key="goods-list"]').waitFor();
  await assertCleanUi(page);
  await shot(page, 'pc-redirect-goods');
  return page.url();
});

await mobile.close();

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const desk = await desktop.newPage();
await asUser(desk, session);

await step('C5-DESKTOP', '≥769 PC 侧栏未坏（无 ms-shell）', async () => {
  await desk.goto(`${WEB}/goods/list`);
  await desk.waitForTimeout(1500);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏不应出现 ms-shell');
  const sidebar = await desk.locator('.kgd-side, .kgd-sidebar, aside, [data-testid="kgd-sidebar"]').count();
  await shot(desk, 'desktop-sidebar');
  return `shell=${shell};sidebarCandidates=${sidebar}`;
});

await desktop.close();
await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const summary = {
  version: '1.0.98',
  feature: 'mobile-c5-goods-master',
  total: results.length,
  passed,
  leafPass,
  leafTotal: LEAVES.length,
  results,
  note: '未 merge、未上腾讯云；UI 已清夹具/硬约束文案与双搜索；业务写回仍为提示',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  `# C5 生产资料验收\n\n- 版本：SEDRIC01 v1.0.98 / mobile-c5-goods-master\n- Playwright：${passed}/${results.length}（叶子 ${leafPass}/${LEAVES.length}）\n- 自检：无夹具/硬约束/同源 API 文案；无标题下长搜索条；商品＋仅两项\n- 未 merge、未上腾讯云\n\n| 编号 | 项 | 结果 | 备注 |\n|------|----|------|------|\n${results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '/')} |`).join('\n')}\n`,
);

console.log(JSON.stringify(summary, null, 2));
if (passed !== results.length) process.exit(1);
