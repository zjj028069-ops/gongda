/** 空库夹具：只服务 C2 手机皮验收，不写业务库 */

export type FixtureLine = {
  name: string;
  spec?: string;
  qty?: number;
  amount?: number;
  book?: number;
  actual?: number;
  diff?: number;
};

export type FixtureBill = {
  id: string;
  code: string;
  status: 'pending' | 'approved' | 'draft' | 'exempt';
  statusText: string;
  date: string;
  warehouse?: string;
  fromWh?: string;
  toWh?: string;
  partner?: string;
  workOrder?: string;
  contract?: string;
  product?: string;
  qty?: number;
  issueQty?: number;
  returnQty?: number;
  amount?: number;
  costAmount?: number;
  lineCount?: number;
  lines?: FixtureLine[];
  alarm?: 'high' | 'low' | 'ok' | 'stale' | 'all_alarm';
  upper?: number;
  lower?: number;
  manager?: string;
  address?: string;
  note?: string;
  active?: boolean;
  direction?: 'in' | 'out';
  docType?: string;
  balance?: number;
  time?: string;
};

function bill(partial: FixtureBill): FixtureBill {
  return partial;
}

export const FIXTURES: Record<string, FixtureBill[]> = {
  stock: [
    bill({
      id: 's1', code: '', status: 'exempt', statusText: '', date: '',
      product: '双列交叉滚柱导轨', warehouse: '铁仓', qty: 15, upper: 20, lower: 5,
      costAmount: 4500, alarm: 'high',
    }),
    bill({
      id: 's2', code: '', status: 'exempt', statusText: '', date: '',
      product: 'DDR5 内存条', warehouse: '航智联', qty: 120, upper: 150, lower: 50,
      costAmount: 24000, alarm: 'low',
    }),
    bill({
      id: 's3', code: '', status: 'exempt', statusText: '', date: '',
      product: '风琴防护罩', warehouse: '铁仓', qty: 80, upper: 100, lower: 10,
      costAmount: 800, alarm: 'ok',
    }),
  ],
  'in-purchase': [
    bill({
      id: 'p1', code: 'RK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      partner: '宁波拉链供应链', warehouse: '铁仓', amount: 1286, lineCount: 2,
      lines: [
        { name: '尼龙拉链', spec: '规格5#', qty: 200, amount: 500 },
        { name: '金属扣', spec: 'M5', qty: 120, amount: 786 },
      ],
    }),
    bill({
      id: 'p2', code: 'RK20261031008', status: 'approved', statusText: '已审核', date: '2026-10-31',
      partner: '上海智联', warehouse: '航智联', amount: 800, lineCount: 1,
      lines: [{ name: '风琴防护罩', qty: 80, amount: 800 }],
    }),
    bill({
      id: 'p3', code: 'RK20261030003', status: 'draft', statusText: '草稿', date: '2026-10-30',
      partner: '苏州精工', warehouse: '铁仓', amount: 12000, lineCount: 1,
      lines: [{ name: 'DDR5 内存条', qty: 50, amount: 12000 }],
    }),
  ],
  'in-fg': [
    bill({
      id: 'f1', code: 'CPRK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      workOrder: 'JG20261028012', warehouse: '成品仓', qty: 24, lineCount: 1,
      lines: [{ name: '伺服电机', spec: '1.5kW', qty: 24 }],
    }),
    bill({
      id: 'f2', code: 'CPRK20261031005', status: 'approved', statusText: '已审核', date: '2026-10-31',
      workOrder: 'JG20261025007', warehouse: '成品仓', qty: 40, lineCount: 1,
      lines: [{ name: '减速机', spec: 'i=20', qty: 40 }],
    }),
  ],
  'in-semi': [
    bill({
      id: 'sm1', code: 'BCRK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      workOrder: 'JG20261028012', warehouse: '半成品仓', qty: 150, lineCount: 2,
      lines: [
        { name: '轴承座毛坯', spec: '规格A', qty: 100 },
        { name: '法兰环毛坯', qty: 50 },
      ],
    }),
    bill({
      id: 'sm2', code: 'BCRK20261031008', status: 'approved', statusText: '已审核', date: '2026-10-31',
      workOrder: 'JG20261025007', warehouse: '半成品仓', qty: 80, lineCount: 1,
      lines: [{ name: '齿轮半成品', spec: '模数2', qty: 80 }],
    }),
    bill({
      id: 'sm3', code: 'BCRK20261029002', status: 'draft', statusText: '草稿', date: '2026-10-29',
      workOrder: 'JG20261022001', warehouse: '半成品仓', qty: 36, lineCount: 1,
      lines: [{ name: '壳体毛坯', spec: 'A型', qty: 36 }],
    }),
  ],
  'in-return': [
    bill({
      id: 'r1', code: 'SCTLD20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      workOrder: 'JG20261028012', warehouse: '原料仓', product: '轴承内圈 6205',
      issueQty: 120, returnQty: 96,
    }),
    bill({
      id: 'r2', code: 'SCTLD20261031004', status: 'approved', statusText: '已审核', date: '2026-10-31',
      workOrder: 'JG20261025007', warehouse: '精工仓储', product: '齿轮坯料 M2',
      issueQty: 80, returnQty: 12,
    }),
    bill({
      id: 'r3', code: 'SCTLD20261028002', status: 'draft', statusText: '草稿', date: '2026-10-28',
      workOrder: 'JG20261020003', warehouse: '原料仓', product: '铝合金棒 Φ30',
      issueQty: 50, returnQty: 8,
    }),
  ],
  'in-sale-return': [
    bill({
      id: 'sr1', code: 'XSTH20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      partner: '杭州精工机电', warehouse: '成品仓', contract: 'HT20261028001',
      qty: 6, amount: 4680, lineCount: 1,
      lines: [{ name: '伺服电机', spec: '1.5kW', qty: 6, amount: 4680 }],
    }),
    bill({
      id: 'sr2', code: 'XSTH20261030002', status: 'approved', statusText: '已审核', date: '2026-10-30',
      partner: '宁波传动', warehouse: '成品仓', contract: 'HT20261020008',
      qty: 2, amount: 1600, lineCount: 1,
      lines: [{ name: '减速机', qty: 2, amount: 1600 }],
    }),
  ],
  'in-other': [
    bill({
      id: 'eo1', code: 'QTRK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      warehouse: '原料仓', qty: 30, lineCount: 1,
      lines: [{ name: '辅料包', qty: 30 }],
      note: '盘盈入库',
    }),
    bill({
      id: 'eo2', code: 'QTRK20261028005', status: 'approved', statusText: '已审核', date: '2026-10-28',
      warehouse: '铁仓', qty: 10, lineCount: 1,
      lines: [{ name: '包装纸箱', qty: 10 }],
    }),
  ],
  'out-sale': [
    bill({
      id: 'so1', code: 'HTCK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      partner: '杭州精工机电有限公司', warehouse: '成品仓', qty: 24, amount: 18720,
      product: '伺服电机 1.5kW × 24',
    }),
    bill({
      id: 'so2', code: 'HTCK20261031006', status: 'approved', statusText: '已审核', date: '2026-10-31',
      partner: '宁波传动科技', warehouse: '成品仓', qty: 12, amount: 9600,
      product: '减速机 i=20 × 12',
    }),
    bill({
      id: 'so3', code: 'HTCK20261028003', status: 'draft', statusText: '草稿', date: '2026-10-28',
      partner: '苏州精工', warehouse: '成品仓', qty: 8, amount: 6400,
      product: '联轴器 × 8',
    }),
  ],
  'out-produce': [
    bill({
      id: 'po1', code: 'SCCK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      workOrder: 'JG20261028012', warehouse: '原料仓', qty: 48, lineCount: 2,
      lines: [
        { name: '铝合金壳体', spec: 'A型', qty: 24 },
        { name: '轴承 6205', qty: 24 },
      ],
    }),
    bill({
      id: 'po2', code: 'SCCK20261031007', status: 'approved', statusText: '已审核', date: '2026-10-31',
      workOrder: 'JG20261025007', warehouse: '原料仓', qty: 40, lineCount: 1,
      lines: [{ name: '齿轮坯料', spec: '模数2', qty: 40 }],
    }),
    bill({
      id: 'po3', code: 'SCCK20261029001', status: 'draft', statusText: '草稿', date: '2026-10-29',
      workOrder: 'JG20261022001', warehouse: '线边仓', qty: 16, lineCount: 1,
      lines: [{ name: '紧固件套装', qty: 16 }],
    }),
  ],
  'out-purchase': [
    bill({
      id: 'pr1', code: 'CGTH20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      partner: '宁波拉链供应链', warehouse: '铁仓', qty: 20, amount: 200, lineCount: 1,
      lines: [{ name: '尼龙拉链', spec: '规格5#', qty: 20, amount: 200 }],
    }),
    bill({
      id: 'pr2', code: 'CGTH20261030004', status: 'approved', statusText: '已审核', date: '2026-10-30',
      partner: '上海智联', warehouse: '航智联', qty: 5, amount: 50, lineCount: 1,
      lines: [{ name: '金属扣', qty: 5, amount: 50 }],
    }),
  ],
  'out-other': [
    bill({
      id: 'oo1', code: 'QTCK20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      warehouse: '原料仓', qty: 8, lineCount: 1,
      lines: [{ name: '报废辅料', qty: 8 }],
      note: '报废出库',
    }),
    bill({
      id: 'oo2', code: 'QTCK20261027002', status: 'approved', statusText: '已审核', date: '2026-10-27',
      warehouse: '铁仓', qty: 3, lineCount: 1,
      lines: [{ name: '样品领用', qty: 3 }],
    }),
  ],
  transfer: [
    bill({
      id: 't1', code: 'KCDB20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      fromWh: '原料仓', toWh: '线边仓', qty: 60, lineCount: 2,
      lines: [
        { name: '轴承座组件', spec: 'B型', qty: 30 },
        { name: '法兰环', qty: 30 },
      ],
    }),
    bill({
      id: 't2', code: 'KCDB20261031003', status: 'approved', statusText: '已审核', date: '2026-10-31',
      fromWh: '铁仓', toWh: '半成品仓', qty: 20, lineCount: 1,
      lines: [{ name: '壳体毛坯', qty: 20 }],
    }),
    bill({
      id: 't3', code: 'KCDB20261028001', status: 'draft', statusText: '草稿', date: '2026-10-28',
      fromWh: '成品仓', toWh: '铁仓', qty: 4, lineCount: 1,
      lines: [{ name: '伺服电机', qty: 4 }],
    }),
  ],
  check: [
    bill({
      id: 'c1', code: 'KCPD20261101001', status: 'pending', statusText: '待审核', date: '2026-11-01',
      warehouse: '原料仓', lineCount: 2, qty: -6,
      lines: [
        { name: '轴承 6205', book: 100, actual: 98, diff: -2 },
        { name: '铝棒 Φ30', book: 50, actual: 46, diff: -4 },
      ],
    }),
    bill({
      id: 'c2', code: 'KCPD20261030002', status: 'approved', statusText: '已审核', date: '2026-10-30',
      warehouse: '铁仓', lineCount: 1, qty: 2,
      lines: [{ name: '尼龙拉链', book: 200, actual: 202, diff: 2 }],
    }),
    bill({
      id: 'c3', code: 'KCPD20261028001', status: 'draft', statusText: '草稿', date: '2026-10-28',
      warehouse: '成品仓', lineCount: 1, qty: 0,
      lines: [{ name: '减速机', book: 12, actual: 12, diff: 0 }],
    }),
  ],
  flow: [
    bill({
      id: 'fl1', code: 'CGRK20261101012', status: 'exempt', statusText: '', date: '2026-11-01',
      time: '2026-11-01 14:20', direction: 'in', docType: '采购入库', warehouse: '原料仓',
      product: '轴承座组件 B型', qty: 40, balance: 158,
    }),
    bill({
      id: 'fl2', code: 'XSCK20261101008', status: 'exempt', statusText: '', date: '2026-11-01',
      time: '2026-11-01 11:05', direction: 'out', docType: '销售出库', warehouse: '成品仓',
      product: '伺服电机 1.5kW', qty: 12, balance: 36,
    }),
    bill({
      id: 'fl3', code: 'SCLL20261031101', status: 'exempt', statusText: '', date: '2026-10-31',
      time: '2026-10-31 16:40', direction: 'out', docType: '生产领料', warehouse: '原料仓',
      product: '铝合金壳体 A型', qty: 24, balance: 80,
    }),
  ],
  'warehouse-list': [
    bill({
      id: 'w1', code: 'CK0001', status: 'exempt', statusText: '启用', date: '',
      product: '原料仓', manager: '张工', address: '浙江省杭州市余杭区 工业园区A栋',
      note: '主原料存放', active: true,
    }),
    bill({
      id: 'w2', code: 'CK0002', status: 'exempt', statusText: '启用', date: '',
      product: '成品仓', manager: '李工', address: '浙江省杭州市余杭区 工业园区B栋',
      note: '成品发运', active: true,
    }),
    bill({
      id: 'w3', code: 'CK0003', status: 'exempt', statusText: '启用', date: '',
      product: '半成品仓', manager: '王工', address: '浙江省杭州市余杭区 工业园区C栋',
      note: '', active: true,
    }),
  ],
};

