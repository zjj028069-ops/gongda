/**
 * C8 · AI智能体 + 信息管理 + 系统管理 20 叶验收（仅 Playwright，≤768）
 * 前置：npm run dev && 已有 .local/dev-credentials.txt
 * 截图输出：docs/verification/mobile-c8-ai-info-system/
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE ?? 'http://127.0.0.1:5173';
const outDir = path.join(process.cwd(), 'docs/verification/mobile-c8-ai-info-system');
mkdirSync(outDir, { recursive: true });
const results = [];

const FORBIDDEN = [
  '同源 API 暂无数据',
  '硬约束',
  '夹具',
  '临时皮',
  '临时版',
  'PC path',
  '（皮）',
  '(皮)',
  '待 Allen',
  '卖点',
  '定版',
  '只设计',
  'README',
];

const LEAVES = [
  { key: 'ai-train', title: '训练中心', path: '/digitalEmployees/manager/setting', shot: '01-ai-train', plus: ['新增数字员工'] },
  { key: 'ai-center', title: '赛德瑞克小助手', path: '/ai/center', shot: '02-ai-center', plus: ['新会话', '扩展'] },
  { key: 'ai-factory', title: '工厂助理', path: '/ai/factory', shot: '03-ai-factory', plus: ['新问答'] },
  { key: 'ai-bom', title: 'AI 导入 BOM', path: '/ai/bom', shot: '04-ai-bom', plus: null },
  { key: 'ai-quick-order', title: '极速下单', path: '/ai/quick-order', shot: '05-ai-quick-order', plus: null },
  { key: 'ai-drawing', title: '图纸拆单', path: '/ai/drawing-split', shot: '06-ai-drawing', plus: null },
  { key: 'ai-glossary', title: '本厂词典', path: '/ai/glossary', shot: '07-ai-glossary', plus: ['新增词条', '一句话录入'] },
  { key: 'ai-ext-apps', title: '扩展应用', path: '/ai/ext-apps', shot: '08-ai-ext-apps', plus: ['一句话扩展', '从方案卡新建'] },
  { key: 'knowledge', title: '知识库', path: '/knowledge/list', shot: '09-knowledge', plus: ['新增文章', '扫码上传附件'] },
  { key: 'notice', title: '通知公告', path: '/notice/list', shot: '10-notice', plus: ['发布公告', '草稿箱'] },
  { key: 'personal', title: '个人中心', path: '/account', shot: '11-personal', plus: ['编辑资料', '退出登录'] },
  { key: 'users', title: '用户管理', path: '/user/list', shot: '12-users', plus: ['新增用户', '扫码加人'] },
  { key: 'roles', title: '角色管理', path: '/role/list', shot: '13-roles', plus: ['新增角色', '从角色复制'] },
  { key: 'teams', title: '团队管理', path: '/systemTeam/list', shot: '14-teams', plus: ['新增团队', '添加成员'] },
  { key: 'departments', title: '部门管理', path: '/department/list', shot: '15-departments', plus: ['新增部门', '新增下级'] },
  { key: 'audit', title: '操作日志', path: '/userLog', shot: '16-audit', plus: ['筛选', '清空条件'], banPlus: ['新增日志'] },
  { key: 'basics', title: '通用设置', path: '/setting/basics', shot: '17-basics', plus: ['新增单位', '新增工作状态'] },
  { key: 'company', title: '企业信息设置', path: '/setting/enterprise/setting', shot: '18-company', plus: ['载入行业模板', '清空数据'], banPlus: ['新增企业'] },
  { key: 'sms', title: '短信设置', path: '/setting/sms', shot: '19-sms', plus: ['购买套餐', '查看发送记录'] },
  { key: 'code-rules', title: '自定义编号规则', path: '/setting/customCodeRules', shot: '20-code-rules', plus: ['筛选', '列配置'], banPlus: ['新增规则'] },
];

const DUAL = ['personal', 'basics', 'company', 'sms', 'code-rules'];

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
  return `${WEB}/ms/leaf?key=${encodeURIComponent(leaf.key)}&title=${encodeURIComponent(leaf.title)}&path=${encodeURIComponent(leaf.path)}`;
}

function assertNoForbidden(text, where) {
  for (const word of FORBIDDEN) {
    if (text.includes(word)) throw new Error(`${where} 含禁字「${word}」`);
  }
}

const session = await login();
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

await step('C8-0', '窄屏四栏壳仍在 · 无 /m/*', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-shell"]').waitFor({ timeout: 20000 });
  const labels = await page.locator('.ms-tab span').allTextContents();
  if (labels.join('|') !== '消息|联系人|功能|设置') throw new Error(`底栏: ${labels.join('|')}`);
  if (page.url().includes('/m/')) throw new Error('出现禁路由 /m/*');
  await shot(page, '00-functions-entry');
  return labels.join('|');
});

for (const [i, leaf] of LEAVES.entries()) {
  await step(`C8-${String(i + 1).padStart(2, '0')}`, `叶可达 · ${leaf.key}`, async () => {
    await page.goto(leafUrl(leaf));
    if (page.url().includes('/m/')) throw new Error('出现禁路由 /m/*');
    const root = page.locator(`[data-testid="ms-leaf"][data-key="${leaf.key}"]`);
    await root.waitFor({ timeout: 20000 });
    const title = await root.locator('.ms-c8-title').innerText();
    if (title !== leaf.title) throw new Error(`标题期望 ${leaf.title}，实际 ${title}`);
    const queryBtn = await root.locator('button:has-text("查询")').count();
    if (queryBtn) throw new Error('出现标题区「查询」按钮');
    const longBar = await root.locator('.ms-c8-body > .m-search, .search-bar, input[placeholder*="查询"]').count();
    if (longBar) throw new Error('出现标题下长搜索/查询条');
    await root.getByRole('button', { name: `${leaf.title}搜索` }).waitFor();
    if (leaf.plus) {
      await root.getByRole('button', { name: '加号菜单' }).click();
      await root.locator('.ms-plus-panel').waitFor();
      const items = (await root.locator('.ms-plus-item').allTextContents()).map((t) => t.replace(/\s+/g, '').trim());
      for (const need of leaf.plus) {
        if (!items.some((t) => t.includes(need))) throw new Error(`＋菜单缺「${need}」: ${items.join('|')}`);
      }
      if (leaf.banPlus) {
        for (const bad of leaf.banPlus) {
          if (items.some((t) => t.includes(bad))) throw new Error(`＋菜单不应含「${bad}」`);
        }
      }
      await root.locator('.ms-c8-title').click();
    } else {
      const plus = await root.getByRole('button', { name: '加号菜单' }).count();
      if (plus) throw new Error(`${leaf.key} 上传流程叶不应有＋菜单`);
    }
    const bodyText = await root.innerText();
    assertNoForbidden(bodyText, leaf.key);
    if (await root.locator('.ms-fab, .ant-float-btn, button.fab').count()) {
      throw new Error('出现页内 FAB');
    }
    await shot(page, leaf.shot);
    return title;
  });
}

await step('C8-21', '设置栏双入口 · personal/basics/company/sms/code-rules', async () => {
  await page.goto(`${WEB}/ms/settings`);
  await page.locator('[data-testid="ms-settings"]').waitFor();
  for (const key of DUAL) {
    const row = page.locator(`[data-leaf-key="${key}"]`);
    if (!(await row.count())) throw new Error(`设置页缺少入口 ${key}`);
  }
  await page.locator('[data-leaf-key="basics"]').click();
  await page.locator('[data-testid="ms-leaf"][data-key="basics"]').waitFor({ timeout: 15000 });
  await shot(page, '21-dual-from-settings');
  return DUAL.join('|');
});

await step('C8-22', '功能树双入口抽检 · system 设置组 + personal', async () => {
  await page.goto(`${WEB}/ms/functions`);
  await page.locator('[data-testid="ms-functions"]').waitFor();
  await page.locator('.ms-fn-block[data-l1="system"] .ms-fn-row').click();
  await page.locator('.ms-fn-block[data-l1="system"] .ms-fn-sub').first().waitFor();
  const personal = page.locator('.ms-fn-block[data-l1="system"] [data-leaf-key="personal"]');
  if (!(await personal.count())) throw new Error('功能树缺 personal');
  const settingsGroup = page.locator('.ms-fn-block[data-l1="system"] .ms-fn-group-title', { hasText: '系统设置' });
  if (!(await settingsGroup.count())) throw new Error('功能树缺系统设置组');
  for (const key of ['basics', 'company', 'sms', 'code-rules']) {
    const row = page.locator(`.ms-fn-block[data-l1="system"] [data-leaf-key="${key}"]`);
    if (!(await row.count())) throw new Error(`功能树系统设置缺 ${key}`);
  }
  await page.locator('.ms-fn-block[data-l1="system"] [data-leaf-key="code-rules"]').click();
  await page.locator('[data-testid="ms-leaf"][data-key="code-rules"]').waitFor({ timeout: 15000 });
  await shot(page, '22-dual-from-functions');
  return 'ok';
});

await step('C8-23', '宽屏 ≥769 PC 壳不被手机壳覆盖', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${WEB}/`);
  await page.waitForTimeout(800);
  const shellVisible = await page.locator('[data-testid="ms-shell"]').isVisible().catch(() => false);
  if (shellVisible) throw new Error('≥769 不应展示 ms-shell');
  await shot(page, '23-desktop-unchanged');
  return 'desktop';
});

await browser.close();

const passed = results.filter((r) => r.result === '通过').length;
const report = {
  feature: 'mobile-c8-ai-info-system',
  version: '1.0.103',
  baseline: 'main=v1.0.92',
  total: results.length,
  passed,
  failed: results.length - passed,
  results,
  notes: [
    '未 merge、未上腾讯云、未重建库、未改开发账号密码',
    '未 rebase / 未合入 PR#3～#12',
    '消息列表属 C0、物联属 C9 本波不做',
    '截图仅 Playwright',
  ],
};
writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(report, null, 2));
writeFileSync(
  path.join(outDir, 'REPORT.md'),
  [
    '# C8 mobile-c8-ai-info-system 验收',
    '',
    `- 版本：SEDRIC01 v1.0.103`,
    `- 基线：GitHub main = v1.0.92`,
    `- 结果：${passed}/${results.length} 通过`,
    '',
    ...results.map((r) => `- ${r.result} ${r.n} ${r.title}${r.reason ? ` · ${r.reason}` : ''}`),
    '',
    ...report.notes.map((n) => `- ${n}`),
    '',
  ].join('\n'),
);

console.log(`\nDONE ${passed}/${results.length}`);
if (passed !== results.length) process.exit(1);
