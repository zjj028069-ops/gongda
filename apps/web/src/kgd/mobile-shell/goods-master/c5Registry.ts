import type { PlusItem } from '../types';

/** C5 生产资料叶子定版（Allen 已选 · DESIGN-MATRIX） */
export type C5Layout =
  | 'v3-category-tabs'
  | 'v4-detail-lines'
  | 'v1-sparse'
  | 'v1-settings'
  | 'v5-minimal'
  | 'v3-status-tabs'
  | 'v4-step-chain';

export type C5UpstreamKind = 'goods' | 'process' | 'person' | 'craft_template' | 'route_goods';

export type C5LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C5Layout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  l1: 'goods' | 'produce';
  upstream?: {
    kind: C5UpstreamKind;
    title: string;
    completeMode: string;
  };
  plusUpstream?: Record<string, { kind: C5UpstreamKind; title: string; completeMode: string }>;
  /** 商品新增直进表单（无模板） */
  createForm?: boolean;
  /** 硬约束标注 */
  hardConstraint?: 'no-template' | 'step-chain';
};

export const C5_LEAVES: C5LeafDef[] = [
  {
    key: 'goods-list',
    title: '商品列表',
    pcPath: '/goods/list',
    layout: 'v3-category-tabs',
    listUrl: '/api/products',
    plus: [
      { key: 'blank', label: '新增商品' },
      { key: 'scan', label: '扫码新增' },
    ],
    searchHint: '商品名/编号/规格',
    l1: 'goods',
    createForm: true,
    hardConstraint: 'no-template',
  },
  {
    key: 'bom',
    title: 'BOM管理',
    pcPath: '/bom/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/boms',
    plus: [
      { key: 'blank', label: '新增BOM' },
      { key: 'scan', label: '扫码' },
    ],
    searchHint: 'BOM编号/名称/商品',
    l1: 'goods',
    createForm: true,
    plusUpstream: {
      blank: { kind: 'goods', title: '关联商品', completeMode: 'blank' },
    },
  },
  {
    key: 'goods-base',
    title: '商品设置',
    pcPath: '/setting/goods',
    layout: 'v1-settings',
    listUrl: '/api/products/settings',
    plus: null,
    searchHint: '设置项',
    l1: 'goods',
  },
  {
    key: 'machine',
    title: '机台管理',
    pcPath: '/machine_platform/list',
    layout: 'v1-sparse',
    listUrl: '/api/machines',
    plus: [
      { key: 'blank', label: '新增机台' },
      { key: 'import', label: '批量导入' },
    ],
    searchHint: '机台编号/名称/车间',
    l1: 'produce',
  },
  {
    key: 'process',
    title: '工序管理',
    pcPath: '/public_craft/list',
    layout: 'v5-minimal',
    listUrl: '/api/processes',
    plus: [
      { key: 'blank', label: '新增工序' },
      { key: 'from-template', label: '从模板导入' },
    ],
    searchHint: '搜索工序',
    l1: 'produce',
    plusUpstream: {
      'from-template': { kind: 'craft_template', title: '选择工序模板', completeMode: 'from-template' },
    },
  },
  {
    key: 'post',
    title: '岗位安排',
    pcPath: '/station/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/stations',
    plus: [
      { key: 'blank', label: '新增岗位' },
      { key: 'from-person', label: '从人员派岗' },
    ],
    searchHint: '搜索岗位名称 / 编号 / 车间',
    l1: 'produce',
    plusUpstream: {
      'from-person': { kind: 'person', title: '选择人员派岗', completeMode: 'from-person' },
    },
  },
  {
    key: 'route',
    title: '工艺路线',
    pcPath: '/process_routing/list',
    layout: 'v4-step-chain',
    listUrl: '/api/routes',
    plus: [
      { key: 'blank', label: '新增路线' },
      { key: 'from-goods', label: '从商品复制' },
    ],
    searchHint: '路线编号/名称/商品',
    l1: 'produce',
    hardConstraint: 'step-chain',
    plusUpstream: {
      'from-goods': { kind: 'route_goods', title: '选择商品复制路线', completeMode: 'from-goods' },
    },
  },
  {
    key: 'extra',
    title: '工序附加组件',
    pcPath: '/process_additional_component/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/process-components',
    plus: [
      { key: 'blank', label: '新增组件' },
      { key: 'bind-process', label: '从工序绑定' },
    ],
    searchHint: '搜索附加组件',
    l1: 'produce',
    plusUpstream: {
      'bind-process': { kind: 'process', title: '选择工序绑定', completeMode: 'bind-process' },
    },
  },
];

const byKey = new Map(C5_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C5_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c5LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c5LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC5GoodsMasterKey(key: string) {
  return byKey.has(key);
}

export function isC5GoodsMasterPath(path: string) {
  return byPath.has(path);
}

export const C5_PC_PATHS = C5_LEAVES.map((leaf) => leaf.pcPath);
export const C5_KEYS = C5_LEAVES.map((leaf) => leaf.key);

export function msLeafUrl(leaf: C5LeafDef, extra?: Record<string, string>) {
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
  leaf: C5LeafDef,
  override?: { kind: C5UpstreamKind; title: string; completeMode: string },
) {
  const up = override ?? leaf.upstream;
  if (!up) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(up.kind)}&title=${encodeURIComponent(up.title)}&mode=${encodeURIComponent(up.completeMode)}&scope=c5`;
}
