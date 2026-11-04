/**
 * C6 设备维保 + 精益定版改皮验收（仅 Playwright）
 * 前置：API 3001 + WEB 5173，.local/dev-credentials.txt
 * 输出：docs/verification/mobile-c6-lean-maint-skin-final/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c6-lean-maint-skin-final');
mkdirSync(outDir, { recursive: true });
const results = [];

const LEAVES = [
  { key: 'maint-plan', title: '维保计划', path: '/inspection_plan/list', layout: 'v4-detail-lines', plus: ['新建计划', '从模板'], l1: 'device', tabs: [], marks: ['注塑机周检计划'] },
  { key: 'maint-task', title: '维保任务', path: '/inspection_task/list', layout: 'v3-status-tabs', plus: ['派工', '认领'], l1: 'device', tabs: ['待执行', '执行中', '逾期'], marks: ['WX-20240520-001'] },
  { key: 'maint-record', title: '维保记录', path: '/inspection_record/list', layout: 'v3-status-tabs', plus: ['补录', '导入'], l1: 'device', tabs: ['正常', '异常', '待审'], marks: ['设备编号'] },
  { key: 'maint-break', title: '维保明细', path: '/inspection_breakdown/list', layout: 'v4-detail-lines', plus: ['新增明细', '拆分'], l1: 'device', tabs: [], marks: ['标准', '实测'] },
  { key: 'maint-content', title: '维保内容', path: '/inspection_content/list', layout: 'v5-switch-rows', plus: ['新增内容', '从标准库选'], l1: 'device', tabs: [], marks: ['离心泵运行检查'], switches: 4 },
  { key: 'pi-plan', title: '点检计划', path: '/point_inspection_plan/list', layout: 'v4-detail-lines', plus: ['新建点检计划', '复制'], l1: 'device', tabs: [], marks: ['压缩机日点检'] },
  { key: 'pi-record', title: '点检记录', path: '/point_inspection_record/list', layout: 'v3-status-tabs', plus: ['补录点检', '扫码点检'], l1: 'device', tabs: ['正常', '异常', '待审'], marks: ['设备编号'], locked: true },
  { key: 'repair-order', title: '维修工单', path: '/device_order/list', layout: 'v3-status-tabs', plus: ['新建工单', '报修转工单'], l1: 'device', tabs: ['待修', '维修中', '已完成'], marks: ['WO20250521008'], locked: true },
  { key: 'device-archive', title: '设备档案', path: '/device/list', layout: 'v4-detail-lines', plus: ['新增设备', '批量导入'], l1: 'device', tabs: [], marks: ['SB202401001'], locked: true, table: true },
  { key: 'device-qr', title: '设备二维码', path: '/device_qr_code/list', layout: 'v3-status-tabs', plus: ['生成二维码', '批量打印'], l1: 'device', tabs: ['已绑定', '未绑定', '已打印'], marks: ['设备编码'], locked: true },
  { key: 'equip-base', title: '维保设置', path: '/setting/inspection/setting', layout: 'v5-switch-rows', plus: [], l1: 'device', tabs: [], marks: ['计划周期', '提醒规则', '审批开关'], switches: 4 },
  { key: 'lean-station', title: '精益生产工作站', path: '/LeanProductionReportChart/ReportChart', layout: 'v2-kpi', plus: [], l1: 'lean', tabs: [], marks: ['关键 KPI 看板', '达成率', '92%', '异常', '待整改', '生产趋势'], station: true },
  { key: 'lean-rectify', title: '整改中心', path: '/lean_production_todo/list', layout: 'v3-status-tabs', plus: ['新增整改'], l1: 'lean', tabs: ['待整改', '整改中', '已关闭'], marks: ['反应釜搅拌电机过热', '设备编号'] },
  { key: 'lean-meeting', title: '精益会议', path: '/meeting/list', layout: 'v3-status-tabs', plus: ['新增会议'], l1: 'lean', tabs: ['待开', '进行中', '已结束'], marks: ['精益生产改善评审会', '8人参与'] },
  { key: 'lean-todo', title: '会议待办', path: '/meetingTodo/list', layout: 'v3-status-tabs', plus: ['新增待办'], l1: 'lean', tabs: ['待办', '进行中', '已完成'], marks: ['生产计划调整评审会议', '发起人'] },
  { key: 'lean-patrol', title: '现场巡查', path: '/onsite_inspection/list', layout: 'v3-status-tabs', plus: ['新增巡查'], l1: 'lean', tabs: ['待巡', '已巡', '异常'], marks: ['生产车间巡查', '今日待巡'] },
  { key: 'lean-setting', title: '精益生产设置', path: '/setting/lean_production', layout: 'v5-switch-rows', plus: [], l1: 'lean', tabs: [], marks: ['生产计划管理', '物料清单管理', '人员权限配置'], switches: 4 },
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
  const n = `C6F-L${String(index + 1).padStart(2, '0')}`;
  await step(n, `≤768 ${leaf.title}`, async () => {
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c6-device-lean-leaf"][data-key="${leaf.key}"]`).waitFor({ timeout: 20000 });
    const root = page.locator('[data-testid="c6-device-lean-leaf"]');
    const layout = await root.getAttribute('data-layout');
    if (layout !== leaf.layout) throw new Error(`layout ${layout} ≠ ${leaf.layout}`);
    if (leaf.station) {
      await page.locator('[data-testid="c6-station-board"]').waitFor({ timeout: 10000 });
      await page.locator('[data-testid="c6-station-chart"]').waitFor();
    } else if (leaf.switches) {
      const switches = await page.locator('[data-testid="c6-switch"]').count();
      if (switches < leaf.switches) throw new Error(`开关行不足: ${switches}`);
    } else {
      await page.locator('[data-testid="c6-list"] [data-testid="c6-card"]').first().waitFor({ timeout: 10000 });
    }
    if (leaf.table && !(await page.locator('[data-testid="c6-table-head"]').count())) {
      throw new Error('档案明细行表头缺失');
    }
    const plusCount = await page.locator('[data-testid="c6-plus"]').count();
    if (leaf.plus.length && !plusCount) throw new Error('应有＋');
    if (!leaf.plus.length && plusCount) throw new Error('本页不应有业务＋');
    if (leaf.tabs.length) {
      await page.locator('[data-testid="c6-status-tabs"]').waitFor();
      const tabText = await page.locator('[data-testid="c6-status-tabs"]').innerText();
      for (const tab of leaf.tabs) {
        if (!tabText.includes(tab)) throw new Error(`缺状态 Tab: ${tab}`);
      }
    }
    const bodyText = await root.innerText();
    for (const mark of leaf.marks) {
      if (!bodyText.includes(mark)) throw new Error(`缺版型文案: ${mark}`);
    }
    const hit = BANNED.find((w) => bodyText.includes(w));
    if (hit) throw new Error(`出现禁字: ${hit}`);
    if (await page.getByRole('button', { name: '查询' }).count()) throw new Error('禁止标题下查询按钮');
    const longSearch = await page.locator('.c6-search-row, button.c6-query-btn').count();
    if (longSearch) throw new Error('禁止标题下长搜索条');
    if (!(await page.locator('[data-testid="c6-leaf-top"] .ms-icon-btn').count())) {
      throw new Error('顶栏缺少细线放大镜');
    }
    const width = await page.evaluate(() => window.innerWidth);
    if (width > 768) throw new Error(`视口过宽: ${width}`);
    await shot(page, `${String(index + 1).padStart(2, '0')}-${leaf.key}`);
    leafPass += 1;
    return `layout=${layout};plus=${plusCount};locked=${leaf.locked ? 1 : 0}`;
  });
}

await step('C6F-PLUS', '整改中心＋气泡贴在加号下方', async () => {
  const leaf = LEAVES.find((item) => item.key === 'lean-rectify');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-plus"]').click();
  const panel = page.locator('[data-testid="c6-plus-panel"]');
  await panel.waitFor();
  const joined = (await page.locator('.ms-plus-item').allTextContents()).join('|');
  if (!joined.includes('新增整改')) throw new Error(`＋项不对: ${joined}`);
  const plusBox = await page.locator('[data-testid="c6-plus"]').boundingBox();
  const panelBox = await panel.boundingBox();
  if (!plusBox || !panelBox) throw new Error('无法测量＋气泡');
  if (panelBox.y < plusBox.y + plusBox.height - 2) throw new Error(`气泡未贴加号下 y=${panelBox.y} plus=${plusBox.y}`);
  const hit = BANNED.find((w) => joined.includes(w));
  if (hit) throw new Error(`＋菜单禁字: ${hit}`);
  await shot(page, 'plus-lean-rectify');
  return joined;
});

await step('C6F-TABS', '整改中心状态 Tab 过滤待整改', async () => {
  const leaf = LEAVES.find((item) => item.key === 'lean-rectify');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="lean-rectify"]').waitFor();
  await page.locator('[data-testid="c6-card"]').first().waitFor();
  const all = await page.locator('[data-testid="c6-card"]').count();
  await page.getByRole('tab', { name: '待整改' }).click();
  await page.waitForTimeout(200);
  const cards = page.locator('[data-testid="c6-card"]');
  const count = await cards.count();
  if (!count || count >= all) throw new Error(`过滤后数量异常 all=${all} wait=${count}`);
  const text = await page.locator('[data-testid="c6-list"]').innerText();
  if (text.includes('整改中') || text.includes('已关闭')) throw new Error('待整改 Tab 混入其他状态');
  if (!text.includes('待整改')) throw new Error('待整改 Tab 为空');
  await shot(page, 'tabs-lean-rectify');
  return `all=${all};wait=${count}`;
});

await step('C6F-TASK-TABS', '维保任务状态 Tab 过滤执行中', async () => {
  const leaf = LEAVES.find((item) => item.key === 'maint-task');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-status-tabs"]').waitFor();
  await page.getByRole('tab', { name: '执行中' }).click();
  await page.waitForTimeout(200);
  const text = await page.locator('[data-testid="c6-list"]').innerText();
  if (!text.includes('执行中')) throw new Error('执行中 Tab 无记录');
  if (text.includes('待执行') || text.includes('逾期')) throw new Error(`执行中 Tab 混入其他状态: ${text.slice(0, 120)}`);
  return 'doing-only';
});

await step('C6F-RECORD', '维保记录对齐点检记录版3行卡', async () => {
  const leaf = LEAVES.find((item) => item.key === 'maint-record');
  await page.goto(leafUrl(leaf));
  const layout = await page.locator('[data-testid="c6-card"]').first().getAttribute('data-layout');
  if (layout !== 'v3-status-tabs') throw new Error(`记录卡版型 ${layout}`);
  const pi = LEAVES.find((item) => item.key === 'pi-record');
  await page.goto(leafUrl(pi));
  const piLayout = await page.locator('[data-testid="c6-device-lean-leaf"]').getAttribute('data-layout');
  if (piLayout !== 'v3-status-tabs') throw new Error(`点检记录退版 ${piLayout}`);
  return 'record=v3;pi-record=v3';
});

await step('C6F-LOCKED', '已定四叶不退版', async () => {
  const expect = {
    'device-archive': 'v4-detail-lines',
    'pi-record': 'v3-status-tabs',
    'repair-order': 'v3-status-tabs',
    'device-qr': 'v3-status-tabs',
  };
  const got = [];
  for (const [key, layout] of Object.entries(expect)) {
    const leaf = LEAVES.find((item) => item.key === key);
    await page.goto(leafUrl(leaf));
    await page.locator(`[data-testid="c6-device-lean-leaf"][data-key="${key}"]`).waitFor();
    const actual = await page.locator('[data-testid="c6-device-lean-leaf"]').getAttribute('data-layout');
    if (actual !== layout) throw new Error(`${key} ${actual} ≠ ${layout}`);
    got.push(`${key}=${actual}`);
  }
  return got.join(';');
});

await step('C6F-SWITCH', '精益设置开关 toast', async () => {
  const leaf = LEAVES.find((item) => item.key === 'lean-setting');
  await page.goto(leafUrl(leaf));
  const sw = page.locator('[data-testid="c6-switch"]').first();
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  await page.locator('[data-testid="c6-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c6-toast"]').innerText();
  const after = await sw.getAttribute('aria-checked');
  if (before === after) throw new Error('开关未切换');
  if (!/已开启|已关闭/.test(toast)) throw new Error(`toast 不对: ${toast}`);
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  await shot(page, 'switch-lean-setting');
  return `${before}->${after} ${toast}`;
});

await step('C6F-UPSTREAM', '维保任务＋派工 → 完成(N)', async () => {
  const leaf = LEAVES.find((item) => item.key === 'maint-task');
  await page.goto(leafUrl(leaf));
  await page.locator('[data-testid="c6-plus"]').click();
  await page.locator('.ms-plus-item', { hasText: '派工' }).click();
  await page.locator('[data-testid="c6-upstream-pick"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="c6-pick-row"]').first().click();
  const done = page.locator('[data-testid="c6-pick-done"]');
  const label = await done.innerText();
  if (!/完成\(1\)/.test(label)) throw new Error(`完成按钮不对: ${label}`);
  await shot(page, 'upstream-maint-task');
  await done.click();
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="maint-task"]').waitFor();
  await page.locator('[data-testid="c6-toast"]').waitFor({ timeout: 5000 });
  const toast = await page.locator('[data-testid="c6-toast"]').innerText();
  const hit = BANNED.find((w) => toast.includes(w));
  if (hit) throw new Error(`toast 禁字: ${hit}`);
  return `${label} ${toast}`;
});

await step('C6F-FN', '功能树设备维保 11 + 精益 6', async () => {
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
  if (!(await leanBlock.locator('.ms-fn-row').getAttribute('aria-expanded'))?.includes('true')) {
    await leanBlock.locator('.ms-fn-row').click();
  }
  for (const key of ['lean-station', 'lean-rectify', 'lean-meeting', 'lean-todo', 'lean-patrol', 'lean-setting']) {
    await page.locator(`[data-leaf-key="${key}"]`).waitFor({ timeout: 5000 });
  }
  await shot(page, 'functions-lean');
  return 'device-11+lean-6';
});

await step('C6F-PC', '窄屏 PC path → /ms/leaf', async () => {
  await page.goto(`${WEB}/device/list`);
  await page.waitForURL(/\/ms\/leaf/, { timeout: 15000 });
  await page.locator('[data-testid="c6-device-lean-leaf"][data-key="device-archive"]').waitFor();
  const layout = await page.locator('[data-testid="c6-device-lean-leaf"]').getAttribute('data-layout');
  if (layout !== 'v4-detail-lines') throw new Error(`重定向后版型 ${layout}`);
  await shot(page, 'pc-redirect-archive');
  return page.url();
});

await mobile.close();

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
const desk = await desktop.newPage();
await asUser(desk, session);
await step('C6F-DESKTOP', '≥769 不挂四栏壳', async () => {
  await desk.goto(`${WEB}/device/list`);
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
  version: 'SEDRIC01 v1.0.107 / mobile-c6-lean-maint-skin-final',
  baseline: 'v1.0.106',
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
  `# mobile-c6-lean-maint-skin-final 验收\n\n- 版本：SEDRIC01 v1.0.107 / mobile-c6-lean-maint-skin-final\n- 基线：main = v1.0.106\n- 通过 ${passed} / ${results.length}（叶子 ${leafPass}/${LEAVES.length}）\n- 未 merge、未上腾讯云、未重建库、未改密码\n\n${lines.join('\n')}\n`,
);
console.log(JSON.stringify({ passed, total: results.length, leafPass }, null, 2));
if (passed !== results.length) process.exit(1);
