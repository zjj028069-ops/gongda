/** 空库展示行：接口无数据时兜底，不写业务库 */

export type FixtureRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  statusText: string;
  statusTone?: 'ok' | 'warn' | 'bad' | 'info' | 'mute' | 'pending';
  device?: string;
  deviceCode?: string;
  plan?: string;
  planSub?: string;
  owner?: string;
  ownerRole?: string;
  deadline?: string;
  time?: string;
  relative?: string;
  result?: string;
  note?: string;
  item?: string;
  standard?: string;
  measured?: string;
  unit?: string;
  judge?: string;
  category?: string;
  categoryTone?: string;
  enable?: boolean;
  shift?: string;
  period?: string;
  workshop?: string;
  model?: string;
  area?: string;
  priority?: string;
  priorityTone?: string;
  sla?: string;
  slaTone?: 'ok' | 'warn' | 'bad';
  bindStatus?: string;
  subject?: string;
  location?: string;
  host?: string;
  attendees?: string;
  meeting?: string;
  meetingTime?: string;
  source?: string;
  issue?: string;
  found?: number;
  settingKey?: string;
  settingDesc?: string;
  settingOn?: boolean;
  settingSide?: string;
  group?: string;
  iconGlyph?: string;
  lines?: { label: string; value: string }[];
  dayLabel?: string;
  dayTone?: 'today' | 'tomorrow' | 'yesterday';
  timeRange?: string;
  accent?: 'blue' | 'green' | 'orange';
  chip?: string;
  chipTone?: 'info' | 'ok' | 'warn';
  timeLabel?: string;
  navOnly?: boolean;
  iconKey?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  'maint-plan': [
    { id: 'up1', title: '注塑机周检计划', sub: '周检 · 注塑机-主机' },
    { id: 'up2', title: '空压机月保计划', sub: '月检 · 空压机-01' },
    { id: 'up3', title: '冷却塔季保计划', sub: '季检 · 冷却塔-01' },
  ],
  'maint-task': [
    { id: 'ut1', title: 'WX-20240520-001', sub: '注塑机-主机 · 待执行' },
    { id: 'ut2', title: 'WX-20240520-002', sub: '空压机-01 · 执行中' },
    { id: 'ut3', title: 'WX-20240519-008', sub: '冷却塔-01 · 逾期' },
  ],
  'pi-plan': [
    { id: 'upp1', title: '压缩机日点检', sub: '早班 · 8小时' },
    { id: 'upp2', title: '注塑机班检', sub: '中班 · 12小时' },
  ],
  'device-archive': [
    { id: 'ud1', title: 'CNC车床', sub: 'SB202401001 · 机加车间一' },
    { id: 'ud2', title: '注塑机-01', sub: 'IS-001 · 注塑车间' },
    { id: 'ud3', title: '加工中心', sub: 'SB202401003 · 机加车间一' },
  ],
  'lean-patrol': [
    { id: 'upr1', title: '巡查点 A1-03', sub: '生产车间 · 合格' },
    { id: 'upr2', title: '巡查点 B2-01', sub: '公用动力区 · 发现项 2' },
  ],
  'lean-meeting': [
    { id: 'um1', title: '精益推进会', sub: '2024-05-20 10:00 · 二楼会议室' },
    { id: 'um2', title: '周生产例会', sub: '2024-05-19 09:00 · 一楼会议室' },
  ],
};

