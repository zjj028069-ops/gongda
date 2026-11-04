/** 空库列表兜底数据（不进 UI 文案） */

export type FixtureLine = {
  name: string;
  spec?: string;
  qty?: number;
  amount?: number;
  method?: string;
  standard?: string;
  actual?: string;
  verdict?: string;
  note?: string;
};

export type FixtureRow = {
  id: string;
  code: string;
  status: 'pending' | 'approved' | 'draft' | 'exempt' | 'pass' | 'fail' | 'processing' | 'rejected' | 'invoiced' | 'auth';
  statusText: string;
  date: string;
  partner?: string;
  product?: string;
  spec?: string;
  qty?: number;
  amount?: number;
  phone?: string;
  contact?: string;
  creditCode?: string;
  method?: string;
  bank?: string;
  taxRate?: string;
  batch?: string;
  sampleQty?: string;
  inspector?: string;
  category?: string;
  version?: string;
  subLabel?: string;
  lastPrice?: number;
  prevPrice?: number;
  changePct?: number;
  changeAmt?: number;
  unit?: string;
  settingKey?: string;
  settingDesc?: string;
  settingIcon?: string;
  lines?: FixtureLine[];
  lineCount?: number;
  note?: string;
  sku?: string;
  time?: string;
  supplierCode?: string;
  standard?: string;
  settingOn?: boolean;
  group?: string;
  iconKey?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  purchase_order: [
    { id: 'upo1', title: 'CG-20240518001', sub: '上海精密制造 · 采购单' },
    { id: 'upo2', title: 'CG-20240517008', sub: '苏州工业零部件 · 采购单' },
    { id: 'upo3', title: 'CG-20240516003', sub: '宁波拉链供应链 · 采购单' },
  ],
  purchase_plan: [
    { id: 'upl1', title: 'JH-20240518001 · 深沟球轴承', sub: '1,200 pcs · 计划商品' },
    { id: 'upl2', title: 'JH-20240518002 · 圆锥滚子轴承', sub: '800 pcs · 计划商品' },
  ],
  contract_goods: [
    { id: 'ucg1', title: 'HT-2024-088 · 伺服电机', sub: '合同商品' },
    { id: 'ucg2', title: 'HT-2024-091 · 减速机', sub: '合同商品' },
  ],
  purchase_goods: [
    { id: 'ug1', title: '尼龙拉链 5#', sub: '外购商品' },
    { id: 'ug2', title: '金属扣 M5', sub: '外购商品' },
    { id: 'ug3', title: '深沟球轴承 6205-2RS', sub: '外购商品' },
  ],
  demand: [
    { id: 'ud1', title: 'MRP-20240518-A', sub: '缺料需求 · 轴承类' },
    { id: 'ud2', title: 'MRP-20240517-B', sub: '缺料需求 · 紧固件' },
  ],
  audit_object: [
    { id: 'ua1', title: '采购计划', sub: '审核对象' },
    { id: 'ua2', title: '采购单', sub: '审核对象' },
    { id: 'ua3', title: '付款记录', sub: '审核对象' },
    { id: 'ua4', title: '发票', sub: '审核对象' },
  ],
};

