import type { C1bLeafDef } from './c1bRegistry';
import type { DetailLine, FixtureRow } from './fixtures';

function text(v: unknown, fallback = '') {
  if (v == null) return fallback;
  return String(v);
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function cryptoRandom() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

function mapProject(item: Record<string, unknown>): FixtureRow {
  const statusRaw = text(item.status || '');
  let status = 'pending';
  let statusText = '未开始';
  if (statusRaw.includes('进行') || statusRaw === 'running') {
    status = 'running';
    statusText = '进行中';
  } else if (statusRaw.includes('完成') || statusRaw === 'done') {
    status = 'done';
    statusText = '已完成';
  } else if (statusRaw.includes('取消') || statusRaw === 'cancelled') {
    status = 'cancelled';
    statusText = '已取消';
  }
  const rawLines = Array.isArray(item.work_orders) ? item.work_orders : Array.isArray(item.lines) ? item.lines : [];
  const lines: DetailLine[] = rawLines.slice(0, 6).map((line: Record<string, unknown>) => ({
    short: '工',
    name: text(line.code || line.work_order_code || line.name, '加工单'),
    qty: num(line.plan_qty ?? line.qty),
    meta: text(line.status || line.status_text || ''),
  }));
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'XM'),
    name: text(item.name, '项目'),
    status,
    statusText,
    category: text(item.category || item.category_name || ''),
    contractCode: text(item.contract_code || ''),
    workOrderCount: num(item.work_order_count) ?? lines.length,
    completedWorkOrderCount: num(item.completed_work_order_count),
    planQty: num(item.plan_qty),
    progressText: text(item.production_progress || item.project_progress || item.progress_text || ''),
    date: text(item.created_text || item.updated_text || item.created_at || '').slice(0, 10),
    lines,
    lineCount: num(item.work_order_count) ?? lines.length,
    iconGlyph: '项',
  };
}

function mapMaterial(item: Record<string, unknown>): FixtureRow {
  const voided = text(item.status) === 'void' || text(item.status_text).includes('作废');
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.plan_code, 'FX'),
    name: text(item.plan_name || item.name, '物料分析'),
    status: voided ? 'void' : 'active',
    statusText: voided ? '已作废' : text(item.status_text || '有效'),
    planCode: text(item.plan_code || ''),
    planName: text(item.plan_name || ''),
    processDemand: num(item.process_demand_qty),
    outsourceDemand: num(item.outsource_demand_qty),
    purchaseDemand: num(item.purchase_demand_qty),
    owner: text(item.analyst_name || ''),
    date: text(item.analyzed_text || item.created_at || '').slice(0, 10),
    note: text(item.note || ''),
  };
}

function mapQcFull(item: Record<string, unknown>): FixtureRow {
  const raw = text(item.quality_status || item.status || '').toLowerCase();
  let status = 'pending';
  let statusText = '待质检';
  if (raw.includes('done') || raw.includes('已')) {
    status = 'done';
    statusText = '已质检';
  } else if (raw.includes('none') || raw.includes('不需')) {
    status = 'none';
    statusText = '不需质检';
  }
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.work_order_code, 'QJ'),
    name: text(item.product_name, '全检'),
    status,
    statusText,
    product: text(item.product_name || ''),
    productCode: text(item.product_code || ''),
    productSpec: text(item.product_spec || ''),
    processName: text(item.process_name || ''),
    processCode: text(item.process_code || ''),
    workOrder: text(item.work_order_code || ''),
    goodQty: num(item.good_qty),
    defectQty: num(item.defect_qty),
    reworkQty: num(item.rework_qty),
    scrapQty: num(item.scrap_qty),
    qty: num(item.qty),
    machine: text(item.machine_name || ''),
    owner: text(item.quality_name || item.operator_name || ''),
    date: text(item.quality_text || item.created_at || '').slice(0, 10),
  };
}