export const FIXTURES: Record<string, FixtureRow[]> = {
  'maint-plan': [
    row({
      id: 'mp1', code: 'JH-20240520-01', name: '注塑机周检计划', status: 'running', statusText: '执行中', statusTone: 'info',
      device: '注塑机-主机', deviceCode: 'SBJ-001', owner: '张维保', ownerRole: '维保工程师',
      period: '每周', shift: '周检', deadline: '2024-05-27', iconGlyph: '计',
    }),
    row({
      id: 'mp2', code: 'JH-20240501-02', name: '空压机月保计划', status: 'done', statusText: '已完成', statusTone: 'ok',
      device: '空压机-01', deviceCode: 'KY-001', owner: '李维修', ownerRole: '维保工程师',
      period: '每月', shift: '月检', deadline: '2024-06-01', iconGlyph: '计',
    }),
    row({
      id: 'mp3', code: 'JH-20240401-03', name: '冷却塔季保计划', status: 'pending', statusText: '待执行', statusTone: 'pending',
      device: '冷却塔-01', deviceCode: 'CT-001', owner: '王工', ownerRole: '设备主管',
      period: '每季', shift: '季检', deadline: '2024-07-01', iconGlyph: '计',
    }),
  ],
  'maint-task': [
    row({
      id: 'mt1', code: 'WX-20240520-001', name: '注塑机周检', status: 'pending', statusText: '待执行', statusTone: 'info',
      device: '注塑机-主机', deviceCode: 'SBJ-001', plan: '2024-05-20', planSub: '周检',
      owner: '张维保', ownerRole: '维保工程师', deadline: '2024-05-20 18:00',
    }),
    row({
      id: 'mt2', code: 'WX-20240520-002', name: '空压机日检', status: 'doing', statusText: '执行中', statusTone: 'ok',
      device: '空压机-01', deviceCode: 'KY-001', plan: '2024-05-20', planSub: '日检',
      owner: '李维修', ownerRole: '维保工程师', deadline: '2024-05-20 16:00',
    }),
    row({
      id: 'mt3', code: 'WX-20240519-008', name: '冷却塔周检', status: 'overdue', statusText: '逾期', statusTone: 'warn',
      device: '冷却塔-01', deviceCode: 'CT-001', plan: '2024-05-19', planSub: '周检',
      owner: '王工', ownerRole: '设备主管', deadline: '2024-05-19 18:00',
    }),
    row({
      id: 'mt4', code: 'WX-20240518-012', name: '配电柜月检', status: 'pending', statusText: '待执行', statusTone: 'info',
      device: '配电柜-02', deviceCode: 'PD-002', plan: '2024-05-18', planSub: '月检',
      owner: '张维保', ownerRole: '维保工程师', deadline: '2024-05-21 12:00',
    }),
  ],
  'maint-record': [
    row({
      id: 'mr1', code: 'WX-20240520-001', name: '注塑机液压系统', status: 'ok', statusText: '正常', statusTone: 'ok',
      device: '注塑机液压系统', deviceCode: 'SB-001', owner: '张维保', ownerRole: '维保工程师',
      time: '2024-05-20 14:30', relative: '2小时前', note: '运行正常，液压油滤芯正常',
    }),
    row({
      id: 'mr2', code: 'WX-20240520-002', name: '空压机润滑', status: 'ok', statusText: '正常', statusTone: 'info',
      device: '空压机-01', deviceCode: 'KY-001', owner: '李维修', ownerRole: '维保工程师',
      time: '2024-05-19 16:10', relative: '昨日', note: '润滑油位正常',
    }),
    row({
      id: 'mr3', code: 'WX-20240518-007', name: '温控传感器', status: 'pending', statusText: '待审', statusTone: 'pending',
      device: '注塑机温控', deviceCode: 'SB-003', owner: '王工', ownerRole: '维保工程师',
      time: '2024-05-18 09:20', relative: '2天前', note: '温控异常，已更换传感器',
    }),
    row({
      id: 'mr4', code: 'WX-20240517-004', name: '冷却塔风机', status: 'bad', statusText: '异常', statusTone: 'bad',
      device: '冷却塔-01', deviceCode: 'CT-001', owner: '陈明', ownerRole: '维保工程师',
      time: '2024-05-17 11:00', relative: '3天前', note: '风机异响，待更换轴承',
    }),
  ],
  'maint-break': [
    row({
      id: 'mb1', code: '1', name: '设备运行状态', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '设备运行状态', standard: '运行平稳，无异常异响和振动', measured: '运行平稳，无异常异响', unit: '--', judge: '合格', iconGlyph: '⚙',
    }),
    row({
      id: 'mb2', code: '2', name: '温度', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '温度', standard: '≤ 75 °C', measured: '68.3', unit: '°C', judge: '合格', iconGlyph: '温',
    }),
    row({
      id: 'mb3', code: '3', name: '振动值（轴承座）', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '振动值（轴承座）', standard: '≤ 4.5 mm/s', measured: '3.2', unit: 'mm/s', judge: '合格', iconGlyph: '振',
    }),
    row({
      id: 'mb4', code: '4', name: '压力', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '压力', standard: '0.40 ~ 0.60 MPa', measured: '0.52', unit: 'MPa', judge: '合格', iconGlyph: '压',
    }),
    row({
      id: 'mb5', code: '5', name: '电压', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '电压', standard: '380 ± 10% V', measured: '387', unit: 'V', judge: '合格', iconGlyph: '电',
    }),
    row({
      id: 'mb6', code: '6', name: '电流', status: 'ok', statusText: '合格', statusTone: 'ok',
      item: '电流', standard: '≤ 26.0 A', measured: '23.7', unit: 'A', judge: '合格', iconGlyph: '流',
    }),
  ],
  'maint-content': [
    row({
      id: 'mc1', code: 'NR-001', name: '离心泵运行检查', status: 'enabled', statusText: '启用',
      category: '设备巡检', enable: true, settingOn: true,
      note: '检查泵体运行状态、声音、温度及泄漏情况',
      standard: 'GB/T 3216-2016', planSub: '离心泵试验', iconKey: 'gear', group: '维保内容',
    }),
    row({
      id: 'mc2', code: 'NR-002', name: '电机绝缘检测', status: 'enabled', statusText: '启用',
      category: '电气检测', enable: true, settingOn: true,
      note: '测量电机绕组绝缘电阻，确认符合安全阈值',
      standard: 'GB/T 1032-2012', planSub: '三相异步电机', iconKey: 'bolt', group: '维保内容',
    }),
    row({
      id: 'mc3', code: 'NR-003', name: '润滑油位检查', status: 'enabled', statusText: '启用',
      category: '润滑维护', enable: false, settingOn: false,
      note: '确认油位在刻线范围内，油质无乳化变质',
      standard: '企标 Q/SD-LY-01', planSub: '润滑维护', iconKey: 'drop', group: '维保内容',
    }),
    row({
      id: 'mc4', code: 'NR-004', name: '安全阀校验', status: 'enabled', statusText: '启用',
      category: '安全校验', enable: true, settingOn: true,
      iconKey: 'shield', group: '维保内容',
    }),
    row({
      id: 'mc5', code: 'NR-005', name: '点检标准同步', status: 'off', statusText: '停用',
      category: '标准库', enable: false, settingOn: false,
      iconKey: 'clip', group: '维保内容',
    }),
  ],
  'pi-plan': [
    row({
      id: 'pp1', code: 'DJ-001', name: '压缩机日点检', status: 'doing', statusText: '执行中', statusTone: 'info',
      device: '压缩机站 / #1 压缩机', shift: '早班', period: '8小时',
      owner: '张伟', ownerRole: '设备主管',
    }),
    row({
      id: 'pp2', code: 'DJ-002', name: '注塑机班检', status: 'done', statusText: '已完成', statusTone: 'ok',
      device: '注塑车间 / 注塑机-01', shift: '中班', period: '12小时',
      owner: '李娜', ownerRole: '班组长',
    }),
    row({
      id: 'pp3', code: 'DJ-003', name: '冷却塔日检', status: 'doing', statusText: '执行中', statusTone: 'info',
      device: '公用动力 / 冷却塔-01', shift: '早班', period: '1天',
      owner: '王强', ownerRole: '设备员',
    }),
  ],
  'pi-record': [
    row({
      id: 'pr1', code: 'IS-001', name: '注塑机-01', status: 'ok', statusText: '正常', statusTone: 'ok',
      area: '注塑车间一区', deviceCode: 'IS-001', time: '2024-05-20 08:30', iconGlyph: '注',
    }),
    row({
      id: 'pr2', code: 'RH-002', name: '机械手-02', status: 'ok', statusText: '正常', statusTone: 'ok',
      area: '注塑车间一区', deviceCode: 'RH-002', time: '2024-05-20 08:45', iconGlyph: '机',
    }),
    row({
      id: 'pr3', code: 'CL-003', name: '输送线-03', status: 'bad', statusText: '异常', statusTone: 'bad',
      area: '注塑车间二区', deviceCode: 'CL-003', time: '2024-05-20 09:10', iconGlyph: '输',
    }),
    row({
      id: 'pr4', code: 'MD-004', name: '模具-04', status: 'ok', statusText: '正常', statusTone: 'ok',
      area: '注塑车间二区', deviceCode: 'MD-004', time: '2024-05-20 09:25', iconGlyph: '模',
    }),
    row({
      id: 'pr5', code: 'CT-001', name: '冷却塔-01', status: 'pending', statusText: '待审', statusTone: 'pending',
      area: '公用动力区', deviceCode: 'CT-001', time: '2024-05-20 10:00', iconGlyph: '冷',
    }),
    row({
      id: 'pr6', code: 'PD-002', name: '配电柜-02', status: 'ok', statusText: '正常', statusTone: 'ok',
      area: '公用动力区', deviceCode: 'PD-002', time: '2024-05-20 10:15', iconGlyph: '配',
    }),
    row({
      id: 'pr7', code: 'PE-002', name: '空气压缩机-01', status: 'bad', statusText: '异常', statusTone: 'bad',
      area: '公用动力区', deviceCode: 'PE-002', time: '2024-05-20 10:30', iconGlyph: '空',
    }),
  ],
  'repair-order': [
    row({
      id: 'ro1', code: 'WO20250521008', name: '数控车床', status: 'doing', statusText: '维修中', statusTone: 'info',
      device: 'CNC-032 数控车床', workshop: '机加工段一', priority: '高', priorityTone: 'info',
      owner: '李维修', time: '2025-05-21 08:30', sla: '已超时 2.5h', slaTone: 'bad',
    }),
    row({
      id: 'ro2', code: 'WO20250521005', name: '注塑机液压', status: 'wait', statusText: '待修', statusTone: 'warn',
      device: 'IS-001 注塑机', workshop: '注塑工段', priority: '中', priorityTone: 'warn',
      owner: '张维保', time: '2025-05-21 09:00', sla: '预计等待 1.5h', slaTone: 'warn',
    }),
    row({
      id: 'ro3', code: 'WO20250520012', name: '冷却塔风机', status: 'done', statusText: '已完成', statusTone: 'ok',
      device: 'CT-001 冷却塔', workshop: '公用动力', priority: '低', priorityTone: 'ok',
      owner: '王工', time: '2025-05-20 14:20', sla: '用时 2.3h', slaTone: 'ok',
    }),
  ],
  'device-archive': [
    row({
      id: 'da1', code: 'SB202401001', name: 'CNC车床', status: 'running', statusText: '运行中', statusTone: 'ok',
      model: 'CK6140H', workshop: '机加车间一', owner: '张伟',
    }),
    row({
      id: 'da2', code: 'SB202401002', name: '加工中心', status: 'running', statusText: '运行中', statusTone: 'ok',
      model: 'VMC850E', workshop: '机加车间一', owner: '李娜',
    }),
    row({
      id: 'da3', code: 'SB202401003', name: '数控铣床', status: 'idle', statusText: '空闲', statusTone: 'info',
      model: 'XK7132', workshop: '机加车间二', owner: '王强',
    }),
    row({
      id: 'da4', code: 'SB202401004', name: '注塑机', status: 'running', statusText: '运行中', statusTone: 'ok',
      model: 'HTF160X', workshop: '注塑车间', owner: '陈明',
    }),
    row({
      id: 'da5', code: 'SB202401005', name: '空压机', status: 'maintain', statusText: '维护中', statusTone: 'warn',
      model: 'GA37VSD', workshop: '公用动力', owner: '刘洋',
    }),
    row({
      id: 'da6', code: 'SB202401006', name: '折弯机', status: 'idle', statusText: '空闲', statusTone: 'info',
      model: 'WC67Y-100', workshop: '钣金车间', owner: '孙洁',
    }),
    row({
      id: 'da7', code: 'SB202401007', name: '激光切割机', status: 'running', statusText: '运行中', statusTone: 'ok',
      model: 'LF3015GA', workshop: '钣金车间', owner: '赵磊',
    }),
    row({
      id: 'da8', code: 'SB202401008', name: '焊接机器人', status: 'offline', statusText: '离线', statusTone: 'mute',
      model: 'ARC-2000', workshop: '焊接车间', owner: '周凯',
    }),
  ],
  'device-qr': [
    row({
      id: 'dq1', code: 'IS-001-2024', name: '注塑机 #01', status: 'bound', statusText: '已绑定', statusTone: 'ok',
      deviceCode: 'IS-001-2024',
    }),
    row({
      id: 'dq2', code: 'CNC-002-2024', name: 'CNC加工中心 #02', status: 'bound', statusText: '已绑定', statusTone: 'ok',
      deviceCode: 'CNC-002-2024',
    }),
    row({
      id: 'dq3', code: 'ASM-003-2024', name: '装配线设备 #03', status: 'unbound', statusText: '未绑定', statusTone: 'mute',
      deviceCode: 'ASM-003-2024',
    }),
    row({
      id: 'dq4', code: 'QC-004-2024', name: '检测设备 #04', status: 'bound', statusText: '已绑定', statusTone: 'ok',
      deviceCode: 'QC-004-2024',
    }),
    row({
      id: 'dq5', code: 'PKG-005-2024', name: '包装机 #05', status: 'printed', statusText: '已打印', statusTone: 'info',
      deviceCode: 'PKG-005-2024',
    }),
    row({
      id: 'dq6', code: 'CV-006-2024', name: '物料输送线 #06', status: 'unbound', statusText: '未绑定', statusTone: 'mute',
      deviceCode: 'CV-006-2024',
    }),
    row({
      id: 'dq7', code: 'LM-007-2024', name: '激光打标机 #07', status: 'bound', statusText: '已绑定', statusTone: 'ok',
      deviceCode: 'LM-007-2024',
    }),
  ],
  'equip-base': [
    row({
      id: 'es1', code: 'cycle', name: '计划周期', status: 'on', statusText: '开',
      settingKey: 'cycle', settingOn: true, group: '维保规则', iconKey: 'calendar',
    }),
    row({
      id: 'es2', code: 'remind', name: '提醒规则', status: 'on', statusText: '开',
      settingKey: 'remind', settingOn: true, group: '维保规则', iconKey: 'bell',
    }),
    row({
      id: 'es3', code: 'approve', name: '审批开关', status: 'on', statusText: '开',
      settingKey: 'approve', settingOn: true, group: '维保规则', iconKey: 'check',
    }),
    row({
      id: 'es4', code: 'scan', name: '扫码维保', status: 'on', statusText: '开',
      settingKey: 'scan', settingOn: true, group: '维保规则', iconKey: 'qr',
    }),
    row({
      id: 'es5', code: 'overdue', name: '逾期升级', status: 'off', statusText: '关',
      settingKey: 'overdue', settingOn: false, group: '维保规则', iconKey: 'alert',
    }),
  ],
  'lean-station': [
    row({
      id: 'ls1', code: 'WO-20250512001', name: '产线 A-01', status: 'doing', statusText: '进行中', statusTone: 'ok',
      result: '96%', workshop: 'A-01',
    }),
    row({
      id: 'ls2', code: 'WO-20250512002', name: '产线 B-02', status: 'done', statusText: '已完成', statusTone: 'info',
      result: '100%', workshop: 'B-02',
    }),
    row({
      id: 'ls3', code: 'WO-20250512003', name: '产线 C-01', status: 'bad', statusText: '异常', statusTone: 'warn',
      result: '62%', workshop: 'C-01',
    }),
  ],
  'lean-rectify': [
    row({
      id: 'lr1', code: 'RX-201', name: '反应釜搅拌电机过热', status: 'wait', statusText: '待整改', statusTone: 'bad',
      issue: '反应釜搅拌电机过热', device: '反应釜搅拌电机', deviceCode: 'RX-201',
      area: '车间 2F-A / 反应区', time: '2024-05-20 08:15', owner: '张伟', iconKey: 'factory',
    }),
    row({
      id: 'lr2', code: 'P-045', name: '管道法兰泄漏', status: 'doing', statusText: '整改中', statusTone: 'info',
      issue: '管道法兰泄漏', device: '管道法兰', deviceCode: 'P-045',
      area: '车间 1F-B / 管廊区', time: '2024-05-19 14:32', owner: '李娜', iconKey: 'factory',
    }),
    row({
      id: 'lr3', code: 'SV-112', name: '安全阀校验超期', status: 'wait', statusText: '待整改', statusTone: 'bad',
      issue: '安全阀校验超期', device: '安全阀', deviceCode: 'SV-112',
      area: '车间 3F-C / 公用工程区', time: '2024-05-18 09:47', owner: '王强', iconKey: 'factory',
    }),
    row({
      id: 'lr4', code: 'DG-308', name: '配电柜接地故障', status: 'doing', statusText: '整改中', statusTone: 'info',
      issue: '配电柜接地故障', device: '配电柜', deviceCode: 'DG-308',
      area: '车间 2F-A / 配电间', time: '2024-05-17 16:20', owner: '陈明', iconKey: 'factory',
    }),
    row({
      id: 'lr5', code: 'PG-067', name: '压力表损坏', status: 'wait', statusText: '待整改', statusTone: 'bad',
      issue: '压力表损坏', device: '压力表', deviceCode: 'PG-067',
      area: '车间 1F-B / 原料区', time: '2024-05-16 11:03', owner: '刘洋', iconKey: 'factory',
    }),
    row({
      id: 'lr6', code: 'PL-021', name: '梯子护栏缺失', status: 'closed', statusText: '已关闭', statusTone: 'mute',
      issue: '梯子护栏缺失', device: '操作平台护栏', deviceCode: 'PL-021',
      area: '车间 3F-C / 操作平台', time: '2024-05-15 10:45', owner: '孙洁', iconKey: 'factory',
    }),
  ],
  'lean-meeting': [
    row({
      id: 'lm1', code: 'MT-001', name: '精益生产改善评审会', status: 'wait', statusText: '待开', statusTone: 'info',
      subject: '精益生产改善评审会', timeRange: '09:30 - 10:30', dayLabel: '今天', dayTone: 'today',
      location: '会议室 1', host: '张伟', attendees: '8人参与', accent: 'blue', iconKey: 'factory',
    }),
    row({
      id: 'lm2', code: 'MT-002', name: '价值流分析优化会议', status: 'doing', statusText: '进行中', statusTone: 'ok',
      subject: '价值流分析优化会议', timeRange: '10:00 - 11:30', dayLabel: '今天', dayTone: 'today',
      location: '会议室 2', host: '李娜', attendees: '6人参与', accent: 'green', iconKey: 'gear',
    }),
    row({
      id: 'lm3', code: 'MT-003', name: '设备OEE提升行动会', status: 'wait', statusText: '待开', statusTone: 'info',
      subject: '设备OEE提升行动会', timeRange: '14:00 - 15:30', dayLabel: '今天', dayTone: 'today',
      location: '会议室 3', host: '王刚', attendees: '10人参与', accent: 'blue', iconKey: 'chart',
    }),
    row({
      id: 'lm4', code: 'MT-004', name: '5S改善成果评审会', status: 'wait', statusText: '待开', statusTone: 'warn',
      subject: '5S改善成果评审会', timeRange: '09:00 - 10:00', dayLabel: '明天', dayTone: 'tomorrow',
      location: '会议室 1', host: '陈静', attendees: '7人参与', accent: 'orange', iconKey: 'box',
    }),
    row({
      id: 'lm5', code: 'MT-005', name: '安全精益改善复盘会', status: 'done', statusText: '已结束', statusTone: 'mute',
      subject: '安全精益改善复盘会', timeRange: '15:00 - 16:00', dayLabel: '昨天', dayTone: 'yesterday',
      location: '会议室 4', host: '刘洋', attendees: '9人参与', accent: 'blue', iconKey: 'check',
    }),
  ],
  'lean-todo': [
    row({
      id: 'lt1', code: 'TD-001', name: '生产计划调整评审会议', status: 'doing', statusText: '进行中', statusTone: 'info',
      time: '2024-05-20 10:00 - 11:00', location: '会议室 A3-2F-01',
      owner: '李经理', priority: '高', priorityTone: 'bad', accent: 'blue',
    }),
    row({
      id: 'lt2', code: 'TD-002', name: '设备保养方案讨论会议', status: 'wait', statusText: '待办', statusTone: 'warn',
      time: '2024-05-21 14:30 - 15:30', location: '会议室 A3-2F-02',
      owner: '张工', priority: '中', priorityTone: 'warn', accent: 'orange',
    }),
    row({
      id: 'lt3', code: 'TD-003', name: '质量问题根因分析会议', status: 'wait', statusText: '待办', statusTone: 'ok',
      time: '2024-05-22 09:00 - 10:30', location: '会议室 A3-1F-会议室',
      owner: '王主管', priority: '高', priorityTone: 'bad', accent: 'green',
    }),
    row({
      id: 'lt4', code: 'TD-004', name: '安全生产月启动会议', status: 'done', statusText: '已完成', statusTone: 'mute',
      time: '2024-05-15 15:00 - 16:00', location: '会议室 A3-多功能厅',
      owner: '安全部', priority: '低', priorityTone: 'ok', accent: 'blue',
    }),
  ],
  'lean-patrol': [
    row({
      id: 'lp1', code: 'PT-01', name: '生产车间巡查', status: 'wait', statusText: '待巡', statusTone: 'info',
      area: '生产车间一区 · 注塑生产线', owner: '张工', timeLabel: '计划时间', time: '09:00 - 10:30',
      chip: '今日待巡', chipTone: 'info', accent: 'blue',
    }),
    row({
      id: 'lp2', code: 'PT-02', name: '公用工程巡查', status: 'wait', statusText: '待巡', statusTone: 'info',
      area: '动力站房 · 空压机房', owner: '李工', timeLabel: '计划时间', time: '10:00 - 11:30',
      chip: '今日待巡', chipTone: 'info', accent: 'blue',
    }),
    row({
      id: 'lp3', code: 'PT-03', name: '安全设施巡查', status: 'done', statusText: '已巡', statusTone: 'ok',
      area: '全厂区域 · 消防通道及灭火器', owner: '王工', timeLabel: '完成时间', time: '08:45',
      chip: '今日已巡', chipTone: 'ok', accent: 'green',
    }),
    row({
      id: 'lp4', code: 'PT-04', name: '设备区域巡查', status: 'bad', statusText: '异常', statusTone: 'warn',
      area: '机加工车间 · CNC设备区', owner: '陈工', timeLabel: '完成时间', time: '09:30',
      chip: '异常待处理', chipTone: 'warn', accent: 'orange', found: 2, result: '异常',
    }),
    row({
      id: 'lp5', code: 'PT-05', name: '仓储物流巡查', status: 'wait', statusText: '待巡', statusTone: 'info',
      area: '成品仓库 · 货架及通道区域', owner: '刘工', timeLabel: '计划时间', time: '11:00 - 12:00',
      chip: '今日待巡', chipTone: 'info', accent: 'blue',
    }),
    row({
      id: 'lp6', code: 'PT-06', name: '环保设施巡查', status: 'done', statusText: '已巡', statusTone: 'ok',
      area: '污水处理站 · 环保设备间', owner: '孙工', timeLabel: '完成时间', time: '08:20',
      chip: '今日已巡', chipTone: 'ok', accent: 'green',
    }),
  ],
  'lean-setting': [
    row({
      id: 'lset1', code: 'plan', name: '生产计划管理', status: 'on', statusText: '开',
      settingKey: 'plan', settingOn: true, group: '生产设置', iconKey: 'factory',
    }),
    row({
      id: 'lset2', code: 'route', name: '工艺路线设置', status: 'on', statusText: '开',
      settingKey: 'route', settingOn: true, group: '生产设置', iconKey: 'gear',
    }),
    row({
      id: 'lset3', code: 'bom', name: '物料清单管理', status: 'off', statusText: '关',
      settingKey: 'bom', settingOn: false, group: '生产设置', iconKey: 'box',
    }),
    row({
      id: 'lset4', code: 'schedule', name: '生产排程优化', status: 'on', statusText: '开',
      settingKey: 'schedule', settingOn: true, group: '生产设置', iconKey: 'chart',
    }),
    row({
      id: 'lset5', code: 'quality', name: '质量标准设置', status: 'on', statusText: '开',
      settingKey: 'quality', settingOn: true, group: '生产设置', iconKey: 'clip',
    }),
    row({
      id: 'lset6', code: 'acl', name: '人员权限配置', status: 'nav', statusText: '',
      settingKey: 'acl', navOnly: true, group: '人员权限配置', iconKey: 'people',
    }),
  ],
};

/** 精益工作站关键指标（空库展示） */
export const STATION_KPI = {
  rate: '92%',
  rateDelta: '6.5% 同比昨日',
  abnormal: '3',
  abnormalDelta: '较昨日 ↓ 1',
  todo: '5',
  todoDelta: '较昨日 ↓ 2',
  refreshedAt: '2024-05-20 08:30',
  refreshHint: '数据刷新：每 5 分钟',
  trend: [
    { day: '05-14', rate: 85, qty: 1250 },
    { day: '05-15', rate: 88, qty: 1320 },
    { day: '05-16', rate: 90, qty: 1480 },
    { day: '05-17', rate: 87, qty: 1400 },
    { day: '05-18', rate: 91, qty: 1550 },
    { day: '05-19', rate: 89, qty: 1620 },
    { day: '05-20', rate: 92, qty: 1680 },
  ],
};
