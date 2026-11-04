import type { PlusItem } from '../types';

/** C3 供应/采购叶子（定版皮：版2 关键字段/金额/结果/现价 · 版4 明细行 · 版5 极简） */
export type C3Layout =
  | 'v2-keyfields'
  | 'v4-detail-lines'
  | 'v2-amount'
  | 'v2-result'
  | 'v5-minimal'
  | 'v5-switch'
  | 'v2-price';

export type C3UpstreamKind =
  | 'purchase_order'
  | 'purchase_plan'
  | 'contract_goods'
  | 'purchase_goods'
  | 'demand'
  | 'audit_object';

export type C3LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C3Layout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  /** 采购单加商品多上游 */
  goodsPlus?: boolean;
  upstream?: {
    kind: C3UpstreamKind;
    title: string;
    completeMode: string;
  };
  /** ＋项 key → 上游 */
  plusUpstream?: Record<string, { kind: C3UpstreamKind; title: string; completeMode: string }>;
};

export const C3_LEAVES: C3LeafDef[] = [
  {
    key: 'supplier',
    title: '供应商管理',
    pcPath: '/supplier/list',
    layout: 'v2-keyfields',
    listUrl: '/api/money/suppliers',
    plus: [{ key: 'blank', label: '新增供应商' }],
    searchHint: '搜名称/编号/电话',
  },
  {
    key: 'purchase-plan',
    title: '采购计划',
    pcPath: '/produce_plan/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/money/purchase-plans',
    plus: [
      { key: 'blank', label: '新建计划' },
      { key: 'from-demand', label: '从需求转入' },
    ],
    searchHint: '计划号/物料',
    plusUpstream: {
      'from-demand': { kind: 'demand', title: '选择需求', completeMode: 'from-demand' },
    },
  },
  {
    key: 'purchase-order',
    title: '采购单',
    pcPath: '/purchase_order/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/money/purchase-orders',
    plus: [
      { key: 'blank', label: '新增' },
      { key: 'pick-goods', label: '选择采购商品' },
      { key: 'pick-plan-goods', label: '选择采购计划商品' },
      { key: 'pick-contract-goods', label: '选择合同商品' },
    ],
    searchHint: '单号/供应商',
    goodsPlus: true,
    plusUpstream: {
      'pick-goods': { kind: 'purchase_goods', title: '选择采购商品', completeMode: 'pick-goods' },
      'pick-plan-goods': { kind: 'purchase_plan', title: '选择采购计划商品', completeMode: 'pick-plan-goods' },
      'pick-contract-goods': { kind: 'contract_goods', title: '选择合同商品', completeMode: 'pick-contract-goods' },
    },
  },
  {
    key: 'purchase-pay',
    title: '付款记录',
    pcPath: '/purchase_pay_record/list',
    layout: 'v2-amount',
    listUrl: '/api/money/purchase-payments',
    plus: [
      { key: 'blank', label: '登记付款' },
      { key: 'from-po', label: '关联采购单' },
    ],
    searchHint: '单号/供应商',
    plusUpstream: {
      'from-po': { kind: 'purchase_order', title: '选择采购单', completeMode: 'from-po' },
    },
  },
  {
    key: 'purchase-invoice',
    title: '发票管理',
    pcPath: '/purchase_pay_invoice/list',
    layout: 'v2-amount',
    listUrl: '/api/money/purchase-invoices',
    plus: [
      { key: 'blank', label: '新增发票' },
      { key: 'from-po', label: '从采购单开票' },
    ],
    searchHint: '发票号/供应商',
    plusUpstream: {
      'from-po': { kind: 'purchase_order', title: '选择采购单', completeMode: 'from-po' },
    },
  },
  {
    key: 'mt-list',
    title: '采购检验单',
    pcPath: '/material_test/list',
    layout: 'v2-result',
    listUrl: '/api/quality/purchase-tests',
    plus: [
      { key: 'from-po', label: '新建检验' },
      { key: 'scan', label: '扫码报检' },
    ],
    searchHint: '单号/物料/批次',
    upstream: { kind: 'purchase_order', title: '选择采购单', completeMode: 'from-po' },
    plusUpstream: {
      'from-po': { kind: 'purchase_order', title: '选择采购单', completeMode: 'from-po' },
    },
  },
  {
    key: 'mt-lines',
    title: '采购检验明细',
    pcPath: '/material_test_item_list/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/quality/purchase-lines',
    plus: null,
    searchHint: '搜索项目/标准/备注',
  },
  {
    key: 'mt-spec',
    title: '检验规范',
    pcPath: '/material_test_content/list',
    layout: 'v5-minimal',
    listUrl: '/api/quality/specs',
    plus: [{ key: 'blank', label: '新增检验规范' }],
    searchHint: '规范编码/名称',
  },
  {
    key: 'purchase-audit',
    title: '审核设置',
    pcPath: '/setting/supplier_purchase/audit_setting',
    layout: 'v5-switch',
    listUrl: '/api/money/audit-flows',
    plus: [{ key: 'blank', label: '新增审核流程' }],
    searchHint: '流程名/对象',
  },
  {
    key: 'purchase-base',
    title: '采购设置',
    pcPath: '/setting/purchase/setting',
    layout: 'v5-switch',
    listUrl: '/api/purchase/settings',
    plus: null,
    searchHint: '设置项',
  },
  {
    key: 'supplier-setting',
    title: '供应商设置',
    pcPath: '/setting/supplier/setting',
    layout: 'v5-switch',
    listUrl: '/api/purchase/supplier-settings',
    plus: null,
    searchHint: '设置项',
  },
  {
    key: 'purchase-price',
    title: '采购价格追踪',
    pcPath: '/setting/purchasePriceTrack',
    layout: 'v2-price',
    listUrl: '/api/purchase/price-rules',
    plus: null,
    searchHint: '物料/供应商',
  },
];

const byKey = new Map(C3_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C3_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c3LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c3LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC3PurchaseKey(key: string) {
  return byKey.has(key);
}

export function isC3PurchasePath(path: string) {
  return byPath.has(path);
}

export const C3_PC_PATHS = C3_LEAVES.map((leaf) => leaf.pcPath);

export function msLeafUrl(leaf: C3LeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: 'supply',
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}

export function msUpstreamUrl(leaf: C3LeafDef, override?: { kind: C3UpstreamKind; title: string; completeMode: string }) {
  const up = override ?? leaf.upstream;
  if (!up) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(up.kind)}&title=${encodeURIComponent(up.title)}&mode=${encodeURIComponent(up.completeMode)}&scope=c3`;
}
