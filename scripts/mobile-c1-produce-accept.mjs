/**
 * 阶段 C1 · 生产管理核心主链手机镜像验收（仅 Playwright）
 * 前置：npm run dev && .local/dev-credentials.txt
 * 截图：docs/verification/mobile-c1-produce-core/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c1-produce-core');
mkdirSync(outDir, { recursive: true });
const results = [];

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
    record(n, title, false, String(error).slice(0, 800));
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
  return { csrf: json.csrf_token, cookie, userId: String(json.user?.id ?? '') };
}

function authHeaders(session, json = true) {
  return {
    cookie: session.cookie,
    ...(json ? { 'content-type': 'application/json' } : {}),
    'x-csrf-token': session.csrf,
  };
}

async function api(session, method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: authHeaders(session, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  if (!res.ok) {
    const msg = json?.message || json?.title || text.slice(0, 240);
    throw new Error(`${method} ${urlPath} ${res.status} ${msg}`);
  }
  return json;
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seed(session) {
  try {
    const existing = await api(session, 'GET', '/api/progress/work-orders?page=1&page_size=5');
    if (Number(existing.total) >= 4) return `reuse orders=${existing.total}`;
  } catch { /* 继续合成 */ }
  const notes = [];
  const key = () => randomUUID();
  let units = [];
  try { units = (await api(session, 'GET', '/api/units')).items ?? []; } catch (error) { notes.push(String(error).slice(0, 120)); }
  const unitId = units[0]?.id;
  const products = [];
  for (const [code, name] of [['YYZ-01', '液压泵站总成'], ['FK-01', '阀块产线'], ['LQ-01', '冷却系统改造'], ['RG-01', '高压软管总成']]) {
    try {
      const created = await api(session, 'POST', '/api/products', { code, name, ...(unitId ? { unit_id: unitId } : {}) });
      products.push(created.product);
    } catch (error) {
      notes.push(`商品 ${name}: ${String(error).slice(0, 140)}`);
    }
  }
  if (!products.length) {
    try {
      const list = await api(session, 'GET', '/api/products?page=1&page_size=20');
      products.push(...(list.items ?? []).slice(0, 4));
    } catch (error) { notes.push(String(error).slice(0, 120)); }
  }
  let warehouses = [];
  try { warehouses = (await api(session, 'GET', '/api/warehouses')).items ?? []; } catch { /* 可能无列表路由 */ }
  if (!warehouses.length) {
    try {
      const created = await api(session, 'POST', '/api/warehouses', { request_key: key(), code: 'WH-C1', name: '一车间仓' });
      warehouses = [created.warehouse ?? created];
    } catch (error) { notes.push(`仓库: ${String(error).slice(0, 160)}`); }
  }
  const processes = [];
  for (const name of ['机械加工', '铣削加工', '装配调试', '压力测试', '精车']) {
    try {
      const created = await api(session, 'POST', '/api/processes', {
        name, standard_minutes: '30', pricing_mode: 'piece', wage_rate: '12',
        ...(session.userId ? { reporter_ids: [session.userId] } : {}),
      });
      processes.push(created.process);
    } catch (error) { notes.push(`工序 ${name}: ${String(error).slice(0, 140)}`); }
  }
  const now = new Date();
  const start = ymd(new Date(now.getFullYear(), now.getMonth(), 2));
  const end = ymd(new Date(now.getFullYear(), now.getMonth(), 26));
  const due = ymd(new Date(now.getFullYear(), now.getMonth(), 28));
  const specs = [
    { product: 0, process: 0, qty: '1600', priority: 'urgent', start: true },
    { product: 1, process: 1, qty: '1400', priority: 'urgent', start: false },
    { product: 2, process: 2, qty: '600', priority: 'normal', start: false },
    { product: 3, process: 3, qty: '800', priority: 'none', start: false },
  ];
  const orders = [];
  for (const spec of specs) {
    const product = products[spec.product] ?? products[0];
    const process = processes[spec.process] ?? processes[0];
    if (!product || !process) continue;
    try {
      const created = await api(session, 'POST', '/api/work-orders', {
        request_key: key(),
        product_id: product.id,
        quantity: spec.qty,
        requires_fg_inspection: false,
        require_cost: false,
        priority: spec.priority,
        due_date: due,
        planned_start: start,
        planned_end: end,
        note: '',
        tasks: [{ process_id: process.id, unit_ratio: '1', pricing_mode: 'piece', wage_rate: '12' }],
      });
      const order = created.work_order;
      orders.push(order);
      if (spec.start) {
        const started = await api(session, 'POST', `/api/work-orders/${order.id}/actions`, { action: 'start', version: order.version, request_key: key() });
        const running = started.work_order;
        const task = running.tasks?.[0];
        if (task) {
          try {
            await api(session, 'POST', '/api/production-reports', {
              request_key: key(), task_id: task.id, good_qty: '800', defect_qty: '0', rework_qty: '0', scrap_qty: '0', effective_seconds: 0,
            });
          } catch (error) { notes.push(`报工: ${String(error).slice(0, 180)}`); }
        }
      }
    } catch (error) { notes.push(`加工单: ${String(error).slice(0, 180)}`); }
  }
  const planLines = products.slice(0, 2).map((product, index) => ({
    product_id: product.id, plan_qty: index === 0 ? '1600' : '900', contract_code: '', customer_name: '', source: '自产', note: '', sequence: index + 1,
  }));
  if (planLines.length) {
    try {
      await api(session, 'POST', '/api/production-plans', { name: '液压泵站总成计划', delivery_date: due, note: '', lines: [planLines[0]] });
    } catch (error) { notes.push(`计划: ${String(error).slice(0, 160)}`); }
    const yesterday = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    try {
      await api(session, 'POST', '/api/production-plans', { name: '阀块产线计划', delivery_date: yesterday, note: '', lines: planLines[1] ? [planLines[1]] : [planLines[0]] });
    } catch (error) { notes.push(`计划2: ${String(error).slice(0, 160)}`); }
  }
  return `orders=${orders.length} products=${products.length} processes=${processes.length}${notes.length ? ` | ${notes.join(' | ')}` : ''}`;
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

