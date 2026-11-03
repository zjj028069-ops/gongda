import type { PlusItem } from '../types';

/** 功能树 key → 手机镜像。PC path 原样挂在 /ms 下，避开 /m 报工应用。 */
export const PRODUCE_MENU_PATH: Record<string, string> = {
  'work-order': '/ms/inside_produce_bill/list',
  task: '/ms/productionTask/list',
  'work-report': '/ms/work_repoty_record/list',
  'plan-mrp': '/ms/ProductionPlan/list',
  schedule: '/ms/ProductionScheduling/list',
  'report-workbench': '/ms/work_report_workbench',
};

const WO_PLUS: PlusItem[] = [
  { key: 'wo-direct', label: '直接创建', glyph: '直' },
  { key: 'wo-contract', label: '合同创建', glyph: '合' },
];
const TASK_PLUS: PlusItem[] = [
  { key: 'task-dispatch', label: '派工', glyph: '派' },
  { key: 'task-scan', label: '扫码领任务', glyph: '扫' },
];
const WB_PLUS: PlusItem[] = [
  { key: 'wb-scan', label: '扫码报工', glyph: '扫' },
  { key: 'wb-manual', label: '手工报工', glyph: '手' },
];
const REC_PLUS: PlusItem[] = [
  { key: 'rec-manual', label: '新增报工', glyph: '新' },
  { key: 'rec-scan', label: '扫码报工', glyph: '扫' },
];
const PLAN_PLUS: PlusItem[] = [
  { key: 'plan-new', label: '新增计划', glyph: '新' },
  { key: 'plan-contract', label: '从合同生成', glyph: '合' },
];
const SCH_PLUS: PlusItem[] = [
  { key: 'sch-enqueue', label: '排入加工单', glyph: '排' },
  { key: 'sch-shift', label: '批量调期', glyph: '期' },
];

export type ProduceMatch = {
  key: string;
  title: string;
  plus: PlusItem[];
  /** 表单/详情收起底栏，列表与工作台保留四栏 */
  focus: boolean;
  hideActions?: boolean;
};

export function matchProduce(pathname: string): ProduceMatch | null {
  if (pathname === '/ms/inside_produce_bill/list') return { key: 'work-order', title: '加工单', plus: WO_PLUS, focus: false };
  if (pathname.startsWith('/ms/inside_produce_bill/detail/')) return { key: 'work-order-detail', title: '加工单详情', plus: WO_PLUS, focus: true };
  if (pathname.startsWith('/ms/inside_produce_bill/add')) return { key: 'work-order-add', title: '创建加工单', plus: [], focus: true, hideActions: true };
  if (pathname === '/ms/productionTask/list') return { key: 'task', title: '生产任务', plus: TASK_PLUS, focus: false };
  if (pathname === '/ms/work_report_workbench') return { key: 'report-wb', title: '报工工作台', plus: WB_PLUS, focus: false };
  if (pathname === '/ms/work_repoty_record/list') return { key: 'report-record', title: '报工记录', plus: REC_PLUS, focus: false };
  if (pathname === '/ms/ProductionPlan/list') return { key: 'plan-mrp', title: '生产计划MRP', plus: PLAN_PLUS, focus: false };
  if (pathname.startsWith('/ms/ProductionPlan/add')) return { key: 'plan-add', title: '创建生产计划', plus: [], focus: true, hideActions: true };
  if (pathname.startsWith('/ms/ProductionPlan/detail/')) return { key: 'plan-detail', title: '生产计划', plus: PLAN_PLUS, focus: true };
  if (pathname === '/ms/ProductionScheduling/list') return { key: 'schedule', title: '生产排产', plus: SCH_PLUS, focus: false };
  return null;
}

const PC_ROOTS = ['/inside_produce_bill', '/productionTask', '/work_report_workbench', '/work_repoty_record', '/ProductionPlan', '/ProductionScheduling'];

/** 窄屏落到 PC 生产路径时，改挂到 /ms 镜像，保留 query。 */
export function produceRedirect(pathname: string, search: string): string | null {
  if (pathname.startsWith('/ms')) return null;
  const hit = PC_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  return hit ? `/ms${pathname}${search}` : null;
}

export function leafRedirect(params: URLSearchParams): string | null {
  const key = params.get('key') || '';
  return PRODUCE_MENU_PATH[key] ?? null;
}

export function shellRedirect(pathname: string, search: string, messagesPath: string): string | null {
  if (!pathname.startsWith('/ms')) return produceRedirect(pathname, search) ?? messagesPath;
  if (pathname === '/ms/leaf' || pathname.startsWith('/ms/leaf/')) return leafRedirect(new URLSearchParams(search));
  return null;
}

export function produceBack(pathname: string): string {
  if (pathname.startsWith('/ms/inside_produce_bill/detail') || pathname.startsWith('/ms/inside_produce_bill/add')) return '/ms/inside_produce_bill/list';
  if (pathname.startsWith('/ms/ProductionPlan/')) return '/ms/ProductionPlan/list';
  return '/ms/functions';
}

export function producePlusHref(itemKey: string): string | null {
  switch (itemKey) {
    case 'wo-direct': return '/ms/inside_produce_bill/add?mode=direct';
    case 'wo-contract': return '/ms/inside_produce_bill/add?pick=1';
    case 'task-dispatch': return '/ms/productionTask/list?sheet=dispatch';
    case 'task-scan': return '/ms/productionTask/list?sheet=scan';
    case 'wb-scan': return '/ms/work_report_workbench?sheet=scan';
    case 'wb-manual': return '/ms/work_report_workbench?sheet=manual';
    case 'rec-manual': return '/ms/work_repoty_record/list?sheet=manual';
    case 'rec-scan': return '/ms/work_repoty_record/list?sheet=scan';
    case 'plan-new': return '/ms/ProductionPlan/add';
    case 'plan-contract': return '/ms/ProductionPlan/add?from=contract';
    case 'sch-enqueue': return '/ms/ProductionScheduling/list?sheet=enqueue';
    case 'sch-shift': return '/ms/ProductionScheduling/list?sheet=shift';
    default: return null;
  }
}
