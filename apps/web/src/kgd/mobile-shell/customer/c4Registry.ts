import type { PlusItem } from '../types';

/** C4 客户管理叶子定版 */
export type C4Layout = 'v4-detail' | 'v1-sparse' | 'v4-track' | 'v1-settings';

export type C4UpstreamKind =
  | 'quotation'
  | 'contract'
  | 'customer'
  | 'linkman'
  | 'sea_customer'
  | 'salesperson'
  | 'audit_object';

export type C4LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C4Layout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  upstream?: {
    kind: C4UpstreamKind;
    title: string;
    completeMode: string;
  };
  /** ＋项 key → 上游 */
  plusUpstream?: Record<string, { kind: C4UpstreamKind; title: string; completeMode: string }>;
  /** 硬约束标注 */
  hardConstraint?: 'quote-full' | 'contract-upstream';
};

export const C4_LEAVES: C4LeafDef[] = [
  {
    key: 'customer-list',
    title: '客户管理',
    pcPath: '/customer/list',
    layout: 'v1-sparse',
    listUrl: '/api/money/customers',
    plus: [{ key: 'blank', label: '新增客户' }],
    searchHint: '客户名称/编号',
  },
  {
    key: 'linkman',
    title: '客户联系人',
    pcPath: '/linkman/list',
    layout: 'v1-sparse',
    listUrl: '/api/crm/contacts',
    plus: [
      { key: 'blank', label: '新增对接人' },
      { key: 'link-customer', label: '关联客户' },
    ],
    searchHint: '姓名/电话/客户',
    plusUpstream: {
      'link-customer': { kind: 'customer', title: '选择客户', completeMode: 'link-customer' },
    },
  },
  {
    key: 'follow',
    title: '客户跟单',
    pcPath: '/follow/list',
    layout: 'v4-detail',
    listUrl: '/api/customer-follows',
    plus: [
      { key: 'blank', label: '新增跟单' },
      { key: 'quick', label: '快速记录' },
    ],
    searchHint: '客户/对接人/跟进类型',
    plusUpstream: {
      blank: { kind: 'customer', title: '关联客户', completeMode: 'blank' },
      quick: { kind: 'linkman', title: '关联对接人', completeMode: 'quick' },
    },
  },
  {
    key: 'quote',
    title: '合同报价单',
    pcPath: '/contract_quotation_bill/list',
    layout: 'v4-detail',
    listUrl: '/api/money/quotations',
    plus: [
      { key: 'blank', label: '新增报价' },
      { key: 'from-contract', label: '从合同复制' },
    ],
    searchHint: '报价单号/客户',
    hardConstraint: 'quote-full',
    plusUpstream: {
      'from-contract': { kind: 'contract', title: '选择合同订单', completeMode: 'from-contract' },
    },
  },
  {
    key: 'contract',
    title: '合同订单',
    pcPath: '/customer_contract/list',
    layout: 'v4-detail',
    listUrl: '/api/money/contracts',
    plus: [
      { key: 'blank', label: '直接创建' },
      { key: 'from-quote', label: '报价单创建' },
    ],
    searchHint: '合同号/客户名/简拼',
    hardConstraint: 'contract-upstream',
    upstream: { kind: 'quotation', title: '选择上游报价', completeMode: 'from-quote' },
    plusUpstream: {
      'from-quote': { kind: 'quotation', title: '选择上游报价', completeMode: 'from-quote' },
    },
  },
  {
    key: 'cash',
    title: '收支记录',
    pcPath: '/customer_financier/list',
    layout: 'v4-detail',
    listUrl: '/api/money/cash',
    plus: [
      { key: 'blank', label: '新增收支' },
      { key: 'from-contract', label: '关联合同订单' },
    ],
    searchHint: '输入关键字查询',
    plusUpstream: {
      'from-contract': { kind: 'contract', title: '选择合同订单', completeMode: 'from-contract' },
    },
  },
  {
    key: 'invoice',
    title: '发票管理',
    pcPath: '/customer_invoice/list',
    layout: 'v4-detail',
    listUrl: '/api/money/invoices',
    plus: [
      { key: 'blank', label: '新增发票' },
      { key: 'from-contract', label: '从订单导入' },
    ],
    searchHint: '发票号/客户',
    plusUpstream: {
      'from-contract': { kind: 'contract', title: '选择合同订单', completeMode: 'from-contract' },
    },
  },
  {
    key: 'sales-fee',
    title: '销售费用',
    pcPath: '/selling_expenses/list',
    layout: 'v4-detail',
    listUrl: '/api/money/expenses',
    plus: [
      { key: 'blank', label: '新增销售费用' },
      { key: 'link-customer', label: '关联客户' },
    ],
    searchHint: '费用类型/客户/申请人',
    plusUpstream: {
      'link-customer': { kind: 'customer', title: '选择客户', completeMode: 'link-customer' },
    },
  },
  {
    key: 'customer-sea',
    title: '客户公海',
    pcPath: '/customer_sea/list',
    layout: 'v1-sparse',
    listUrl: '/api/crm/sea',
    plus: [
      { key: 'claim', label: '领取客户' },
      { key: 'assign', label: '分配销售' },
    ],
    searchHint: '公海客户名称/编号',
    plusUpstream: {
      claim: { kind: 'sea_customer', title: '领取客户', completeMode: 'claim' },
      assign: { kind: 'salesperson', title: '分配销售', completeMode: 'assign' },
    },
  },
  {
    key: 'customer-base',
    title: '基础设置',
    pcPath: '/customer/setting/base_setting',
    layout: 'v1-settings',
    listUrl: '/api/money/settings',
    plus: null,
    searchHint: '设置项',
  },
  {
    key: 'customer-audit',
    title: '审核设置',
    pcPath: '/customer/setting/audit_setting',
    layout: 'v1-sparse',
    listUrl: '/api/money/audit-flows',
    plus: [{ key: 'blank', label: '新增审核流程' }],
    searchHint: '流程名/对象',
    plusUpstream: {
      blank: { kind: 'audit_object', title: '选择审核对象', completeMode: 'blank' },
    },
  },
  {
    key: 'sales-price',
    title: '销售价格追踪',
    pcPath: '/customer/salesPriceTrack',
    layout: 'v4-track',
    listUrl: '/api/crm/price-rules',
    plus: null,
    searchHint: '客户/产品',
  },
];

const byKey = new Map(C4_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C4_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c4LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c4LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC4CustomerKey(key: string) {
  return byKey.has(key);
}

export function isC4CustomerPath(path: string) {
  return byPath.has(path);
}

export const C4_PC_PATHS = C4_LEAVES.map((leaf) => leaf.pcPath);

export function msLeafUrl(leaf: C4LeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: 'customer',
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}

export function msUpstreamUrl(
  leaf: C4LeafDef,
  override?: { kind: C4UpstreamKind; title: string; completeMode: string },
) {
  const up = override ?? leaf.upstream;
  if (!up) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(up.kind)}&title=${encodeURIComponent(up.title)}&mode=${encodeURIComponent(up.completeMode)}&scope=c4`;
}
