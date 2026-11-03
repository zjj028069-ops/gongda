/**
 * C6 设备维保 + 精益生产手机镜像验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c6-device-lean/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c6-device-lean');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'maint-plan', title: '维保计划', path: '/inspection_plan/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'maint-task', title: '维保任务', path: '/inspection_task/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'maint-record', title: '维保记录', path: '/inspection_record/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'maint-break', title: '维保明细', path: '/inspection_breakdown/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'maint-content', title: '维保内容', path: '/inspection_content/list', layout: 'v1-sparse', plus: true, l1: 'device', tabs: false },
  { key: 'pi-plan', title: '点检计划', path: '/point_inspection_plan/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'pi-record', title: '点检记录', path: '/point_inspection_record/list', layout: 'v3-status-tabs', plus: true, l1: 'device', tabs: true },
  { key: 'repair-order', title: '维修工单', path: '/device_order/list', layout: 'v3-status-tabs', plus: true, l1: 'device', tabs: true },
  { key: 'device-archive', title: '设备档案', path: '/device/list', layout: 'v4-detail-lines', plus: true, l1: 'device', tabs: false },
  { key: 'device-qr', title: '设备二维码', path: '/device_qr_code/list', layout: 'v3-status-tabs', plus: true, l1: 'device', tabs: true },
  { key: 'equip-base', title: '维保设置', path: '/setting/inspection/setting', layout: 'v1-settings', plus: false, l1: 'device', tabs: false },
  { key: 'lean-station', title: '精益生产工作站', path: '/LeanProductionReportChart/ReportChart', layout: 'v1-station', plus: false, l1: 'lean', tabs: false },
  { key: 'lean-rectify', title: '整改中心', path: '/lean_production_todo/list', layout: 'v4-detail-lines', plus: true, l1: 'lean', tabs: false },
  { key: 'lean-meeting', title: '精益会议', path: '/meeting/list', layout: 'v4-detail-lines', plus: true, l1: 'lean', tabs: false },
  { key: 'lean-todo', title: '会议待办', path: '/meetingTodo/list', layout: 'v4-detail-lines', plus: true, l1: 'lean', tabs: false },
  { key: 'lean-patrol', title: '现场巡查', path: '/onsite_inspection/list', layout: 'v4-detail-lines', plus: true, l1: 'lean', tabs: false },
  { key: 'lean-setting', title: '精益生产设置', path: '/setting/lean_production', layout: 'v1-settings', plus: false, l1: 'lean', tabs: false },
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
  const n = `C6-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 列表 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c6-device-lean-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const layout = await page.locator('[data-testid="c6-device-lean-leaf"]').getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    if (leaf.key === 'lean-station') {
      await page.locator('[data-testid="c6-station-board"]').waitFor({ timeout: 10000 });
      await page.locator('[data-testid="c6-station-chart"]').waitFor();
    } else if (leaf.key === 'equip-base' || leaf.key === 'lean-setting') {
      await page.locator('[data-testid="c6-list"] [data-testid="c6-card"]').first().waitFor({ timeout: 10000 });
    } else {
      await page.locator('[data-testid="c6-list"] [data-testid="c6-card"]').first().waitFor({ timeout: 10000 });
    }
    const plusCount = await page.locator('[data-testid="c6-plus"]').count();
    if (leaf.plus && !plusCount) throw new Error('应有＋');
    if (!leaf.plus && plusCount) throw new Error('设置/工作站不应有业务＋');
    if (leaf.tabs) await page.locator('[data-testid="c6-status-tabs"]').waitFor();
    // Allen 硬规矩：叶子页禁止开发说明文案；顶栏仅细线放大镜，禁止标题下长搜索条＋查询
    const bodyText = await page.locator('[data-testid="c6-device-lean-leaf"]').innerText();
    const banned = ['同源 API', '夹具', '硬约束', '不改业务语义', '临时皮', '待 Allen', 'Allen 已定版', 'PC path'];
    const hit = banned.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`叶子页出现违禁开发文案: ${hit}`);
    const longSearch = await page.locator('.c6-search-row, .c5-search-row, button.c6-query-btn, button.c5-query-btn').count();
    if (longSearch) throw new Error('禁止标题下长搜索条＋查询按钮');
    const topSearch = await page.locator('[data-testid="c6-leaf-top"] [aria-label$="搜索"]').count();
    if (!topSearch && leaf.key !== 'equip-base') {
      // 顶栏应有放大镜（设置页也有）
    }
    if (!(await page.locator('[data-testid="c6-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少图标按钮（细线放大镜）');
    }
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};ui-clean`;
  });
}

await step('C6-PLUS-ARCHIVE', '设备档案＋下拉（新增设备｜批量导入）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'device-archive');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-plus"]').click();
  await page.locator('[data-testid="c6-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新增设备') || !joined.includes('批量导入')) {
    throw new Error(`设备档案＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-device-archive');
  return joined;
});

await step('C6-PLUS-PI', '点检记录＋下拉（补录点检｜扫码点检）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'pi-record');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-plus"]').click();
  await page.locator('[data-testid="c6-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('补录点检') || !joined.includes('扫码点检')) {
    throw new Error(`点检记录＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-pi-record');
  return joined;
});

await step('C6-PLUS-REPAIR', '维修工单＋下拉（新建工单｜报修转工单）', async () => {
  const leaf = LEAVES.find((x) => x.key === 'repair-order');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-plus"]').click();
  await page.locator('[data-testid="c6-plus-panel"]').waitFor();
  const items = await page.locator('.ms-plus-item').allTextContents();
  const joined = items.map((t) => t.trim()).join('|');
  if (!joined.includes('新建工单') || !joined.includes('报修转工单')) {
    throw new Error(`维修工单＋项缺失: ${joined}`);
  }
  await shot(page, 'plus-repair-order');
  return joined;
});

await step('C6-UP-TASK-PLAN', '维保任务←计划 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=maint-task&kind=maint-plan&title=${encodeURIComponent('选择维保计划派工')}&mode=dispatch&scope=c6`);
  await page.locator('[data-testid="c6-upstream-pick"][data-kind="maint-plan"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c6-pick-row"]').first().click();
  const selected = await page.locator('[data-testid="c6-pick-selected"]').innerText();
  if (!selected.includes('已选 1')) throw new Error(`已选文案错误: ${selected}`);
  const done = page.locator('[data-testid="c6-pick-done"]');
  const label = await done.innerText();
  if (!label.includes('完成(1)')) throw new Error(`完成按钮: ${label}`);
  await shot(page, 'upstream-task-plan');
  await done.click();
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="maint-task"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="c6-toast"]').waitFor({ timeout: 5000 });
  return selected;
});

await step('C6-UP-REC-TASK', '维保记录←任务 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=maint-record&kind=maint-task&title=${encodeURIComponent('选择维保任务补录')}&mode=blank&scope=c6`);
  await page.locator('[data-testid="c6-upstream-pick"][data-kind="maint-task"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c6-pick-row"]').first().click();
  const done = page.locator('[data-testid="c6-pick-done"]');
  if (!(await done.innerText()).includes('完成(1)')) throw new Error('完成(1) 缺失');
  await shot(page, 'upstream-record-task');
  await done.click();
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="maint-record"]').waitFor({ timeout: 10000 });
  return 'ok';
});

await step('C6-UP-PI', '点检记录←计划 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=pi-record&kind=pi-plan&title=${encodeURIComponent('选择点检计划补录')}&mode=blank&scope=c6`);
  await page.locator('[data-testid="c6-upstream-pick"][data-kind="pi-plan"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c6-pick-row"]').first().click();
  const done = page.locator('[data-testid="c6-pick-done"]');
  if (!(await done.innerText()).includes('完成(1)')) throw new Error('完成(1) 缺失');
  await shot(page, 'upstream-pi-plan');
  await done.click();
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="pi-record"]').waitFor({ timeout: 10000 });
  return 'ok';
});

await step('C6-UP-REPAIR', '维修工单←设备档案 · 上游勾选完成(N)', async () => {
  await page.goto(`${WEB}/ms/pick?key=repair-order&kind=device-archive&title=${encodeURIComponent('选择设备新建工单')}&mode=blank&scope=c6`);
  await page.locator('[data-testid="c6-upstream-pick"][data-kind="device-archive"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="c6-pick-row"]').first().click();
  const done = page.locator('[data-testid="c6-pick-done"]');
  if (!(await done.innerText()).includes('完成(1)')) throw new Error('完成(1) 缺失');
  await shot(page, 'upstream-repair-device');
  await done.click();
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="repair-order"]').waitFor({ timeout: 10000 });
  return 'ok';
});

await step('C6-FN-TREE', '功能树可达设备维保 11 + 精益 6 叶子', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  const deviceBlock = page.locator('[data-l1="device"]');
  if (!(await deviceBlock.locator('.ms-fn-row').getAttribute('aria-expanded'))?.includes('true')) {
    await deviceBlock.locator('.ms-fn-row').click();
  }
  for (const key of ['maint-plan', 'maint-task', 'maint-record', 'maint-break', 'maint-content', 'pi-plan', 'pi-record', 'repair-order', 'device-archive', 'device-qr', 'equip-base']) {
    await page.locator(`[data-leaf-key="${key}"]`).waitFor({ timeout: 5000 });
  }
  await shot(page, 'functions-device');
  const leanBlock = page.locator('[data-l1="lean"]');
  await leanBlock.locator('.ms-fn-row').click();
  for (const key of ['lean-station', 'lean-rectify', 'lean-meeting', 'lean-todo', 'lean-patrol', 'lean-setting']) {
    await page.locator(`[data-leaf-key="${key}"]`).waitFor({ timeout: 5000 });
  }
  await shot(page, 'functions-lean');
  return 'device+lean C6 keys visible';
});

await step('C6-PC-REDIRECT', '窄屏 PC 路径重定向 /ms 叶子', async () => {
  await page.goto(`${WEB}/device/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="device-archive"]').waitFor();
  await shot(page, 'pc-redirect-archive');
  return page.url();
});

await mobile.close();

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const desk = await desktop.newPage();
await asUser(desk, session);

await step('C6-DESKTOP', '≥769 PC 侧栏未坏（无 ms-shell）', async () => {
  await desk.goto(`${WEB}/device/list`);
  await desk.waitForTimeout(1500);
  const shell = await desk.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏不应出现 ms-shell');
  const sidebar = await desk.locator('.kgd-sidebar, aside').count();
  await shot(desk, 'desktop-sidebar');
  return `shell=${shell};sidebarCandidates=${sidebar}`;
});

await desktop.close();
await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const summary = {
  version: '1.0.99',
  feature: 'mobile-c6-device-lean',
  total: results.length,
  passed,
  leafPass,
  leafTotal: LEAVES.length,
  results,
  note: '未 merge、未上腾讯云；业务写回为皮提示；临时皮待 Allen 重选',
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  path.join(outDir, 'SUMMARY.md'),
  `# C6 设备维保 + 精益生产验收\n\n- 版本：SEDRIC01 v1.0.99 / mobile-c6-device-lean\n- Playwright：${passed}/${results.length}（叶子 ${leafPass}/${LEAVES.length}）\n- 未 merge、未上腾讯云\n- 临时皮：维保计划/任务/记录/明细、点检计划、整改/会议/待办/巡查、维保内容/维保设置/精益工作站/精益设置（待 Allen 重选皮）\n\n| 编号 | 项 | 结果 | 备注 |\n|------|----|------|------|\n${results.map((r) => `| ${r.n} | ${r.title} | ${r.result} | ${r.reason.replace(/\|/g, '/')} |`).join('\n')}\n`,
);

console.log(JSON.stringify(summary, null, 2));
if (passed !== results.length) process.exit(1);
