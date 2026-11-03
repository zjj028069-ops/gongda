import type { PlusItem } from '../types';

/** C2 仓库叶子定版（DESIGN-MATRIX 权威） */
export type C2Layout = 'v4-alarm' | 'v4-detail' | 'v2-qty' | 'v1-sparse';

export type C2LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C2Layout;
  /** 列表 API（同源）；空数据时用夹具 */
  listUrl: string | null;
  listQuery?: string;
  /** 右上＋下拉；null = 无＋（只读流水） */
  plus: PlusItem[] | null;
  /** 搜索占位 */
  searchHint: string;
  /** 是否展示报警胶囊筛 */
  alarmCapsules?: boolean;
  /** 上游选单模式 */
  upstream?: {
    kind: 'purchase_order' | 'work_order' | 'contract' | 'purchase_receipt' | 'shipment' | 'io_type_in' | 'io_type_out';
    title: string;
    /** 完成后落到的新增 mode */
    completeMode: string;
  };
};

export const C2_LEAVES: C2LeafDef[] = [
  {
    key: 'stock',
    title: '库存管理',
    pcPath: '/goods_stock/list',
    layout: 'v4-alarm',
    listUrl: '/api/warehouse/stock/balances?view=warehouse&only_positive=true',
    plus: null,
    searchHint: '品名/仓库',
    alarmCapsules: true,
  },
  {
    key: 'in-purchase',
    title: '采购入库单',
    pcPath: '/purchase_stock_in_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/purchase-receipts',
    plus: [
      { key: 'blank', label: '空白新增' },
      { key: 'from-po', label: '从采购单入库' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/供应商',
    upstream: { kind: 'purchase_order', title: '选择采购单', completeMode: 'from-po' },
  },
  {
    key: 'in-fg',
    title: '成品入库单',
    pcPath: '/produce_stock_in_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/fg-receipts',
    plus: [
      { key: 'blank', label: '空白新增' },
      { key: 'from-wo', label: '从加工单入库' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/加工单',
    upstream: { kind: 'work_order', title: '选择加工单', completeMode: 'from-wo' },
  },
  {
    key: 'in-semi',
    title: '半成品入库单',
    pcPath: '/semi_finished_products_stock_in_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/misc-bills',
    listQuery: 'kind=semi_fg_in',
    plus: [
      { key: 'from-wo', label: '从加工单入库' },
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/加工单',
    upstream: { kind: 'work_order', title: '选择加工单', completeMode: 'from-wo' },
  },
  {
    key: 'in-return',
    title: '生产退料单',
    pcPath: '/produce_return_materiel_bill/list',
    layout: 'v1-sparse',
    listUrl: '/api/warehouse/misc-bills',
    listQuery: 'kind=prod_return_mat',
    plus: [
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/加工单/物料',
  },
  {
    key: 'in-sale-return',
    title: '销售退货单',
    pcPath: '/salesReturnOrder/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/misc-bills',
    listQuery: 'kind=sales_return',
    plus: [
      { key: 'blank', label: '新增' },
      { key: 'from-ship', label: '从出库/合同' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/客户',
    upstream: { kind: 'contract', title: '选择合同/出库', completeMode: 'from-ship' },
  },
  {
    key: 'in-other',
    title: '其他入库单',
    pcPath: '/else_stock_in_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/misc-bills',
    listQuery: 'kind=else_in',
    plus: [
      { key: 'pick-type', label: '选类型新增' },
      { key: 'blank', label: '空白新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/仓库',
    upstream: { kind: 'io_type_in', title: '选择入库类型', completeMode: 'pick-type' },
  },
  {
    key: 'out-sale',
    title: '销售出库单',
    pcPath: '/sale_stock_out_bill/list',
    layout: 'v2-qty',
    listUrl: '/api/warehouse/shipments',
    plus: [
      { key: 'from-contract', label: '合同出库' },
      { key: 'blank', label: '空白新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/客户',
    upstream: { kind: 'contract', title: '选择合同', completeMode: 'from-contract' },
  },
  {
    key: 'out-produce',
    title: '生产出库单',
    pcPath: '/production_out_of_storage/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/material-issues',
    plus: [
      { key: 'from-wo', label: '从加工单出库' },
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/加工单',
    upstream: { kind: 'work_order', title: '选择加工单', completeMode: 'from-wo' },
  },
  {
    key: 'out-purchase',
    title: '采购退货单',
    pcPath: '/purchase_return_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/purchase-returns',
    plus: [
      { key: 'from-receipt', label: '从采购入库退货' },
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/供应商',
    upstream: { kind: 'purchase_receipt', title: '选择采购入库单', completeMode: 'from-receipt' },
  },
  {
    key: 'out-other',
    title: '其他出库单',
    pcPath: '/else_stock_out_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/misc-bills',
    listQuery: 'kind=else_out',
    plus: [
      { key: 'pick-type', label: '选类型新增' },
      { key: 'blank', label: '空白新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/仓库',
    upstream: { kind: 'io_type_out', title: '选择出库类型', completeMode: 'pick-type' },
  },
  {
    key: 'transfer',
    title: '调拨单',
    pcPath: '/stock_allocate_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/transfer-bills',
    plus: [
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/仓库',
  },
  {
    key: 'check',
    title: '库存盘点',
    pcPath: '/stock_taking_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/stock-taking-bills',
    plus: [
      { key: 'blank', label: '新增' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: '单号/仓库',
  },
  {
    key: 'flow',
    title: '出入库流水',
    pcPath: '/stock_item/list',
    layout: 'v4-detail',
    listUrl: '/api/warehouse/stock/ledger',
    plus: null,
    searchHint: '单号/品名',
  },
  {
    key: 'warehouse-list',
    title: '仓库档案',
    pcPath: '/ware/list',
    layout: 'v1-sparse',
    listUrl: '/api/warehouse/warehouses',
    plus: [{ key: 'blank', label: '新增' }],
    searchHint: '编码/名称/负责人',
  },
];

const byKey = new Map(C2_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C2_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c2LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c2LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC2WarehouseKey(key: string) {
  return byKey.has(key);
}

export function isC2WarehousePath(path: string) {
  return byPath.has(path);
}

export const C2_PC_PATHS = C2_LEAVES.map((leaf) => leaf.pcPath);

export function msLeafUrl(leaf: C2LeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: 'warehouse',
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}

export function msUpstreamUrl(leaf: C2LeafDef) {
  if (!leaf.upstream) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(leaf.upstream.kind)}&title=${encodeURIComponent(leaf.upstream.title)}&mode=${encodeURIComponent(leaf.upstream.completeMode)}`;
}
