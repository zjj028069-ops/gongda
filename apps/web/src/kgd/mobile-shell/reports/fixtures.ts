/** 空库夹具数据：只撑版型，文案不上屏 */

export type C7Metric = { label: string; value: string; tone?: 'accent' | 'warn' | 'ok' | 'mute' };

export type C7Row = {
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  date?: string;
  status?: string;
  statusTone?: 'pending' | 'ok' | 'draft' | 'mute';
  partner?: string;
  meta?: string;
  amount?: string;
  qty?: string;
  metrics?: C7Metric[];
  lines?: { name: string; value: string }[];
  /** 大屏 */
  layout?: string;
  module?: string;
  description?: string;
  screenId?: string;
  accessPassword?: string;
  /** 搜索拼合 */
  blob?: string;
};

function row(partial: C7Row): C7Row {
  const blob = [partial.title, partial.subtitle, partial.code, partial.partner, partial.meta, partial.module]
    .filter(Boolean)
    .join(' ');
  return { ...partial, blob };
}

const PERIOD_ROWS = (prefix: string): C7Row[] => [
  row({
    id: `${prefix}-1`,
    title: '本月汇总',
    subtitle: '关键指标',
    date: '2026-11',
    metrics: [
      { label: '合计', value: '12,860', tone: 'accent' },
      { label: '环比', value: '+6.2%', tone: 'ok' },
      { label: '同比', value: '-1.4%', tone: 'warn' },
    ],
  }),
  row({
    id: `${prefix}-2`,
    title: '上周汇总',
    subtitle: '关键指标',
    date: '2026-10 W4',
    metrics: [
      { label: '合计', value: '3,240', tone: 'accent' },
      { label: '良品率', value: '98.2%', tone: 'ok' },
      { label: '不良', value: '58', tone: 'warn' },
    ],
  }),
  row({
    id: `${prefix}-3`,
    title: '今日快览',
    subtitle: '实时',
    date: '2026-11-03',
    metrics: [
      { label: '产量', value: '420', tone: 'accent' },
      { label: '在制', value: '86' },
      { label: '待办', value: '12', tone: 'mute' },
    ],
  }),
];