function mapQcSpot(item: Record<string, unknown>): FixtureRow {
  const raw = text(item.quality_status || item.status || '');
  const done = raw.includes('已') || raw.toLowerCase() === 'done';
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'CJ'),
    name: text(item.process_name || item.product_name || '抽检'),
    status: done ? 'done' : 'pending',
    statusText: done ? '已质检' : '待质检',
    product: text(item.product_name || ''),
    processName: text(item.process_name || ''),
    processCode: text(item.process_code || ''),
    workOrder: text(item.work_order_code || ''),
    qty: num(item.qty),
    goodQty: num(item.good_qty),
    defectQty: num(item.defect_qty),
    creator: text(item.creator_name || ''),
    date: text(item.created_at || '').slice(0, 10),
    note: text(item.note || ''),
  };
}

function mapQcSpotLine(item: Record<string, unknown>): FixtureRow {
  const base = mapQcSpot(item);
  const rawLines = Array.isArray(item.items) ? item.items : Array.isArray(item.lines) ? item.lines : [];
  const lines: DetailLine[] = rawLines.slice(0, 8).map((line: Record<string, unknown>) => ({
    short: Array.from(text(line.name || '项'))[0] || '项',
    name: text(line.name || line.title || '检查项'),
    qty: num(line.qty ?? line.good_qty),
    meta: text(line.result || line.status_text || ''),
  }));
  return {
    ...base,
    lines,
    lineCount: lines.length || num(item.item_count),
  };
}

function mapOsOrder(item: Record<string, unknown>): FixtureRow {
  const statusRaw = text(item.status || '');
  let status = 'pending';
  let statusText = '未开始';
  if (statusRaw.includes('生产') || statusRaw === 'running') {
    status = 'running';
    statusText = '生产中';
  } else if (statusRaw.includes('完成') || statusRaw === 'done') {
    status = 'done';
    statusText = '已完成';
  } else if (statusRaw.includes('取消')) {
    status = 'cancelled';
    statusText = '已取消';
  }
  const rawLines = Array.isArray(item.materials) ? item.materials : Array.isArray(item.lines) ? item.lines : [];
  const lines: DetailLine[] = rawLines.slice(0, 6).map((line: Record<string, unknown>) => ({
    short: '料',
    name: text(line.name || line.product_name || line.process_name || '明细'),
    qty: num(line.qty ?? line.plan_qty),
  }));
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'WX'),
    name: text(item.product_name || item.name || '外协工单'),
    status,
    statusText,
    product: text(item.product_name || ''),
    productCode: text(item.product_code || ''),
    productSpec: text(item.product_spec || ''),
    supplier: text(item.supplier_name || ''),
    partner: text(item.contact_name || ''),
    planQty: num(item.plan_qty),
    unitPrice: num(item.unit_price),
    dueDate: text(item.due_date || '').slice(0, 10),
    priority: text(item.priority || ''),
    progressText: text(item.accept_progress || ''),
    lines,
    lineCount: lines.length,
    date: text(item.created_at || '').slice(0, 10),
  };
}

function mapOsReceipt(item: Record<string, unknown>): FixtureRow {
  const settled = text(item.settle_status).includes('已') || text(item.settle_status) === 'settled';
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.order_code, 'YS'),
    name: text(item.product_name || '外协验收'),
    status: settled ? 'settled' : 'unsettled',
    statusText: settled ? '已结算' : '未结算',
    product: text(item.product_name || ''),
    supplier: text(item.supplier_name || ''),
    workOrder: text(item.order_code || ''),
    acceptQty: num(item.accept_qty),
    passQty: num(item.pass_qty),
    failQty: num(item.fail_qty),
    owner: text(item.inspector_name || ''),
    date: text(item.created_at || '').slice(0, 10),
    category: text(item.kind || '工单外协'),
    settleStatus: settled ? '已结算' : '未结算',
  };
}

function mapOsSettle(item: Record<string, unknown>): FixtureRow {
  const base = mapOsReceipt(item);
  const unit = num(item.unit_price);
  const pass = num(item.pass_qty) ?? 0;
  const amount = num(item.settle_amount) ?? (unit != null ? unit * pass : undefined);
  return {
    ...base,
    code: text(item.code || item.order_code, 'JS'),
    name: text(item.product_name || '外协结算'),
    unitPrice: unit,
    amount,
  };
}

