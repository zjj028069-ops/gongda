import type { FixtureRow, FixtureLine } from './fixtures';
import { FIXTURES } from './fixtures';
import type { C3LeafDef } from './c3Registry';

function statusOf(row: Record<string, unknown>): Pick<FixtureRow, 'status' | 'statusText'> {
  const raw = String(row.audit_status ?? row.approval ?? row.state ?? row.status ?? row.money_audit ?? 'exempt');
  if (raw === 'pending' || raw === '待审' || raw === '待审核' || raw === '待确认' || raw === '待开票') {
    return { status: 'pending', statusText: raw.includes('开票') ? '待开票' : raw.includes('确认') ? '待确认' : '待审核' };
  }
  if (raw === 'approved' || raw === '通过' || raw === '已审核' || raw === '已付款' || raw === '已确认') {
    return { status: 'approved', statusText: raw === '已付款' ? '已付款' : raw === '已确认' ? '已确认' : '已审核' };
  }
  if (raw === 'draft' || raw === '草稿') return { status: 'draft', statusText: '草稿' };
  if (raw === 'rejected' || raw === '已拒绝' || raw === '拒绝') return { status: 'rejected', statusText: '已拒绝' };
  if (raw === 'processing' || raw === '处理中' || raw === '生产中') return { status: 'processing', statusText: raw.includes('生产') ? '生产中' : '处理中' };
  if (raw === 'pass' || raw === '合格') return { status: 'pass', statusText: '合格' };
  if (raw === 'fail' || raw === '不合格') return { status: 'fail', statusText: '不合格' };
  if (raw === 'auth' || raw === '已认证') return { status: 'auth', statusText: '已认证' };
  if (raw === 'invoiced' || raw === '已开票') return { status: 'invoiced', statusText: '已开票' };
  return { status: 'exempt', statusText: raw || '—' };
}

function moneyOf(row: Record<string, unknown>) {
  if (row.amount_cents != null) return Number(row.amount_cents) / 100;
  if (row.amount != null) return Number(row.amount);
  return undefined;
}

function linesOf(row: Record<string, unknown>): FixtureLine[] {
  const lines = Array.isArray(row.lines) ? (row.lines as Record<string, unknown>[]) : [];
  return lines.map((line) => ({
    name: String(line.product_name ?? line.name ?? '商品'),
    spec: line.specification ? String(line.specification) : line.spec ? String(line.spec) : undefined,
    qty: Number(line.quantity ?? line.qty ?? 0),
    amount: line.amount != null ? Number(line.amount) : line.amount_cents != null ? Number(line.amount_cents) / 100 : undefined,
  }));
}

