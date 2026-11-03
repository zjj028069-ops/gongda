import type { FixtureRow, FixtureLine } from './fixtures';
import { FIXTURES } from './fixtures';
import type { C4LeafDef } from './c4Registry';

function statusOf(row: Record<string, unknown>): Pick<FixtureRow, 'status' | 'statusText'> {
  const raw = String(row.audit_status ?? row.approval ?? row.state ?? row.status ?? row.lifecycle ?? row.money_audit ?? 'exempt');
  if (raw === 'pending' || raw === '待审' || raw === '待审核' || raw === '待确认' || raw === '待开票' || raw === '待跟进' || raw === '审批中') {
    return { status: 'pending', statusText: String(raw) };
  }
  if (raw === 'approved' || raw === '通过' || raw === '已审核' || raw === '已确认' || raw === '已通过') {
    return { status: 'approved', statusText: String(raw) };
  }
  if (raw === 'draft' || raw === '草稿' || raw === '未生效') return { status: 'draft', statusText: String(raw) };
  if (raw === 'rejected' || raw === '已拒绝' || raw === '拒绝' || raw === '已作废') return { status: 'rejected', statusText: String(raw) };
  if (raw === 'processing' || raw === '处理中' || raw === '进行中' || raw === '履约中' || raw === '已邮寄' || raw === '跟进中') {
    return { status: 'processing', statusText: String(raw) };
  }
  if (raw === 'completed' || raw === '已完成') return { status: 'completed', statusText: '已完成' };
  if (raw === 'invoiced' || raw === '已开票') return { status: 'invoiced', statusText: '已开票' };
  if (raw === 'exempt' || raw === '不需审核') return { status: 'exempt', statusText: '不需审核' };
  if (raw === 'enabled' || raw === '启用' || raw === '开') return { status: 'enabled', statusText: '启用' };
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

export function mapApiItems(leaf: C4LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  if (!items.length) return FIXTURES[leaf.key] ?? [];

  if (leaf.key === 'customer-list') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      status: row.active === false ? 'draft' : 'completed',
      statusText: row.active === false ? '停用' : '已完成',
      date: '',
      partner: String(row.name ?? ''),
      phone: String(row.contact_phone ?? row.phone ?? ''),
      contact: String(row.contact_name ?? ''),
      customerType: Array.isArray(row.tags) ? String(row.tags[0] ?? '客户') : String(row.tags ?? '客户'),
      tag: row.active === false ? '停用' : '启用',
      active: row.active !== false,
      address: String(row.address ?? ''),
    }));
  }

  if (leaf.key === 'linkman') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.id ?? `LM-${index + 1}`),
      status: 'enabled',
      statusText: '启用',
      date: '',
      contact: String(row.name ?? ''),
      title: String(row.title ?? row.role ?? '对接人'),
      partner: String(row.customer_name ?? ''),
      phone: String(row.phone ?? ''),
      tag: '客户',
    }));
  }

  if (leaf.key === 'follow') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.id ?? ''),
        ...st,
        date: String(row.follow_at ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? row.partner ?? ''),
        typeLabel: String(row.follow_type ?? row.type ?? '跟进'),
        subLabel: String(row.content ?? row.sub_type ?? ''),
        owner: [row.owner_name, row.dept_name].filter(Boolean).join(' / ') || String(row.owner ?? ''),
        nextFollow: String(row.next_follow_at ?? row.next_at ?? ''),
        category: String(row.industry ?? row.category ?? ''),
      };
    });
  }

  if (leaf.key === 'quote') {
    return items.slice(0, 40).map((row, index) => {
      const lines = linesOf(row);
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? ''),
        ...st,
        date: String(row.valid_to ?? row.delivery_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? ''),
        amount: moneyOf(row),
        note: row.valid_from && row.valid_to
          ? `${String(row.valid_from).slice(0, 10)} ~ ${String(row.valid_to).slice(0, 10)}`
          : String(row.note ?? ''),
        lines,
        lineCount: lines.length || undefined,
      };
    });
  }

  if (leaf.key === 'contract') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf({ ...row, status: row.lifecycle ?? row.approval });
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? ''),
        ...st,
        date: String(row.order_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? ''),
        amount: moneyOf(row),
        address: String(row.address ?? row.customer_code ?? ''),
        note: String(row.note ?? ''),
      };
    });
  }

  if (leaf.key === 'cash') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      const direction = String(row.direction ?? row.io ?? row.kind ?? 'in');
      const isOut = direction === 'out' || direction === '支出' || direction === 'expense';
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.contract_code ?? row.id ?? ''),
        ...st,
        date: String(row.pay_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? row.partner ?? ''),
        amount: moneyOf(row),
        direction: isOut ? 'out' : 'in',
        typeLabel: isOut ? '支出' : '收入',
        note: String(row.note ?? ''),
      };
    });
  }

  if (leaf.key === 'invoice') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.invoice_no ?? row.code ?? ''),
        ...st,
        date: String(row.invoice_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? ''),
        amount: moneyOf(row),
        invoiceType: String(row.invoice_type ?? row.type_name ?? '增值税专用发票'),
      };
    });
  }

  if (leaf.key === 'sales-fee') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.id ?? ''),
        ...st,
        date: String(row.expense_date ?? row.created_at ?? '').slice(0, 10),
        typeLabel: String(row.expense_type ?? row.type_name ?? '销售费用'),
        partner: String(row.customer_name ?? ''),
        amount: moneyOf(row),
        applicant: [row.applicant_name, row.dept_name].filter(Boolean).join(' ') || String(row.creator_name ?? ''),
      };
    });
  }

  if (leaf.key === 'customer-sea') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      status: 'pending',
      statusText: '可领取',
      date: '',
      partner: String(row.name ?? ''),
      category: String(row.tags ?? row.industry ?? '行业'),
      daysIdle: Number(row.idle_days ?? row.days ?? 0) || undefined,
      phone: String(row.contact_phone ?? ''),
      contact: String(row.contact_name ?? ''),
      note: String(row.created_text ?? ''),
    }));
  }

  if (leaf.key === 'customer-audit') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? row.id ?? ''),
      status: row.active === false ? 'draft' : 'enabled',
      statusText: row.active === false ? '关' : '开',
      date: '',
      product: String(row.name ?? '审核流程'),
      subLabel: String(row.doc_type ?? row.object_type ?? row.module ?? ''),
      note: String(row.note ?? ''),
      active: row.active !== false,
    }));
  }

  if (leaf.key === 'customer-base') {
    return FIXTURES[leaf.key] ?? [];
  }

  if (leaf.key === 'sales-price') {
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
        date: String(row.updated_at ?? row.created_at ?? row.effective_date ?? '').slice(0, 10),
        product: String(row.product_name ?? ''),
        partner: String(row.customer_name ?? ''),
        lastPrice: last,
        prevPrice: prev,
        changePct,
        changeAmt,
        unit: String(row.unit_name ?? '元'),
        note: row.effective_date ? `生效日 ${String(row.effective_date).slice(0, 10)}` : '',
      };
    });
  }

  return items.slice(0, 40).map((row, index) => {
    const st = statusOf(row);
    return {
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      ...st,
      date: String(row.created_at ?? '').slice(0, 10),
      partner: String(row.customer_name ?? row.name ?? ''),
      amount: moneyOf(row),
    };
  });
}