export type UpstreamOption = {
  id: string;
  title: string;
  sub?: string;
};

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  purchase_order: [
    { id: 'po-a', title: 'CG20261028001', sub: '宁波拉链供应链 · 未完成入库' },
    { id: 'po-b', title: 'CG20261025012', sub: '上海智联 · 未完成入库' },
    { id: 'po-c', title: 'CG20261020003', sub: '苏州精工 · 部分入库' },
  ],
  work_order: [
    { id: 'wo-a', title: 'JG20261028012', sub: '轴承座毛坯 · 计划 100' },
    { id: 'wo-b', title: 'JG20261025007', sub: '齿轮半成品 · 计划 80' },
    { id: 'wo-c', title: 'JG20261022001', sub: '壳体毛坯 · 计划 36' },
  ],
  contract: [
    { id: 'ct-a', title: 'HT20261028001', sub: '杭州精工机电 · 待出库 24' },
    { id: 'ct-b', title: 'HT20261020008', sub: '宁波传动 · 待出库 12' },
    { id: 'ct-c', title: 'HT20261015002', sub: '苏州精工 · 待出库 8' },
  ],
  purchase_receipt: [
    { id: 'rc-a', title: 'RK20261101001', sub: '宁波拉链供应链 · 铁仓' },
    { id: 'rc-b', title: 'RK20261031008', sub: '上海智联 · 航智联' },
  ],
  shipment: [
    { id: 'sh-a', title: 'HTCK20261101001', sub: '杭州精工机电 · 24件' },
    { id: 'sh-b', title: 'HTCK20261031006', sub: '宁波传动 · 12件' },
  ],
  io_type_in: [
    { id: 'tin-a', title: '盘盈入库', sub: '其他入库类型' },
    { id: 'tin-b', title: '调拨入库', sub: '其他入库类型' },
    { id: 'tin-c', title: '样品入库', sub: '其他入库类型' },
  ],
  io_type_out: [
    { id: 'tout-a', title: '报废出库', sub: '其他出库类型' },
    { id: 'tout-b', title: '样品领用', sub: '其他出库类型' },
    { id: 'tout-c', title: '盘亏出库', sub: '其他出库类型' },
  ],
};
