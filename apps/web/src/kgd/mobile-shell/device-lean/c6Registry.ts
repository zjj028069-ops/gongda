import type { PlusItem } from '../types';

/** C6 设备维保 + 精益生产叶子（定版皮：版2 KPI / 版3 状态 Tabs / 版4 明细行 / 版5 开关行） */
export type C6Layout =
  | 'v4-detail-lines'
  | 'v3-status-tabs'
  | 'v2-kpi'
  | 'v5-switch-rows';

export type C6UpstreamKind =
  | 'maint-plan'
  | 'maint-task'
  | 'pi-plan'
  | 'device-archive'
  | 'lean-patrol'
  | 'lean-meeting';

export type C6StatusTab = { key: string; label: string };

export type C6LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C6Layout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  l1: 'device' | 'lean';
  statusTabs?: C6StatusTab[];
  upstream?: {
    kind: C6UpstreamKind;
    title: string;
    completeMode: string;
  };
  plusUpstream?: Record<string, { kind: C6UpstreamKind; title: string; completeMode: string }>;
};

export const C6_LEAVES: C6LeafDef[] = [
  {
    key: 'maint-plan',
    title: '维保计划',
    pcPath: '/inspection_plan/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/equip/plans',
    plus: [
      { key: 'blank', label: '新建计划' },
      { key: 'from-template', label: '从模板' },
    ],
    searchHint: '计划名/设备/执行人',
    l1: 'device',
  },
  {
    key: 'maint-task',
    title: '维保任务',
    pcPath: '/inspection_task/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/equip/tasks',
    plus: [
      { key: 'dispatch', label: '派工' },
      { key: 'claim', label: '认领' },
    ],
    searchHint: '任务号/设备/执行人',
    l1: 'device',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待执行' },
      { key: 'doing', label: '执行中' },
      { key: 'overdue', label: '逾期' },
    ],
    upstream: { kind: 'maint-plan', title: '选择维保计划', completeMode: 'from-plan' },
    plusUpstream: {
      dispatch: { kind: 'maint-plan', title: '选择维保计划派工', completeMode: 'dispatch' },
    },
  },
  {
    key: 'maint-record',
    title: '维保记录',
    pcPath: '/inspection_record/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/equip/records',
    plus: [
      { key: 'blank', label: '补录' },
      { key: 'import', label: '导入' },
    ],
    searchHint: '记录号/设备/执行人',
    l1: 'device',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'ok', label: '正常' },
      { key: 'bad', label: '异常' },
      { key: 'pending', label: '待审' },
    ],
    upstream: { kind: 'maint-task', title: '选择维保任务', completeMode: 'blank' },
    plusUpstream: {
      blank: { kind: 'maint-task', title: '选择维保任务补录', completeMode: 'blank' },
    },
  },
  {
    key: 'maint-break',
    title: '维保明细',
    pcPath: '/inspection_breakdown/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/equip/breakdowns',
    plus: [
      { key: 'blank', label: '新增明细' },
      { key: 'split', label: '拆分' },
    ],
    searchHint: '项目/标准/实测',
    l1: 'device',
  },
  {
    key: 'maint-content',
    title: '维保内容',
    pcPath: '/inspection_content/list',
    layout: 'v5-switch-rows',
    listUrl: '/api/equip/contents',
    plus: [
      { key: 'blank', label: '新增内容' },
      { key: 'from-lib', label: '从标准库选' },
    ],
    searchHint: '内容名/类别/标准',
    l1: 'device',
  },
  {
    key: 'pi-plan',
    title: '点检计划',
    pcPath: '/point_inspection_plan/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/equip/pi-plans',
    plus: [
      { key: 'blank', label: '新建点检计划' },
      { key: 'copy', label: '复制' },
    ],
    searchHint: '计划名/设备/班次',
    l1: 'device',
  },
  {
    key: 'pi-record',
    title: '点检记录',
    pcPath: '/point_inspection_record/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/equip/pi-records',
    plus: [
      { key: 'blank', label: '补录点检' },
      { key: 'scan', label: '扫码点检' },
    ],
    searchHint: '设备/区域/编号',
    l1: 'device',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'ok', label: '正常' },
      { key: 'bad', label: '异常' },
      { key: 'pending', label: '待审' },
    ],
    upstream: { kind: 'pi-plan', title: '选择点检计划', completeMode: 'blank' },
    plusUpstream: {
      blank: { kind: 'pi-plan', title: '选择点检计划补录', completeMode: 'blank' },
    },
  },
  {
    key: 'repair-order',
    title: '维修工单',
    pcPath: '/device_order/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/equip/repairs',
    plus: [
      { key: 'blank', label: '新建工单' },
      { key: 'from-report', label: '报修转工单' },
    ],
    searchHint: '工单号/设备/维修人',
    l1: 'device',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待修' },
      { key: 'doing', label: '维修中' },
      { key: 'done', label: '已完成' },
    ],
    upstream: { kind: 'device-archive', title: '关联设备档案', completeMode: 'blank' },
    plusUpstream: {
      blank: { kind: 'device-archive', title: '选择设备新建工单', completeMode: 'blank' },
      'from-report': { kind: 'device-archive', title: '选择设备报修转工单', completeMode: 'from-report' },
    },
  },
  {
    key: 'device-archive',
    title: '设备档案',
    pcPath: '/device/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/equip/devices',
    plus: [
      { key: 'blank', label: '新增设备' },
      { key: 'import', label: '批量导入' },
    ],
    searchHint: '编号/名称/型号/车间',
    l1: 'device',
  },
  {
    key: 'device-qr',
    title: '设备二维码',
    pcPath: '/device_qr_code/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/equip/qrcodes',
    plus: [
      { key: 'blank', label: '生成二维码' },
      { key: 'print', label: '批量打印' },
    ],
    searchHint: '设备名/编码',
    l1: 'device',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'bound', label: '已绑定' },
      { key: 'unbound', label: '未绑定' },
      { key: 'printed', label: '已打印' },
    ],
  },
  {
    key: 'equip-base',
    title: '维保设置',
    pcPath: '/setting/inspection/setting',
    layout: 'v5-switch-rows',
    listUrl: '/api/equip/settings',
    plus: null,
    searchHint: '设置项',
    l1: 'device',
  },
  {
    key: 'lean-station',
    title: '精益生产工作站',
    pcPath: '/LeanProductionReportChart/ReportChart',
    layout: 'v2-kpi',
    listUrl: '/api/lean/workstation',
    plus: null,
    searchHint: '工单/产线',
    l1: 'lean',
  },
  {
    key: 'lean-rectify',
    title: '整改中心',
    pcPath: '/lean_production_todo/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/lean/rectify',
    plus: [{ key: 'blank', label: '新增整改' }],
    searchHint: '单号/问题/责任人',
    l1: 'lean',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待整改' },
      { key: 'doing', label: '整改中' },
      { key: 'closed', label: '已关闭' },
    ],
    upstream: { kind: 'lean-patrol', title: '关联巡查', completeMode: 'blank' },
    plusUpstream: {
      blank: { kind: 'lean-patrol', title: '关联巡查新增整改', completeMode: 'blank' },
    },
  },
  {
    key: 'lean-meeting',
    title: '精益会议',
    pcPath: '/meeting/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/lean/meetings',
    plus: [{ key: 'blank', label: '新增会议' }],
    searchHint: '主题/地点/主持人',
    l1: 'lean',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待开' },
      { key: 'doing', label: '进行中' },
      { key: 'done', label: '已结束' },
    ],
  },
  {
    key: 'lean-todo',
    title: '会议待办',
    pcPath: '/meetingTodo/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/lean/todos',
    plus: [{ key: 'blank', label: '新增待办' }],
    searchHint: '待办/会议/责任人',
    l1: 'lean',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待办' },
      { key: 'doing', label: '进行中' },
      { key: 'done', label: '已完成' },
    ],
    upstream: { kind: 'lean-meeting', title: '关联会议', completeMode: 'blank' },
    plusUpstream: {
      blank: { kind: 'lean-meeting', title: '关联会议新增待办', completeMode: 'blank' },
    },
  },
  {
    key: 'lean-patrol',
    title: '现场巡查',
    pcPath: '/onsite_inspection/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/lean/patrols',
    plus: [{ key: 'blank', label: '新增巡查' }],
    searchHint: '巡查点/区域/巡查人',
    l1: 'lean',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'wait', label: '待巡' },
      { key: 'done', label: '已巡' },
      { key: 'bad', label: '异常' },
    ],
  },
  {
    key: 'lean-setting',
    title: '精益生产设置',
    pcPath: '/setting/lean_production',
    layout: 'v5-switch-rows',
    listUrl: '/api/lean/settings',
    plus: null,
    searchHint: '设置项',
    l1: 'lean',
  },
];

const byKey = new Map(C6_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C6_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c6LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c6LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC6DeviceLeanKey(key: string) {
  return byKey.has(key);
}

export function isC6DeviceLeanPath(path: string) {
  return byPath.has(path);
}

export const C6_PC_PATHS = C6_LEAVES.map((leaf) => leaf.pcPath);
export const C6_KEYS = C6_LEAVES.map((leaf) => leaf.key);

export function msLeafUrl(leaf: C6LeafDef, extra?: Record<string, string>) {
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
  leaf: C6LeafDef,
  override?: { kind: C6UpstreamKind; title: string; completeMode: string },
) {
  const up = override ?? leaf.upstream;
  if (!up) return msLeafUrl(leaf);
  return `/ms/pick?key=${encodeURIComponent(leaf.key)}&kind=${encodeURIComponent(up.kind)}&title=${encodeURIComponent(up.title)}&mode=${encodeURIComponent(up.completeMode)}&scope=c6`;
}
