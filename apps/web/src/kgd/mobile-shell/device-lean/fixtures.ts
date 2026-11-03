/** 空库夹具：只服务 C6 手机皮验收，不写业务库 */

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
      id: 'mr3', code: 'WX-20240518-007', name: '温控传感器', status: 'fair', statusText: '一般', statusTone: 'warn',
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
      category: '设备巡检', enable: true,
      note: '检查泵体运行状态、声音、温度及泄漏情况',
      standard: 'GB/T 3216-2016', planSub: '离心泵试验', iconGlyph: '泵',
    }),
    row({
      id: 'mc2', code: 'NR-002', name: '电机绝缘检测', status: 'enabled', statusText: '启用',
      category: '电气检测', enable: true,
      note: '测量电机绕组绝缘电阻，确认符合安全阈值',
      standard: 'GB/T 1032-2012', planSub: '三相异步电机', iconGlyph: '电',
    }),
    row({
      id: 'mc3', code: 'NR-003', name: '润滑油位检查', status: 'enabled', statusText: '启用',
      category: '润滑维护', enable: true,
      note: '确认油位在刻线范围内，油质无乳化变质',
      standard: '企标 Q/SD-LY-01', planSub: '润滑维护', iconGlyph: '油',
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
      settingKey: 'cycle', settingDesc: '设置维保计划的周期规则，如每日、每周、每月或自定义周期。',
      settingOn: true, group: '维保规则', iconGlyph: '周',
    }),
    row({
      id: 'es2', code: 'remind', name: '提醒规则', status: 'on', statusText: '开',
      settingKey: 'remind', settingDesc: '配置提醒触发方式、提前提醒时间及通知对象，确保维保任务及时执行。',
      settingOn: true, group: '维保规则', iconGlyph: '铃',
    }),
    row({
      id: 'es3', code: 'approve', name: '审批开关', status: 'on', statusText: '开',
      settingKey: 'approve', settingDesc: '开启或关闭维保任务的审批流程，控制关键操作的权限与合规性。',
      settingOn: true, group: '维保规则', iconGlyph: '审',
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
      id: 'lr1', code: 'REC-20240520-001', name: '整改任务', status: 'pending', statusText: '待整改', statusTone: 'info',
      issue: '设备防护罩缺失', owner: '张伟', deadline: '2024-05-23', source: '巡检发现',
    }),
    row({
      id: 'lr2', code: 'REC-20240520-002', name: '整改任务', status: 'pending', statusText: '待整改', statusTone: 'info',
      issue: '安全通道被堵塞', owner: '李娜', deadline: '2024-05-22', source: '安全巡查',
    }),
    row({
      id: 'lr3', code: 'REC-20240520-003', name: '整改任务', status: 'pending', statusText: '待整改', statusTone: 'info',
      issue: '消火栓压力偏低', owner: '王强', deadline: '2024-05-24', source: '巡检发现',
    }),
    row({
      id: 'lr4', code: 'REC-20240518-007', name: '整改任务', status: 'overdue', statusText: '已逾期', statusTone: 'mute',
      issue: '电气线路老化', owner: '陈明', deadline: '2024-05-19', source: '隐患上报',
    }),
    row({
      id: 'lr5', code: 'REC-20240520-004', name: '整改任务', status: 'pending', statusText: '待整改', statusTone: 'info',
      issue: '警示标识不全', owner: '刘洋', deadline: '2024-05-25', source: '安全巡查',
    }),
    row({
      id: 'lr6', code: 'REC-20240520-005', name: '整改任务', status: 'pending', statusText: '待整改', statusTone: 'info',
      issue: '地面破损待修补', owner: '孙洁', deadline: '2024-05-26', source: '巡检发现',
    }),
  ],
  'lean-meeting': [
    row({
      id: 'lm1', code: 'MT-001', name: '精益推进会', status: 'pending', statusText: '待开', statusTone: 'pending',
      subject: '精益推进会', time: '2024-05-20 10:00', location: '二楼会议室', host: '李明', attendees: '8人',
    }),
    row({
      id: 'lm2', code: 'MT-002', name: '周生产例会', status: 'done', statusText: '已开', statusTone: 'ok',
      subject: '周生产例会', time: '2024-05-19 09:00', location: '一楼会议室', host: '张伟', attendees: '12人',
    }),
    row({
      id: 'lm3', code: 'MT-003', name: '质量专题会', status: 'pending', statusText: '待开', statusTone: 'pending',
      subject: '质量专题会', time: '2024-05-21 14:00', location: '三楼会议室', host: '王强', attendees: '6人',
    }),
  ],
  'lean-todo': [
    row({
      id: 'lt1', code: 'TD-001', name: '生产计划调整', status: 'doing', statusText: '进行中', statusTone: 'info',
      note: '优化周计划排产，对齐订单交期',
      meeting: '周生产例会', meetingTime: '2024-05-20 10:00',
      owner: '张伟', ownerRole: '生产部', deadline: '2024-05-24', priority: '高', priorityTone: 'bad',
    }),
    row({
      id: 'lt2', code: 'TD-002', name: '现场5S整改跟进', status: 'pending', statusText: '待处理', statusTone: 'pending',
      note: '注塑车间通道堆料清理',
      meeting: '精益推进会', meetingTime: '2024-05-20 10:00',
      owner: '李娜', ownerRole: '精益办', deadline: '2024-05-22', priority: '中', priorityTone: 'ok',
    }),
    row({
      id: 'lt3', code: 'TD-003', name: '设备点检标准修订', status: 'pending', statusText: '待处理', statusTone: 'pending',
      note: '补充空压机振动阈值',
      meeting: '质量专题会', meetingTime: '2024-05-21 14:00',
      owner: '王强', ownerRole: '设备部', deadline: '2024-05-28', priority: '低', priorityTone: 'warn',
    }),
  ],
  'lean-patrol': [
    row({
      id: 'lp1', code: 'A1-03', name: '巡查点 A1-03', status: 'ok', statusText: '合格', statusTone: 'ok',
      area: '生产车间', found: 0, result: '合格', owner: '张工', time: '10:24',
    }),
    row({
      id: 'lp2', code: 'A1-05', name: '巡查点 A1-05', status: 'ok', statusText: '合格', statusTone: 'ok',
      area: '生产车间', found: 0, result: '合格', owner: '李工', time: '10:40',
    }),
    row({
      id: 'lp3', code: 'B2-01', name: '巡查点 B2-01', status: 'bad', statusText: '不合格', statusTone: 'bad',
      area: '公用动力区', found: 2, result: '不合格', owner: '王工', time: '11:05',
    }),
  ],
  'lean-setting': [
    row({
      id: 'lset1', code: 'deadline', name: '整改时限', status: 'on', statusText: '开',
      settingKey: 'deadline', settingDesc: '超期未整改将自动提醒', settingOn: true, settingSide: '3天',
      group: '基础设置', iconGlyph: '时',
    }),
    row({
      id: 'lset2', code: 'patrol-remind', name: '巡查提醒', status: 'on', statusText: '开',
      settingKey: 'patrol-remind', settingDesc: '开启后将定期推送巡查提醒', settingOn: true,
      group: '基础设置', iconGlyph: '铃',
    }),
    row({
      id: 'lset3', code: 'minutes', name: '会议纪要必填', status: 'on', statusText: '开',
      settingKey: 'minutes', settingDesc: '开启后会议纪要为必填项', settingOn: true,
      group: '基础设置', iconGlyph: '纪',
    }),
    row({
      id: 'lset4', code: 'plus-loop', name: 'PLUS 闭环可选', status: 'on', statusText: '开',
      settingKey: 'plus-loop', settingDesc: '开启后可按需启用高级闭环管理功能', settingOn: true,
      group: '可选功能', iconGlyph: '＋',
    }),
  ],
};

/** 精益工作站 KPI 夹具 */
export const STATION_KPI = {
  rate: '92%',
  rateDelta: '较昨日 ↑ 3.2%',
  oee: '87%',
  oeeDelta: '较昨日 ↑ 2.7%',
  bars: [
    { day: '周一', value: 68 },
    { day: '周二', value: 74 },
    { day: '周三', value: 82 },
    { day: '周四', value: 91 },
    { day: '周五', value: 76 },
    { day: '周六', value: 45 },
    { day: '周日', value: 32 },
  ],
  planHours: '512',
  doneHours: '432',
  wip: '18',
  wipDelta: '较昨日 ↑ 2 个',
};
