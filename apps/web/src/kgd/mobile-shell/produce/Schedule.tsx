import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../../api';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { showError, useCommand } from '../../kit';
import { Banner, Empty, Sheet, Tag } from './bits';

type ScheduleRow = {
  id: string;
  code: string;
  planned_start: string | null;
  planned_end: string | null;
  priority: string;
  product_name: string;
  product_code: string;
  specification: string;
  current_process: string;
  elapsed_seconds: number;
  task_progress_pct: number;
  execution: string;
};

const LEVELS = [
  { key: 'all', label: '全部' },
  { key: 'urgent', label: '高', hint: '加急' },
  { key: 'normal', label: '中', hint: '正常' },
  { key: 'low', label: '低', hint: '无' },
] as const;

function levelOf(priority: string) {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'normal') return 'normal';
  if (priority === 'delayed') return 'delayed';
  return 'low';
}

function badge(priority: string) {
  if (priority === 'urgent') return { text: '高', tone: 'is-high' };
  if (priority === 'normal') return { text: '中', tone: 'is-mid' };
  if (priority === 'delayed') return { text: '延期', tone: 'is-delay' };
  return { text: '低', tone: 'is-low' };
}

function elapsedLabel(seconds: number) {
  if (!seconds) return '未开工';
  if (seconds < 60) return '不足1分钟';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function dayLabels(start: string | null, end: string | null) {
  if (!start || !end) return [];
  const from = new Date(`${start.slice(0, 10)}T00:00:00`);
  const to = new Date(`${end.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return [];
  const span = Math.round((to.getTime() - from.getTime()) / 86400000);
  const steps = Math.min(span, 5);
  const labels: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const at = new Date(from.getTime() + Math.round((span * i) / Math.max(steps, 1)) * 86400000);
    labels.push(String(at.getDate()));
  }
  return labels;
}

export function SchedulePage({ keyword }: { keyword: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sheet = params.get('sheet');
  const { revision, onExpired } = useKgd();
  const command = useCommand();
  const [level, setLevel] = useState('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [enqueueId, setEnqueueId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const path = useMemo(() => {
    const query = new URLSearchParams();
    query.set('period', 'month');
    if (keyword.trim()) query.set('keyword', keyword.trim());
    query.set('page', '1');
    query.set('page_size', '30');
    return `/api/progress/scheduling?${query}`;
  }, [keyword]);
  const remote = useRemote<{ items: ScheduleRow[]; total: number }>(path, revision, onExpired);
  const pool = useRemote<{ items: { id: string; code: string; product_snapshot?: { name?: string }; planned_start?: string | null; version?: number }[] }>(
    sheet === 'enqueue' ? '/api/progress/work-orders?page=1&page_size=50' : null,
    revision,
    onExpired,
  );
  const rows = remote.data?.items ?? [];
  const counts = {
    all: rows.length,
    urgent: rows.filter((row) => levelOf(row.priority) === 'urgent').length,
    normal: rows.filter((row) => levelOf(row.priority) === 'normal').length,
    low: rows.filter((row) => levelOf(row.priority) === 'low').length,
  };
  const shown = rows.filter((row) => level === 'all' || levelOf(row.priority) === level);

  function close() {
    const next = new URLSearchParams(params);
    next.delete('sheet');
    setParams(next, { replace: true });
  }

  async function saveFields(id: string, plannedStart: string | null, plannedEnd: string | null) {
    const body = await apiRequest<{ work_order: { version: number; due_date?: string | null; priority?: string; note?: string; planned_start?: string | null; planned_end?: string | null } }>(`/api/work-orders/${id}`);
    const order = body.work_order;
    await command.send(`/api/work-orders/${id}/plan-fields`, {
      version: order.version,
      planned_start: plannedStart ?? order.planned_start ?? null,
      planned_end: plannedEnd ?? order.planned_end ?? null,
      due_date: order.due_date ?? null,
      priority: order.priority ?? 'none',
      note: order.note ?? '',
    }, 'PATCH');
  }

  async function enqueue() {
    if (!enqueueId) { command.setError('请选择加工单'); return; }
    if (!start || !end) { command.setError('请填写计划起止'); return; }
    try {
      await saveFields(enqueueId, start, end);
      close();
    } catch (failure) { command.setError(showError(failure)); }
  }

  async function shift() {
    if (!picked.length) { command.setError('请先勾选要调期的加工单'); return; }
    if (!shiftStart || !shiftEnd) { command.setError('请填写新的计划起止'); return; }
    try {
      for (const id of picked) await saveFields(id, shiftStart, shiftEnd);
      setPicked([]);
      close();
    } catch (failure) { command.setError(showError(failure)); }
  }

  return (
    <div data-testid="mp-schedule">
      <div className="mp-tabs" data-testid="mp-priority-tabs">
        {LEVELS.map((item) => (
          <button key={item.key} type="button" className={level === item.key ? 'on' : ''} title={'hint' in item ? item.hint : '全部'} onClick={() => setLevel(item.key)}>
            {item.label}({counts[item.key]})
          </button>
        ))}
      </div>
      <Banner text={remote.error || command.error} />
      {remote.loading && <Empty text="正在读取排产…" />}
      {!remote.loading && !shown.length && <Empty text="本月没有排产，可用右上角排入加工单" />}
      {shown.map((row) => {
        const mark = badge(row.priority);
        const days = dayLabels(row.planned_start, row.planned_end);
        return (
          <article key={row.id} className="mp-card" data-testid="mp-schedule-card">
            <div className="mp-card-top">
              <label className="mp-check">
                {sheet === 'shift' && (
                  <input type="checkbox" checked={picked.includes(row.id)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
                )}
                <button type="button" className="mp-hit" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.id}`)}><h3>{row.code}</h3></button>
              </label>
              <Tag text={mark.text} tone={mark.tone} />
            </div>
            <button type="button" className="mp-hit" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.id}`)}>
              <p className="mp-sub">{row.product_name || row.product_code || '商品'}</p>
              <div className="mp-row" style={{ marginTop: 8 }}>
                <div>
                  <div className="mp-sub">计划起止</div>
                  <b>{row.planned_start?.slice(0, 10) || '-'} ~ {row.planned_end?.slice(0, 10) || '-'}</b>
                </div>
                <div>
                  <div className="mp-sub">当前工序</div>
                  <b>{row.current_process || '-'}</b>
                </div>
              </div>
              <div className="mp-row" style={{ marginTop: 8 }}>
                <div><span className="mp-sub">进度 </span><b style={{ color: '#4184F4' }}>{row.task_progress_pct}%</b></div>
                <div><span className="mp-sub">已开工时长 </span><b>{elapsedLabel(row.elapsed_seconds)}</b></div>
              </div>
              <div className="mp-days">
                <div className="mp-days-track">
                  <i style={{ width: `${Math.max(0, Math.min(100, row.task_progress_pct))}%` }} />
                  <em style={{ left: `${Math.max(0, Math.min(100, row.task_progress_pct))}%` }} />
                </div>
                {days.length > 0 && <div className="mp-days-scale">{days.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>}
              </div>
            </button>
          </article>
        );
      })}
      {sheet === 'enqueue' && (
        <Sheet title="排入加工单" testId="mp-sch-enqueue" onClose={close}>
          <p className="mp-sub">选择加工单并写入计划起止（现网 plan-fields，不新造排产规则）。</p>
          <label className="mp-form">加工单
            <select value={enqueueId} onChange={(event) => setEnqueueId(event.target.value)}>
              <option value="">选择加工单</option>
              {(pool.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} {item.product_snapshot?.name || ''}</option>)}
            </select>
          </label>
          <label className="mp-form">计划开始<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label className="mp-form">计划结束<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          <button type="button" className="mp-primary" disabled={command.busy} onClick={() => void enqueue()}>排入</button>
        </Sheet>
      )}
      {sheet === 'shift' && (
        <Sheet title="批量调期" testId="mp-sch-shift" onClose={close}>
          <p className="mp-sub">先在卡片上勾选，再统一改计划起止。已勾选 {picked.length} 张。</p>
          <label className="mp-form">新的开始<input type="date" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} /></label>
          <label className="mp-form">新的结束<input type="date" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} /></label>
          <button type="button" className="mp-primary" disabled={command.busy} onClick={() => void shift()}>保存调期</button>
        </Sheet>
      )}
    </div>
  );
}
