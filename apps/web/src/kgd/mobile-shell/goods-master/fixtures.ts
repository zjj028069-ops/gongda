/** 空库夹具：只服务 C5 手机皮验收，不写业务库 */

export type BomLine = {
  short: string;
  name: string;
  qty: number;
};

export type RouteStep = {
  name: string;
};

export type FixtureRow = {
  id: string;
  code: string;
  name: string;
  status: 'enabled' | 'disabled' | 'running' | 'idle' | 'maintain' | 'alarm';
  statusText: string;
  category?: string;
  categoryTone?: 'raw' | 'semi' | 'fg' | 'other';
  spec?: string;
  unit?: string;
  stock?: number;
  stockMin?: number;
  stockMax?: number;
  price?: number;
  cost?: number;
  stagnantDays?: number;
  source?: string;
  product?: string;
  date?: string;
  lines?: BomLine[];
  lineCount?: number;
  location?: string;
  utilRate?: number;
  owner?: string;
  processName?: string;
  processCode?: string;
  pricing?: string;
  wage?: string;
  hours?: string;
  workshop?: string;
  headcount?: number;
  staff?: string;
  tasks?: string;
  versionLabel?: string;
  steps?: RouteStep[];
  extraType?: 'report' | 'qc';
  bindProcess?: string;
  settingKey?: string;
  settingDesc?: string;
  settingValue?: string;
  settingOn?: boolean;
  active?: boolean;
  iconGlyph?: string;
};

function row(partial: FixtureRow): FixtureRow {
  return partial;
}

export type UpstreamOption = { id: string; title: string; sub?: string };

export const UPSTREAM_FIXTURES: Record<string, UpstreamOption[]> = {
  goods: [
    { id: 'ug1', title: '液压电磁换向阀组件', sub: 'SP202610300101 · 成品' },
    { id: 'ug2', title: '交流伺服电机 400W', sub: 'SP202610300088 · 半成品' },
    { id: 'ug3', title: '深沟球轴承 6205-2RS', sub: 'SP202610300055 · 原材料' },
  ],
  route_goods: [
    { id: 'urg1', title: '液压泵站总成', sub: '可复制路线 GY-001' },
    { id: 'urg2', title: '伺服驱动单元', sub: '可复制路线 GY-002' },
  ],
  process: [
    { id: 'up1', title: '精车', sub: 'GX-001 · 启用' },
    { id: 'up2', title: '检验', sub: 'GX-005 · 启用' },
    { id: 'up3', title: '焊接', sub: 'GX-002 · 启用' },
  ],
  person: [
    { id: 'upe1', title: '张师傅', sub: '第一车间 · CNC' },
    { id: 'upe2', title: '李工', sub: '第二车间 · 装配' },
    { id: 'upe3', title: '王工', sub: '质检中心' },
  ],
  craft_template: [
    { id: 'ut1', title: '机械加工标准工序', sub: '计价 · 32 元/件' },
    { id: 'ut2', title: '焊接标准工序', sub: '计价 · 28.50 元/件' },
  ],
};

