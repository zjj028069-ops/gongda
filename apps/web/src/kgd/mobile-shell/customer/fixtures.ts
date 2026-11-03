/** 空库时的客户域样例，只用于手机列表展示，不写业务库。 */

export type FixtureLine = {
  name: string;
  spec?: string;
  qty?: number;
  amount?: number;
  note?: string;
};

export type FixtureRow = {
  id: string;
  code: string;
  status: string;
  statusText: string;
  date: string;
  partner?: string;
  shortName?: string;
  product?: string;
  spec?: string;
  qty?: number;
  amount?: number;
  arrears?: number;
  phone?: string;
  contact?: string;
  title?: string;
  tag?: string;
  typeLabel?: string;
  owner?: string;
  nextFollow?: string;
  category?: string;
  subLabel?: string;
  lastPrice?: number;
  prevPrice?: number;
  changePct?: number;
  changeAmt?: number;
  unit?: string;
  settingKey?: string;
  settingDesc?: string;
  settingValue?: string;
  settingOn?: boolean;
  lines?: FixtureLine[];
  lineCount?: number;
  note?: string;
  daysIdle?: number;
  address?: string;
  industry?: string;
  city?: string;
  customerType?: string;
  direction?: 'in' | 'out';
  invoiceType?: string;
  applicant?: string;
  active?: boolean;
  priority?: boolean;
  updater?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  quotation: [
    { id: 'uq1', title: 'QO-2024-04184', sub: '上海工业有限公司 · 已审核 · 未建合同 · ¥128,000' },
    { id: 'uq2', title: 'QO-2024-0516-0003', sub: '华东液压 · 不需审核 · 未建合同 · ¥86,400' },
    { id: 'uq3', title: 'QO-2024-0518-0008', sub: '上海精密制造 · 已审核 · 未建合同 · ¥258,600' },
  ],
  contract: [
    { id: 'uc1', title: 'HT20261026008', sub: '赛德 · 执行中' },
    { id: 'uc2', title: 'HT20240518001', sub: '上海工业有限公司 · 已完成' },
  ],
  customer: [
    { id: 'uck1', title: '瑞科', sub: 'KH0005' },
    { id: 'uck2', title: '赛德', sub: 'KH0004' },
    { id: 'uck3', title: '青岛艾伦有限公司', sub: 'KH0002' },
  ],
  linkman: [
    { id: 'ul1', title: '张伟', sub: '瑞科 · 采购经理' },
    { id: 'ul2', title: '李娜', sub: '赛德 · 销售对接' },
  ],
  sea_customer: [
    { id: 'us1', title: '上海宏达工业有限公司', sub: '未跟进 15 天 · 可领取' },
    { id: 'us2', title: '华东液压设备厂', sub: '未跟进 9 天 · 可领取' },
  ],
  salesperson: [
    { id: 'usp1', title: '张销售', sub: '销售一部' },
    { id: 'usp2', title: '李娜', sub: '销售二部' },
  ],
  audit_object: [
    { id: 'ua1', title: '合同报价单', sub: '审核对象' },
    { id: 'ua2', title: '合同订单', sub: '审核对象' },
    { id: 'ua3', title: '收支记录', sub: '审核对象' },
    { id: 'ua4', title: '销售费用', sub: '审核对象' },
  ],
};

