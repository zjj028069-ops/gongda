import type { C4LeafDef } from './c4Registry';
import type { FixtureLine, FixtureRow } from './fixtures';

function statusOf(row: Record<string, unknown>): Pick<FixtureRow, 'status' | 'statusText'> {
  const raw = String(row.audit_status ?? row.approval ?? row.state ?? row.status ?? row.lifecycle ?? row.money_audit ?? '');
  if (!raw) return { status: 'exempt', statusText: '' };
  if (/待审|待确认|待开票|待跟进|审批中|待审批/.test(raw) || raw === 'pending') return { status: 'pending', statusText: raw === 'pending' ? '待审核' : raw };
  if (/已审核|已确认|已通过|通过/.test(raw) || raw === 'approved') return { status: 'approved', statusText: raw === 'approved' ? '已确认' : raw };
  if (/草稿|未生效/.test(raw) || raw === 'draft') return { status: 'draft', statusText: raw === 'draft' ? '草稿' : raw };
  if (/逾期/.test(raw)) return { status: 'rejected', statusText: raw };
  if (/已拒绝|拒绝|已作废/.test(raw) || raw === 'rejected') return { status: 'rejected', statusText: raw === 'rejected' ? '已拒绝' : raw };
  if (/部分回款/.test(raw)) return { status: 'processing', statusText: raw };
  if (/执行中|履约中|处理中|进行中|跟进中|已邮寄/.test(raw) || raw === 'processing' || raw === 'performing') {
    return { status: 'processing', statusText: raw === 'processing' || raw === 'performing' ? '执行中' : raw };
  }
  if (/已完成/.test(raw) || raw === 'completed') return { status: 'completed', statusText: '已完成' };
  if (/已开票/.test(raw) || raw === 'invoiced') return { status: 'invoiced', statusText: '已开票' };
  if (/不需审核|免审/.test(raw) || raw === 'exempt') return { status: 'exempt', statusText: raw === 'exempt' ? '不需审核' : raw };
  if (/启用|^开$/.test(raw) || raw === 'enabled') return { status: 'enabled', statusText: '启用' };
  return { status: 'exempt', statusText: raw };
}

function moneyOf(row: Record<string, unknown>) {
  if (row.amount_cents != null && row.amount_cents !== '') return Number(row.amount_cents) / 100;
  if (row.amount != null && row.amount !== '') return Number(row.amount);
  return undefined;
}

function num(value: unknown) {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
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

function idleDays(row: Record<string, unknown>) {
  const direct = num(row.idle_days ?? row.days_idle ?? row.days);
  if (direct != null) return direct;
  const raw = row.last_follow_at ?? row.updated_at ?? row.created_at;
  if (!raw) return undefined;
  const t = Date.parse(String(raw));
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function mapApiItems(leaf: C4LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  if (leaf.key === 'customer-list') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.code ?? ''),
      status: row.active === false ? 'draft' : 'enabled',
      statusText: row.active === false ? '停用' : '启用',
      date: '',
      partner: String(row.name ?? ''),
      shortName: String(row.short_name ?? row.alias ?? row.contact_name ?? row.name ?? ''),
      phone: String(row.contact_phone ?? row.phone ?? ''),
      contact: String(row.contact_name ?? ''),
      customerType: Array.isArray(row.tags) ? String(row.tags[0] ?? '') : String(row.tags ?? ''),
      address: String(row.address ?? ''),
      active: row.active !== false,
    }));
  }

  if (leaf.key === 'linkman') {
    return items.slice(0, 40).map((row, index) => ({
      id: String(row.id ?? index),
      code: String(row.id ?? ''),
      status: 'enabled',
      statusText: '启用',
      date: '',
      contact: String(row.name ?? ''),
      title: String(row.title ?? row.role ?? '对接人'),
      partner: String(row.customer_name ?? ''),
      phone: String(row.phone ?? ''),
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
        priority: row.priority === true || row.priority === 1 || row.priority === '优先',
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
      const st = statusOf({ ...row, status: row.lifecycle ?? row.approval ?? row.status });
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? ''),
        ...st,
        statusText: st.statusText === '履约中' ? '执行中' : st.statusText,
        date: String(row.order_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? ''),
        amount: moneyOf(row),
        arrears: num(row.arrears ?? row.unpaid ?? row.debt ?? row.balance),
        address: String(row.address ?? row.customer_address ?? ''),
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
        code: String(row.code ?? row.contract_code ?? ''),
        ...st,
        date: String(row.pay_date ?? row.created_at ?? '').slice(0, 10),
        partner: String(row.customer_name ?? row.partner ?? ''),
        amount: moneyOf(row),
        direction: isOut ? 'out' as const : 'in' as const,
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
        invoiceType: String(row.invoice_type ?? row.type_name ?? '增值税发票'),
      };
    });
  }

  if (leaf.key === 'sales-fee') {
    return items.slice(0, 40).map((row, index) => {
      const st = statusOf(row);
      let statusText = st.statusText;
      if (st.status === 'approved' && !/报销|审批/.test(statusText)) statusText = '已审批';
      if (st.status === 'pending') statusText = '待审批';
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? ''),
        ...st,
        statusText,
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
      industry: String(row.industry ?? '制造业'),
      category: String(row.tags ?? row.category ?? ''),
      city: String(row.city ?? row.region ?? row.address ?? ''),
      daysIdle: idleDays(row),
      phone: String(row.contact_phone ?? ''),
      contact: String(row.contact_name ?? ''),
    }));
  }

  if (leaf.key === 'customer-audit') {
    return items.slice(0, 40).map((row, index) => {
      const need = row.active !== false && row.exempt !== true;
      return {
        id: String(row.id ?? index),
        code: String(row.code ?? row.id ?? ''),
        status: need ? 'enabled' : 'draft',
        statusText: need ? '需审核' : '免审',
        date: '',
        product: String(row.name ?? row.doc_type ?? '审核流程'),
        subLabel: String(row.note ?? row.doc_type ?? row.object_type ?? row.module ?? ''),
        active: need,
      };
    });
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
        date: String(row.effective_date ?? row.updated_at ?? row.created_at ?? '').slice(0, 10),
        product: String(row.product_name ?? ''),
        partner: String(row.customer_name ?? ''),
        lastPrice: last,
        prevPrice: prev,
        changePct,
        changeAmt,
        unit: String(row.unit_name ?? '件'),
        updater: String(row.updater_name ?? row.updated_by ?? row.creator_name ?? ''),
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