async function waitSettled(page, loadingText, card) {
  await page.getByText(loadingText).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  if (card) await page.locator(card).first().waitFor({ timeout: 8000 }).catch(() => {});
}

async function openProduce(page) {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-shell"]').waitFor({ timeout: 20000 });
  const block = page.locator('.ms-fn-block[data-l1="produce"]');
  const open = await block.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await block.locator('.ms-fn-row').click();
  await block.locator('.ms-fn-subs').waitFor();
  return block;
}

async function openPlus(page) {
  await page.getByRole('button', { name: '加号菜单' }).click();
  await page.locator('[data-testid="ms-plus-panel"]').waitFor();
  const items = (await page.locator('.ms-plus-item').allTextContents()).map((text) => text.replace(/\s+/g, '')).join('|');
  return items;
}

const session = await login();
let seedNote = '';
try { seedNote = await seed(session); console.log('seed', seedNote); }
catch (error) { seedNote = `seed-failed ${String(error).slice(0, 300)}`; console.log(seedNote); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  locale: 'zh-CN',
});
const page = await context.newPage();
await asUser(page, session);

await step('C1-1', '功能树进入五个生产叶子和报工工作台', async () => {
  const block = await openProduce(page);
  const keys = ['plan-mrp', 'work-order', 'schedule', 'task'];
  for (const key of keys) {
    await block.locator(`[data-key="${key}"]`).first().waitFor();
  }
  await block.locator('[data-testid="ms-fn-more-produce"]').click();
  await block.locator('[data-key="work-report"]').waitFor();
  await block.locator('[data-key="report-workbench"]').waitFor();
  await shot(page, '01-functions-produce');
  await block.locator('[data-key="work-order"]').click();
  await page.locator('[data-testid="mp-work-orders"]').waitFor();
  if (!page.url().includes('/ms/inside_produce_bill/list')) throw new Error(page.url());
  return 'work-order,plan-mrp,schedule,task,work-report,report-workbench';
});

await step('C1-2', '加工单列表 v5 结构与详情', async () => {
  await page.goto(`${WEB}/ms/inside_produce_bill/list`);
  await page.locator('[data-testid="mp-work-orders"]').waitFor();
  await page.getByText('工单状态').waitFor();
  await page.getByText('总计划数').waitFor();
  await waitSettled(page, '正在读取加工单', '[data-testid="mp-wo-card"]');
  const title = await page.locator('.ms-top-title').innerText();
  if (title !== '加工单') throw new Error(`标题 ${title}`);
  const under = await page.locator('.ms-body input[placeholder*="搜索项目"]').count();
  if (under) throw new Error('列表不该有标题下长搜索条');
  await shot(page, '02-work-order-list');
  const cards = await page.locator('[data-testid="mp-wo-card"]').count();
  if (cards) {
    await page.locator('[data-testid="mp-wo-card"] h3').first().click();
    await page.locator('[data-testid="mp-wo-detail"]').waitFor();
    await page.getByText('品名').waitFor();
    await shot(page, '03-work-order-detail');
  } else {
    await shot(page, '03-work-order-detail-empty');
  }
  return `cards=${cards}`;
});