export const FIXTURES: Record<string, FixtureRow[]> = {
  'customer-list': [
    row({ id: 'c1', code: 'KH0005', status: 'enabled', statusText: '启用', date: '', partner: '瑞科', shortName: '瑞科', phone: '17852586564' }),
    row({ id: 'c2', code: 'AI51318472', status: 'enabled', statusText: '启用', date: '', partner: '聊天落单客户', shortName: '聊天落单客户', phone: '17852586564' }),
    row({ id: 'c3', code: 'KH0004', status: 'enabled', statusText: '启用', date: '', partner: '赛德', shortName: '赛德', phone: '17852586555' }),
    row({ id: 'c4', code: 'KH0003', status: 'enabled', statusText: '启用', date: '', partner: '鸡哥', shortName: '鸡哥', phone: '111' }),
    row({ id: 'c5', code: 'KH0002', status: 'enabled', statusText: '启用', date: '', partner: '青岛艾伦有限公司', shortName: '青岛艾伦有限公司', phone: '17852586553' }),
    row({ id: 'c6', code: 'KH0001', status: 'enabled', statusText: '启用', date: '', partner: 'Allen客户', shortName: 'Allen', phone: '17852586552' }),
  ],
  linkman: [
    row({ id: 'lm1', code: 'LM-001', status: 'enabled', statusText: '启用', date: '', contact: '张伟', title: '采购经理', partner: '瑞科', phone: '17852586564' }),
    row({ id: 'lm2', code: 'LM-002', status: 'enabled', statusText: '启用', date: '', contact: '李娜', title: '销售对接', partner: '赛德', phone: '17852586555' }),
    row({ id: 'lm3', code: 'LM-003', status: 'enabled', statusText: '启用', date: '', contact: '王磊', title: '技术对接', partner: '青岛艾伦有限公司', phone: '17852586553' }),
  ],
  follow: [
    row({
      id: 'f1', code: 'FL-20241102', status: 'processing', statusText: '进行中', date: '2026-11-02',
      partner: '上海宏达工业有限公司', typeLabel: '现场拜访', subLabel: '需求确认', owner: '张销售',
      nextFollow: '2026-11-06 09:30',
    }),
    row({
      id: 'f2', code: 'FL-20241101', status: 'completed', statusText: '已完成', date: '2026-11-01',
      partner: '瑞科', typeLabel: '电话沟通', subLabel: '报价确认', owner: '李娜',
      nextFollow: '2026-11-08 14:00',
    }),
    row({
      id: 'f3', code: 'FL-20241028', status: 'pending', statusText: '待跟进', date: '2026-10-28',
      partner: '赛德', typeLabel: '微信跟进', subLabel: '交期澄清', owner: '王磊',
      nextFollow: '2026-11-04 10:00',
    }),
  ],
  quote: [
    row({
      id: 'q1', code: 'QO-2024-04184', status: 'approved', statusText: '已确认', date: '2026-11-02',
      partner: '上海工业有限公司', amount: 128000, priority: true,
      note: '2026-11-02 ~ 2026-12-02',
      lines: [
        { name: '轴承座A', qty: 200, amount: 25600 },
        { name: '伺服电机', qty: 8, amount: 102400 },
      ],
      lineCount: 2,
    }),
    row({
      id: 'q2', code: 'QO-2024-0516-0003', status: 'exempt', statusText: '不需审核', date: '2026-10-16',
      partner: '华东液压', amount: 86400, note: '有效期至 2026-11-16',
      lines: [{ name: '液压阀组', qty: 10, amount: 86400 }],
      lineCount: 1,
    }),
    row({
      id: 'q3', code: 'QO-2024-0510-0001', status: 'pending', statusText: '待审核', date: '2026-10-10',
      partner: '赛德', amount: 45600, note: '待确认交期',
      lines: [{ name: '轴承座A', qty: 50, amount: 45600 }],
      lineCount: 1,
    }),
  ],
  contract: [
    row({
      id: 'ct1', code: 'HT20261026008', status: 'processing', statusText: '执行中', date: '2026-10-26',
      partner: '赛德', amount: 6045, arrears: -3970,
      address: '江苏省/苏州市/姑苏区\n山东省青岛市城阳区长城南路18号',
    }),
    row({
      id: 'ct2', code: 'HT20241102001', status: 'completed', statusText: '已完成', date: '2026-11-02',
      partner: '上海工业有限公司', amount: 128000, arrears: 0,
      address: '上海市 · 浦东新区',
    }),
  ],
  cash: [
    row({ id: 'ca1', code: 'HT20261026008', status: 'approved', statusText: '通过', date: '2026-11-02', partner: '贾德', amount: 2000, direction: 'in', typeLabel: '收入' }),
    row({ id: 'ca2', code: 'HT20261026008', status: 'approved', statusText: '通过', date: '2026-11-01', partner: '贾德', amount: 2000, direction: 'in', typeLabel: '收入' }),
    row({ id: 'ca3', code: 'HT20261026004', status: 'approved', statusText: '通过', date: '2026-10-26', partner: '鸡哥', amount: 1000, direction: 'out', typeLabel: '支出' }),
    row({ id: 'ca4', code: 'HT20261026004', status: 'approved', statusText: '通过', date: '2026-10-20', partner: '鸡哥', amount: 1000, direction: 'out', typeLabel: '支出' }),
    row({ id: 'ca5', code: 'HT20261016003', status: 'approved', statusText: '通过', date: '2026-10-16', partner: '鸡哥', amount: 1000, direction: 'out', typeLabel: '支出' }),
  ],
  invoice: [
    row({
      id: 'iv1', code: 'INV-2024-00568', status: 'invoiced', statusText: '已开票', date: '2026-11-02',
      partner: '上海工业有限公司', amount: 1256789, invoiceType: '增值税专用发票',
    }),
    row({
      id: 'iv2', code: 'INV-2024-00567', status: 'invoiced', statusText: '已开票', date: '2026-11-01',
      partner: '南京机械制造有限公司', amount: 982341.5, invoiceType: '增值税普通发票',
    }),
    row({
      id: 'iv3', code: 'INV-2024-00566', status: 'processing', statusText: '部分回款', date: '2026-10-18',
      partner: '杭州自动化设备有限公司', amount: 753200, invoiceType: '增值税专用发票',
    }),
    row({
      id: 'iv4', code: 'INV-2024-00565', status: 'rejected', statusText: '逾期未回款', date: '2026-10-15',
      partner: '苏州精密零部件有限公司', amount: 621450.8, invoiceType: '增值税普通发票',
    }),
  ],
  'sales-fee': [
    row({
      id: 'sf1', code: 'FY-20261102', status: 'approved', statusText: '已报销', date: '2026-11-02',
      typeLabel: '客户拜访费用', partner: '上海通用汽车有限公司', amount: 12560, applicant: '张销售',
    }),
    row({
      id: 'sf2', code: 'FY-20261101', status: 'approved', statusText: '已审批', date: '2026-11-01',
      typeLabel: '市场推广费用', partner: '浙江吉利控股集团', amount: 45800, applicant: '李娜',
    }),
    row({
      id: 'sf3', code: 'FY-20261118', status: 'pending', statusText: '待审批', date: '2026-11-01',
      typeLabel: '招待费用', partner: '比亚迪股份有限公司', amount: 8930, applicant: '王磊',
    }),
    row({
      id: 'sf4', code: 'FY-20261002', status: 'approved', statusText: '已报销', date: '2026-10-12',
      typeLabel: '差旅交通', partner: '赛德', amount: 56737, applicant: '张销售',
    }),
  ],
  'customer-sea': [
    row({
      id: 'sea1', code: 'SEA-015', status: 'pending', statusText: '可领取', date: '',
      partner: '上海宏达工业有限公司', industry: '制造业', category: '机械制造',
      city: '上海市 · 浦东新区', daysIdle: 15,
    }),
    row({
      id: 'sea2', code: 'SEA-009', status: 'pending', statusText: '可领取', date: '',
      partner: '华东液压设备厂', industry: '制造业', category: '液压件',
      city: '江苏省 · 苏州市', daysIdle: 9,
    }),
    row({
      id: 'sea3', code: 'SEA-006', status: 'pending', statusText: '可领取', date: '',
      partner: '青岛艾伦有限公司', industry: '制造业', category: '零部件',
      city: '山东省 · 青岛市', daysIdle: 6,
    }),
  ],
  'customer-base': [
    row({
      id: 'cb1', code: 'auto-no', status: 'enabled', statusText: '开', date: '',
      product: '生产订单自动编号', settingDesc: '开启后系统自动生成订单编号', settingOn: true,
    }),
    row({
      id: 'cb2', code: 'mat-code', status: 'enabled', statusText: '开', date: '',
      product: '物料编码规则', settingDesc: 'MES-自动生成', settingOn: true,
    }),
    row({
      id: 'cb3', code: 'shift', status: 'draft', statusText: '关', date: '',
      product: '班次管理', settingDesc: '按自然日划分', settingOn: false,
    }),
    row({
      id: 'cb4', code: 'retain', status: 'enabled', statusText: '开', date: '',
      product: '数据保留期限', settingDesc: '180 天', settingOn: true,
    }),
  ],
  'customer-audit': [
    row({
      id: 'au1', code: 'FLOW-QUOTE', status: 'enabled', statusText: '需审核', date: '',
      product: '合同报价单', subLabel: '报价单新建、改审相关文档', active: true,
    }),
    row({
      id: 'au2', code: 'FLOW-CONTRACT', status: 'enabled', statusText: '需审核', date: '',
      product: '合同订单', subLabel: '合同订单新建与履约相关文档', active: true,
    }),
    row({
      id: 'au3', code: 'FLOW-CASH', status: 'enabled', statusText: '需审核', date: '',
      product: '收支记录', subLabel: '收款与支出相关文档', active: true,
    }),
    row({
      id: 'au4', code: 'FLOW-FEE', status: 'draft', statusText: '免审', date: '',
      product: '销售费用', subLabel: '费用报销相关文档', active: false,
    }),
  ],
  'sales-price': [
    row({
      id: 'sp1', code: 'PR-001', status: 'exempt', statusText: '', date: '2024-05-20',
      partner: '华东精密', product: '轴承座A', lastPrice: 128, prevPrice: 135,
      changePct: -5, changeAmt: -7, unit: '件', updater: '张销售',
    }),
    row({
      id: 'sp2', code: 'PR-002', status: 'exempt', statusText: '', date: '2026-11-01',
      partner: '上海工业有限公司', product: '伺服电机 SM-200', lastPrice: 6800, prevPrice: 6500,
      changePct: 4.6, changeAmt: 300, unit: '台', updater: '李娜',
    }),
  ],
};
