/** 空库兜底样例：工业物联域；仅服务手机皮展示，禁止上屏开发话术 */

export type FixtureRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  statusText: string;
  statusTone?: 'ok' | 'warn' | 'bad' | 'info' | 'mute' | 'pending';
  gateway?: string;
  deviceCount?: number;
  onlineRate?: string;
  spark?: number[];
  workshop?: string;
  line?: string;
  device?: string;
  deviceCode?: string;
  kind?: string;
  unit?: string;
  value?: string;
  threshold?: string;
  scene?: string;
  point?: string;
  interval?: string;
  bindStatus?: string;
  level?: string;
  levelTone?: 'critical' | 'high' | 'mid' | 'low';
  location?: string;
  time?: string;
  result?: string;
  sensorValue?: string;
  settingKey?: string;
  settingDesc?: string;
  settingTone?: 'blue' | 'green' | 'purple';
  iconGlyph?: string;
  group?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export const FIXTURES: Record<string, FixtureRow[]> = {
  'iot-scene': [
    row({
      id: 'sc1', code: 'SC-001', name: '注塑车间', status: 'ok', statusText: '正常', statusTone: 'ok',
      gateway: 'GW-01', deviceCount: 128, onlineRate: '98.4%', spark: [88, 90, 92, 95, 97, 98, 98],
      workshop: '注塑一车间', line: '产线 A', iconGlyph: '景',
    }),
    row({
      id: 'sc2', code: 'SC-002', name: '装配生产线', status: 'ok', statusText: '正常', statusTone: 'ok',
      gateway: 'GW-02', deviceCount: 96, onlineRate: '99.1%', spark: [94, 95, 96, 97, 98, 99, 99],
      workshop: '装配车间', line: '产线 B', iconGlyph: '景',
    }),
    row({
      id: 'sc3', code: 'SC-003', name: 'CNC加工区', status: 'ok', statusText: '正常', statusTone: 'ok',
      gateway: 'GW-03', deviceCount: 64, onlineRate: '95.3%', spark: [90, 91, 93, 94, 95, 95, 95],
      workshop: '机加车间', line: 'CNC-01', iconGlyph: '景',
    }),
    row({
      id: 'sc4', code: 'SC-004', name: '质量检测区', status: 'ok', statusText: '正常', statusTone: 'ok',
      gateway: 'GW-04', deviceCount: 48, onlineRate: '97.8%', spark: [92, 94, 95, 96, 97, 97, 98],
      workshop: '质检车间', line: '检测线', iconGlyph: '景',
    }),
    row({
      id: 'sc5', code: 'SC-005', name: '立体仓库', status: 'warn', statusText: '警告', statusTone: 'warn',
      gateway: 'GW-05', deviceCount: 32, onlineRate: '90.6%', spark: [96, 94, 93, 92, 91, 91, 90],
      workshop: '立库区', line: '仓储', iconGlyph: '景',
    }),
    row({
      id: 'sc6', code: 'SC-006', name: '能源动力区', status: 'offline', statusText: '离线', statusTone: 'mute',
      gateway: 'GW-06', deviceCount: 27, onlineRate: '0%', spark: [40, 20, 10, 5, 0, 0, 0],
      workshop: '动力中心', line: '公用', iconGlyph: '景',
    }),
    row({
      id: 'sc7', code: 'SC-007', name: '包装线', status: 'ok', statusText: '正常', statusTone: 'ok',
      gateway: 'GW-07', deviceCount: 18, onlineRate: '93.2%', spark: [88, 90, 91, 92, 93, 93, 93],
      workshop: '包装车间', line: '包装-01', iconGlyph: '景',
    }),
  ],
  'iot-sensor': [
    row({
      id: 's1', code: 'S001', name: '温度', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '温度', unit: '°C', value: '28.6', threshold: '≤30 / ≥15',
      scene: '注塑车间', point: '反应釜外壁', gateway: 'GW-01', interval: '5s', iconGlyph: '温',
    }),
    row({
      id: 's2', code: 'S002', name: '湿度', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '湿度', unit: '%RH', value: '52.3', threshold: '≤60 / ≥30',
      scene: '装配生产线', point: '干燥箱', gateway: 'GW-02', interval: '10s', iconGlyph: '湿',
    }),
    row({
      id: 's3', code: 'S003', name: '压力', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '压力', unit: 'kPa', value: '101.2', threshold: '≤120 / ≥80',
      scene: '注塑车间', point: '液压回路', gateway: 'GW-01', interval: '5s', iconGlyph: '压',
    }),
    row({
      id: 's4', code: 'S004', name: '流量', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '流量', unit: 'm³/h', value: '35.7', threshold: '≤50 / ≥10',
      scene: '能源动力区', point: '冷却回路', gateway: 'GW-06', interval: '15s', iconGlyph: '流',
    }),
    row({
      id: 's5', code: 'S005', name: '液位', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '液位', unit: 'm', value: '2.85', threshold: '≤3.5 / ≥0.5',
      scene: '反应釜区', point: '储槽-03', gateway: 'GW-03', interval: '10s', iconGlyph: '液',
    }),
    row({
      id: 's6', code: 'S006', name: '电压', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '电压', unit: 'V', value: '219.4', threshold: '≤240 / ≥200',
      scene: '能源动力区', point: '配电柜', gateway: 'GW-06', interval: '5s', iconGlyph: '压',
    }),
    row({
      id: 's7', code: 'S007', name: '电流', status: 'ok', statusText: '正常', statusTone: 'ok',
      kind: '电流', unit: 'A', value: '6.21', threshold: '≤10 / ≥1',
      scene: 'CNC加工区', point: '主轴驱动', gateway: 'GW-03', interval: '5s', iconGlyph: '流',
    }),
    row({
      id: 's8', code: 'S008', name: '振动', status: 'warn', statusText: '警告', statusTone: 'warn',
      kind: '振动', unit: 'mm/s', value: '2.34', threshold: '≤4.0 / ≥0.1',
      scene: 'CNC加工区', point: '主轴轴承', gateway: 'GW-03', interval: '2s', iconGlyph: '振',
    }),
    row({
      id: 's9', code: 'S009', name: '烟感', status: 'bad', statusText: '报警', statusTone: 'bad',
      kind: '烟感', unit: '%obs/m', value: '0.18', threshold: '≤0.10',
      scene: '立体仓库', point: '货架区', gateway: 'GW-05', interval: '3s', iconGlyph: '烟',
    }),
  ],
  'iot-alarm': [
    row({
      id: 'a1', code: 'AL-240520-01', name: '2#注塑机 料温过高', status: 'open', statusText: '未处理', statusTone: 'bad',
      level: '紧急', levelTone: 'critical', device: '2#注塑机', deviceCode: 'INJ-002',
      location: '车间A-2F-03', time: '2024-05-20 10:24:15', sensorValue: '248°C', scene: '注塑车间',
    }),
    row({
      id: 'a2', code: 'AL-240520-02', name: '反应釜压力超限', status: 'doing', statusText: '处理中', statusTone: 'warn',
      level: '高', levelTone: 'high', device: '反应釜-01', deviceCode: 'RX-001',
      location: '反应区-1F-02', time: '2024-05-20 09:58:02', sensorValue: '1.82MPa', scene: '反应釜区',
    }),
    row({
      id: 'a3', code: 'AL-240520-03', name: '机床主轴负载异常', status: 'open', statusText: '未处理', statusTone: 'warn',
      level: '中', levelTone: 'mid', device: 'CNC-03', deviceCode: 'CNC-003',
      location: '机加区-B03', time: '2024-05-20 09:41:33', sensorValue: '92%', scene: 'CNC加工区',
    }),
    row({
      id: 'a4', code: 'AL-240520-04', name: '干燥机湿度超标', status: 'doing', statusText: '处理中', statusTone: 'info',
      level: '中', levelTone: 'mid', device: '干燥机-02', deviceCode: 'DRY-002',
      location: '装配线旁', time: '2024-05-20 09:12:48', sensorValue: '68%RH', scene: '装配生产线',
    }),
    row({
      id: 'a5', code: 'AL-240520-05', name: '中央供料系统气压偏低', status: 'closed', statusText: '已关闭', statusTone: 'ok',
      level: '低', levelTone: 'low', device: '供料系统', deviceCode: 'FEED-01',
      location: '公用动力', time: '2024-05-20 08:55:10', sensorValue: '0.42MPa', scene: '能源动力区',
    }),
    row({
      id: 'a6', code: 'AL-240520-06', name: '机械手动作超时', status: 'open', statusText: '未处理', statusTone: 'bad',
      level: '高', levelTone: 'high', device: '机械手-A', deviceCode: 'ROB-A01',
      location: '装配线-站3', time: '2024-05-20 08:33:21', sensorValue: '超时 3.2s', scene: '装配生产线',
    }),
    row({
      id: 'a7', code: 'AL-240520-07', name: '冷却水塔水温过高', status: 'closed', statusText: '已关闭', statusTone: 'ok',
      level: '中', levelTone: 'mid', device: '冷却塔-01', deviceCode: 'CT-001',
      location: '动力中心', time: '2024-05-19 22:18:06', sensorValue: '38.6°C', scene: '能源动力区',
    }),
    row({
      id: 'a8', code: 'AL-240520-08', name: '空压机润滑油位偏低', status: 'doing', statusText: '处理中', statusTone: 'warn',
      level: '低', levelTone: 'low', device: '空压机-01', deviceCode: 'AC-001',
      location: '动力中心', time: '2024-05-19 21:05:44', sensorValue: '液位 18%', scene: '能源动力区',
    }),
  ],
  'iot-base': [
    row({
      id: 'set1', code: 'collect', name: '采集周期', status: 'on', statusText: '开',
      settingKey: 'collect', settingDesc: '设置设备数据采集的时间间隔',
      settingTone: 'blue', group: '物联设置', iconGlyph: '采',
    }),
    row({
      id: 'set2', code: 'alarm-push', name: '报警推送', status: 'on', statusText: '开',
      settingKey: 'alarm-push', settingDesc: '配置报警通知的推送方式和接收人',
      settingTone: 'green', group: '物联设置', iconGlyph: '推',
    }),
    row({
      id: 'set3', code: 'gateway-timeout', name: '网关超时', status: 'on', statusText: '开',
      settingKey: 'gateway-timeout', settingDesc: '设置网关通信超时的阈值和处理方式',
      settingTone: 'purple', group: '物联设置', iconGlyph: '关',
    }),
  ],
};