await step('C1-3', '加工单＋下拉含直接创建与合同创建', async () => {
  await page.goto(`${WEB}/ms/inside_produce_bill/list`);
  await page.locator('[data-testid="mp-work-orders"]').waitFor();
  const items = await openPlus(page);
  if (!items.includes('直接创建') || !items.includes('合同创建')) throw new Error(items);
  const box = await page.locator('[data-testid="ms-plus-panel"]').boundingBox();
  const plus = await page.getByRole('button', { name: '加号菜单' }).boundingBox();
  if (!box || !plus || box.y < plus.y) throw new Error('气泡未贴在加号下方');
  await shot(page, '04-work-order-plus');
  await page.locator('.ms-plus-item', { hasText: '合同创建' }).click();
  await page.locator('[data-testid="ms-contract-pick"]').waitFor();
  await page.getByText('选择合同订单商品').waitFor();
  await page.getByText('正在读取合同').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await shot(page, '05-work-order-contract-pick');
  return items;
});

await step('C1-4', '生产任务版1与派工｜扫码领任务', async () => {
  const block = await openProduce(page);
  await block.locator('[data-key="task"]').click();
  await page.locator('[data-testid="mp-tasks"]').waitFor();
  await page.getByText('请优先处理逾期').waitFor();
  await waitSettled(page, '正在读取生产任务', '[data-testid="mp-task-card"]');
  await shot(page, '06-task-list');
  const items = await openPlus(page);
  if (!items.includes('派工') || !items.includes('扫码领任务')) throw new Error(items);
  await shot(page, '07-task-plus');
  await page.locator('.ms-plus-item', { hasText: '派工' }).click();
  await page.locator('[data-testid="mp-task-dispatch"]').waitFor();
  return items;
});

await step('C1-5', '报工工作台版2与扫码｜手工', async () => {
  const block = await openProduce(page);
  await block.locator('[data-testid="ms-fn-more-produce"]').click();
  await block.locator('[data-key="report-workbench"]').click();
  await page.locator('[data-testid="mp-report-wb"]').waitFor();
  await page.getByText('确认报工').waitFor();
  await waitSettled(page, '正在读取', null);
  await page.getByRole('button', { name: '+1', exact: true }).waitFor();
  await shot(page, '08-report-workbench');
  const items = await openPlus(page);
  if (!items.includes('扫码报工') || !items.includes('手工报工')) throw new Error(items);
  await shot(page, '09-report-wb-plus');
  return items;
});

await step('C1-6', '报工记录版1疏朗行卡与新增｜扫码', async () => {
  const block = await openProduce(page);
  await block.locator('[data-testid="ms-fn-more-produce"]').click();
  await block.locator('[data-key="work-report"]').click();
  await page.locator('[data-testid="mp-report-records"]').waitFor();
  await page.getByText('待 Allen 重选').waitFor();
  await waitSettled(page, '正在读取报工记录', '[data-testid="mp-report-card"]');
  await shot(page, '10-report-records');
  const items = await openPlus(page);
  if (!items.includes('新增报工') || !items.includes('扫码报工')) throw new Error(items);
  await shot(page, '11-report-records-plus');
  return items;
});

await step('C1-7', '生产计划MRP版2与新增｜从合同生成', async () => {
  const block = await openProduce(page);
  await block.locator('[data-key="plan-mrp"]').click();
  await page.locator('[data-testid="mp-plans"]').waitFor();
  await page.getByText('加工投产').waitFor();
  await waitSettled(page, '正在读取生产计划', '[data-testid="mp-plan-card"]');
  await page.getByText('延期风险提示').waitFor();
  await shot(page, '12-plan-mrp');
  const items = await openPlus(page);
  if (!items.includes('新增计划') || !items.includes('从合同生成')) throw new Error(items);
  await shot(page, '13-plan-plus');
  await page.locator('.ms-plus-item', { hasText: '新增计划' }).click();
  await page.locator('[data-testid="ms-plan-add"]').waitFor();
  await page.getByText('计划名称').waitFor();
  await shot(page, '14-plan-add');
  return items;
});