function mapOsContent(item: Record<string, unknown>): FixtureRow {
  const active = item.active !== false;
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code || item.id, 'NR'),
    name: text(item.title || item.name, '验收内容'),
    status: active ? 'enabled' : 'disabled',
    statusText: active ? '启用' : '停用',
    itemCount: num(item.item_count) ?? (Array.isArray(item.items) ? item.items.length : 0),
    creator: text(item.creator_name || ''),
    date: text(item.created_at || '').slice(0, 10),
    note: text(item.note || ''),
  };
}

function mapCost(item: Record<string, unknown>): FixtureRow {
  const statusRaw = text(item.status || '');
  const shared = statusRaw.includes('已') || statusRaw === 'shared' || statusRaw === '已分摊';
  const rawLines = Array.isArray(item.lines) ? item.lines : Array.isArray(item.items) ? item.items : [];
  const lines: DetailLine[] = rawLines.slice(0, 6).map((line: Record<string, unknown>) => ({
    short: '单',
    name: text(line.work_order_code || line.code || line.name, '加工单'),
    qty: num(line.amount ?? line.qty),
    meta: text(line.meta || line.note || ''),
  }));
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'FT'),
    name: text(item.note || item.name || `${text(item.expense_type || '费用')}分摊`),
    status: shared ? 'shared' : 'draft',
    statusText: shared ? '已审核' : '待审核',
    expenseType: text(item.expense_type || ''),
    method: text(item.method || ''),
    amount: num(item.amount),
    date: text(item.period_start || item.created_text || item.created_at || '').slice(0, 10),
    creator: text(item.creator_name || ''),
    note: text(item.note || ''),
    lines,
    lineCount: lines.length,
  };
}

function mapDefect(item: Record<string, unknown>): FixtureRow {
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'BL'),
    name: text(item.name, '不良品项'),
    status: 'enabled',
    statusText: '启用',
    date: text(item.created_at || '').slice(0, 10),
    creator: text(item.creator_name || ''),
  };
}

function mapTrace(item: Record<string, unknown>): FixtureRow {
  const raw = text(item.status || '');
  let status = 'unused';
  let statusText = '未使用';
  if (raw.includes('已使用') || raw === 'used') {
    status = 'used';
    statusText = '已使用';
  } else if (raw.includes('作废') || raw === 'void') {
    status = 'void';
    statusText = '作废';
  }
  return {
    id: text(item.id, cryptoRandom()),
    code: text(item.code, 'SY'),
    name: text(item.product_name || '溯源码'),
    status,
    statusText,
    product: text(item.product_name || ''),
    productCode: text(item.product_code || ''),
    workOrder: text(item.work_order_code || ''),
    qty: num(item.qty),
    creator: text(item.creator_name || ''),
    date: text(item.created_text || item.created_at || '').slice(0, 10),
    expandBody: [
      item.work_order_code ? `加工单 ${text(item.work_order_code)}` : '',
      item.product_code ? `商品编号 ${text(item.product_code)}` : '',
      item.qty != null ? `数量 ${text(item.qty)}` : '',
    ].filter(Boolean),
  };
}

export function mapApiItems(leaf: C1bLeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  if (!items?.length) return [];
  return items.map((item) => {
    switch (leaf.key) {
      case 'project':
        return mapProject(item);
      case 'material-analysis':
        return mapMaterial(item);
      case 'qc-full':
        return mapQcFull(item);
      case 'qc-spot':
        return mapQcSpot(item);
      case 'qc-spot-line':
        return mapQcSpotLine(item);
      case 'os-order':
        return mapOsOrder(item);
      case 'os-receipt':
        return mapOsReceipt(item);
      case 'os-settle':
        return mapOsSettle(item);
      case 'os-content':
        return mapOsContent(item);
      case 'cost':
        return mapCost(item);
      case 'defect':
        return mapDefect(item);
      case 'trace':
        return mapTrace(item);
      default:
        return {
          id: text(item.id, cryptoRandom()),
          code: text(item.code, '—'),
          name: text(item.name || item.title, '—'),
          status: 'enabled',
          statusText: '—',
        };
    }
  });
}
