import type { C5LeafDef } from './c5Registry';
import type { FixtureRow, BomLine, RouteStep } from './fixtures';

function text(v: unknown, fallback = '') {
  if (v == null) return fallback;
  return String(v);
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function categoryTone(label: string): FixtureRow['categoryTone'] {
  if (label.includes('成品') && !label.includes('半')) return 'fg';
  if (label.includes('半')) return 'semi';
  if (label.includes('原') || label.includes('料')) return 'raw';
  return 'other';
}

function mapGoods(item: Record<string, unknown>): FixtureRow {
  const category = text(item.category_name || item.category || item.goods_type || '原材料');
  const stock = num(item.available_qty ?? item.stock_qty ?? item.qty);
  const stockMin = num(item.min_stock ?? item.stock_min);
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.product_code, '—'),
    name: text(item.name || item.product_name, '未命名商品'),
    status: item.active === false ? 'disabled' : 'enabled',
    statusText: item.active === false ? '停用' : '启用',
    category,
    categoryTone: categoryTone(category),
    spec: text(item.spec || item.specification || ''),
    unit: text(item.unit_name || item.unit || ''),
    stock,
    stockMin,
    stockMax: num(item.max_stock ?? item.stock_max),
    iconGlyph: Array.from(text(item.name, '品'))[0] || '品',
  };
}

function mapBom(item: Record<string, unknown>): FixtureRow {
  const category = text(item.category || item.bom_category || '成品');
  const rawLines = Array.isArray(item.items) ? item.items : Array.isArray(item.lines) ? item.lines : [];
  const lines: BomLine[] = rawLines.slice(0, 6).map((line: Record<string, unknown>, idx: number) => ({
    short: Array.from(text(line.name || line.product_name || '件'))[0] || String(idx + 1),
    name: text(line.name || line.product_name || line.child_name, '子件'),
    qty: num(line.quantity ?? line.qty) ?? 1,
  }));
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.bom_code, 'BOM'),
    name: text(item.name || item.parent_name || 'BOM'),
    status: item.active === false ? 'disabled' : 'enabled',
    statusText: item.active === false ? '停用' : '启用',
    category,
    categoryTone: categoryTone(category),
    product: text(item.parent_name || item.product_name || ''),
    date: text(item.updated_at || item.created_at || '').slice(0, 10),
    lines,
    lineCount: num(item.item_count) ?? lines.reduce((n, l) => n + l.qty, 0),
  };
}

function mapMachine(item: Record<string, unknown>): FixtureRow {
  const statusRaw = text(item.status || item.run_status || 'idle').toLowerCase();
  let status: FixtureRow['status'] = 'idle';
  let statusText = '空闲';
  if (statusRaw.includes('run') || statusRaw.includes('运行')) {
    status = 'running';
    statusText = '运行';
  } else if (statusRaw.includes('maint') || statusRaw.includes('修')) {
    status = 'maintain';
    statusText = '维修中';
  }
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.machine_code, 'M'),
    name: text(item.name || item.machine_name, '机台'),
    status,
    statusText,
    location: text(item.shop_name || item.line_name || item.location || ''),
    processName: text(item.current_process_name || item.process_name || '—'),
    processCode: text(item.current_process_code || ''),
    utilRate: num(item.utilization ?? item.util_rate),
    owner: text(item.owner_name || item.manager_name || ''),
    iconGlyph: status === 'maintain' ? '修' : '机',
  };
}

function mapProcess(item: Record<string, unknown>): FixtureRow {
  const active = item.active !== false;
  const pricing = text(item.pricing_mode) === 'time' ? '计时' : '计价';
  const wage = item.wage_rate != null ? `${text(item.wage_rate)} 元/${pricing === '计时' ? '时' : '件'}` : '—';
  const minutes = num(item.standard_minutes);
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'GX'),
    name: text(item.name, '工序'),
    status: active ? 'enabled' : 'disabled',
    statusText: active ? '启用' : '停用',
    pricing,
    wage,
    hours: minutes != null ? `${(minutes / 60).toFixed(2)} 工时` : '—',
  };
}

function mapStation(item: Record<string, unknown>): FixtureRow {
  const active = item.active !== false && text(item.status) !== 'disabled';
  const staffNames = Array.isArray(item.staff_names)
    ? item.staff_names.map((x: unknown) => text(x)).join(' / ')
    : text(item.staff || item.members || '');
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.station_code, 'GW'),
    name: text(item.name || item.station_name, '岗位'),
    status: active ? 'enabled' : 'disabled',
    statusText: active ? '启用' : '停用',
    workshop: text(item.shop_name || item.workshop || ''),
    headcount: num(item.headcount ?? item.member_count) ?? 0,
    staff: staffNames,
    tasks: text(item.process_names || item.tasks || item.note || ''),
    iconGlyph: Array.from(text(item.name, '岗'))[0] || '岗',
  };
}

function mapRoute(item: Record<string, unknown>): FixtureRow {
  const active = item.active !== false;
  const rawSteps = Array.isArray(item.steps) ? item.steps : Array.isArray(item.process_steps) ? item.process_steps : [];
  const steps: RouteStep[] = rawSteps.map((step: Record<string, unknown>) => ({
    name: text(step.name || step.process_name || step.title, '工序'),
  }));
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'GY'),
    name: text(item.name, '工艺路线'),
    status: active ? 'enabled' : 'disabled',
    statusText: active ? '启用' : '停用',
    product: text(item.product_name || item.goods_name || ''),
    versionLabel: item.current_revision != null ? `V${item.current_revision}.0` : text(item.version_label || 'V1.0'),
    steps: steps.length ? steps : undefined,
  };
}

function mapExtra(item: Record<string, unknown>): FixtureRow {
  const active = item.active !== false;
  const type = text(item.kind || item.type || item.component_type || '').toLowerCase();
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'ZJ'),
    name: text(item.title || item.name, '附加组件'),
    status: active ? 'enabled' : 'disabled',
    statusText: active ? '启用' : '停用',
    bindProcess: text(item.process_name || item.bind_process || ''),
    extraType: type.includes('qc') || type.includes('质') ? 'qc' : 'report',
  };
}

function cryptoRandom() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

export function mapApiItems(leaf: C5LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  if (!items?.length) return [];
  return items.map((item) => {
    switch (leaf.key) {
      case 'goods-list':
        return mapGoods(item);
      case 'bom':
        return mapBom(item);
      case 'machine':
        return mapMachine(item);
      case 'process':
        return mapProcess(item);
      case 'post':
        return mapStation(item);
      case 'route':
        return mapRoute(item);
      case 'extra':
        return mapExtra(item);
      default:
        return {
          id: text(item.id, cryptoRandom()),
          code: text(item.code, '—'),
          name: text(item.name || item.title, '—'),
          status: 'enabled',
          statusText: '启用',
        };
    }
  });
}