await step('C1-8', '生产排产版3优先级 Tabs 与排入｜调期', async () => {
  const block = await openProduce(page);
  await block.locator('[data-key="schedule"]').click();
  await page.locator('[data-testid="mp-schedule"]').waitFor();
  await page.locator('[data-testid="mp-priority-tabs"]').waitFor();
  await waitSettled(page, '正在读取排产', '[data-testid="mp-schedule-card"]');
  await page.getByRole('button', { name: /高\(\d+\)/ }).waitFor();
  await page.getByRole('button', { name: /中\(\d+\)/ }).waitFor();
  await page.getByRole('button', { name: /低\(\d+\)/ }).waitFor();
  await shot(page, '15-schedule');
  const items = await openPlus(page);
  if (!items.includes('排入加工单') || !items.includes('批量调期')) throw new Error(items);
  await shot(page, '16-schedule-plus');
  return items;
});

await step('C1-9', '窄屏 PC 路径重定向到 /ms，搜索不串台', async () => {
  await page.goto(`${WEB}/productionTask/list`);
  await page.locator('[data-testid="mp-tasks"]').waitFor();
  if (!page.url().includes('/ms/productionTask/list')) throw new Error(page.url());
  await page.goto(`${WEB}/inside_produce_bill/list`);
  await page.locator('[data-testid="mp-work-orders"]').waitFor();
  const tab = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (tab !== 'functions') throw new Error(`底栏高亮 ${tab}`);
  await page.getByRole('button', { name: '加工单搜索' }).click();
  await page.locator('[data-testid="mp-search-pop"]').waitFor();
  if (page.url().includes('/ms/search/')) throw new Error('搜索串到分栏搜索页');
  const still = await page.locator('.ms-tab.is-on').getAttribute('data-tab');
  if (still !== 'functions') throw new Error(`搜索后高亮 ${still}`);
  await shot(page, '17-search-pop');
  return page.url();
});

await step('C1-10', '报价与合同入口仍在', async () => {
  await page.goto(`${WEB}/ms/functions`);
  const customer = page.locator('.ms-fn-block[data-l1="customer"]');
  const open = await customer.evaluate((el) => el.classList.contains('is-open'));
  if (!open) await customer.locator('.ms-fn-row').click();
  await customer.locator('[data-key="quote"]').click();
  await page.locator('[data-testid="ms-leaf"]').waitFor();
  const note = await page.locator('.ms-leaf-note').innerText();
  if (!note.includes('硬约束')) throw new Error(note);
  await page.goto(`${WEB}/ms/functions`);
  const again = page.locator('.ms-fn-block[data-l1="customer"]');
  if (!(await again.evaluate((el) => el.classList.contains('is-open')))) await again.locator('.ms-fn-row').click();
  await again.locator('[data-key="contract"]').click();
  await page.getByText('上游报价').waitFor();
  await shot(page, '18-quote-contract-kept');
  return 'quote+contract';
});

await context.close();

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
const pc = await desktop.newPage();
await asUser(pc, session);
await step('C1-11', '≥769 PC 侧栏未坏', async () => {
  await pc.goto(`${WEB}/inside_produce_bill/list`);
  await pc.locator('aside.kgd-sidebar').waitFor({ timeout: 20000 });
  const shell = await pc.locator('[data-testid="ms-shell"]').count();
  if (shell) throw new Error('宽屏出现了手机四栏壳');
  await pc.locator('aside.kgd-sidebar button[data-primary="produce"]').waitFor();
  await pc.locator('.kgd-link, .kgd-card, table').first().waitFor({ timeout: 20000 });
  await shot(pc, '19-desktop-sidebar');
  return 'pc-ok';
});

await browser.close();

const passed = results.filter((item) => item.result === '通过').length;
const report = {
  at: new Date().toISOString(),
  version: 'SEDRIC01 v1.0.94',
  feature: 'mobile-c1-produce-core',
  seed: seedNote,
  passed,
  total: results.length,
  results,
};
writeFileSync(path.join(outDir, 'REPORT.json'), JSON.stringify(report, null, 2));
const lines = [
  '# 手机生产主链 C1 验收',
  '',
  `- 时间：${report.at}`,
  `- 版本：SEDRIC01 v1.0.94 / mobile-c1-produce-core`,
  `- 结果：${passed}/${results.length}`,
  `- 夹具：${seedNote}`,
  '',
  '| 编号 | 项 | 结果 | 说明 |',
  '| --- | --- | --- | --- |',
  ...results.map((item) => `| ${item.n} | ${item.title} | ${item.result} | ${item.reason.replace(/\|/g, '/')} |`),
  '',
];
writeFileSync(path.join(outDir, 'REPORT.md'), lines.join('\n'));
console.log(`DONE ${passed}/${results.length}`);
if (passed !== results.length) process.exitCode = 1;
