import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest, errorMessage, hasPermission } from './api';
import type { Session } from './api';
import { useRemote } from './masterTools';
import type { Process, TeamMember } from './masterTypes';
import { EmptyState, Loading, Notice } from './shared';
import { CommandKeys } from './commandKeys';

type DeskProps = { session: Session; revision: number; onExpired: () => void; onChanged: () => void };
type Task = { id: string; sequence: number; process_id: string; process_name: string; execution: string; plan_qty: string; approved_good: string };
type WorkOrder = { id: string; code: string; plan_qty: string; execution: string; product_snapshot: { name?: string; code?: string }; tasks: Task[] };
type Report = { id: string; code: string; approval: string; version: number; good_qty: string; defect_qty: string; wage_status: string; estimated_wage: string|null; posted: boolean };

export function MobileReport({ session, revision, onExpired, onChanged }: DeskProps) {
  const orders = useRemote<{ items: WorkOrder[] }>('/api/work-orders?reportable=1', revision, onExpired);
  const processes = useRemote<{ items: Process[] }>(hasPermission(session, 'production.approve') ? '/api/processes' : null, revision, onExpired);
  const members = useRemote<{ items: TeamMember[] }>(hasPermission(session, 'production.approve') ? '/api/team-members' : null, revision, onExpired);
  const [selected, setSelected] = useState('');
  const [good, setGood] = useState('');
  const [defect, setDefect] = useState('0');
  const [rework, setRework] = useState('0');
  const [scrap, setScrap] = useState('0');
  const [seconds,setSeconds]=useState('0'),[supplement,setSupplement]=useState('');
  const [note, setNote] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const commandKeys = useRef(new CommandKeys());
  const current = orders.data?.items.find((item) => item.id === selected) ?? orders.data?.items[0];
  const task = current?.tasks.find((item) => item.execution === 'running');
  const supplements=useRemote<{items:{id:string;code:string;task_id:string;quantity:string;approval:string}[]}>('/api/production-supplements',revision,onExpired);
  const reports = useRemote<{ items: Report[] }>(current && hasPermission(session, 'production.approve') ? `/api/production-reports?work_order_id=${current.id}` : null, revision, onExpired);
  const reporters = (processes.data?.items.find((item) => String(item.id) === task?.process_id)?.reporter_ids ?? [])
    .map((id) => members.data?.items.find((member) => String(member.id) === id))
    .filter((member): member is TeamMember => !!member);
  const canProxy = hasPermission(session, 'production.approve');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!task || busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const body = commandKeys.current.prepare('/api/production-reports', { request_key: crypto.randomUUID(), task_id: task.id, good_qty: good.trim(), defect_qty: defect.trim(), rework_qty: rework.trim(), scrap_qty: scrap.trim(), effective_seconds:Number(seconds),...(supplement?{supplement_id:supplement}:{}), ...(note.trim() ? { defect_note: note.trim() } : {}), ...(canProxy ? { operator_id: operatorId } : {}) });
      const created = await apiRequest<{ report: Report }>('/api/production-reports', {
        method: 'POST', csrfToken: session.csrf_token,
        body,
      });
      commandKeys.current.complete('/api/production-reports', body);
      setInfo(`报工 ${created.report.code} 已保存，待审核。预计工资 ${created.report.estimated_wage??'未计价'}。`);
      setGood(''); setNote('');setSupplement('');
      onChanged();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally { setBusy(false); }
  }
  async function approve(report: Report) {
    if (busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const path = `/api/production-reports/${report.id}/actions`;
      const body = commandKeys.current.prepare(path, { action: 'approve', version: report.version, request_key: crypto.randomUUID() });
      await apiRequest(path, { method: 'POST', csrfToken: session.csrf_token, body });
      commandKeys.current.complete(path, body);
      setInfo(`${report.code} 已审核并计入任务进度。`);
      onChanged();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">生产主线 / 手机报工</div><h1>手机报工</h1><p>只提交当前执行中的工序。提交后写入报工单，审核通过才增加良品进度。</p></div><span className="badge badge-teal">真实单据</span></div>
    <Notice kind="info">报工提交时冻结工价，审核通过才计入应计工资。没有适用规则的历史工单显示未计价。照片、扫码和离线队列仍使用旁边的预检原型，不会在这里上传。</Notice>
    {orders.error && <Notice>{orders.error}</Notice>}{error && <Notice>{error}</Notice>}{info && <Notice kind="success">{info}</Notice>}
    {orders.loading ? <Loading label="正在读取可报工的加工单…" /> : <div className="preview-layout preview-mobile"><section className="panel phone-prototype"><div className="phone-preview-bar"><span>现场报工</span><span className="badge badge-teal">落库</span></div>
      {!orders.data?.items.length || !current || !task ? <EmptyState title="现在没有可报工序" description="加工单开工并且轮到您有资格的工序后，会出现在这里。" /> : <form onSubmit={submit}><label className="form-field"><span>加工单</span><select value={current.id} disabled={busy} onChange={(event) => { setSelected(event.target.value); setOperatorId(''); }}>{orders.data.items.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.product_snapshot.name} · 计划 {item.plan_qty}</option>)}</select></label><dl className="detail-list subsection"><div><dt>当前工序</dt><dd>{task.sequence}. {task.process_name}</dd></div><div><dt>计划 / 已审良品</dt><dd>{task.plan_qty} / {task.approved_good}</dd></div></dl>
        {canProxy && <label className="form-field"><span>实际操作者</span><select value={operatorId} required disabled={busy} onChange={(event) => setOperatorId(event.target.value)}><option value="">选择当前工序报工名单</option>{reporters.map((member) => <option key={member.id} value={String(member.id)}>{member.display_name}</option>)}</select><small>代报不会把资格扩大到名单以外的人。</small></label>}
        <div className="phone-quantity-grid"><label className="form-field"><span>良品</span><input inputMode="decimal" value={good} required disabled={busy} onChange={(event) => setGood(event.target.value)} /></label><label className="form-field"><span>不良</span><input inputMode="decimal" value={defect} required disabled={busy} onChange={(event) => setDefect(event.target.value)} /></label></div>
        <div className="phone-quantity-grid"><label className="form-field"><span>其中返工</span><input inputMode="decimal" value={rework} required disabled={busy} onChange={(event) => setRework(event.target.value)} /></label><label className="form-field"><span>其中报废</span><input inputMode="decimal" value={scrap} required disabled={busy} onChange={(event) => setScrap(event.target.value)} /></label></div>
        <label className="form-field"><span>不良说明</span><input value={note} disabled={busy} maxLength={500} onChange={(event) => setNote(event.target.value)} /></label>
        <label className="form-field"><span>有效工时（秒，计时规则必填）</span><input type="number" min="0" max="2678400" step="1" value={seconds} disabled={busy} onChange={e=>setSeconds(e.target.value)}/></label><label className="form-field"><span>补产投入来源（普通报工留空）</span><select value={supplement} disabled={busy} onChange={e=>setSupplement(e.target.value)}><option value="">普通报工</option>{supplements.data?.items.filter(s=>s.task_id===task.id&&s.approval==='approved').map(s=><option value={s.id} key={s.id}>{s.code} · 追加 {s.quantity}</option>)}</select></label>
        <button className="button button-primary preview-submit" disabled={busy}>{busy ? '正在提交…' : '提交报工'}</button></form>}
    </section><section className="panel"><div className="panel-heading"><h2>待审核</h2><span className="badge badge-gray">提交时冻结工价</span></div>{!canProxy ? <p className="muted small">当前账号可以提交，审核由有生产审核权限的人完成。</p> : reports.loading ? <Loading /> : !(reports.data?.items ?? []).some((item) => item.approval === 'pending') ? <p className="muted small">这张加工单没有待审核报工。</p> : <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>单号</th><th>数量</th><th></th></tr></thead><tbody>{reports.data?.items.filter((item) => item.approval === 'pending').map((item) => <tr key={item.id}><td className="monospace">{item.code}</td><td>良 {item.good_qty} / 不良 {item.defect_qty}<span className="cell-subtitle">{item.estimated_wage === null ? '未计价' : '预计工资 '+item.estimated_wage+' 元'}</span></td><td><button className="button button-secondary" disabled={busy} onClick={() => void approve(item)}>审核</button></td></tr>)}</tbody></table></div>}</section></div>}
  </>;
}
