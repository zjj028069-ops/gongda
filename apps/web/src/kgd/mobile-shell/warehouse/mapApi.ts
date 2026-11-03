import type { FixtureBill, FixtureLine } from './fixtures';
import { FIXTURES } from './fixtures';
import type { C2LeafDef } from './c2Registry';

function statusOf(row: Record<string, unknown>): Pick<FixtureBill, 'status' | 'statusText'> {
  const raw = String(row.audit_status ?? row.approval ?? row.state ?? 'exempt');
  if (raw === 'pending' || raw === '待审' || raw === '待审核') return { status: 'pending', statusText: '待审核' };
  if (raw === 'approved' || raw === '通过' || raw === '已审核') return { status: 'approved', statusText: '已审核' };
  if (raw === 'draft' || raw === '草稿') return { status: 'draft', statusText: '草稿' };
  if (raw === 'exempt' || raw === '不需审核') return { status: 'exempt', statusText: '不需审核' };
  return { status: 'exempt', statusText: raw || '—' };
}

function dateOf(row: Record<string, unknown>) {
  const raw = String(row.receipt_date ?? row.ship_date ?? row.return_date ?? row.transfer_date ?? row.taking_date ?? row.biz_date ?? row.created_at ?? '');
  return raw.slice(0, 10);
}

function linesOf(row: Record<string, unknown>): FixtureLine[] {
  const lines = Array.isArray(row.lines) ? (row.lines as Record<string, unknown>[]) : [];
  return lines.map((line) => ({
    name: String(line.product_name ?? line.name ?? '商品'),
    spec: line.product_spec ? String(line.product_spec) : line.specification ? String(line.specification) : undefined,
    qty: Number(line.quantity ?? line.actual_qty ?? 0),
    amount: line.amount_cents != null ? Number(line.amount_cents) / 100 : line.amount != null ? Number(line.amount) : undefined,
    book: line.book_qty != null ? Number(line.book_qty) : undefined,
    actual: line.actual_qty != null ? Number(line.actual_qty) : undefined,
    diff: line.diff_qty != null ? Number(line.diff_qty) : undefined,
  }));
}

function sumQty(lines: FixtureLine[], fallback?: unknown) {
  if (lines.length) return lines.reduce((n, line) => n + (Number(line.qty) || 0), 0);
  return Number(fallback ?? 0);
}

export function mapApiItems(leaf: C2LeafDef, items: Record<string, unknown>[]): FixtureBill[] {
  if (!items.length) return FIXTURES[leaf.key] ?? [];
  if (leaf.key === 'stock') {
    return items.slice(0, 40).map((row, index) => {
      const qty = Number(row.on_hand ?? 0);
      const product = row.product as Record<string, unknown> | undefined;
      const upper = Number(product?.stock_upper_warn ?? row.stock_upper_warn ?? 0) || undefined;
      const lower = Number(product?.stock_lower_warn ?? row.stock_lower_warn ?? 0) || undefined;
      let alarm: FixtureBill['alarm'] = 'ok';
      if (lower != null && qty < lower) alarm = 'low';
      else if (upper != null && qty > upper) alarm = 'high';
      return {
        id: String(row.id ?? (`${String(row.warehouse_id ?? '')}:${String(row.product_id ?? '')}` || String(index))),
        code: '',
        status: 'exempt',
        statusText: '',
        date: '',
        product: String(row.product_name ?? '商品'),
        warehouse: String(row.warehouse_name ?? row.warehouse_code ?? ''),
        qty,
        upper,
        lower,
        costAmount: Number(row.cost_amount ?? 0) || undefined,
        alarm,
      };
    });
  }
  if (leaf.key === 'warehouse-list') {
    return items.map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      status: 'exempt',
      statusText: row.active === false ? '禁用' : '启用',
      date: '',
      product: String(row.name ?? ''),
      manager: Array.isArray(row.manager_ids) ? `${(row.manager_ids as string[]).length}人` : '',
      address: [row.province, row.city, row.district, row.address].filter(Boolean).join(' '),
      note: String(row.note ?? ''),
      active: row.active !== false,
    }));
  }
  if (leaf.key === 'flow') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.doc_code ?? row.ledger_code ?? row.seq_no ?? ''),
      status: 'exempt',
      statusText: '',
      date: String(row.biz_date ?? '').slice(0, 10),
      time: String(row.posted_at ?? '').replace('T', ' ').slice(0, 16),
      direction: String(row.direction) === 'out' ? 'out' : 'in',
      docType: String(row.doc_type ?? row.ledger_kind ?? ''),
      warehouse: String(row.warehouse_name ?? row.in_warehouse_name ?? row.out_warehouse_name ?? ''),
      product: String(row.product_name ?? ''),
      qty: Number(row.quantity ?? 0),
      balance: Number(row.balance_after ?? 0),
    }));
  }
  return items.slice(0, 40).map((row, index) => {
    const lines = linesOf(row);
    const st = statusOf(row);
    const qty = sumQty(lines, row.quantity ?? row.diff_total);
    return {
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      ...st,
      date: dateOf(row),
      warehouse: String(row.warehouse_name ?? ''),
      fromWh: String(row.from_warehouse_name ?? ''),
      toWh: String(row.to_warehouse_name ?? ''),
      partner: String(row.supplier_name ?? row.customer_name ?? ''),
      workOrder: String(row.work_order_code ?? ''),
      contract: String(row.contract_code ?? ''),
      product: String(row.product_name ?? lines[0]?.name ?? ''),
      qty,
      issueQty: Number(row.issued_qty ?? row.issue_qty ?? qty) || undefined,
      returnQty: Number(row.quantity ?? row.return_qty ?? 0) || undefined,
      amount: row.amount_cents != null ? Number(row.amount_cents) / 100 : Number(row.amount ?? 0) || undefined,
      costAmount: Number(row.cost_amount ?? 0) || undefined,
      lineCount: lines.length || Number(row.line_count ?? 0) || undefined,
      lines,
    };
  });
}

export function useFixtureFallback(leafKey: string, apiItems: FixtureBill[]) {
  if (apiItems.length) return { items: apiItems, fromFixture: false };
  return { items: FIXTURES[leafKey] ?? [], fromFixture: true };
}