export function mapApiItems(leaf: C3LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  if (!items.length) return FIXTURES[leaf.key] ?? [];

  if (leaf.key === 'supplier') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      status: 'exempt',
      statusText: '',
      date: '',
      partner: String(row.name ?? row.company_name ?? ''),
      contact: String(row.contact_name ?? ''),
      phone: String(row.contact_phone ?? ''),
      creditCode: String(row.credit_code ?? ''),
    }));
  }

  if (leaf.key === 'purchase-plan') {
    return items.slice(0, 40).map((row, index) => {
      const lines = linesOf(row);
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? ''),
        ...st,
        date: String(row.delivery_date ?? row.due ?? '').slice(0, 10),
        product: String(row.name ?? lines[0]?.name ?? '采购计划'),
        spec: lines[0]?.spec,
        qty: Number(row.qty ?? lines.reduce((n, l) => n + (l.qty ?? 0), 0)),
        partner: String(row.supplier_name ?? ''),
        amount: moneyOf(row),
        lines,
        lineCount: lines.length || undefined,
      };
    });
  }

  if (leaf.key === 'purchase-pay') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.id ?? ''),
        ...st,
        date: String(row.pay_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.supplier_name ?? ''),
        amount: moneyOf(row),
        method: String(row.method ?? row.pay_method ?? ''),
        bank: String(row.bank_name ?? row.bank ?? ''),
      };
    });
  }

  if (leaf.key === 'purchase-invoice') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.invoice_no ?? row.code ?? ''),
        ...st,
        date: String(row.invoice_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.supplier_name ?? ''),
        amount: moneyOf(row),
        taxRate: row.tax_rate != null ? `${row.tax_rate}%`.replace('%%', '%') : '',
      };
    });
  }

  if (leaf.key === 'mt-list') {
    return items.slice(0, 40).map((row, index) => {
      const fail = Number(row.fail_qty ?? 0);
      const tested = Number(row.tested_qty ?? 0);
      const pass = fail > 0 && tested > 0 ? false : Number(row.pass_qty ?? 0) >= 0;
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.purchase_code ?? ''),
        status: fail > 0 ? 'fail' : 'pass',
        statusText: fail > 0 ? '不合格' : '合格',
        date: String(row.finish_date ?? row.created_at ?? '').slice(0, 10),
        product: String(row.product_name ?? ''),
        batch: String(row.purchase_code ?? ''),
        sampleQty: row.send_qty != null ? `${row.send_qty} PCS` : '',
        inspector: String(row.inspector_names ?? row.creator_name ?? ''),
        partner: String(row.supplier_name ?? ''),
        note: pass ? '' : '',
      };
    });
  }

  if (leaf.key === 'mt-lines') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.item_name ?? row.code ?? ''),
      status: 'pass',
      statusText: '合格',
      date: '',
      product: String(row.item_name ?? ''),
      lines: [{
        name: String(row.item_name ?? ''),
        method: String(row.method ?? '—'),
        standard: String(row.standard ?? '—'),
        actual: String(row.value ?? '—'),
        verdict: '合格',
        note: String(row.purchase_code ?? ''),
      }],
    }));
  }

  if (leaf.key === 'mt-spec') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? `JYN-${String(index + 1).padStart(4, '0')}`),
      status: 'exempt',
      statusText: '',
      date: '',
      product: String(row.name ?? ''),
      subLabel: String(row.note ?? row.item_text ?? ''),
      category: '检验规范',
      version: 'v1.0',
      note: String(row.creator_name ?? ''),
    }));
  }

  if (leaf.key === 'purchase-audit') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? row.id ?? ''),
      status: row.active === false ? 'draft' : 'exempt',
      statusText: row.active === false ? '停用' : '启用',
      date: '',
      product: String(row.name ?? '审核流程'),
      subLabel: String(row.doc_type ?? row.object_type ?? row.module ?? ''),
      note: String(row.note ?? ''),
    }));
  }

  if (leaf.key === 'purchase-base' || leaf.key === 'supplier-setting') {
    return FIXTURES[leaf.key] ?? [];
  }

  if (leaf.key === 'purchase-price') {
    return items.slice(0, 40).map((row, index) => {
      const last = Number(row.unit_price ?? row.last_price ?? row.price ?? 0);
      const prev = Number(row.prev_price ?? row.last_price ?? last);
      const changeAmt = last - prev;
      const changePct = prev ? (changeAmt / prev) * 100 : 0;
      return {
        id: String(row.id ?? index),
        code: String(row.product_code ?? row.code ?? ''),
        status: 'exempt',
        statusText: '',
        date: String(row.updated_at ?? row.created_at ?? '').slice(0, 10),
        product: String(row.product_name ?? ''),
        partner: String(row.supplier_name ?? ''),
        lastPrice: last,
        prevPrice: prev,
        changePct,
        changeAmt,
        unit: String(row.unit_name ?? '元'),
        note: '较昨日更新',
      };
    });
  }

  // purchase-order default
  return items.slice(0, 40).map((row, index) => {
    const lines = linesOf(row);
    const st = statusOf(row);
    return {
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      ...st,
      date: String(row.order_date ?? row.created_at ?? '').slice(0, 10),
      partner: String(row.supplier_name ?? ''),
      product: lines[0]?.name,
      qty: lines.reduce((n, l) => n + (l.qty ?? 0), 0),
      amount: moneyOf(row),
      lines,
      lineCount: lines.length || undefined,
    };
  });
}
