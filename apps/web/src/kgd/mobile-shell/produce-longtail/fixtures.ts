/** 空库夹具数据：仅兜底版型，不上屏说明文案 */

export type DetailLine = {
  short: string;
  name: string;
  qty?: number;
  meta?: string;
};

export type FixtureRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  statusText: string;
  category?: string;
  product?: string;
  productCode?: string;
  productSpec?: string;
  processName?: string;
  processCode?: string;
  workOrder?: string;
  supplier?: string;
  partner?: string;
  planCode?: string;
  planName?: string;
  date?: string;
  dueDate?: string;
  note?: string;
  owner?: string;
  creator?: string;
  qty?: number;
  goodQty?: number;
  defectQty?: number;
  passQty?: number;
  failQty?: number;
  acceptQty?: number;
  planQty?: number;
  amount?: number;
  unitPrice?: number;
  progressText?: string;
  method?: string;
  expenseType?: string;
  itemCount?: number;
  lines?: DetailLine[];
  lineCount?: number;
  expandBody?: string[];
  settleStatus?: string;
  priority?: string;
  machine?: string;
  reworkQty?: number;
  scrapQty?: number;
  contractCode?: string;
  workOrderCount?: number;
  completedWorkOrderCount?: number;
  processDemand?: number;
  outsourceDemand?: number;
  purchaseDemand?: number;
  iconGlyph?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  contract: [
    { id: 'uc1', title: 'HT-2026-0118', sub: '液压泵站总成 · ¥128,000' },
    { id: 'uc2', title: 'HT-2026-0102', sub: '伺服驱动单元 · ¥56,400' },
  ],
  plan: [
    { id: 'up1', title: 'JH-2026-031', sub: '液压泵站月计划 · 未分析' },
    { id: 'up2', title: 'JH-2026-028', sub: '轴承组件周计划 · 已分析' },
  ],
  work_order: [
    { id: 'uw1', title: 'JG-20261103001', sub: '液压电磁换向阀 · 生产中' },
    { id: 'uw2', title: 'JG-20261102008', sub: '交流伺服电机 · 未开始' },
    { id: 'uw3', title: 'JG-20261031015', sub: '深沟球轴承 · 已完成' },
  ],
  os_order: [
    { id: 'uo1', title: 'WX-20261101001', sub: '精车外协 · 生产中' },
    { id: 'uo2', title: 'WX-20261028006', sub: '热处理外协 · 已完成' },
  ],
  os_receipt: [
    { id: 'ur1', title: 'YS-20261102001', sub: 'WX-20261101001 · 未结算' },
    { id: 'ur2', title: 'YS-20261029003', sub: 'WX-20261028006 · 已结算' },
  ],
  spot_check: [
    { id: 'us1', title: 'CJ-20261103001', sub: '精车 · 待质检' },
    { id: 'us2', title: 'CJ-20261102004', sub: '检验 · 已质检' },
  ],
};

