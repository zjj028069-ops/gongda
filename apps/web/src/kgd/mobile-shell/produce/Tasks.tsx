import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { showError, useCommand } from '../../kit';
import { qtyText } from '../../qty';
import { Banner, Empty, percentOf, Sheet, statusTone, Tag, TASK_TEXT } from './bits';

type TaskItem = {
  id: string;
  work_order_id: string;
  work_order_code: string;
  product_snapshot: { name?: string; code?: string };
  process_snapshot: { name?: string; code?: string; reporter_ids?: string[] };
  execution: string;
  plan_qty: string;
  approved_good: string;
  task_type?: string;
  dispatch_operator_ids?: string[];
  overdue_days: number;
};

type Payload = { items: TaskItem[]; total: number; counts: Record<string, number> };

export function TaskListPage({ keyword }: { keyword: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sheet = params.get('sheet');
  const { revision, onExpired, session } = useKgd();
  const command = useCommand();
  const [status, setStatus] = useState('all');
  const [mine, setMine] = useState(false);
  const [late, setLate] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [ops, setOps] = useState<string[]>([]);
  const [scanCode, setScanCode] = useState('');
  const scanPath = sheet === 'scan' && scanCode.trim()
    ? `/api/production-tasks?work_order_code=${encodeURIComponent(scanCode.trim())}&page=1&page_size=20`
    : null;
  const members = useRemote<{ items: { id: string; display_name: string }[] }>('/api/team-members', revision, onExpired);
  const nameOf = (id: string) => members.data?.items.find((item) => String(item.id) === String(id))?.display_name ?? '';
  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (status !== 'all') query.set('status', status);
    if (late) query.set('overdue', '1');
    if (keyword.trim() && !/[\u4e00-\u9fa5]/.test(keyword)) query.set('work_order_code', keyword.trim());
    if (keyword.trim() && /[\u4e00-\u9fa5]/.test(keyword)) query.set('product', keyword.trim());
    query.set('page', '1');
    query.set('page_size', '50');
    return `/api/production-tasks?${query}`;
  }, [keyword, late, status]);
  const remote = useRemote<Payload>(path, revision, onExpired);
  const scanned = useRemote<Payload>(scanPath, revision, onExpired);
  const counts = remote.data?.counts;
  const self = String(session.user.id);
  const rows = (remote.data?.items ?? []).filter((row) => {
    if (mine) {
      const people = [...(row.process_snapshot.reporter_ids ?? []), ...(row.dispatch_operator_ids ?? [])].map(String);
      if (!people.includes(self)) return false;
    }
    if (keyword.trim() && /[\u4e00-\u9fa5]/.test(keyword)) {
      const blob = `${row.process_snapshot.name ?? ''}${row.product_snapshot.name ?? ''}`;
      if (!blob.includes(keyword.trim())) return false;
    }
    return true;
  });
  const scanRows = scanned.data?.items ?? [];

  function close() {
    const next = new URLSearchParams(params);
    next.delete('sheet');
    setParams(next, { replace: true });
  }

  async function dispatch(taskIds: string[], operatorIds: string[]) {
    if (!taskIds.length) { command.setError('请先勾选生产任务'); return; }
    if (!operatorIds.length) { command.setError('请选择生产派工人员'); return; }
    try {
      await command.send('/api/production-tasks/dispatch', { task_ids: taskIds, operator_ids: operatorIds });
      setPicked([]);
      setOps([]);
      close();
    } catch (failure) { command.setError(showError(failure)); }
  }

  const sharedReporters = picked.length
    ? rows.filter((row) => picked.includes(row.id)).reduce<string[] | null>((acc, row) => {
      const ids = (row.process_snapshot.reporter_ids ?? []).map(String);
      return acc === null ? ids : acc.filter((id) => ids.includes(id));
    }, null) ?? []
    : [];

  return (
    <div data-testid="mp-tasks">
      <div className="mp-tip">提示：请优先处理逾期或即将开始的生产任务</div>
      <div className="mp-stats">
        <div className="mp-stat"><span>未开始</span><b>{counts?.not_started ?? 0}</b></div>
        <div className="mp-stat is-run"><span>进行中</span><b>{counts?.running ?? 0}</b></div>
        <div className="mp-stat is-done"><span>已完成</span><b>{counts?.completed ?? 0}</b></div>
      </div>
      <div className="mp-filters">
        <button type="button" className={!mine && !late && status === 'all' ? 'on' : ''} onClick={() => { setMine(false); setLate(false); setStatus('all'); }}>全部</button>
        <button type="button" className={mine ? 'on' : ''} onClick={() => setMine((value) => !value)}>我的任务</button>
        <button type="button" className={late ? 'on' : ''} onClick={() => setLate((value) => !value)}>逾期</button>
        <button type="button" className={status === 'running' ? 'on' : ''} onClick={() => setStatus(status === 'running' ? 'all' : 'running')}>进行中</button>
        <button type="button" className={status === 'not_started' ? 'on' : ''} onClick={() => setStatus(status === 'not_started' ? 'all' : 'not_started')}>未开始</button>
      </div>
      <Banner text={remote.error || command.error} />
      {remote.loading && <Empty text="正在读取生产任务…" />}
      {!remote.loading && !rows.length && <Empty text="暂无生产任务" />}
      {rows.map((row) => {
        const pct = percentOf(row.approved_good, row.plan_qty);
        const people = (row.dispatch_operator_ids?.length ? row.dispatch_operator_ids : row.process_snapshot.reporter_ids ?? []).map(nameOf).filter(Boolean);
        return (
          <article key={row.id} className="mp-card" data-testid="mp-task-card">
            <div className="mp-card-top">
              <label className="mp-check">
                {sheet === 'dispatch' && <input type="checkbox" checked={picked.includes(row.id)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />}
                <span className="mp-ico">序</span>
                <div>
                  <h3>工序 · {row.process_snapshot.name || '-'}</h3>
                  {row.overdue_days > 0 && <span className="mp-sub">逾{row.overdue_days}天</span>}
                </div>
              </label>
              <Tag text={TASK_TEXT[row.execution] ?? row.execution} tone={statusTone(row.execution === 'running' ? 'running' : row.execution)} />
            </div>
            <button type="button" className="mp-hit" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.work_order_id}`)}>
              <p className="mp-sub">商品 · {row.product_snapshot.name || '-'}</p>
              <p className="mp-sub">加工单 {row.work_order_code}</p>
              <div className="mp-bar-line"><span>生产进度</span><div className="mp-bar"><i style={{ width: `${pct}%` }} /></div><span>{pct}% ({qtyText(row.approved_good)}/{qtyText(row.plan_qty)})</span></div>
              <p className="mp-sub">人员 {people.join('、') || '未派工'}</p>
            </button>
          </article>
        );
      })}
      {sheet === 'dispatch' && (
        <Sheet title="派工" testId="mp-task-dispatch" onClose={close}>
          <p className="mp-sub">已选 {picked.length} 条。派工人员只能从各任务共同的生产人员中选择（与 PC 批量派工相同）。</p>
          {sharedReporters.length ? sharedReporters.map((id) => (
            <label key={id} className="mp-check">
              <input type="checkbox" checked={ops.includes(id)} onChange={(event) => setOps((current) => event.target.checked ? [...current, id] : current.filter((item) => item !== id))} />
              {nameOf(id) || id}
            </label>
          )) : <p className="mp-sub">请先在卡片上勾选任务；若没有共同生产人员，请分开派工。</p>}
          <button type="button" className="mp-primary" disabled={command.busy} onClick={() => void dispatch(picked, ops)}>确认派工</button>
        </Sheet>
      )}
      {sheet === 'scan' && (
        <Sheet title="扫码领任务" testId="mp-task-scan" onClose={close}>
          <p className="mp-sub">扫描或输入加工单号。领取调用现网派工接口，把当前账号写入该任务的生产派工（须已是工序生产人员）。</p>
          <label className="mp-form"><span>加工单号</span><input value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="例如 JG20261028001" /></label>
          {scanCode.trim() && !scanRows.length && <Empty text="没有匹配的生产任务" />}
          {scanRows.map((row) => (
            <div key={row.id} className="mp-line">
              <span>{row.work_order_code} · {row.process_snapshot.name}</span>
              <button type="button" className="link" onClick={() => void dispatch([row.id], [self])}>领取</button>
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}
