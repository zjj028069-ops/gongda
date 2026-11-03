import type { C7LeafDef } from './c7Registry';
import type { C7Row } from './fixtures';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

/** 把同源 API items 尽量映射成行卡；映射不上返回空，由夹具兜底 */
export function mapApiItems(leaf: C7LeafDef, items: Record<string, unknown>[]): C7Row[] {
  if (!items?.length) return [];

  if (leaf.key === 'screen-manage') {
    return items.map((item, index) => ({
      id: asText(item.id, `sc-${index}`),
      title: asText(item.menu_name, '未命名大屏'),
      layout: asText(item.layout, '默认'),
      module: asText(item.module_kind, ''),
      description: asText(item.description, ''),
      screenId: asText(item.id),
      accessPassword: asText(item.access_password, ''),
      blob: [item.menu_name, item.module_kind, item.description].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-machine') {
    return items.map((item, index) => ({
      id: asText(item.id, `m-${index}`),
      code: asText(item.code),
      title: asText(item.name, '机台'),
      subtitle: [item.shop_name, item.line_name].filter(Boolean).join(' · '),
      status: asText(item.status, ''),
      statusTone: String(item.status || '').includes('运') ? 'ok' : 'pending',
      lines: [
        { name: '报工数', value: asText(item.report_qty, '0') },
        { name: '良品', value: asText(item.good_qty, '0') },
        { name: '不良', value: asText(item.defect_qty, '0') },
      ],
      amount: item.good_rate != null ? `良率 ${asText(item.good_rate)}%` : undefined,
      blob: [item.code, item.name, item.shop_name, item.line_name].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-wip') {
    return items.map((item, index) => ({
      id: asText(item.id ?? item.code, `w-${index}`),
      code: asText(item.code ?? item.work_order_code),
      title: asText(item.product_name, '在制品'),
      status: asText(item.status_text ?? item.execution, ''),
      statusTone: String(item.execution) === 'running' ? 'ok' : 'draft',
      lines: [
        { name: '计划', value: asText(item.plan_qty, '0') },
        { name: '良品', value: asText(item.good_qty, '0') },
        { name: '待产', value: asText(item.pending_qty, '0') },
      ],
      blob: [item.code, item.product_name, item.product_code].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-clock') {
    return items.map((item, index) => ({
      id: asText(item.id, `c-${index}`),
      code: '打卡',
      title: `${asText(item.member_name, '人员')} · ${asText(item.process_name, '工序')}`,
      subtitle: asText(item.work_order_code, ''),
      partner: asText(item.department_name, ''),
      date: `${asText(item.clock_text, '')} → ${asText(item.next_clock_text, '')}`,
      meta: asText(item.duration_text, ''),
      status: asText(item.clock_type, ''),
      statusTone: 'ok',
      blob: [item.member_name, item.process_name, item.work_order_code, item.department_name].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-defect-detail') {
    return items.map((item, index) => ({
      id: asText(item.id, `dd-${index}`),
      code: asText(item.code ?? item.defect_name, `BL-${index + 1}`),
      title: asText(item.defect_name ?? item.name, '不良项'),
      subtitle: [item.work_order_code, item.process_name].filter(Boolean).join(' · '),
      date: asText(item.date ?? item.created_at, ''),
      lines: [
        { name: '不良数', value: asText(item.defect_qty ?? item.qty, '0') },
        { name: '操作员', value: asText(item.operator_name ?? item.member_name, '—') },
      ],
      blob: [item.defect_name, item.work_order_code, item.process_name].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-wage') {
    return items.map((item, index) => ({
      id: asText(item.user_id ?? item.id, `wg-${index}`),
      code: asText(item.name, ''),
      title: asText(item.name, '员工'),
      subtitle: [item.department_name, item.pricing_mode].filter(Boolean).join(' · '),
      status: asText(item.quality_status_text ?? item.quality_status, ''),
      statusTone: String(item.quality_status) === 'done' ? 'ok' : 'pending',
      amount: item.amount != null ? money(item.amount) : asText(item.wage_amount, ''),
      lines: [
        { name: '报工', value: asText(item.report_qty ?? item.good_qty, '—') },
        { name: '工时', value: asText(item.hours ?? item.work_hours, '—') },
      ].filter((line) => line.value !== '—'),
      blob: [item.name, item.department_name].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-smart') {
    return items.map((item, index) => ({
      id: asText(item.id, `sm-${index}`),
      code: asText(item.code ?? `SR-${index + 1}`),
      title: asText(item.name, '智能报表'),
      subtitle: [item.dimension, item.metric].filter(Boolean).join(' · '),
      status: item.enabled === false ? '停用' : '启用',
      statusTone: item.enabled === false ? 'mute' : 'ok',
      meta: asText(item.source, ''),
      date: asText(item.period, ''),
      blob: [item.name, item.source, item.dimension].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-ai-stock') {
    return items.map((item, index) => ({
      id: asText(item.id ?? item.product_id, `ai-${index}`),
      code: asText(item.code, ''),
      title: asText(item.name ?? item.product_name, '物料'),
      subtitle: asText(item.advice_text ?? item.status_text, ''),
      status: asText(item.level_text ?? item.alarm, ''),
      statusTone: String(item.alarm || item.level).includes('low') ? 'pending' : 'ok',
      lines: [
        { name: '库存', value: asText(item.stock_qty ?? item.qty, '0') },
        { name: '安全', value: asText(item.safety_qty ?? item.safe_qty, '—') },
        { name: '建议采', value: asText(item.advise_qty ?? item.suggest_qty, '0') },
      ],
      blob: [item.code, item.name, item.product_name].filter(Boolean).join(' '),
    }));
  }

  if (leaf.key === 'report-purchase' || leaf.key === 'report-sales' || leaf.key === 'report-contract') {
    return items.map((item, index) => ({
      id: asText(item.id ?? item.code, `st-${index}`),
      code: asText(item.code ?? item.bill_no, ''),
      title: asText(item.partner_name ?? item.customer_name ?? item.supplier_name ?? item.name, '对账对象'),
      subtitle: leaf.title,
      date: asText(item.period ?? item.date ?? item.month, ''),
      status: asText(item.status_text ?? item.status, ''),
      statusTone: String(item.status || '').includes('确认') || String(item.status) === 'confirmed' ? 'ok' : 'pending',
      amount: item.amount != null ? money(item.amount) : asText(item.total_amount, ''),
      lines: [
        { name: leaf.key === 'report-sales' ? '应收' : leaf.key === 'report-purchase' ? '应付' : '金额', value: money(item.amount ?? item.total_amount ?? item.receivable) },
        { name: leaf.key === 'report-sales' ? '已收' : leaf.key === 'report-purchase' ? '已付' : '已交', value: money(item.paid ?? item.received ?? item.delivered) },
        { name: '余额', value: money(item.balance ?? item.remain) },
      ],
      blob: [item.code, item.partner_name, item.customer_name, item.supplier_name].filter(Boolean).join(' '),
    }));
  }

  // 分析类：尽量抽 metrics；抽不到则不映射（走夹具）
  if (leaf.kind === 'analysis') {
    const mapped = items.slice(0, 8).map((item, index) => {
      const keys = Object.keys(item).filter((k) => !['id', 'name', 'title', 'code', 'period', 'date'].includes(k));
      const metrics = keys.slice(0, 3).map((k) => ({
        label: k.replace(/_/g, ' '),
        value: asText(item[k]),
        tone: undefined as undefined | 'accent',
      }));
      if (!metrics.length) return null;
      metrics[0] = { ...metrics[0], tone: 'accent' };
      return {
        id: asText(item.id ?? item.code ?? item.name, `a-${index}`),
        title: asText(item.name ?? item.title ?? item.team_name ?? item.product_name ?? item.process_name, leaf.title),
        subtitle: asText(item.subtitle ?? item.category ?? item.dimension, ''),
        date: asText(item.period ?? item.date, ''),
        metrics,
        blob: [item.name, item.title, item.team_name, item.product_name].filter(Boolean).join(' '),
      } satisfies C7Row;
    }).filter(Boolean) as C7Row[];
    return mapped;
  }

  return [];
}
