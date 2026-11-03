import type { PlusItem } from '../types';

/** C9 智能设备 · 物联 4 叶（Allen 定版：scene/alarm 核对；sensor→版3；base→版5） */
export type C9Layout = 'v4-detail-lines' | 'v3-status-tabs' | 'v5-switch-rows';

export type C9StatusTab = { key: string; label: string };

export type C9LeafDef = {
  key: string;
  title: string;
  pcPath: string;
  layout: C9Layout;
  listUrl: string | null;
  listQuery?: string;
  plus: PlusItem[] | null;
  searchHint: string;
  l1: 'iot';
  statusTabs?: C9StatusTab[];
};

export const C9_LEAVES: C9LeafDef[] = [
  {
    key: 'iot-scene',
    title: '物联场景',
    pcPath: '/device_iot/list',
    layout: 'v4-detail-lines',
    listUrl: '/api/iot/scenes',
    plus: [
      { key: 'blank', label: '新建场景' },
      { key: 'from-template', label: '导入模板' },
    ],
    searchHint: '场景/网关/车间',
    l1: 'iot',
  },
  {
    key: 'iot-sensor',
    title: '传感器',
    pcPath: '/device_sensor/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/iot/sensors',
    plus: [
      { key: 'blank', label: '新增测点' },
      { key: 'import', label: '批量导入' },
    ],
    searchHint: '编号/类型/点位',
    l1: 'iot',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'online', label: '在线' },
      { key: 'offline', label: '离线' },
      { key: 'alarm', label: '告警' },
    ],
  },
  {
    key: 'iot-alarm',
    title: '报警记录',
    pcPath: '/alarm_record/list',
    layout: 'v3-status-tabs',
    listUrl: '/api/iot/alarms',
    plus: [
      { key: 'blank', label: '手动录入' },
      { key: 'export', label: '导出' },
    ],
    searchHint: '场景/设备/级别',
    l1: 'iot',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'open', label: '未处理' },
      { key: 'doing', label: '处理中' },
      { key: 'closed', label: '已关闭' },
    ],
  },
  {
    key: 'iot-base',
    title: '基础设置',
    pcPath: '/setting/smart_device/setting',
    layout: 'v5-switch-rows',
    listUrl: null,
    plus: null,
    searchHint: '设置项',
    l1: 'iot',
  },
];

const byKey = new Map(C9_LEAVES.map((leaf) => [leaf.key, leaf]));
const byPath = new Map(C9_LEAVES.map((leaf) => [leaf.pcPath, leaf]));

export function c9LeafByKey(key: string) {
  return byKey.get(key) ?? null;
}

export function c9LeafByPath(path: string) {
  return byPath.get(path) ?? null;
}

export function isC9IotKey(key: string) {
  return byKey.has(key);
}

export function isC9IotPath(path: string) {
  return byPath.has(path);
}

export const C9_PC_PATHS = C9_LEAVES.map((leaf) => leaf.pcPath);
export const C9_KEYS = C9_LEAVES.map((leaf) => leaf.key);

export function msLeafUrl(leaf: C9LeafDef, extra?: Record<string, string>) {
  const q = new URLSearchParams({
    key: leaf.key,
    title: leaf.title,
    path: leaf.pcPath,
    l1: leaf.l1,
    ...extra,
  });
  return `/ms/leaf?${q.toString()}`;
}
