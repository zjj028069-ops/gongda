import type { C6LeafDef } from './c6Registry';
import type { FixtureRow } from './fixtures';

function str(v: unknown, fallback = '') {
  if (v == null) return fallback;
  return String(v);
}

function mapStatus(raw: string): { status: string; statusText: string; statusTone: FixtureRow['statusTone'] } {
  const s = raw.toLowerCase();
  if (['running', 'doing', 'in_progress', 'repairing', '执行中', '维修中', '进行中'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'doing', statusText: raw || '执行中', statusTone: 'info' };
  }
  if (['done', 'completed', 'finished', 'ok', 'normal', 'pass', '已完成', '正常', '合格', '已开'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'ok', statusText: raw || '正常', statusTone: 'ok' };
  }
  if (['overdue', 'timeout', '逾期', '已超时'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'overdue', statusText: raw || '逾期', statusTone: 'warn' };
  }
  if (['bad', 'abnormal', 'fail', '异常', '不合格'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'bad', statusText: raw || '异常', statusTone: 'bad' };
  }
  if (['pending', 'wait', 'todo', '待', '未'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'pending', statusText: raw || '待处理', statusTone: 'pending' };
  }
  if (['bound', '已绑定'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'bound', statusText: raw || '已绑定', statusTone: 'ok' };
  }
  if (['printed', '已打印'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'printed', statusText: raw || '已打印', statusTone: 'info' };
  }
  if (['idle', '空闲'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'idle', statusText: raw || '空闲', statusTone: 'info' };
  }
  if (['maintain', '维护'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'maintain', statusText: raw || '维护中', statusTone: 'warn' };
  }
  if (['offline', '离线'].some((x) => s.includes(x) || raw.includes(x))) {
    return { status: 'offline', statusText: raw || '离线', statusTone: 'mute' };
  }
  return { status: raw || 'unknown', statusText: raw || '—', statusTone: 'mute' };
}

/** 将同源 API items 映射为皮展示行；字段缺失时留空，由夹具兜底 */
export function mapApiItems(leaf: C6LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  return items.map((item, idx) => {
    const id = str(item.id, `${leaf.key}-${idx}`);
    const code = str(item.code || item.bill_no || item.task_no || item.plan_no || item.title, id);
    const name = str(item.name || item.title || item.device_name || item.subject || item.content_name || item.description, code);
    const rawStatus = str(item.status || item.result || item.judge || item.bind_status || item.enabled);
    const st = mapStatus(rawStatus || (item.enabled === false ? '停用' : '启用'));
    return {
      id,
      code,
      name,
      status: st.status,
      statusText: st.statusText || str(item.status_text, st.statusText),
      statusTone: st.statusTone,
      device: str(item.device_name || item.device || item.equipment_name),
      deviceCode: str(item.device_code || item.equip_code),
      plan: str(item.plan_title || item.plan_name || item.plan),
      planSub: str(item.cycle_text || item.content_title || item.category),
      owner: str(item.executor_name || item.owner_name || item.inspector_name || item.owner_names || item.host_name || item.assignee_name),
      ownerRole: str(item.team_name || item.role || item.department_name),
      deadline: str(item.deadline || item.due_at || item.plan_end),
      time: str(item.checked_at || item.finished_at || item.created_at || item.meeting_at || item.time),
      note: str(item.remark || item.note || item.description),
      result: str(item.result || item.judge),
      category: str(item.category || item.category_name),
      workshop: str(item.shop_name || item.workshop || item.department_name || item.line_name),
      model: str(item.spec || item.model),
      area: str(item.area || item.department_name),
      shift: str(item.shift),
      period: str(item.cycle_text || item.period),
      subject: str(item.subject || item.title),
      location: str(item.location || item.place),
      host: str(item.host_name || item.host),
      attendees: str(item.attendee_count ? `${item.attendee_count}人` : item.attendees),
      meeting: str(item.meeting_title || item.meeting_name),
      meetingTime: str(item.meeting_at),
      source: str(item.source),
      issue: str(item.issue || item.problem || item.description),
      found: typeof item.abnormal_count === 'number' ? item.abnormal_count : undefined,
      standard: str(item.standard || item.standard_code),
      measured: str(item.measured || item.actual),
      unit: str(item.unit),
      judge: str(item.judge || item.result),
      item: str(item.item_name || item.name),
      enable: item.enabled !== false,
      priority: str(item.priority),
      sla: str(item.sla_text || item.wait_text),
      iconGlyph: name.slice(0, 1),
    };
  });
}