export const FIXTURES: Record<string, FixtureRow[]> = {
  'goods-list': [
    row({
      id: 'g1', code: 'SP202610300001', name: '四合扣', status: 'enabled', statusText: '启用',
      category: '原材料', categoryTone: 'raw', spec: 'Φ12 铜质', unit: '个', stock: 1280, stockMin: 200, stockMax: 5000,
      iconGlyph: '料',
    }),
    row({
      id: 'g2', code: 'SP202610300002', name: '测试PRM商品', status: 'enabled', statusText: '启用',
      category: '半成品', categoryTone: 'semi', spec: 'PRM-试验件', unit: '件', stock: 36, stockMin: 10, stockMax: 200,
      iconGlyph: '半',
    }),
    row({
      id: 'g3', code: 'SP202610300003', name: '尼龙拉链', status: 'enabled', statusText: '启用',
      category: '成品', categoryTone: 'fg', spec: '5# 闭尾 20cm', unit: '条', stock: 6, stockMin: 20, stockMax: 800,
      iconGlyph: '成',
    }),
    row({
      id: 'g4', code: 'SP202610300101', name: '深沟球轴承 6205-2RS', status: 'enabled', statusText: '启用',
      category: '原材料', categoryTone: 'raw', spec: '内径25×外径52×宽15', unit: '套', stock: 1280, stockMin: 200, stockMax: 5000,
      iconGlyph: '轴',
    }),
  ],
  bom: [
    row({
      id: 'b1', code: 'BOM20261030001', name: '液压泵站总成BOM', status: 'enabled', statusText: '启用',
      category: '成品', categoryTone: 'fg', product: '液压电磁换向阀组件', date: '2026-10-28',
      lines: [
        { short: '轴承', name: '深沟球轴承 6205', qty: 2 },
        { short: '阀', name: '液压电磁换向阀', qty: 1 },
        { short: '圈', name: '密封圈', qty: 4 },
      ],
      lineCount: 7,
    }),
    row({
      id: 'b2', code: 'BOM20261030002', name: '伺服驱动单元BOM', status: 'disabled', statusText: '停用',
      category: '半成品', categoryTone: 'semi', product: '交流伺服电机 400W', date: '2026-10-27',
      lines: [
        { short: '电机', name: '交流伺服电机 400W', qty: 1 },
        { short: '编', name: '编码器', qty: 1 },
        { short: '联', name: '联轴器', qty: 2 },
      ],
      lineCount: 4,
    }),
  ],
  'goods-base': [
    row({
      id: 's1', code: 'dup', name: '商品重名检查', status: 'enabled', statusText: '开',
      settingKey: 'dup_name', settingDesc: '开启后，重名商品将无法录入到系统', settingOn: true, settingValue: '基础开关',
    }),
    row({
      id: 's2', code: 'auto', name: '商品编号自动填写', status: 'enabled', statusText: '开',
      settingKey: 'auto_code', settingDesc: '开启后，商品编号为空时会自动填写', settingOn: true, settingValue: '基础开关',
    }),
    row({
      id: 's3', code: 'scan', name: '扫码查看需登录', status: 'disabled', statusText: '关',
      settingKey: 'scan_login', settingDesc: '开启后，扫描商品二维码需登录才能查看', settingOn: false, settingValue: '基础开关',
    }),
    row({
      id: 's4', code: 'cat', name: '商品类别', status: 'enabled', statusText: '5 项',
      settingKey: 'categories', settingDesc: '成品 / 半成品 / 毛坯 / 包材配件 / 外协加工', settingValue: '类别树',
    }),
    row({
      id: 's5', code: 'bomcat', name: 'BOM配比类别', status: 'enabled', statusText: '下滚可见',
      settingKey: 'bom_categories', settingDesc: '成品 / 半成品', settingValue: '类别树',
    }),
  ],
  machine: [
    row({
      id: 'm1', code: 'CNC-01', name: '立式加工中心', status: 'running', statusText: '运行',
      location: '一车间A线', processName: '机械加工', processCode: 'JG20261028001', utilRate: 86, owner: '张工',
      iconGlyph: '机',
    }),
    row({
      id: 'm2', code: 'CNC-02', name: '数控车床', status: 'idle', statusText: '空闲',
      location: '一车间B线', processName: '—', utilRate: 0, owner: '李工',
      iconGlyph: '机',
    }),
    row({
      id: 'm3', code: 'LAT-03', name: '普通车床', status: 'maintain', statusText: '维修中',
      location: '二车间', processName: '—', utilRate: 0, owner: '王工',
      iconGlyph: '修',
    }),
  ],
  process: [
    row({
      id: 'p1', code: 'GX-001', name: '机械加工', status: 'enabled', statusText: '启用',
      pricing: '计价', wage: '32.00 元/件', hours: '0.50 工时',
    }),
    row({
      id: 'p2', code: 'GX-002', name: '焊接', status: 'enabled', statusText: '启用',
      pricing: '计价', wage: '28.50 元/件', hours: '0.40 工时',
    }),
    row({
      id: 'p3', code: 'GX-003', name: '热处理', status: 'disabled', statusText: '停用',
      pricing: '计价', wage: '18.00 元/件', hours: '0.60 工时',
    }),
    row({
      id: 'p4', code: 'GX-004', name: '装配', status: 'enabled', statusText: '启用',
      pricing: '计价', wage: '22.00 元/件', hours: '0.35 工时',
    }),
    row({
      id: 'p5', code: 'GX-005', name: '试压', status: 'enabled', statusText: '启用',
      pricing: '计价', wage: '15.00 元/件', hours: '0.25 工时',
    }),
  ],
  post: [
    row({
      id: 'po1', code: 'GW-001', name: 'CNC车床操作岗', status: 'enabled', statusText: '启用',
      workshop: '第一车间', headcount: 8, staff: '张师傅 / 李工 / 王工',
      tasks: 'CNC车削 · 首检 · 尺寸检测', iconGlyph: '床',
    }),
    row({
      id: 'po2', code: 'GW-002', name: '数控铣床操作岗', status: 'enabled', statusText: '启用',
      workshop: '第一车间', headcount: 6, staff: '陈工 / 刘工 / 孙工',
      tasks: '铣削 · 装夹 · 表面检验', iconGlyph: '铣',
    }),
    row({
      id: 'po3', code: 'GW-003', name: '装配调试岗', status: 'enabled', statusText: '启用',
      workshop: '第二车间', headcount: 7, staff: '周工 / 吴工 / 郑工',
      tasks: '部件装配 · 校准 · 功能测试', iconGlyph: '装',
    }),
    row({
      id: 'po4', code: 'GW-004', name: '质量检验岗', status: 'enabled', statusText: '启用',
      workshop: '质检中心', headcount: 5, staff: '赵工 / 钱工 / 孙工',
      tasks: '来料检 · 巡检 · 不良判定', iconGlyph: '质',
    }),
    row({
      id: 'po5', code: 'GW-005', name: '物料配送岗', status: 'disabled', statusText: '停用',
      workshop: '物流车间', headcount: 4, staff: '冯工 / 卫工',
      tasks: '物料配送 · 工位补料 · 库存反馈', iconGlyph: '物',
    }),
  ],
  route: [
    row({
      id: 'r1', code: 'GY-001', name: '液压泵站标准工艺', status: 'enabled', statusText: '启用',
      product: '液压泵站总成', versionLabel: 'V1.0',
      steps: [
        { name: '下料' }, { name: '粗车' }, { name: '精车' }, { name: '热处理' }, { name: '检验' },
      ],
    }),
    row({
      id: 'r2', code: 'GY-002', name: '伺服驱动单元工艺', status: 'disabled', statusText: '停用',
      product: '伺服驱动单元', versionLabel: 'V1.1',
      steps: [
        { name: '下料' }, { name: '粗车' }, { name: '精车' }, { name: '热处理' }, { name: '检验' },
      ],
    }),
  ],
  extra: [
    row({
      id: 'e1', code: 'ZJ-001', name: '刀具磨损记录', status: 'enabled', statusText: '启用',
      bindProcess: '精车', extraType: 'report',
    }),
    row({
      id: 'e2', code: 'ZJ-002', name: '首件检验表', status: 'enabled', statusText: '启用',
      bindProcess: '检验', extraType: 'qc',
    }),
    row({
      id: 'e3', code: 'ZJ-003', name: '粗车参数确认', status: 'enabled', statusText: '启用',
      bindProcess: '粗车', extraType: 'report',
    }),
    row({
      id: 'e4', code: 'ZJ-004', name: '焊接变形检查', status: 'enabled', statusText: '启用',
      bindProcess: '焊接', extraType: 'qc',
    }),
    row({
      id: 'e5', code: 'ZJ-005', name: '试压压力记录', status: 'enabled', statusText: '启用',
      bindProcess: '试压', extraType: 'report',
    }),
    row({
      id: 'e6', code: 'ZJ-006', name: '旧版质检附加', status: 'disabled', statusText: '停用',
      bindProcess: '检验', extraType: 'qc',
    }),
  ],
};
