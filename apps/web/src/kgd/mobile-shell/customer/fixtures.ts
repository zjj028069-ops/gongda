/** 空库夹具：只服务 C4 手机皮验收，不写业务库 */

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
  status: 'pending' | 'approved' | 'draft' | 'exempt' | 'pass' | 'fail' | 'processing' | 'rejected' | 'invoiced' | 'auth' | 'enabled' | 'completed';
  statusText: string;
  date: string;
  partner?: string;
  product?: string;
  spec?: string;
  qty?: number;
  amount?: number;
  phone?: string;
  contact?: string;
  title?: string;
  tag?: string;
  typeLabel?: string;
  owner?: string;
  nextFollow?: string;
  method?: string;
  bank?: string;
  taxRate?: string;
  category?: string;
  subLabel?: string;
  lastPrice?: number;
  prevPrice?: number;
  changePct?: number;
  changeAmt?: number;
  unit?: string;
  settingKey?: string;
  settingDesc?: string;
  settingIcon?: string;
  settingValue?: string;
  lines?: FixtureLine[];
  lineCount?: number;
  note?: string;
  daysIdle?: number;
  address?: string;
  customerType?: string;
  direction?: 'in' | 'out';
  invoiceType?: string;
  applicant?: string;
  active?: boolean;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  quotation: [
    { id: 'uq1', title: 'QO-2024-0518-0008', sub: '上海精密制造 · 已审核 · 未建合同 · ¥258,600' },
    { id: 'uq2', title: 'QO-2024-0516-0003', sub: '华东液压 · 不需审核 · 未建合同 · ¥86,400' },
    { id: 'uq3', title: 'QO-2024-0512-0011', sub: '苏州工业设备 · 已审核 · 未建合同 · ¥128,000' },
  ],
  contract: [
    { id: 'uc1', title: 'HT20261026008', sub: '赛德 · 履约中' },
    { id: 'uc2', title: 'HT20240518001', sub: '上海精密制造 · 已完成' },
    { id: 'uc3', title: 'HT20240516003', sub: '聊天落单客户 · 未生效' },
  ],
  customer: [
    { id: 'uck1', title: '赛德', sub: 'KH0005 · 意向客户' },
    { id: 'uck2', title: '上海精密制造有限公司', sub: 'KH0008 · 成交客户' },
    { id: 'uck3', title: '聊天下单客户', sub: 'AI51318472 · 聊天下单客户' },
  ],
  linkman: [
    { id: 'ul1', title: '张伟', sub: '液压科技有限公司 · 采购经理' },
    { id: 'ul2', title: '李娜', sub: '中科自动化 · 销售对接' },
  ],
  sea_customer: [
    { id: 'us1', title: '华东液压设备厂', sub: '未跟进 18 天 · 可领取' },
    { id: 'us2', title: '中科自动化有限公司', sub: '未跟进 9 天 · 可领取' },
    { id: 'us3', title: '苏州工业设备有限公司', sub: '未跟进 26 天 · 可领取' },
  ],
  salesperson: [
    { id: 'usp1', title: '张伟', sub: '销售一部' },
    { id: 'usp2', title: '李娜', sub: '销售二部' },
    { id: 'usp3', title: '王磊', sub: '销售一部' },
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
    row({
      id: 'c1', code: 'KH0005', status: 'completed', statusText: '已完成', date: '',
      partner: '赛德', phone: '17852586554', customerType: '意向客户', tag: '启用', active: true,
    }),
    row({
      id: 'c2', code: 'AI51318472', status: 'completed', statusText: '已完成', date: '',
      partner: '聊天下单客户', phone: '138****8001', customerType: '聊天下单客户', tag: '启用', active: true,
    }),
    row({
      id: 'c3', code: 'KH0008', status: 'processing', statusText: '跟进中', date: '',
      partner: '上海精密制造有限公司', phone: '139****6666', customerType: '成交客户', tag: '启用', active: true,
    }),
  ],
  linkman: [
    row({
      id: 'lm1', code: 'LM-001', status: 'enabled', statusText: '启用', date: '',
      contact: '张伟', title: '采购经理', partner: '液压科技有限公司', phone: '138****8001', tag: '客户',
    }),
    row({
      id: 'lm2', code: 'LM-002', status: 'enabled', statusText: '启用', date: '',
      contact: '李娜', title: '销售对接', partner: '中科自动化有限公司', phone: '139****6622', tag: '客户',
    }),
    row({
      id: 'lm3', code: 'LM-003', status: 'enabled', statusText: '启用', date: '',
      contact: '王磊', title: '技术对接', partner: '苏州工业设备有限公司', phone: '137****2211', tag: '客户',
    }),
  ],
  follow: [
    row({
      id: 'f1', code: 'FL-20240603', status: 'processing', statusText: '进行中', date: '2024-06-03',
      partner: '上海机械有限公司', typeLabel: '现场拜访', subLabel: '技术交流', owner: '张伟 / 销售一部',
      nextFollow: '2024-06-03 09:30', category: '工业设备',
    }),
    row({
      id: 'f2', code: 'FL-20240602', status: 'completed', statusText: '已完成', date: '2024-06-02',
      partner: '杭州精密制造有限公司', typeLabel: '电话沟通', subLabel: '报价确认', owner: '李娜 / 销售二部',
      nextFollow: '2024-06-05 14:00', category: '精密零件',
    }),
    row({
      id: 'f3', code: 'FL-20240601', status: 'pending', statusText: '待跟进', date: '2024-06-01',
      partner: '苏州工业设备有限公司', typeLabel: '微信跟进', subLabel: '需求澄清', owner: '王磊 / 销售一部',
      nextFollow: '2024-06-04 10:00', category: '自动化',
    }),
  ],
  quote: [
    row({
      id: 'q1', code: 'QO-2024-0518-0008', status: 'approved', statusText: '已确认', date: '2024-06-18',
      partner: '上海精密制造有限公司', amount: 258600, note: '2024-06-18 ~ 2024-07-18',
      lines: [{ name: '伺服电机', qty: 2, amount: 128000 }, { name: '减速机', qty: 4, amount: 130600 }],
      lineCount: 2,
    }),
    row({
      id: 'q2', code: 'QO-2024-0516-0003', status: 'exempt', statusText: '不需审核', date: '2024-06-16',
      partner: '华东液压', amount: 86400, note: '有效期至 2024-07-16',
      lines: [{ name: '液压阀组', qty: 10, amount: 86400 }],
      lineCount: 1,
    }),
    row({
      id: 'q3', code: 'QO-2024-0510-0001', status: 'pending', statusText: '待审核', date: '2024-06-10',
      partner: '赛德', amount: 45600, note: '草稿改审中',
      lines: [{ name: '轴承座A', qty: 50, amount: 45600 }],
      lineCount: 1,
    }),
  ],
  contract: [
    row({
      id: 'ct1', code: 'HT20261026008', status: 'processing', statusText: '履约中', date: '2024-05-20',
      partner: '赛德', amount: 6045, address: '客户地址 · 江苏常州', note: '客户编号 KH0005',
    }),
    row({
      id: 'ct2', code: 'HT20240518001', status: 'completed', statusText: '已完成', date: '2024-05-18',
      partner: '上海精密制造有限公司', amount: 258600, address: '客户地址 · 上海浦东', note: '由报价 QO-2024-0518-0008 生成',
    }),
    row({
      id: 'ct3', code: 'HT20240516003', status: 'draft', statusText: '草稿', date: '2024-05-16',
      partner: '聊天落单客户', amount: 12800, address: '客户编号 AI51318472', note: '待提交审核',
    }),
  ],
  cash: [
    row({
      id: 'ca1', code: 'HT20261026008', status: 'approved', statusText: '通过', date: '2024-05-20',
      partner: '赛德', amount: 4070, direction: 'in', typeLabel: '收入', note: '收款详情',
    }),
    row({
      id: 'ca2', code: 'SX-20240518-02', status: 'approved', statusText: '通过', date: '2024-05-18',
      partner: '鸡哥', amount: 1000, direction: 'out', typeLabel: '支出', note: '附件 1',
    }),
    row({
      id: 'ca3', code: 'SX-20240516-01', status: 'pending', statusText: '待审', date: '2024-05-16',
      partner: '上海精密制造有限公司', amount: 12860, direction: 'in', typeLabel: '收入', note: '预收款',
    }),
  ],
  invoice: [
    row({
      id: 'iv1', code: 'INV-20240518-00125', status: 'invoiced', statusText: '已开票', date: '2024-05-18',
      partner: '上海机电有限公司', amount: 128600, invoiceType: '增值税专用发票',
    }),
    row({
      id: 'iv2', code: 'INV-20240516-00088', status: 'processing', statusText: '已邮寄', date: '2024-05-16',
      partner: '华东液压设备厂', amount: 86400, invoiceType: '增值税普通发票',
    }),
    row({
      id: 'iv3', code: 'INV-20240512-00051', status: 'pending', statusText: '待开票', date: '2024-05-12',
      partner: '苏州工业设备有限公司', amount: 45600, invoiceType: '增值税专用发票',
    }),
    row({
      id: 'iv4', code: 'INV-20240501-00012', status: 'rejected', statusText: '已作废', date: '2024-05-01',
      partner: '赛德', amount: 3200, invoiceType: '增值税普通发票',
    }),
  ],
  'sales-fee': [
    row({
      id: 'sf1', code: 'FY-20240520', status: 'pending', statusText: '审批中', date: '2024-05-20',
      typeLabel: '出差交通', partner: '上海机械有限公司', amount: 5860, applicant: '张伟 销售一部',
    }),
    row({
      id: 'sf2', code: 'FY-20240519', status: 'approved', statusText: '已通过', date: '2024-05-19',
      typeLabel: '客户招待', partner: '杭州精密制造有限公司', amount: 2350, applicant: '李娜 销售二部',
    }),
    row({
      id: 'sf3', code: 'FY-20240518', status: 'pending', statusText: '审批中', date: '2024-05-18',
      typeLabel: '市场推广', partner: '苏州工业设备有限公司', amount: 12800, applicant: '王磊 销售一部',
    }),
    row({
      id: 'sf4', code: 'FY-20240517', status: 'rejected', statusText: '已拒绝', date: '2024-05-17',
      typeLabel: '物流费用', partner: '无锡自动化科技有限公司', amount: 3420, applicant: '陈静 销售三部',
    }),
  ],
  'customer-sea': [
    row({
      id: 'sea1', code: 'SEA-001', status: 'pending', statusText: '可领取', date: '',
      partner: '华东液压设备厂', category: '液压', daysIdle: 18, note: '以下客户当前无负责人，可领取跟进',
    }),
    row({
      id: 'sea2', code: 'SEA-002', status: 'pending', statusText: '可领取', date: '',
      partner: '中科自动化有限公司', category: '自动化设备', daysIdle: 9,
    }),
    row({
      id: 'sea3', code: 'SEA-003', status: 'pending', statusText: '可领取', date: '',
      partner: '苏州工业设备有限公司', category: '工业设备', daysIdle: 26,
    }),
    row({
      id: 'sea4', code: 'SEA-004', status: 'pending', statusText: '可领取', date: '',
      partner: '无锡精密传动有限公司', category: '传动件', daysIdle: 12,
    }),
  ],
  'customer-base': [
    row({
      id: 'cb1', code: 'sea-rule', status: 'enabled', statusText: '启用', date: '',
      product: '客户公海规则', settingDesc: '规则说明：超过30天无跟进的客户将自动回收至公海。',
      settingIcon: '公', settingKey: 'sea-rule', settingValue: '自动回收天数 30 启用',
    }),
    row({
      id: 'cb2', code: 'follow-remind', status: 'exempt', statusText: '', date: '',
      product: '跟进提醒', settingDesc: '在跟进时间前 1 天，通过站内信和推送通知提醒跟进人。',
      settingIcon: '提', settingKey: 'follow-remind', settingValue: '提前 1 天',
    }),
  ],
  'customer-audit': [
    row({
      id: 'au1', code: 'FLOW-QUOTE', status: 'enabled', statusText: '开', date: '',
      product: '报价单需审核', subLabel: '新建或修改报价单时需要审核确认', note: '对象：合同报价单', active: true,
    }),
    row({
      id: 'au2', code: 'FLOW-CONTRACT', status: 'enabled', statusText: '开', date: '',
      product: '合同订单需审核', subLabel: '新建或修改合同订单时需要审核确认', note: '对象：合同订单', active: true,
    }),
    row({
      id: 'au3', code: 'FLOW-CASH', status: 'enabled', statusText: '开', date: '',
      product: '收支需审核', subLabel: '新建或修改收支记录时需要审核确认', note: '对象：收支记录', active: true,
    }),
    row({
      id: 'au4', code: 'FLOW-FEE', status: 'draft', statusText: '关', date: '',
      product: '销售费用需审核', subLabel: '新建或修改销售费用时需要审核确认', note: '对象：销售费用', active: false,
    }),
  ],
  'sales-price': [
    row({
      id: 'sp1', code: 'PR-001', status: 'exempt', statusText: '', date: '2024-05-20',
      partner: '华东精密', product: '轴承座A', lastPrice: 128, prevPrice: 135,
      changePct: -5.19, changeAmt: -7, unit: '元', note: '生效日 2024-05-20',
    }),
    row({
      id: 'sp2', code: 'PR-002', status: 'exempt', statusText: '', date: '2024-05-18',
      partner: '上海机械有限公司', product: '伺服电机 SM-200', lastPrice: 6800, prevPrice: 6500,
      changePct: 4.62, changeAmt: 300, unit: '元', note: '生效日 2024-05-18',
    }),
    row({
      id: 'sp3', code: 'PR-003', status: 'exempt', statusText: '', date: '2024-05-15',
      partner: '液压科技有限公司', product: '液压阀组 V8', lastPrice: 860, prevPrice: 860,
      changePct: 0, changeAmt: 0, unit: '元', note: '生效日 2024-05-15',
    }),
  ],
};
