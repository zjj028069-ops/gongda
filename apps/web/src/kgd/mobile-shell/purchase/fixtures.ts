/** 空库夹具：只服务 C3 手机皮验收，不写业务库 */

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
      partner: '新昌璟辉机械有限公司', contact: '王经理', phone: '138****8888',
      creditCode: '91310108MA1K3N2X7R',
    }),
    row({
      id: 's2', code: 'GYS00002', status: 'exempt', statusText: '', date: '',
      partner: '上海精密制造有限公司', contact: '李主管', phone: '139****6666',
      creditCode: '91310000MA1FL2B89C',
    }),
    row({
      id: 's3', code: 'GYS00003', status: 'exempt', statusText: '', date: '',
      partner: '苏州工业零部件有限公司', contact: '赵工', phone: '137****2222',
      creditCode: '91320500MA1N88K01X',
    }),
  ],
  'purchase-plan': [
    row({
      id: 'pp1', code: 'JH-20240518001', status: 'approved', statusText: '已确认', date: '2024-05-25',
      product: '深沟球轴承 6205-2RS', spec: 'd 25mm x D 52mm x B 15mm', qty: 1200,
    }),
    row({
      id: 'pp2', code: 'JH-20240518002', status: 'approved', statusText: '已确认', date: '2024-05-27',
      product: '圆锥滚子轴承 30207', spec: 'd 35mm x D 72mm x T 18.25mm', qty: 800,
    }),
    row({
      id: 'pp3', code: 'JH-20240518003', status: 'processing', statusText: '生产中', date: '2024-05-30',
      product: '调心滚子轴承 22310CA', spec: 'd 50mm x D 110mm x B 40mm', qty: 500,
    }),
    row({
      id: 'pp4', code: 'JH-20240518004', status: 'pending', statusText: '待确认', date: '2024-06-02',
      product: '滚针轴承 NK30/20', spec: 'd 30mm x D 40mm x C 20mm', qty: 1500,
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
    row({
      id: 'pay1', code: 'FKD-20240520-0001', status: 'approved', statusText: '已付款', date: '2024-05-20',
      partner: '上海精密制造有限公司', amount: 128600, method: '银行转账', bank: '中国工商银行',
    }),
    row({
      id: 'pay2', code: 'FKD-20240517-0003', status: 'processing', statusText: '处理中', date: '2024-05-17',
      partner: '苏州工业零部件有限公司', amount: 45300, method: '电汇', bank: '交通银行',
    }),
    row({
      id: 'pay3', code: 'FKD-20240510-0006', status: 'rejected', statusText: '已拒绝', date: '2024-05-10',
      partner: '常州数控设备有限公司', amount: 59800, method: '银行转账', bank: '浦发银行',
    }),
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
      id: 'mt1', code: 'PO202405180023', status: 'pass', statusText: '合格', date: '2024-05-18',
      product: '外购壳体A (白色)', batch: 'B240518A', sampleQty: '32 PCS', inspector: '张检验',
    }),
    row({
      id: 'mt2', code: 'PO202405170015', status: 'fail', statusText: '不合格', date: '2024-05-17',
      product: '深沟球轴承 6205-2RS', batch: 'B240517C', sampleQty: '20 PCS', inspector: '李检验',
    }),
    row({
      id: 'mt3', code: 'PO202405160009', status: 'pass', statusText: '合格', date: '2024-05-16',
      product: '尼龙拉链 5#', batch: 'B240516A', sampleQty: '50 PCS', inspector: '王检验',
    }),
  ],
  'mt-lines': [
    row({
      id: 'ml1', code: '外观检验', status: 'pass', statusText: '合格', date: '',
      product: '外观检验',
      lines: [{ name: '外观检验', method: '目视', standard: '无锈蚀/划伤', actual: 'Surface clean', verdict: '合格', note: '' }],
    }),
    row({
      id: 'ml2', code: '尺寸检验', status: 'pass', statusText: '合格', date: '',
      product: '尺寸检验',
      lines: [{ name: '尺寸检验', method: '卡尺', standard: '100±0.5 mm', actual: '100.2 mm', verdict: '合格', note: 'CO-20240518' }],
    }),
    row({
      id: 'ml3', code: '材质检验', status: 'pass', statusText: '合格', date: '',
      product: '材质检验',
      lines: [{ name: '材质检验', method: '光谱', standard: '45#钢', actual: '符合', verdict: '合格', note: 'SST-20240520' }],
    }),
  ],
  'mt-spec': [
    row({
      id: 'sp1', code: 'JYN-0001', status: 'exempt', statusText: '', date: '',
      product: '外观检验规范', subLabel: '外观质量要求', category: '包装材料', version: 'v1.0', note: '进货检验规范',
    }),
    row({
      id: 'sp2', code: 'JYN-0002', status: 'exempt', statusText: '', date: '',
      product: '尺寸检验规范', subLabel: '尺寸公差要求', category: '塑料制品', version: 'v1.2', note: '制程检验规范',
    }),
    row({
      id: 'sp3', code: 'JYN-0003', status: 'exempt', statusText: '', date: '',
      product: '最终检验规范', subLabel: '出厂抽检', category: '电子元器件', version: 'v1.1', note: '最终检验规范',
    }),
    row({
      id: 'sp4', code: 'JYN-0004', status: 'exempt', statusText: '', date: '',
      product: '出货检验规范', subLabel: '包装完整性', category: '成品包装', version: 'v1.0', note: '出货检验规范',
    }),
  ],
  'purchase-audit': [
    row({
      id: 'au1', code: 'FLOW-PO', status: 'exempt', statusText: '启用', date: '',
      product: '采购单审核', subLabel: '对象：采购单 · 两级审批', note: '采购员→采购主管',
    }),
    row({
      id: 'au2', code: 'FLOW-PAY', status: 'exempt', statusText: '启用', date: '',
      product: '付款审核', subLabel: '对象：付款记录 · 金额分级', note: '财务→总经理',
    }),
    row({
      id: 'au3', code: 'FLOW-INV', status: 'draft', statusText: '停用', date: '',
      product: '发票审核', subLabel: '对象：发票', note: '单级审批',
    }),
  ],
  'purchase-base': [
    row({
      id: 'set1', code: 'warehouse', status: 'exempt', statusText: '', date: '',
      product: '默认仓库', settingDesc: '设置采购入库的默认仓库', settingIcon: '仓', settingKey: 'warehouse',
    }),
    row({
      id: 'set2', code: 'pricing', status: 'exempt', statusText: '', date: '',
      product: '计价方式', settingDesc: '设置采购单据的默认计价方式', settingIcon: '价', settingKey: 'pricing',
    }),
    row({
      id: 'set3', code: 'overrecv', status: 'exempt', statusText: '', date: '',
      product: '超收比例', settingDesc: '设置允许超过采购数量的比例上限', settingIcon: '%', settingKey: 'overrecv',
    }),
  ],
  'supplier-setting': [
    row({
      id: 'ss1', code: 'dup-name', status: 'exempt', statusText: '', date: '',
      product: '名称查重', settingDesc: '供应商名称重复时拦截保存', settingIcon: '名', settingKey: 'dup-name',
    }),
    row({
      id: 'ss2', code: 'phone-unique', status: 'exempt', statusText: '', date: '',
      product: '电话唯一', settingDesc: '联系电话在企业内保持唯一', settingIcon: '电', settingKey: 'phone-unique',
    }),
    row({
      id: 'ss3', code: 'level', status: 'exempt', statusText: '', date: '',
      product: '等级字段', settingDesc: '供应商等级与标签字段配置', settingIcon: '级', settingKey: 'level',
    }),
  ],
  'purchase-price': [
    row({
      id: 'pr1', code: 'MAT-00123', status: 'exempt', statusText: '', date: '2024-05-20',
      product: '碳钢圆棒', partner: '上海宝钢钢铁有限公司', lastPrice: 5680, prevPrice: 5320,
      changePct: 6.77, changeAmt: 360, unit: '元/吨', note: '较昨日更新',
    }),
    row({
      id: 'pr2', code: 'MAT-00456', status: 'exempt', statusText: '', date: '2024-05-19',
      product: '不锈钢板', partner: '江苏不锈供应链', lastPrice: 16200, prevPrice: 16500,
      changePct: -1.82, changeAmt: -300, unit: '元/吨', note: '较昨日更新',
    }),
    row({
      id: 'pr3', code: 'MAT-00789', status: 'exempt', statusText: '', date: '2024-05-18',
      product: '尼龙拉链 5#', partner: '宁波拉链供应链', lastPrice: 0.85, prevPrice: 0.82,
      changePct: 3.66, changeAmt: 0.03, unit: '元/米', note: '较昨日更新',
    }),
  ],
};