export const FIXTURES: Record<string, FixtureRow[]> = {
  supplier: [
    row({
      id: 's1', code: 'GYS00001', status: 'exempt', statusText: '', date: '',
      partner: '新昌瑞联机械有限公司', contact: '张经理', phone: '138-0011-2233',
    }),
    row({
      id: 's2', code: 'GYS00002', status: 'exempt', statusText: '', date: '',
      partner: '上海赛德瑞克', contact: '王先生', phone: '139-1234-5678',
    }),
  ],
  'purchase-plan': [
    row({
      id: 'pp1', code: 'JH-20240518001', status: 'approved', statusText: '已确认', date: '2024-05-25',
      product: '深沟球轴承', sku: '6205-2RS', spec: 'd 25mm × D 52mm × B 15mm', qty: 1200,
    }),
    row({
      id: 'pp2', code: 'JH-20240518002', status: 'approved', statusText: '已确认', date: '2024-05-27',
      product: '圆锥滚子轴承', sku: '30207', spec: 'd 35mm × D 72mm × T 18.25mm', qty: 800,
    }),
    row({
      id: 'pp3', code: 'JH-20240518003', status: 'processing', statusText: '生产中', date: '2024-05-30',
      product: '调心滚子轴承', sku: '22310CA', spec: 'd 50mm × D 110mm × B 40mm', qty: 500,
    }),
    row({
      id: 'pp4', code: 'JH-20240518004', status: 'pending', statusText: '待确认', date: '2024-06-02',
      product: '滚针轴承', sku: 'NK30/20', spec: 'd 30mm × D 40mm × C 20mm', qty: 1500,
    }),
    row({
      id: 'pp5', code: 'JH-20240518005', status: 'approved', statusText: '已确认', date: '2024-06-05',
      product: '带座轴承', sku: 'UCP205', spec: 'd 25mm × L 140mm × H 36.5mm', qty: 600,
    }),
  ],
  'purchase-order': [
    row({
      id: 'po1', code: 'CG-20240520001', status: 'approved', statusText: '已审核', date: '2024-05-20',
      partner: '鸠哥', amount: 1286, lineCount: 1,
      lines: [{ name: '尼龙拉链', qty: 3, amount: 0 }],
    }),
    row({
      id: 'po2', code: 'CG-20240518008', status: 'pending', statusText: '待审核', date: '2024-05-18',
      partner: '上海精密制造有限公司', amount: 56800, lineCount: 2,
      lines: [
        { name: '深沟球轴承', spec: '6205-2RS', qty: 1200, amount: 36000 },
        { name: '圆锥滚子轴承', spec: '30207', qty: 800, amount: 20800 },
      ],
    }),
    row({
      id: 'po3', code: 'CG-20240516003', status: 'draft', statusText: '草稿', date: '2024-05-16',
      partner: '苏州工业零部件', amount: 9200, lineCount: 1,
      lines: [{ name: '金属扣', spec: 'M5', qty: 500, amount: 9200 }],
    }),
  ],
  'purchase-pay': [
    row({ id: 'pay1', code: 'FK-20240520', status: 'approved', statusText: '已付款', date: '2024-05-20', time: '10:30:45', partner: '上海工业有限公司', supplierCode: 'SUP-00021', amount: 25000, method: '银行转账' }),
    row({ id: 'pay2', code: 'FK-20240519', status: 'approved', statusText: '已付款', date: '2024-05-19', time: '14:22:18', partner: '南京机械制造有限公司', supplierCode: 'SUP-00115', amount: 18600, method: '银行转账' }),
    row({ id: 'pay3', code: 'FK-20240518', status: 'approved', statusText: '已付款', date: '2024-05-18', time: '09:15:33', partner: '杭州自动化设备有限公司', supplierCode: 'SUP-00073', amount: 7850, method: '电汇' }),
    row({ id: 'pay4', code: 'FK-20240517', status: 'approved', statusText: '已付款', date: '2024-05-17', time: '16:45:09', partner: '苏州精密零部件有限公司', supplierCode: 'SUP-00038', amount: 32400, method: '银行转账' }),
    row({ id: 'pay5', code: 'FK-20240516', status: 'processing', statusText: '处理中', date: '2024-05-16', time: '11:07:52', partner: '无锡标准件有限公司', supplierCode: 'SUP-00102', amount: 9120, method: '银行转账' }),
    row({ id: 'pay6', code: 'FK-20240515', status: 'approved', statusText: '已付款', date: '2024-05-15', time: '08:33:21', partner: '常州工业技术有限公司', supplierCode: 'SUP-00056', amount: 15000, method: '银行转账' }),
  ],
  'purchase-invoice': [
    row({
      id: 'inv1', code: '10023875', status: 'auth', statusText: '已认证', date: '2024-05-18',
      partner: '深圳市华源工业有限公司', amount: 58600, taxRate: '13%',
    }),
    row({
      id: 'inv2', code: '10023876', status: 'invoiced', statusText: '已开票', date: '2024-05-16',
      partner: '上海精密制造有限公司', amount: 128600, taxRate: '13%',
    }),
    row({
      id: 'inv3', code: '10023880', status: 'pending', statusText: '待开票', date: '2024-05-12',
      partner: '苏州工业零部件有限公司', amount: 45300, taxRate: '9%',
    }),
  ],
  'mt-list': [
    row({
      id: 'mt1', code: 'QJ20240518007', status: 'pass', statusText: '合格', date: '2024-05-18',
      product: '深沟球轴承 6205', sku: '工业轴承', batch: 'B240518-001', sampleQty: '100 件',
      inspector: '李质检', partner: '上海精密轴承有限公司', standard: 'Q/JT 001-2024',
    }),
    row({
      id: 'mt2', code: 'QJ20240517015', status: 'fail', statusText: '不合格', date: '2024-05-17',
      product: '尼龙拉链 5#', sku: '辅料', batch: 'B240517C', sampleQty: '50 件',
      inspector: '王检验', partner: '宁波拉链供应链', standard: 'Q/JT 008-2023',
    }),
    row({
      id: 'mt3', code: 'QJ20240516009', status: 'pass', statusText: '合格', date: '2024-05-16',
      product: '金属扣 M5', sku: '紧固件', batch: 'B240516A', sampleQty: '80 件',
      inspector: '张检验', partner: '苏州工业零部件', standard: 'Q/JT 003-2024',
    }),
  ],
  'mt-lines': [
    row({ id: 'ml1', code: '外观检验', status: 'pass', statusText: '合格', date: '', product: '外观检验', lines: [{ name: '外观检验', method: '目视检查', standard: '表面无锈蚀、划痕、油污', actual: '表面清洁，包装完好', verdict: '合格', note: '—' }] }),
    row({ id: 'ml2', code: '尺寸检验', status: 'pass', statusText: '合格', date: '', product: '尺寸检验', lines: [{ name: '尺寸检验', method: '卡尺测量', standard: '长度 100±0.5 mm', actual: '100.2 mm', verdict: '合格', note: '—' }] }),
    row({ id: 'ml3', code: '重量检验', status: 'pass', statusText: '合格', date: '', product: '重量检验', lines: [{ name: '重量检验', method: '电子秤称重', standard: '500±10 g', actual: '502 g', verdict: '合格', note: '—' }] }),
    row({ id: 'ml4', code: '材质检验', status: 'pass', statusText: '合格', date: '', product: '材质检验', lines: [{ name: '材质检验', method: '光谱分析', standard: '符合材质证明书', actual: 'C 0.14% / Mn 0.38%', verdict: '合格', note: '附材质证明书' }] }),
    row({ id: 'ml5', code: '证书检验', status: 'pass', statusText: '合格', date: '', product: '证书检验', lines: [{ name: '证书检验', method: '文件审核', standard: '材质证明书在有效期内', actual: 'CO-20240518', verdict: '合格', note: '有效' }] }),
    row({ id: 'ml6', code: '包装检验', status: 'pass', statusText: '合格', date: '', product: '包装检验', lines: [{ name: '包装检验', method: '目视检查', standard: '包装牢固、标识清晰', actual: '包装牢固，标识清晰', verdict: '合格', note: '—' }] }),
  ],
  'mt-spec': [
    row({ id: 'sp1', code: 'JYN-SIZE', status: 'exempt', statusText: '有效', date: '', product: '尺寸检验规范' }),
    row({ id: 'sp2', code: 'JYN-LOOK', status: 'exempt', statusText: '有效', date: '', product: '外观检验规范' }),
    row({ id: 'sp3', code: 'JYN-PERF', status: 'exempt', statusText: '有效', date: '', product: '性能检验规范' }),
    row({ id: 'sp4', code: 'JYN-PACK', status: 'draft', statusText: '已停用', date: '', product: '包装检验规范' }),
  ],
  'purchase-audit': [
    row({ id: 'au1', code: 'audit-on', status: 'exempt', statusText: '开', date: '', product: '启用审核流程', settingDesc: '是否启动整体审核机制', settingOn: true, group: '审核设置', iconKey: 'shield' }),
    row({ id: 'au2', code: 'audit-key', status: 'exempt', statusText: '开', date: '', product: '关键数据审核', settingDesc: '生产数据变更需审核确认', settingOn: true, group: '审核设置', iconKey: 'check' }),
    row({ id: 'au3', code: 'audit-level', status: 'exempt', statusText: '开', date: '', product: '分级审核', settingDesc: '根据角色与权限进行分级审核', settingOn: true, group: '审核设置', iconKey: 'user' }),
    row({ id: 'au4', code: 'audit-remind', status: 'draft', statusText: '关', date: '', product: '审核时效提醒', settingDesc: '超过时限自动提醒审核人', settingOn: false, group: '审核设置', iconKey: 'clock' }),
    row({ id: 'au5', code: 'audit-log', status: 'exempt', statusText: '开', date: '', product: '审核记录留存', settingDesc: '所有审核操作记录留存与追溯', settingOn: true, group: '审核设置', iconKey: 'chart' }),
    row({ id: 'au6', code: 'audit-strict', status: 'draft', statusText: '关', date: '', product: '严格模式', settingDesc: '未通过审核的数据禁止下发与执行', settingOn: false, group: '审核设置', iconKey: 'shield' }),
  ],
  'purchase-base': [
    row({ id: 'set1', code: 'approve', status: 'exempt', statusText: '开', date: '', product: '启用采购申请审批', settingDesc: '采购申请提交后需要经过审批', settingOn: true, group: '基本设置', iconKey: 'cart', settingKey: 'approve' }),
    row({ id: 'set2', code: 'contract', status: 'exempt', statusText: '开', date: '', product: '自动生成采购合同', settingDesc: '订单确认后自动创建合同模板', settingOn: true, group: '基本设置', iconKey: 'file', settingKey: 'contract' }),
    row({ id: 'set3', code: 'admit', status: 'exempt', statusText: '开', date: '', product: '供应商准入控制', settingDesc: '新供应商必须通过准入评估', settingOn: true, group: '基本设置', iconKey: 'shield', settingKey: 'admit' }),
    row({ id: 'set4', code: 'price-remind', status: 'draft', statusText: '关', date: '', product: '价格到期提醒', settingDesc: '采购价格到期前 7 天发送提醒', settingOn: false, group: '基本设置', iconKey: 'tag', settingKey: 'price-remind' }),
  ],
  'supplier-setting': [
    row({ id: 'ss1', code: 'portal', status: 'exempt', statusText: '开', date: '', product: '启用供应商门户', settingDesc: '允许供应商访问门户并提交相关信息', settingOn: true, group: '供应商设置', iconKey: 'shield' }),
    row({ id: 'ss2', code: 'docs', status: 'exempt', statusText: '开', date: '', product: '允许提交资质文件', settingDesc: '供应商可上传资质证书和相关文件', settingOn: true, group: '供应商设置', iconKey: 'doc' }),
    row({ id: 'ss3', code: 'notify', status: 'draft', statusText: '关', date: '', product: '启用通知提醒', settingDesc: '开启后将向供应商发送通知和提醒', settingOn: false, group: '供应商设置', iconKey: 'bell' }),
    row({ id: 'ss4', code: 'score', status: 'exempt', statusText: '开', date: '', product: '启用评分功能', settingDesc: '对供应商进行绩效评估和评分', settingOn: true, group: '供应商设置', iconKey: 'check' }),
  ],
  'purchase-price': [
    row({ id: 'pr1', code: 'MAT-000123', status: 'exempt', statusText: '', date: '2024-05-20', product: '碳钢板 Q235B 12mm', partner: '上海工业有限公司', lastPrice: 23.56, prevPrice: 24.61, changePct: -4.25, changeAmt: -1.05, unit: 'PCS' }),
    row({ id: 'pr2', code: 'MAT-000456', status: 'exempt', statusText: '', date: '2024-05-19', product: '不锈钢件 304 DN50', partner: '南京机械制造', lastPrice: 158, prevPrice: 150.22, changePct: 5.18, changeAmt: 7.78, unit: 'SET' }),
    row({ id: 'pr3', code: 'MAT-000789', status: 'exempt', statusText: '', date: '2024-05-18', product: '工业盐 NaCl ≥98%', partner: '杭州化工', lastPrice: 6.87, prevPrice: 6.87, changePct: 0, changeAmt: 0, unit: 'KG' }),
    row({ id: 'pr4', code: 'MAT-001002', status: 'exempt', statusText: '', date: '2024-05-17', product: '减速电机 RV75 1.5kW', partner: '苏州精密零部件', lastPrice: 1245, prevPrice: 1108.2, changePct: 12.36, changeAmt: 136.8, unit: 'EA' }),
    row({ id: 'pr5', code: 'MAT-001135', status: 'exempt', statusText: '', date: '2024-05-16', product: '铜排 T2 20x3mm', partner: '无锡标准件', lastPrice: 78.9, prevPrice: 80.77, changePct: -2.31, changeAmt: -1.87, unit: 'M' }),
  ],
};
