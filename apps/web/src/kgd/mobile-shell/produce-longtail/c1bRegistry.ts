import type { PlusItem } from '../types';

/** C1b 生产长尾叶子皮版（临时皮写在 PR，不上屏） */
export type C1bLayout =
  | 'v4-detail-lines'
  | 'v1-sparse'
  | 'v2-result'
  | 'v2-amt'
  | 'v3-status-tabs'
  | 'v1-expand';

export type C1bUpstreamKind =
  | 'contract'
  | 'plan'
  | 'work_order'
  | 'os_order'
  | 'os_receipt'
  | 'spot_check';

export type C1bLeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C1bLayout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  l1: 'produce';
  plusUpstream?: Record<string, { kind: C1bUpstreamKind; title: string; completeMode: string }>;
  statusTabs?: string[];
};

export const C1B_LEAVES: C1bLeafDef[] = [
  {
    key: 'project',
    title: '项目管理',
    pcPath: '/production_project/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/production-projects',
    plus: [
      { key: 'blank', label: '新增项目' },
      { key: 'from-contract', label: '从合同创建' },
    ],
    searchHint: '项目编号/名称/合同',
    l1: 'produce',
    plusUpstream: {
      'from-contract': { kind: 'contract', title: '选择合同', completeMode: 'from-contract' },
    },
  },
  {
    key: 'material-analysis',
    title: '物料分析',
    pcPath: '/MaterialAnalysis/list',
    layout: 'v1-sparse',
    listUrl: '/api/material-analysis',
    plus: [
      { key: 'blank', label: '新建分析' },
      { key: 'from-plan', label: '从计划分析' },
    ],
    searchHint: '计划编号/名称',
    l1: 'produce',
    plusUpstream: {
      'from-plan': { kind: 'plan', title: '选择生产计划', completeMode: 'from-plan' },
    },
  },
  {
    key: 'qc-full',
    title: '全检',
    pcPath: '/work_quality_testing/list',
    layout: 'v2-result',
    listUrl: '/api/quality/inspections',
    plus: [
      { key: 'blank', label: '手工质检' },
      { key: 'from-work-order', label: '从加工单' },
    ],
    searchHint: '商品/工序/加工单',
    l1: 'produce',
    plusUpstream: {
      'from-work-order': { kind: 'work_order', title: '选择加工单', completeMode: 'from-work-order' },
    },
  },
  {
    key: 'qc-spot',
    title: '抽检',
    pcPath: '/spot_check/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/quality/spot-checks',
    plus: [
      { key: 'blank', label: '新建抽检' },
      { key: 'from-work-order', label: '从加工单' },
    ],
    searchHint: '质检单号/加工单/商品',
    l1: 'produce',
    statusTabs: ['全部', '待质检', '已质检'],
    plusUpstream: {
      'from-work-order': { kind: 'work_order', title: '选择加工单', completeMode: 'from-work-order' },
    },
  },
  {
    key: 'qc-spot-line',
    title: '抽检明细',
    pcPath: '/spot_check_item/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/quality/spot-lines',
    plus: [
      { key: 'from-spot', label: '从抽检单' },
    ],
    searchHint: '质检单号/工序',
    l1: 'produce',
    plusUpstream: {
      'from-spot': { kind: 'spot_check', title: '选择抽检单', completeMode: 'from-spot' },
    },
  },
  {
    key: 'os-order',
    title: '外协工单',
    pcPath: '/OutWorkOrder/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/outsource/orders',
    plus: [
      { key: 'blank', label: '新增外协' },
      { key: 'from-work-order', label: '从加工单' },
      { key: 'from-analysis', label: '从物料分析' },
    ],
    searchHint: '外协单号/商品/供应商',
    l1: 'produce',
    plusUpstream: {
      'from-work-order': { kind: 'work_order', title: '选择加工单', completeMode: 'from-work-order' },
      'from-analysis': { kind: 'plan', title: '选择物料分析计划', completeMode: 'from-analysis' },
    },
  },
  {
    key: 'os-receipt',
    title: '外协验收',
    pcPath: '/outsourcing_receipt/list',
    layout: 'v2-result',
    listUrl: '/api/outsource/receipts',
    plus: [
      { key: 'blank', label: '新增验收' },
      { key: 'from-os-order', label: '从外协工单' },
    ],
    searchHint: '外协单号/商品/供应商',
    l1: 'produce',
    plusUpstream: {
      'from-os-order': { kind: 'os_order', title: '选择外协工单', completeMode: 'from-os-order' },
    },
  },
  {
    key: 'os-settle',
    title: '外协结算',
    pcPath: '/Outsourcing_settlement/list',
    layout: 'v2-amt',
    listUrl: '/api/outsource/receipts',
    plus: [
      { key: 'from-receipt', label: '从验收结算' },
    ],
    searchHint: '供应商/外协单号/商品',
    l1: 'produce',
    plusUpstream: {
      'from-receipt': { kind: 'os_receipt', title: '选择验收单', completeMode: 'from-receipt' },
    },
  },
  {
    key: 'os-content',
    title: '验收内容',
    pcPath: '/outsourcing_content/list',
    layout: 'v1-sparse',
    listUrl: '/api/outsource/contents',
    plus: [
      { key: 'blank', label: '新增验收内容' },
    ],
    searchHint: '标题/备注',
    l1: 'produce',
  },
  {
    key: 'cost',
    title: '成本分摊',
    pcPath: '/apportioned_cost/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/cost-shares',
    plus: [
      { key: 'blank', label: '新增分摊' },
      { key: 'from-work-order', label: '从加工单' },
    ],
    searchHint: '分摊编号/类别/方案',
    l1: 'produce',
    plusUpstream: {
      'from-work-order': { kind: 'work_order', title: '选择加工单', completeMode: 'from-work-order' },
    },
  },
  {
    key: 'defect',
    title: '不良品项',
    pcPath: '/waste_item/list',
    layout: 'v1-sparse',
    listUrl: '/api/quality/defects',
    plus: [
      { key: 'blank', label: '新增不良品项' },
    ],
    searchHint: '编号/名称',
    l1: 'produce',
  },
  {
    key: 'trace',
    title: '溯源码管理',
    pcPath: '/product_traceability/list',
    layout: 'v1-expand',
    listUrl: '/api/trace-codes',
    plus: [
      { key: 'batch', label: '批量生成' },
      { key: 'from-work-order', label: '从加工单生成' },
    ],
    searchHint: '溯源码/商品/加工单',
    l1: 'produce',
    plusUpstream: {
      'from-work-order': { kind: 'work_order', title: '选择加工单', completeMode: 'from-work-order' },
      batch: { kind: 'work_order', title: '选择加工单批量生成', completeMode: 'batch' },
    },
  },
];

const byKey = new Map(C1B_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C1B_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c1bLeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c1bLeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC1bProduceKey(key: string) {
  return byKey.has(key);
}

export function isC1bProducePath(path: string) {
  return byPath.has(path);
}

export const C1B_PC_PATHS = C1B_LEAVES.map((leaf) => leaf.pcPath);
export const C1B_KEYS = C1B_LEAVES.map((leaf) => leaf.key);

export function msLeafUrl(leaf: C1bLeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: leaf.l1,
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}

export function msUpstreamUrl(
  leaf: C1bLeafDef,
  override?: { kind: C1bUpstreamKind; title: string; completeMode: string },
) {
  const up = override ?? Object.values(leaf.plusUpstream || {})[0];
  if (!up) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(up.kind)}&title=${encodeURIComponent(up.title)}&mode=${encodeURIComponent(up.completeMode)}&scope=c1b`;
}
