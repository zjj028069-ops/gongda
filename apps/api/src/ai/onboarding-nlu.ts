/**
 * L1 开户引导 · 意图优先 NLU（赛德瑞克 MES）
 * 路径：LLM 结构化 → 白名单校验 → 规则兜底（v1.0.87：归类不看 currentStep；支持 multi）
 * 只返回草案 JSON，绝不写业务表。与 Garment Agent 无关。
 */
import { readAiConfig } from './config.js';

export type OnboardingIntent =
  | 'org_upsert'
  | 'process_upsert'
  | 'goods_upsert'
  | 'bom_guide'
  | 'multi_upsert'
  | 'skip_step'
  | 'resume_guide'
  | 'clarify'
  | 'not_l1';

export type OnboardingCtx = {
  currentStep?: string | null;
  confirmedSummary?: string | null;
};

export type OnboardingRow = Record<string, unknown>;

export type OnboardingParseResult = {
  intent: OnboardingIntent;
  confidence?: number;
  source: 'llm' | 'rules';
  step_hint?: string;
  rows?: OnboardingRow[];
  /** 一句多意图时分区草案；壳展示综合确认卡 */
  intents?: OnboardingParseResult[];
  clarify?: string;
  mes_path?: string;
  reason?: string;
  latency_ms?: number;
};

const MES_PATHS: Record<string, string> = {
  department: '/department/list',
  user: '/user/list',
  workshop: '/setting/produce/dictionary',
  process: '/public_craft/list',
  goods: '/goods/list',
  bom: '/bom/list',
};

/** 工序名黑名单：计价方式词不得当工序名 */
const PROCESS_NAME_BAN = new Set(['计件', '计时', '单价', '都计件', '都计时']);

/** 常见工序词典（用于无分隔符时贪心切分） */
const KNOWN_PROCESSES = [
  '机械加工',
  '热处理',
  '表面处理',
  '精加工',
  '粗加工',
  '机加工',
  '铸造',
  '机加',
  '抛光',
  '装配',
  '组装',
  '焊接',
  '喷涂',
  '喷漆',
  '电镀',
  '打磨',
  '冲压',
  '注塑',
  '钻孔',
  '车削',
  '铣削',
  '下料',
  '折弯',
  '包装',
  '检验',
  '质检',
  '喷涂',
  '打孔',
  '攻丝',
  '热处理',
];

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function splitList(chunk: string): string[] {
  return String(chunk || '')
    .split(/[、,，/\s]+/)
    .map((s) => s.replace(/^(有|：|:|是)/, '').trim())
    .filter(Boolean);
}

function isBannedProcessName(name: string): boolean {
  const n = String(name || '').trim();
  if (!n) return true;
  if (PROCESS_NAME_BAN.has(n)) return true;
  if (/^(计件|计时|单价)/.test(n) && n.length <= 4) return true;
  return false;
}

function greedySplitProcesses(blob: string): string[] {
  const text = String(blob || '').replace(/\s+/g, '');
  if (!text) return [];
  const sorted = [...KNOWN_PROCESSES].sort((a, b) => b.length - a.length);
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let hit = '';
    for (const p of sorted) {
      if (text.startsWith(p, i)) {
        hit = p;
        break;
      }
    }
    if (hit) {
      if (!isBannedProcessName(hit)) out.push(hit);
      i += hit.length;
      continue;
    }
    // 未知片段：读到下一已知词或结束，整段若短则丢弃
    let j = i + 1;
    while (j < text.length) {
      let found = false;
      for (const p of sorted) {
        if (text.startsWith(p, j)) {
          found = true;
          break;
        }
      }
      if (found) break;
      j += 1;
    }
    const frag = text.slice(i, j);
    if (frag && !isBannedProcessName(frag) && frag.length >= 2 && frag.length <= 12) {
      out.push(frag);
    }
    i = j > i ? j : i + 1;
  }
  return out;
}

