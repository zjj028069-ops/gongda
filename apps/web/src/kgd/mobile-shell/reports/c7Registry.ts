/** C7 报表中心 + 数据大屏 · 22 叶子（临时皮待 Allen 重选，勿画进 UI） */

export type C7Layout = 'v4-detail' | 'v1-sparse' | 'v1-screen';

export type C7Kind =
  | 'statement' // 对账单/列表/明细行卡
  | 'analysis' // 分析/趋势/柏拉图/汇总 · 关键指标
  | 'screen'; // 大屏管理只读

export type C7LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C7Layout;
  kind: C7Kind;
  l1: 'report' | 'screen';
  /** 同源列表 API；空数据时用夹具 */
  listUrl: string | null;
  listQuery?: string;
  searchHint: string;
  /** 时间胶囊（查询用，非常驻搜索条） */
  periodChips?: boolean;
};

export const C7_LEAVES: C7LeafDef[] = [
  // —— 数据大屏 ——
  {
    key: 'screen-manage',
    title: '大屏管理',
    pcPath: '/screen_management/list',
    layout: 'v1-screen',
    kind: 'screen',
    l1: 'screen',
    listUrl: '/api/data-screens',
    searchHint: '菜单名/模块',
  },
  // —— 生产 ——
  {
    key: 'report-machine',
    title: '机台报表',
    pcPath: '/drilling_crew_statement/list',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/biz-reports/machines',
    searchHint: '机台/车间',
    periodChips: true,
  },
  {
    key: 'report-output',
    title: '产量报表',
    pcPath: '/output_statistics_report',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/progress/reports/output',
    listQuery: 'period=本月&granularity=month&dimension=product',
    searchHint: '商品/工序',
    periodChips: true,
  },
  {
    key: 'report-wip',
    title: '在制品报表',
    pcPath: '/articles_being_processed_report',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/progress/reports/wip',
    listQuery: 'period=本年',
    searchHint: '加工单/商品',
    periodChips: true,
  },
  {
    key: 'report-clock',
    title: '工序打卡计时',
    pcPath: '/clock_in_report',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/progress/reports/clock',
    listQuery: 'page=1&page_size=50',
    searchHint: '姓名/工序',
    periodChips: true,
  },
  // —— 质量 ——
  {
    key: 'report-defect-trend',
    title: '不良品趋势分析',
    pcPath: '/waste_analysis',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/quality/reports/trend',
    searchHint: '不良项/工序',
    periodChips: true,
  },
  {
    key: 'report-pareto',
    title: '不良品柏拉图',
    pcPath: '/waste_key_analysis',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/quality/reports/pareto',
    searchHint: '不良项',
    periodChips: true,
  },
  {
    key: 'report-defect-detail',
    title: '不良品项明细',
    pcPath: '/waste_detail',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/quality/reports/defect-detail',
    searchHint: '加工单/不良项',
    periodChips: true,
  },
  {
    key: 'report-iqc',
    title: '采购检验分析',
    pcPath: '/material_test_report',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/report-extra/purchase-tests',
    searchHint: '物料/供应商',
    periodChips: true,
  },
  {
    key: 'report-sample',
    title: '生产抽检分析',
    pcPath: '/spot_check_report',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/report-extra/spot-checks',
    listQuery: 'dimension=operator_process',
    searchHint: '工序/人员',
    periodChips: true,
  },
  {
    key: 'report-scrap',
    title: '报废返工统计',
    pcPath: '/scrap_rework_statistics_report',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/report-extra/scrap-rework',
    listQuery: 'dimension=inspector',
    searchHint: '商品/工序',
    periodChips: true,
  },
  // —— 维保 ——
  {
    key: 'report-maint-analysis',
    title: '设备维修分析',
    pcPath: '/device_maintenance_analysis',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/equip/reports/repair',
    searchHint: '班组/设备',
    periodChips: true,
  },
  {
    key: 'report-maint-workload',
    title: '维修工作量统计',
    pcPath: '/maintenance_workload_statistics',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/equip/reports/workload',
    searchHint: '班组',
    periodChips: true,
  },
  {
    key: 'report-maint-plan',
    title: '维保计划统计',
    pcPath: '/maintenance_plan_statistics',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/equip/reports/plans',
    searchHint: '计划/执行人',
    periodChips: true,
  },
  // —— 经营 ——
  {
    key: 'report-purchase',
    title: '采购对账单',
    pcPath: '/purchase_statement',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/reports/purchase-statement',
    searchHint: '供应商/单号',
    periodChips: true,
  },
  {
    key: 'report-sales',
    title: '销售对账单',
    pcPath: '/sales_statement',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/report-extra/sales',
    searchHint: '客户/单号',
    periodChips: true,
  },
  {
    key: 'report-contract',
    title: '合同报表',
    pcPath: '/contract_report',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/report-extra/contracts',
    searchHint: '客户/合同号',
    periodChips: true,
  },
  {
    key: 'report-cost',
    title: '成本报表',
    pcPath: '/produce_bill_cost',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/report-extra/cost',
    searchHint: '加工单/商品',
    periodChips: true,
  },
  {
    key: 'report-ai-stock',
    title: 'AI库存监控',
    pcPath: '/ai_inventory/list',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/reports/ai-inventory',
    searchHint: '品名/编码',
  },
  {
    key: 'report-inventory',
    title: '进销存汇总',
    pcPath: '/inventory_summary',
    layout: 'v1-sparse',
    kind: 'analysis',
    l1: 'report',
    listUrl: '/api/report-extra/inventory',
    listQuery: 'only_flow=0',
    searchHint: '品名/仓库',
    periodChips: true,
  },
  // —— 薪酬 + 智能 ——
  {
    key: 'report-wage',
    title: '生产工资报表',
    pcPath: '/payroll_statement/list',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/payroll-statement',
    searchHint: '姓名/部门',
    periodChips: true,
  },
  {
    key: 'report-smart',
    title: '智能报表',
    pcPath: '/smart/form_core_list',
    layout: 'v4-detail',
    kind: 'statement',
    l1: 'report',
    listUrl: '/api/smart-reports',
    searchHint: '报表名',
  },
];

const byKey = new Map(C7_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C7_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c7LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c7LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC7Key(key: string) {
  return byKey.has(key);
}

export function isC7Path(path: string) {
  return byPath.has(path);
}

export const C7_PC_PATHS = C7_LEAVES.map((leaf) => leaf.pcPath);

export function msC7LeafUrl(leaf: C7LeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: leaf.l1,
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}