export const C7_FIXTURES: Record<string, C7Row[]> = {
  'screen-manage': [
    row({
      id: 'sc1',
      title: '生产看板',
      layout: '默认',
      module: '生产',
      description: '产线实时产量与良率',
      screenId: 'fixture-screen-prod',
      accessPassword: '',
    }),
    row({
      id: 'sc2',
      title: '质量总览',
      layout: '双栏',
      module: '质量',
      description: '不良趋势与柏拉图',
      screenId: 'fixture-screen-qc',
      accessPassword: 'demo',
    }),
    row({
      id: 'sc3',
      title: '仓储大屏',
      layout: '默认',
      module: '仓储',
      description: '库存水位与出入库',
      screenId: 'fixture-screen-wh',
    }),
  ],
  'report-machine': [
    row({
      id: 'm1', code: 'JT-01', title: '数控铣床 A1', subtitle: '一车间 · 一线',
      status: '运行中', statusTone: 'ok', date: '本月',
      lines: [
        { name: '报工数', value: '1,280' },
        { name: '良品', value: '1,246' },
        { name: '不良', value: '34' },
      ],
      amount: '良率 97.3%',
    }),
    row({
      id: 'm2', code: 'JT-08', title: '装配工位 B3', subtitle: '二车间 · 二线',
      status: '待机', statusTone: 'pending', date: '本月',
      lines: [
        { name: '报工数', value: '860' },
        { name: '良品', value: '852' },
        { name: '工时', value: '126h' },
      ],
      amount: '良率 99.1%',
    }),
  ],
  'report-output': PERIOD_ROWS('out'),
  'report-wip': [
    row({
      id: 'w1', code: 'WO-20261101', title: '导轨总成', subtitle: '生产中',
      status: '生产中', statusTone: 'ok', partner: '自产',
      lines: [
        { name: '计划', value: '500' },
        { name: '良品', value: '320' },
        { name: '待产', value: '180' },
      ],
    }),
    row({
      id: 'w2', code: 'WO-20261028', title: '防护罩组件', subtitle: '未开始',
      status: '未开始', statusTone: 'draft',
      lines: [
        { name: '计划', value: '200' },
        { name: '良品', value: '0' },
        { name: '待产', value: '200' },
      ],
    }),
  ],
  'report-clock': [
    row({
      id: 'c1', code: '打卡', title: '张三 · 精加工', subtitle: 'WO-20261101',
      date: '09:12 → 12:05', meta: '区间 2h53m', partner: '生产一部',
      status: '上班', statusTone: 'ok',
    }),
    row({
      id: 'c2', code: '打卡', title: '李四 · 装配', subtitle: 'WO-20261028',
      date: '13:00 → 17:20', meta: '区间 4h20m', partner: '生产二部',
      status: '下班', statusTone: 'mute',
    }),
  ],
  'report-defect-trend': PERIOD_ROWS('dt'),
  'report-pareto': [
    row({
      id: 'pa1', title: '尺寸超差', subtitle: '柏拉图 Top1',
      metrics: [
        { label: '次数', value: '86', tone: 'warn' },
        { label: '占比', value: '42%', tone: 'accent' },
        { label: '累计', value: '42%', tone: 'ok' },
      ],
    }),
    row({
      id: 'pa2', title: '表面划伤', subtitle: '柏拉图 Top2',
      metrics: [
        { label: '次数', value: '54', tone: 'warn' },
        { label: '占比', value: '26%', tone: 'accent' },
        { label: '累计', value: '68%', tone: 'ok' },
      ],
    }),
    row({
      id: 'pa3', title: '装配偏差', subtitle: '柏拉图 Top3',
      metrics: [
        { label: '次数', value: '28' },
        { label: '占比', value: '14%' },
        { label: '累计', value: '82%', tone: 'ok' },
      ],
    }),
  ],
  'report-defect-detail': [
    row({
      id: 'dd1', code: 'BL-1101', title: '尺寸超差', subtitle: 'WO-20261101 · 精加工',
      date: '2026-11-01', status: '已登记', statusTone: 'pending',
      lines: [
        { name: '不良数', value: '12' },
        { name: '操作员', value: '张三' },
      ],
    }),
    row({
      id: 'dd2', code: 'BL-1102', title: '表面划伤', subtitle: 'WO-20261028 · 装配',
      date: '2026-10-28', status: '已登记', statusTone: 'ok',
      lines: [
        { name: '不良数', value: '5' },
        { name: '操作员', value: '李四' },
      ],
    }),
  ],
  'report-iqc': PERIOD_ROWS('iqc').map((item, i) => ({
    ...item,
    title: i === 0 ? '来料合格率' : i === 1 ? '抽检批次' : '供应商异常',
    metrics: i === 0
      ? [{ label: '合格率', value: '97.8%', tone: 'ok' }, { label: '批次', value: '46' }, { label: '不合格', value: '1', tone: 'warn' }]
      : item.metrics,
  })),
  'report-sample': PERIOD_ROWS('sm').map((item, i) => ({
    ...item,
    title: i === 0 ? '抽检覆盖' : i === 1 ? '工序合格率' : '人员抽检',
  })),
  'report-scrap': [
    row({
      id: 'sr1', title: '报废汇总', subtitle: '本月',
      metrics: [
        { label: '报废', value: '36', tone: 'warn' },
        { label: '返工', value: '58', tone: 'accent' },
        { label: '报废率', value: '1.2%' },
      ],
    }),
    row({
      id: 'sr2', title: '精加工 · 报废', subtitle: '工序',
      metrics: [
        { label: '报废', value: '18', tone: 'warn' },
        { label: '返工', value: '22' },
        { label: '占比', value: '50%' },
      ],
    }),
  ],
  'report-maint-analysis': [
    row({
      id: 'ma1', title: '一班维修组', subtitle: '设备维修分析',
      metrics: [
        { label: '设备数', value: '24', tone: 'accent' },
        { label: '次数', value: '18' },
        { label: '完成', value: '16', tone: 'ok' },
      ],
    }),
    row({
      id: 'ma2', title: '二班维修组', subtitle: '设备维修分析',
      metrics: [
        { label: '设备数', value: '18', tone: 'accent' },
        { label: '次数', value: '11' },
        { label: '完成', value: '10', tone: 'ok' },
      ],
    }),
  ],
  'report-maint-workload': [
    row({
      id: 'mw1', title: '一班 · 工作量',
      metrics: [
        { label: '人数', value: '6' },
        { label: '完成', value: '42', tone: 'ok' },
        { label: '合计', value: '48', tone: 'accent' },
      ],
    }),
    row({
      id: 'mw2', title: '二班 · 工作量',
      metrics: [
        { label: '人数', value: '5' },
        { label: '完成', value: '31', tone: 'ok' },
        { label: '合计', value: '36', tone: 'accent' },
      ],
    }),
  ],
  'report-maint-plan': [
    row({
      id: 'mp1', title: '月度润滑计划', subtitle: '周期维保',
      metrics: [
        { label: '设备', value: '32' },
        { label: '应做', value: '32' },
        { label: '完成率', value: '94%', tone: 'ok' },
      ],
    }),
    row({
      id: 'mp2', title: '季度点检', subtitle: '周期维保',
      metrics: [
        { label: '设备', value: '48' },
        { label: '应做', value: '48' },
        { label: '完成率', value: '88%', tone: 'accent' },
      ],
    }),
  ],
  'report-purchase': [
    row({
      id: 'pu1', code: 'CGDZ-1101', title: '宁波拉链供应链', subtitle: '采购对账',
      date: '2026-11', status: '待确认', statusTone: 'pending',
      amount: '¥28,600',
      lines: [
        { name: '应付', value: '¥28,600' },
        { name: '已付', value: '¥10,000' },
        { name: '余额', value: '¥18,600' },
      ],
    }),
    row({
      id: 'pu2', code: 'CGDZ-1028', title: '上海智联', subtitle: '采购对账',
      date: '2026-10', status: '已确认', statusTone: 'ok',
      amount: '¥12,400',
      lines: [
        { name: '应付', value: '¥12,400' },
        { name: '已付', value: '¥12,400' },
        { name: '余额', value: '¥0' },
      ],
    }),
  ],
  'report-sales': [
    row({
      id: 'sa1', code: 'XSDZ-1102', title: '华东机械', subtitle: '销售对账',
      date: '2026-11', status: '待确认', statusTone: 'pending',
      amount: '¥86,000',
      lines: [
        { name: '应收', value: '¥86,000' },
        { name: '已收', value: '¥40,000' },
        { name: '余额', value: '¥46,000' },
      ],
    }),
    row({
      id: 'sa2', code: 'XSDZ-1020', title: '南方轨道', subtitle: '销售对账',
      date: '2026-10', status: '已确认', statusTone: 'ok',
      amount: '¥52,300',
      lines: [
        { name: '应收', value: '¥52,300' },
        { name: '已收', value: '¥52,300' },
        { name: '余额', value: '¥0' },
      ],
    }),
  ],
  'report-contract': [
    row({
      id: 'ct1', code: 'HT-2026-088', title: '导轨年度框架', subtitle: '华东机械',
      date: '2026-01~12', status: '执行中', statusTone: 'ok',
      amount: '¥1,280,000',
      lines: [
        { name: '已交付', value: '¥620,000' },
        { name: '待交付', value: '¥660,000' },
      ],
    }),
    row({
      id: 'ct2', code: 'HT-2026-102', title: '防护罩批量', subtitle: '南方轨道',
      date: '2026-09~11', status: '已完成', statusTone: 'mute',
      amount: '¥186,000',
      lines: [
        { name: '已交付', value: '¥186,000' },
        { name: '待交付', value: '¥0' },
      ],
    }),
  ],
  'report-cost': [
    row({
      id: 'co1', title: 'WO-20261101 成本', subtitle: '导轨总成',
      metrics: [
        { label: '材料', value: '¥8,420', tone: 'accent' },
        { label: '人工', value: '¥2,160' },
        { label: '合计', value: '¥11,080', tone: 'ok' },
      ],
    }),
    row({
      id: 'co2', title: 'WO-20261028 成本', subtitle: '防护罩组件',
      metrics: [
        { label: '材料', value: '¥1,280', tone: 'accent' },
        { label: '人工', value: '¥640' },
        { label: '合计', value: '¥2,020', tone: 'ok' },
      ],
    }),
  ],
  'report-ai-stock': [
    row({
      id: 'ai1', code: 'P-DDR5', title: 'DDR5 内存条', subtitle: '建议补货',
      status: '偏低', statusTone: 'pending',
      lines: [
        { name: '库存', value: '48' },
        { name: '安全', value: '80' },
        { name: '建议采', value: '120' },
      ],
    }),
    row({
      id: 'ai2', code: 'P-GUARD', title: '风琴防护罩', subtitle: '水位正常',
      status: '正常', statusTone: 'ok',
      lines: [
        { name: '库存', value: '210' },
        { name: '安全', value: '60' },
        { name: '建议采', value: '0' },
      ],
    }),
  ],
  'report-inventory': [
    row({
      id: 'iv1', title: '进销存 · 本月', subtitle: '汇总',
      metrics: [
        { label: '期初', value: '12,400' },
        { label: '入库', value: '3,280', tone: 'ok' },
        { label: '出库', value: '2,960', tone: 'warn' },
      ],
    }),
    row({
      id: 'iv2', title: '导轨系列', subtitle: '品类',
      metrics: [
        { label: '期末', value: '860', tone: 'accent' },
        { label: '周转', value: '1.8' },
        { label: '金额', value: '¥96万' },
      ],
    }),
  ],
  'report-wage': [
    row({
      id: 'wg1', code: '张三', title: '张三', subtitle: '生产一部 · 计件',
      date: '2026-10', status: '已结算', statusTone: 'ok',
      amount: '¥8,640',
      lines: [
        { name: '良品工时', value: '168h' },
        { name: '计件', value: '¥7,200' },
        { name: '加班', value: '¥1,440' },
      ],
    }),
    row({
      id: 'wg2', code: '李四', title: '李四', subtitle: '生产二部 · 计时',
      date: '2026-10', status: '待质检', statusTone: 'pending',
      amount: '¥6,280',
      lines: [
        { name: '工时', value: '176h' },
        { name: '基本', value: '¥5,600' },
        { name: '补贴', value: '¥680' },
      ],
    }),
  ],
  'report-smart': [
    row({
      id: 'sm1', code: 'SR-01', title: '产量周报', subtitle: '工序维度 · 良品数',
      status: '启用', statusTone: 'ok', date: '本周',
      meta: '生产源',
    }),
    row({
      id: 'sm2', code: 'SR-02', title: '销售简报', subtitle: '客户维度 · 金额',
      status: '启用', statusTone: 'ok', date: '本月',
      meta: '经营源',
    }),
  ],
};