function extractPrices(text: string): number[] {
  const m = text.match(/单价[^0-9]*([0-9]+(?:[、,，\s]+[0-9]+)*)/);
  if (!m?.[1]) return [];
  return m[1]
    .split(/[、,，\s]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function pricingOf(text: string): '计件' | '计时' {
  if (/计时/.test(text) && !/都计件|计件/.test(text)) return '计时';
  if (/计时/.test(text) && /计件/.test(text)) {
    // 同时出现时以「都X」为准
    if (/都计时/.test(text)) return '计时';
    return '计件';
  }
  return '计件';
}

/** 加字段硬特征：不当开户（与壳 shell-intent-router 对齐） */
function looksLikeFieldExtHard(t: string): boolean {
  if (/(紧急度|加急标记|交期备注|交货备注|扩展字段|拓展字段|货源地)/.test(t)) return true;
  if (/(加|增加|新增|添加|要个|要一个|加个|做个|做一个|来个).{0,30}(字段|备注|标记|筛选|过滤)/.test(t)) return true;
  if (
    /(加工单|工单|合同|出库|客户|供应商|商品列表|产品列表|列表|界面).{0,16}(加|增加|新增|添加).{0,12}(字段|备注|标记|紧急度|货源地|交期)/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function looksLikeShellOrFactoryHard(t: string): boolean {
  if (/(做一个|做个|弄个|搞个|来个).{0,10}(倒计时|正计时|计时器|番茄钟|小算盘|计算器)/.test(t)) return true;
  if (/(正计时|倒计时|计时器|秒表|番茄|专注).{0,12}(复位|暂停|带复位)/.test(t)) return true;
  if (/这单进度|进度怎么样|生产怎么样|三本账|欠款多少|工资结了没/.test(t)) return true;
  return false;
}

/** v1.0.88：收紧开户门控；删 in_progress 任意≥2字黑洞；单独「商品」不够 */
export function looksLikeOnboardingIntent(raw: string, ctx: OnboardingCtx = {}): boolean {
  const t = String(raw || '').replace(/\s+/g, '');
  if (!t) return false;
  if (looksLikeFieldExtHard(t) || looksLikeShellOrFactoryHard(t)) return false;
  if (/继续开户|恢复引导|开户引导|开始开户|以后再说|先跳过|跳过本步|稍后再说|下次再说/.test(t)) return true;
  if (/开户|建档/.test(t)) return true;

  const step = String(ctx.currentStep || '');
  const inGuide =
    step === 'org' ||
    step === 'process' ||
    step === 'goods' ||
    step === 'bom' ||
    step === 'welcome' ||
    /进行中|in_progress/i.test(String(ctx.confirmedSummary || ''));

  // 组织 / 工序实体（不含单独「商品|货|产品」）
  if (/(部门|人员|员工|同事|车间|产线|班组|工序|工艺|BOM|物料清单)/.test(t)) return true;
  if (/(帮我建|新建|录入|加上|添加).{0,12}(货|商品|产品|工序|部门|人员|车间)/.test(t)) return true;
  if (/单价|计件|计时/.test(t) && (inGuide || /工序|铸造|机加|热处理|都计件/.test(t))) return true;
  if (/产品有|商品有|货有|货品有|工序有|部门有/.test(t)) return true;
  if (/(?:三个货|几件货|几个商品|几个产品)[：:]/.test(t)) return true;
  // 进行中：只收像开户的补全，禁止任意≥2字
  if (inGuide) {
    if (/(帮我建|新建|录入|加上|添加|建三个|建几个)/.test(t)) return true;
    if (/^[\u4e00-\u9fffA-Za-z0-9]{1,40}([、,，/][\u4e00-\u9fffA-Za-z0-9]{1,40}){1,12}$/.test(t)) return true;
  }
  return false;
}

function parseSkipResume(compact: string): OnboardingParseResult | null {
  if (/继续开户|恢复引导|开户引导|开始开户/.test(compact)) {
    return { intent: 'resume_guide', source: 'rules', confidence: 0.9 };
  }
  if (/以后再说|先跳过|跳过(本步|工序|商品|部门|BOM)|稍后再说|下次再说/.test(compact)) {
    let step_hint: string | undefined;
    if (/工序/.test(compact)) step_hint = 'process';
    else if (/商品|产品|货/.test(compact)) step_hint = 'goods';
    else if (/部门|人员|车间|组织/.test(compact)) step_hint = 'org';
    else if (/BOM|物料清单/i.test(compact)) step_hint = 'bom';
    return { intent: 'skip_step', source: 'rules', confidence: 0.9, step_hint };
  }
  return null;
}

function parseOrgRules(text: string): OnboardingParseResult | null {
  const depts: OnboardingRow[] = [];
  const users: OnboardingRow[] = [];
  const workshops: OnboardingRow[] = [];

  const deptM =
    text.match(/部门[^；;]*?(?:有|：|:)?\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
    text.match(/(?:在|属)?([\u4e00-\u9fff]{2,12}部)(?:里|中|下)?/);
  if (deptM) {
    const chunk = deptM[1] || '';
    // 「生产部」整词 vs 列表
    if (/部$/.test(chunk) && !/[、,，]/.test(chunk) && !/有/.test(chunk)) {
      depts.push({ kind: 'dept', name: chunk, parent: '' });
    } else {
      splitList(chunk).forEach((n) => {
        const name = n.replace(/有|：|:/g, '').trim();
        if (name) depts.push({ kind: 'dept', name, parent: '' });
      });
    }
  }

  const userM =
    text.match(/人员[^；;]*?(?:有|：|:)?\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
    text.match(/(?:员工|同事)[^；;]*?(?:有|：|:)?\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
    text.match(/([\u4e00-\u9fff]{2,4}(?:[、,，][\u4e00-\u9fff]{2,4})+)(?:在|于)/);
  if (userM?.[1]) {
    splitList(userM[1]).forEach((n) => {
      const name = n.replace(/有|：|:/g, '').trim();
      if (name && name.length <= 8) {
        users.push({
          kind: 'user',
          name,
          username: '',
          phone: '13800000000',
          role: '生产工',
          team: '默认团队',
          dept: (depts[0] && String(depts[0].name)) || '',
          password: '',
        });
      }
    });
  }

  const wsM =
    text.match(/(?:车间|产线|班组)[^；;]*?(?:有|：|:)?\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
    text.match(/车间([\u4e00-\u9fffA-Za-z0-9]{2,20})/);
  if (wsM?.[1]) {
    splitList(wsM[1]).forEach((n) => {
      let name = n.replace(/有|：|:|车间$/g, '').trim();
      if (name && !/车间$/.test(name)) {
        // 「精工」→「精工车间」可选保留原词
      }
      if (name) {
        if (!/车间|产线|班组$/.test(name) && /车间/.test(text)) {
          // keep as-is; UI can show name
        }
        workshops.push({ kind: 'workshop', name: name.replace(/^(有)/, '') });
      }
    });
  }

  // 乱序：「车间精工，张三李四在生产部」
  if (!depts.length) {
    const d2 = text.match(/([\u4e00-\u9fff]{2,8}部)/);
    if (d2) depts.push({ kind: 'dept', name: d2[1], parent: '' });
  }
  if (!workshops.length) {
    const w2 = text.match(/车间\s*([\u4e00-\u9fffA-Za-z0-9]{1,12})/);
    if (w2) workshops.push({ kind: 'workshop', name: w2[1] });
  }
  if (!users.length) {
    const u2 = text.match(/([\u4e00-\u9fff]{2,4})[和与、,，]([\u4e00-\u9fff]{2,4})/);
    if (u2 && /(人员|员工|同事|在)/.test(text)) {
      [u2[1], u2[2]].forEach((name) => {
        users.push({
          kind: 'user',
          name,
          username: '',
          phone: '13800000000',
          role: '生产工',
          team: '默认团队',
          dept: (depts[0] && String(depts[0].name)) || '',
          password: '',
        });
      });
    }
  }

  if (!depts.length && !users.length && !workshops.length) return null;
  const rows = [...depts, ...users, ...workshops];
  return {
    intent: 'org_upsert',
    source: 'rules',
    confidence: 0.75,
    step_hint: 'org',
    rows,
    mes_path: MES_PATHS.department,
  };
}

function isPlausibleProcessName(name: string): boolean {
  const n = String(name || '').trim();
  if (!n || isBannedProcessName(n)) return false;
  if (/[；;]/.test(n)) return false;
  if (/(部门|人员|车间|商品|产品|货有|货品|生产部|部$)/.test(n)) return false;
  if (n.length > 12) return false;
  return true;
}

function parseProcessRules(text: string): OnboardingParseResult | null {
  const compact = text.replace(/\s+/g, '');
  const prices = extractPrices(text);
  const pricing = pricingOf(compact);

  // 一句多段时，优先取含工序/计件的片段，避免把组织/商品前缀吞进工序名
  let focus = text;
  const segs = text.split(/[；;]+/).map((s) => s.trim()).filter(Boolean);
  if (segs.length > 1) {
    const hit = segs.find((s) => /(工序|工艺|计件|计时|单价)/.test(s.replace(/\s+/g, '')));
    if (hit) focus = hit;
  }
  const focusCompact = focus.replace(/\s+/g, '');

  let names: string[] = [];
  const listed =
    focus.match(/工序[^有]*有\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
    focus.match(/工艺[^有]*有\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
  if (listed?.[1]) {
    let chunk = listed[1].replace(/(?:都)?(?:计件|计时).*$/, '').replace(/单价.*$/, '');
    names = splitList(chunk).filter((n) => isPlausibleProcessName(n));
  }

  if (!names.length) {
    const before =
      focusCompact.match(/^(.+?)(?:都)?(?:计件|计时)/)?.[1] ||
      focusCompact.match(/^(.+?)单价/)?.[1] ||
      '';
    const cleaned = before
      .replace(/^(?:工序|工艺)(?:有|：|:)?/, '')
      .replace(/有/g, '');
    if (/[、,，]/.test(cleaned)) {
      names = splitList(cleaned).filter((n) => isPlausibleProcessName(n));
    } else if (cleaned) {
      names = greedySplitProcesses(cleaned).filter((n) => isPlausibleProcessName(n));
    }
  }

  // 单价数量对齐：若名字数与单价数不一致且有单价，尝试再切
  if (prices.length >= 2 && names.length === 1 && names[0]) {
    const again = greedySplitProcesses(String(names[0]));
    if (again.length === prices.length) names = again;
  }
  if (prices.length >= 2 && names.length === 0) {
    const before = compact.replace(/(?:都)?(?:计件|计时).*$/, '').replace(/单价.*$/, '');
    names = greedySplitProcesses(before.replace(/^(?:工序|工艺)(?:有)?/, ''));
  }

  names = names.filter((n) => isPlausibleProcessName(n));
  if (!names.length) return null;

  // 对齐单价数组到工序
  const rows: OnboardingRow[] = names.map((name, i) => ({
    kind: 'process',
    name,
    pricing,
    wage: prices[i] != null ? prices[i] : '',
    workshop: '',
    workers: [] as string[],
  }));

  return {
    intent: 'process_upsert',
    source: 'rules',
    confidence: 0.8,
    step_hint: 'process',
    rows,
    mes_path: MES_PATHS.process,
  };
}

function parseGoodsRules(text: string): OnboardingParseResult | null {
  const compact = text.replace(/\s+/g, '');
  let names: string[] = [];

  const m =
    text.match(/(?:产品|商品|货品|货)[^有:：]*[有:：]\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/) ||
    text.match(/(?:建|新建|录入|添加|加上|帮我建)[^：:]*?(?:个)?(?:货|商品|产品)[：:]\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/) ||
    text.match(/(?:三个货|几件货|几个商品|几个产品)[：:]\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/);

  if (m?.[1]) {
    names = splitList(m[1].replace(/等$/, ''));
  }

  if (!names.length) {
    // 「帮我建三个货：水泵壳、叶轮、端盖」
    const m2 = compact.match(
      /(?:帮我)?(?:建|新建|录入|添加)(?:三个|几件|几个|些)?(?:货|商品|产品)[：:]([\u4e00-\u9fffA-Za-z0-9、,，]+)/,
    );
    if (m2?.[1]) names = splitList(m2[1]);
  }

  if (!names.length) {
    const m3 = text.match(/([A-Za-z0-9\u4e00-\u9fff]+(?:[、,，][A-Za-z0-9\u4e00-\u9fff]+)+)/);
    if (m3 && /(产品|商品|货)/.test(compact)) {
      names = splitList(m3[1]);
    }
  }

  names = names.filter((n) => n && !/^(产品|商品|货|个)$/.test(n) && n.length <= 40);
  if (!names.length) return null;

  const rows: OnboardingRow[] = names.map((name) => ({
    kind: 'goods',
    name,
    code: '',
    category: '成品',
    unit: '个',
    source: '自产',
  }));

  return {
    intent: 'goods_upsert',
    source: 'rules',
    confidence: 0.8,
    step_hint: 'goods',
    rows,
    mes_path: MES_PATHS.goods,
  };
}

function parseBomRules(text: string, _ctx: OnboardingCtx = {}): OnboardingParseResult | null {
  const compact = text.replace(/\s+/g, '');
  // 归类不看 currentStep：仅关键词触发
  if (!/BOM|物料清单|用料|配方|建BOM|做BOM|录BOM/i.test(compact)) return null;
  const nameM = compact.match(/(?:为|给)?[「『"]?([\u4e00-\u9fffA-Za-z0-9_-]{1,40})[」』"]?(?:建|做|录)?BOM/);
  return {
    intent: 'bom_guide',
    source: 'rules',
    confidence: 0.7,
    step_hint: 'bom',
    rows: nameM?.[1] ? [{ kind: 'bom', name: nameM[1] }] : [],
    mes_path: MES_PATHS.bom,
  };
}

/** 规则兜底（同步，可供单测与壳内镜像）。归类只看话语，不看 currentStep。 */
export function parseOnboardingRules(raw: string, ctx: OnboardingCtx = {}): OnboardingParseResult {
  const text = String(raw || '').trim();
  if (!text) {
    return { intent: 'not_l1', source: 'rules', reason: '空输入' };
  }
  const compact = text.replace(/\s+/g, '');

  const sr = parseSkipResume(compact);
  if (sr) return sr;

  const step = String(ctx.currentStep || ''); // 仅 clarify 文案兜底用

  const goods = parseGoodsRules(text);
  const procs = parseProcessRules(text);
  const org = parseOrgRules(text);
  const bom = parseBomRules(text, ctx);

  // 关键词门控命中（不按 currentStep 放宽）
  const hits: OnboardingParseResult[] = [];
  if (goods && /(产品|商品|货)/.test(compact)) hits.push(goods);
  if (procs && /(工序|工艺|计件|计时|单价)/.test(compact)) hits.push(procs);
  if (org && /(部门|人员|车间|产线|班组|员工|同事|[\u4e00-\u9fff]{2,8}部)/.test(compact)) hits.push(org);
  if (bom) hits.push(bom);

  if (hits.length >= 2) {
    return {
      intent: 'multi_upsert',
      source: 'rules',
      confidence: 0.75,
      step_hint: hits[0]?.step_hint,
      intents: hits,
      rows: hits.flatMap((h) => h.rows || []),
    };
  }
  if (hits.length === 1) return hits[0]!;

  // 弱命中：解析器抽出了内容但关键词不全（仍不绑 step）
  if (goods) return goods;
  if (procs) return procs;
  if (org) return org;

  // v1.0.88：硬特征 → not_l1；仅 looksLike 才 clarify；禁止「任意在 step 就 clarify」
  if (looksLikeFieldExtHard(compact) || looksLikeShellOrFactoryHard(compact)) {
    return { intent: 'not_l1', source: 'rules', reason: '硬特征非开户' };
  }
  if (looksLikeOnboardingIntent(text, ctx)) {
    return {
      intent: 'clarify',
      source: 'rules',
      confidence: 0.4,
      step_hint: step || undefined,
      clarify: clarifyPrompt(step),
    };
  }

  return { intent: 'not_l1', source: 'rules', reason: '不像开户引导' };
}

function clarifyPrompt(step: string): string {
  // 追问只补缺；currentStep 仅影响兜底文案，不训「请先完成某步」
  if (step === 'process') return '还差工序名或单价，补一句就行。';
  if (step === 'goods') return '还差商品名，直接说要建哪些货即可。';
  if (step === 'bom') return '要建哪个商品的 BOM？说商品名，或点芯片。';
  if (step === 'org' || step === 'welcome') return '还差部门、人员或车间名，缺啥补啥，顺序不限。';
  return '开户可乱序：说部门/人员/车间、工序、商品或 BOM，缺字段我再问。';
}

type LlmPlan = {
  intent?: string;
  confidence?: number;
  step_hint?: string;
  rows?: OnboardingRow[];
  intents?: LlmPlan[];
  clarify?: string;
  mes_path?: string;
  reason?: string;
};

const INTENT_SET = new Set<string>([
  'org_upsert',
  'process_upsert',
  'goods_upsert',
  'bom_guide',
  'multi_upsert',
  'skip_step',
  'resume_guide',
  'clarify',
  'not_l1',
]);

function validateLlmPlan(plan: LlmPlan): OnboardingParseResult | null {
  const intent = String(plan.intent || '').trim() as OnboardingIntent;
  if (!INTENT_SET.has(intent)) return null;

  if (intent === 'process_upsert') {
    const rows = Array.isArray(plan.rows) ? plan.rows : [];
    const cleaned = rows
      .map((r) => {
        const name = clip(String((r as { name?: unknown }).name || ''), 40);
        if (isBannedProcessName(name)) return null;
        const pricingRaw = String((r as { pricing?: unknown }).pricing || '计件');
        const pricing = pricingRaw.includes('计时') ? '计时' : '计件';
        const wage = (r as { wage?: unknown }).wage;
        return {
          kind: 'process',
          name,
          pricing,
          wage: wage == null || wage === '' ? '' : Number(wage),
          workshop: String((r as { workshop?: unknown }).workshop || ''),
          workers: Array.isArray((r as { workers?: unknown }).workers)
            ? ((r as { workers: unknown[] }).workers as unknown[]).map(String)
            : [],
        };
      })
      .filter(Boolean) as OnboardingRow[];
    if (!cleaned.length) {
      return {
        intent: 'clarify',
        source: 'llm',
        clarify: clarifyPrompt('process'),
        step_hint: 'process',
      };
    }
    return {
      intent: 'process_upsert',
      source: 'llm',
      confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.85,
      step_hint: 'process',
      rows: cleaned,
      mes_path: MES_PATHS.process,
    };
  }

  if (intent === 'goods_upsert') {
    const rows = (Array.isArray(plan.rows) ? plan.rows : [])
      .map((r) => {
        const name = clip(String((r as { name?: unknown }).name || ''), 40);
        if (!name) return null;
        return {
          kind: 'goods',
          name,
          code: String((r as { code?: unknown }).code || ''),
          category: String((r as { category?: unknown }).category || '成品'),
          unit: String((r as { unit?: unknown }).unit || '个'),
          source: String((r as { source?: unknown }).source || '自产'),
        };
      })
      .filter(Boolean) as OnboardingRow[];
    if (!rows.length) {
      return { intent: 'clarify', source: 'llm', clarify: clarifyPrompt('goods'), step_hint: 'goods' };
    }
    return {
      intent: 'goods_upsert',
      source: 'llm',
      confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.85,
      step_hint: 'goods',
      rows,
      mes_path: MES_PATHS.goods,
    };
  }

  if (intent === 'org_upsert') {
    const rows = Array.isArray(plan.rows) ? plan.rows : [];
    const cleaned = rows
      .map((r) => {
        const kind = String((r as { kind?: unknown }).kind || '').trim();
        const name = clip(String((r as { name?: unknown }).name || ''), 40);
        if (!name) return null;
        if (kind === 'dept' || (!kind && (r as { parent?: unknown }).parent !== undefined)) {
          return { kind: 'dept', name, parent: String((r as { parent?: unknown }).parent || '') };
        }
        if (kind === 'user' || (r as { role?: unknown }).role || (r as { username?: unknown }).username) {
          return {
            kind: 'user',
            name,
            username: String((r as { username?: unknown }).username || ''),
            phone: String((r as { phone?: unknown }).phone || '13800000000'),
            role: String((r as { role?: unknown }).role || '生产工'),
            team: String((r as { team?: unknown }).team || '默认团队'),
            dept: String((r as { dept?: unknown }).dept || ''),
            password: '',
          };
        }
        if (kind === 'workshop' || /车间|产线|班组/.test(name)) {
          return { kind: 'workshop', name };
        }
        if (kind === 'dept' || kind === 'user' || kind === 'workshop') {
          return { ...r, kind, name };
        }
        // 无 kind 时：若像部门
        if (/部$/.test(name)) return { kind: 'dept', name, parent: '' };
        return null;
      })
      .filter(Boolean) as OnboardingRow[];
    if (!cleaned.length) {
      return { intent: 'clarify', source: 'llm', clarify: clarifyPrompt('org'), step_hint: 'org' };
    }
    return {
      intent: 'org_upsert',
      source: 'llm',
      confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.85,
      step_hint: 'org',
      rows: cleaned,
      mes_path: MES_PATHS.department,
    };
  }

  if (intent === 'bom_guide') {
    return {
      intent: 'bom_guide',
      source: 'llm',
      confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.8,
      step_hint: 'bom',
      rows: Array.isArray(plan.rows) ? plan.rows : [],
      mes_path: MES_PATHS.bom,
    };
  }

  if (intent === 'multi_upsert') {
    const sub = Array.isArray(plan.intents) ? plan.intents : [];
    const validated: OnboardingParseResult[] = [];
    for (const part of sub) {
      const v = validateLlmPlan({ ...part, intent: part.intent });
      if (v && v.intent !== 'not_l1' && v.intent !== 'clarify' && v.intent !== 'multi_upsert') {
        validated.push(v);
      }
    }
    // 也允许单一 intent + 混合 kind rows
    if (!validated.length && Array.isArray(plan.rows) && plan.rows.length) {
      const byKind: Record<string, OnboardingRow[]> = {};
      for (const r of plan.rows) {
        const k = String((r as { kind?: unknown }).kind || '');
        if (!k) continue;
        (byKind[k] ||= []).push(r);
      }
      if (byKind.dept || byKind.user || byKind.workshop) {
        const orgRows = [...(byKind.dept || []), ...(byKind.user || []), ...(byKind.workshop || [])];
        const v = validateLlmPlan({ intent: 'org_upsert', rows: orgRows, confidence: plan.confidence });
        if (v && v.intent === 'org_upsert') validated.push(v);
      }
      if (byKind.process) {
        const v = validateLlmPlan({ intent: 'process_upsert', rows: byKind.process, confidence: plan.confidence });
        if (v && v.intent === 'process_upsert') validated.push(v);
      }
      if (byKind.goods) {
        const v = validateLlmPlan({ intent: 'goods_upsert', rows: byKind.goods, confidence: plan.confidence });
        if (v && v.intent === 'goods_upsert') validated.push(v);
      }
    }
    if (validated.length >= 2) {
      return {
        intent: 'multi_upsert',
        source: 'llm',
        confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.85,
        intents: validated,
        rows: validated.flatMap((h) => h.rows || []),
        step_hint: validated[0]?.step_hint,
      };
    }
    if (validated.length === 1) return validated[0]!;
    return {
      intent: 'clarify',
      source: 'llm',
      clarify: clarifyPrompt(String(plan.step_hint || '')),
      step_hint: plan.step_hint ? String(plan.step_hint) : undefined,
    };
  }

  if (intent === 'clarify') {
    return {
      intent: 'clarify',
      source: 'llm',
      clarify: clip(String(plan.clarify || clarifyPrompt(String(plan.step_hint || ''))), 200),
      step_hint: plan.step_hint ? String(plan.step_hint) : undefined,
    };
  }

  if (intent === 'skip_step' || intent === 'resume_guide' || intent === 'not_l1') {
    return {
      intent,
      source: 'llm',
      confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.8,
      step_hint: plan.step_hint ? String(plan.step_hint) : undefined,
      reason: plan.reason ? clip(String(plan.reason), 200) : undefined,
      clarify: plan.clarify ? clip(String(plan.clarify), 200) : undefined,
    };
  }

  return null;
}

export async function parseOnboardingWithLlm(
  raw: string,
  ctx: OnboardingCtx = {},
): Promise<OnboardingParseResult | null> {
  const config = readAiConfig();
  if (config.provider !== 'openai' || !config.apiKey) return null;

  const system = [
    '你是赛德瑞克 MES「开户引导 L1」解析器。把用户中文口语变成 JSON，不要解释。',
    '只输出一个 JSON 对象，字段：intent, confidence, step_hint, rows, intents, clarify, mes_path, reason。',
    'intent 枚举：org_upsert | process_upsert | goods_upsert | bom_guide | multi_upsert | skip_step | resume_guide | clarify | not_l1',
    '同义：产品=商品=货；车间≈产线/班组；人员≈员工/同事。',
    '归类只看用户话语，不要被 currentStep 绑架；用户可在组织步先建货、可乱序、可一句混说。',
    '一句同时含组织+工序+商品 → intent=multi_upsert，并填 intents 数组（每项含 intent+rows）；或单一 intent + rows 混 kind。',
    'process_upsert：rows[].name 不得为 计件/计时/单价；「都计件」只表示 pricing；单价数组按序对齐工序。',
    'goods_upsert：rows 每项 {kind:goods, name, code?, category?, unit?, source?}。',
    'org_upsert：rows 可含 {kind:dept|user|workshop,...}；乱序也可抽；「车间精工」车间名=精工。',
    '追问只补缺字段，禁止脚本腔「请先完成组织」。',
    '明显闲聊/查进度/非开户 → not_l1。信息不足 → clarify 并写一句 clarify。',
    `进度参考（勿据此强行改 intent）currentStep=${ctx.currentStep || ''}；已确认摘要=${clip(String(ctx.confirmedSummary || ''), 200)}`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${config.openaiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: raw.slice(0, 500) },
        ],
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim() ?? '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const plan = JSON.parse(match[0]) as LlmPlan;
    return validateLlmPlan(plan);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 商用入口：LLM 优先 → 白名单校验 → 规则兜底 */
export async function resolveOnboardingUtterance(
  raw: string,
  ctx: OnboardingCtx = {},
): Promise<OnboardingParseResult> {
  const text = String(raw || '').trim();
  if (!text) return { intent: 'not_l1', source: 'rules', reason: '空输入' };

  const compact = text.replace(/\s+/g, '');
  // 控制类优先规则
  const sr = parseSkipResume(compact);
  if (sr) return sr;

  const llm = await parseOnboardingWithLlm(text, ctx);
  if (llm && llm.intent !== 'not_l1' && llm.intent !== 'clarify') return llm;

  const rules = parseOnboardingRules(text, ctx);
  if (rules.intent !== 'not_l1') return rules;

  if (llm?.intent === 'clarify') return llm;
  if (llm?.intent === 'not_l1') return llm;
  return rules;
}