export const FIXTURES: Record<string, FixtureRow[]> = {
  project: [
    row({
      id: 'pj1', code: 'XM-2026-018', name: '液压泵站合同项目', status: 'running', statusText: '进行中',
      category: '合同项目', contractCode: 'HT-2026-0118', workOrderCount: 6, completedWorkOrderCount: 2,
      planQty: 120, progressText: '生产 45% · 入库 20%', date: '2026-10-28',
      lines: [
        { short: '工', name: 'JG-20261103001 液压电磁换向阀', qty: 40, meta: '生产中' },
        { short: '工', name: 'JG-20261102008 伺服电机壳体', qty: 30, meta: '未开始' },
        { short: '工', name: 'JG-20261031015 轴承组件', qty: 50, meta: '已完成' },
      ],
      lineCount: 6, iconGlyph: '项',
    }),
    row({
      id: 'pj2', code: 'XM-2026-012', name: '轴承组件普通项目', status: 'pending', statusText: '未开始',
      category: '普通项目', workOrderCount: 2, completedWorkOrderCount: 0,
      planQty: 80, progressText: '生产 0% · 入库 0%', date: '2026-10-20',
      lines: [
        { short: '工', name: 'JG-20261020001 轴承内圈', qty: 40, meta: '未开始' },
        { short: '工', name: 'JG-20261020002 轴承外圈', qty: 40, meta: '未开始' },
      ],
      lineCount: 2, iconGlyph: '项',
    }),
    row({
      id: 'pj3', code: 'XM-2026-009', name: '阀体外协项目', status: 'done', statusText: '已完成',
      category: '外协项目', workOrderCount: 3, completedWorkOrderCount: 3,
      planQty: 60, progressText: '生产 100% · 入库 100%', date: '2026-09-18',
      lines: [
        { short: '外', name: 'WX-20260915001 阀体精车', qty: 60, meta: '已完成' },
      ],
      lineCount: 3, iconGlyph: '项',
    }),
  ],
  'material-analysis': [
    row({
      id: 'ma1', code: 'FX-2026-041', name: '液压泵站月计划分析', status: 'active', statusText: '有效',
      planCode: 'JH-2026-031', planName: '液压泵站月计划',
      processDemand: 120, outsourceDemand: 40, purchaseDemand: 86,
      owner: '张分析', date: '2026-11-01', note: '缺轴承 6205',
    }),
    row({
      id: 'ma2', code: 'FX-2026-038', name: '伺服驱动周计划分析', status: 'active', statusText: '有效',
      planCode: 'JH-2026-028', planName: '伺服驱动周计划',
      processDemand: 60, outsourceDemand: 0, purchaseDemand: 24,
      owner: '李分析', date: '2026-10-28',
    }),
    row({
      id: 'ma3', code: 'FX-2026-030', name: '旧版轴承分析', status: 'void', statusText: '已作废',
      planCode: 'JH-2026-020', planName: '轴承周计划',
      processDemand: 40, outsourceDemand: 10, purchaseDemand: 18,
      owner: '王分析', date: '2026-10-12',
    }),
  ],
  'qc-full': [
    row({
      id: 'qf1', code: 'QJ-20261103001', name: '液压电磁换向阀', status: 'done', statusText: '已质检',
      product: '液压电磁换向阀', productCode: 'SP-HV-01', productSpec: 'DN10',
      processName: '精车', processCode: 'GX-001', workOrder: 'JG-20261103001',
      goodQty: 38, defectQty: 2, reworkQty: 1, scrapQty: 1,
      machine: 'CNC-01', owner: '赵检', date: '2026-11-03',
    }),
    row({
      id: 'qf2', code: 'QJ-20261102008', name: '交流伺服电机壳体', status: 'pending', statusText: '待质检',
      product: '交流伺服电机壳体', productCode: 'SP-SV-08',
      processName: '粗车', processCode: 'GX-002', workOrder: 'JG-20261102008',
      goodQty: 0, defectQty: 0, qty: 30, machine: 'CNC-02', owner: '钱检', date: '2026-11-02',
    }),
    row({
      id: 'qf3', code: 'QJ-20261031015', name: '深沟球轴承', status: 'none', statusText: '不需质检',
      product: '深沟球轴承 6205', productCode: 'SP-BR-15',
      processName: '装配', processCode: 'GX-004', workOrder: 'JG-20261031015',
      goodQty: 50, defectQty: 0, date: '2026-10-31',
    }),
  ],
  'qc-spot': [
    row({
      id: 'qs1', code: 'CJ-20261103001', name: '精车抽检', status: 'pending', statusText: '待质检',
      product: '液压电磁换向阀', processName: '精车', processCode: 'GX-001',
      workOrder: 'JG-20261103001', qty: 10, goodQty: 0, defectQty: 0, creator: '孙检', date: '2026-11-03',
    }),
    row({
      id: 'qs2', code: 'CJ-20261102004', name: '检验抽检', status: 'done', statusText: '已质检',
      product: '伺服电机壳体', processName: '检验', processCode: 'GX-005',
      workOrder: 'JG-20261102008', qty: 8, goodQty: 7, defectQty: 1, creator: '周检', date: '2026-11-02',
    }),
    row({
      id: 'qs3', code: 'CJ-20261030002', name: '焊接抽检', status: 'done', statusText: '已质检',
      product: '阀体组件', processName: '焊接', processCode: 'GX-002',
      workOrder: 'JG-20261030002', qty: 12, goodQty: 12, defectQty: 0, creator: '吴检', date: '2026-10-30',
    }),
  ],
  'qc-spot-line': [
    row({
      id: 'ql1', code: 'CJ-20261103001', name: '尺寸抽检明细', status: 'pending', statusText: '待质检',
      processName: '精车', processCode: 'GX-001', workOrder: 'JG-20261103001',
      qty: 10, goodQty: 0, defectQty: 0, date: '2026-11-03',
      lines: [
        { short: '外', name: '外径', meta: '待检' },
        { short: '内', name: '内径', meta: '待检' },
        { short: '面', name: '表面粗糙度', meta: '待检' },
      ],
      lineCount: 3,
    }),
    row({
      id: 'ql2', code: 'CJ-20261102004', name: '硬度抽检明细', status: 'done', statusText: '已质检',
      processName: '检验', processCode: 'GX-005', workOrder: 'JG-20261102008',
      qty: 8, goodQty: 7, defectQty: 1, date: '2026-11-02',
      lines: [
        { short: '硬', name: '硬度 HRC', qty: 7, meta: '合格' },
        { short: '裂', name: '裂纹目视', qty: 1, meta: '不良' },
      ],
      lineCount: 2,
    }),
  ],
  'os-order': [
    row({
      id: 'oo1', code: 'WX-20261101001', name: '精车外协', status: 'running', statusText: '生产中',
      product: '液压电磁换向阀', productCode: 'SP-HV-01', productSpec: 'DN10',
      supplier: '宁海精工', partner: '王联系', planQty: 40, unitPrice: 18.5,
      dueDate: '2026-11-08', priority: '加急', progressText: '验收 12/40',
      lines: [
        { short: '料', name: '阀体毛坯', qty: 40 },
        { short: '工', name: '精车外协工序', qty: 40 },
      ],
      lineCount: 2, date: '2026-11-01',
    }),
    row({
      id: 'oo2', code: 'WX-20261028006', name: '热处理外协', status: 'done', statusText: '已完成',
      product: '轴承内圈', productCode: 'SP-BR-IN',
      supplier: '余姚热处', planQty: 100, unitPrice: 3.2,
      dueDate: '2026-11-02', priority: '正常', progressText: '验收 100/100',
      lines: [
        { short: '工', name: '淬火', qty: 100 },
        { short: '工', name: '回火', qty: 100 },
      ],
      lineCount: 2, date: '2026-10-28',
    }),
    row({
      id: 'oo3', code: 'WX-20261020003', name: '电镀外协', status: 'pending', statusText: '未开始',
      product: '阀芯', productCode: 'SP-HV-CORE',
      supplier: '慈溪电镀', planQty: 60, unitPrice: 2.8,
      dueDate: '2026-11-12', priority: '正常', progressText: '验收 0/60',
      lines: [{ short: '工', name: '镀锌', qty: 60 }],
      lineCount: 1, date: '2026-10-20',
    }),
  ],
  'os-receipt': [
    row({
      id: 'or1', code: 'YS-20261102001', name: '精车外协验收', status: 'unsettled', statusText: '未结算',
      product: '液压电磁换向阀', supplier: '宁海精工', workOrder: 'WX-20261101001',
      acceptQty: 12, passQty: 11, failQty: 1, owner: '郑验', date: '2026-11-02',
      category: '工单外协', settleStatus: '未结算',
    }),
    row({
      id: 'or2', code: 'YS-20261029003', name: '热处理验收', status: 'settled', statusText: '已结算',
      product: '轴承内圈', supplier: '余姚热处', workOrder: 'WX-20261028006',
      acceptQty: 100, passQty: 98, failQty: 2, owner: '冯验', date: '2026-10-29',
      category: '工单外协', settleStatus: '已结算',
    }),
  ],
  'os-settle': [
    row({
      id: 'os1', code: 'JS-20261102001', name: '精车外协结算', status: 'unsettled', statusText: '未结算',
      product: '液压电磁换向阀', supplier: '宁海精工', workOrder: 'WX-20261101001',
      acceptQty: 12, passQty: 11, failQty: 1, unitPrice: 18.5, amount: 203.5, date: '2026-11-02',
      category: '工单外协',
    }),
    row({
      id: 'os2', code: 'JS-20261029003', name: '热处理结算', status: 'settled', statusText: '已结算',
      product: '轴承内圈', supplier: '余姚热处', workOrder: 'WX-20261028006',
      acceptQty: 100, passQty: 98, failQty: 2, unitPrice: 3.2, amount: 313.6, date: '2026-10-29',
      category: '工单外协',
    }),
  ],
  'os-content': [
    row({
      id: 'oc1', code: 'NR-001', name: '精车外观与尺寸', status: 'enabled', statusText: '启用',
      itemCount: 5, creator: '管理员', date: '2026-10-12', note: '外径/内径/粗糙度/毛刺/外观',
    }),
    row({
      id: 'oc2', code: 'NR-002', name: '热处理硬度检查', status: 'enabled', statusText: '启用',
      itemCount: 3, creator: '管理员', date: '2026-10-08', note: '硬度/变形/裂纹',
    }),
    row({
      id: 'oc3', code: 'NR-003', name: '旧版电镀检查', status: 'disabled', statusText: '停用',
      itemCount: 2, creator: '管理员', date: '2026-09-01', note: '厚度/色泽',
    }),
  ],
  cost: [
    row({
      id: 'cs1', code: 'FT-20261101', name: '11月水电分摊', status: 'draft', statusText: '待审核',
      expenseType: '电费', method: '按报工工时', amount: 12800, date: '2026-11-01',
      creator: '财务A', note: '一车间电费',
      lines: [
        { short: '单', name: 'JG-20261103001', qty: 4200, meta: '工时 42h' },
        { short: '单', name: 'JG-20261102008', qty: 3600, meta: '工时 36h' },
        { short: '单', name: 'JG-20261031015', qty: 5000, meta: '工时 50h' },
      ],
      lineCount: 3,
    }),
    row({
      id: 'cs2', code: 'FT-20261015', name: '10月人工分摊', status: 'shared', statusText: '已审核',
      expenseType: '人工费用', method: '按实际生产数', amount: 24600, date: '2026-10-15',
      creator: '财务B',
      lines: [
        { short: '单', name: 'JG-20261020001', qty: 12000, meta: '产量 400' },
        { short: '单', name: 'JG-20261020002', qty: 12600, meta: '产量 420' },
      ],
      lineCount: 2,
    }),
  ],
  defect: [
    row({ id: 'df1', code: 'BL-001', name: '尺寸超差', status: 'enabled', statusText: '启用', date: '2026-09-01', creator: '质检' }),
    row({ id: 'df2', code: 'BL-002', name: '表面划伤', status: 'enabled', statusText: '启用', date: '2026-09-01', creator: '质检' }),
    row({ id: 'df3', code: 'BL-003', name: '裂纹', status: 'enabled', statusText: '启用', date: '2026-09-08', creator: '质检' }),
    row({ id: 'df4', code: 'BL-004', name: '毛刺', status: 'enabled', statusText: '启用', date: '2026-09-12', creator: '质检' }),
  ],
  trace: [
    row({
      id: 'tr1', code: 'SY-20261103001', name: '液压电磁换向阀', status: 'unused', statusText: '未使用',
      product: '液压电磁换向阀', productCode: 'SP-HV-01', workOrder: 'JG-20261103001',
      qty: 40, creator: '仓管', date: '2026-11-03',
      expandBody: ['生成批次 BT-1103', '关联工序 精车/检验', '打印状态 未打印'],
    }),
    row({
      id: 'tr2', code: 'SY-20261102008', name: '交流伺服电机壳体', status: 'used', statusText: '已使用',
      product: '交流伺服电机壳体', productCode: 'SP-SV-08', workOrder: 'JG-20261102008',
      qty: 30, creator: '仓管', date: '2026-11-02',
      expandBody: ['生成批次 BT-1102', '出库单 CK-20261102', '绑定箱码 BX-088'],
    }),
    row({
      id: 'tr3', code: 'SY-20261028001', name: '旧版轴承码', status: 'void', statusText: '作废',
      product: '深沟球轴承', productCode: 'SP-BR-15', workOrder: 'JG-20261028001',
      qty: 20, creator: '仓管', date: '2026-10-28',
      expandBody: ['作废原因 打错批次', '操作人 仓管'],
    }),
  ],
};
