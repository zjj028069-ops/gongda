import { useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { CommandKeys } from '../../../commandKeys';
import { reportCreatePayload } from '../../../domain/payloads';
import { apiRequest } from '../../../api';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { showError } from '../../kit';
import { modeWageText, nowShanghai, rateLabel, splitSpan, wageAmount, yuanLabel } from '../../wage';
import './mobile.css';

type Options = {
  work_orders: { id: string; code: string; product_name: string; plan_qty: string; execution: string; due_date?: string | null }[];
  tasks: { id: string; work_order_id: string; process_name: string; execution: string; plan_qty: string; approved_good: string; remaining_qty: string; pricing_mode: string; wage_rate: string | null; reporters: { id: string; name: string }[] }[];
  defect_items: { id: string; name: string }[];
  machines: { id: string; code: string; name: string }[];
  self: { id: string; name: string };
  can_proxy: boolean;
};
type Today = { summary: { report_qty: string; good_qty: string; defect_qty: string }; items: { id: string; work_order_code: string; product_name: string; process_name: string; good_qty: string; defect_qty: string; created_at: string }[] };
type Cards = { items: { page_key: string; tab_key: string; fields: string[] }[] };

function useOptions(query: string, revision: number) {
  const { onExpired } = useKgd();
  return useRemote<Options>(`/api/report-workbench/options${query}`, revision, onExpired);
}

export function MobileApp() {
  return <div className="m-app">
    <Routes>
      <Route path="report" element={<Home />} />
      <Route path="report/order/:id" element={<PickTask />} />
      <Route path="report/task/:taskId" element={<ReportForm />} />
      <Route path="report/today" element={<TodayPage />} />
      <Route path="*" element={<Navigate to="/m/report" replace />} />
    </Routes>
  </div>;
}

function Home() {
  const { revision, onExpired } = useKgd();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const options = useOptions(`?q=${encodeURIComponent(q)}`, revision);
  const cards = useRemote<Cards>('/api/mobile-cards?page_key=work-orders', revision, onExpired);
  const listFields = cards.data?.items.find((item) => item.tab_key === 'list')?.fields ?? ['code', 'product', 'plan', 'due'];
  const wo = params.get('wo');
  const task = params.get('task');
  const matched = options.data?.work_orders.find((item) => item.code === wo);
  if (wo && options.data && matched && task) return <Navigate to={`/m/report/task/${task}`} replace />;
  if (wo && options.data && matched) return <Navigate to={`/m/report/order/${matched.id}`} replace />;
  const scan = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  return <>
    <div className="m-head">报工</div>
    <div className="m-search"><input placeholder="输入加工单号/商品名" value={q} onChange={(event) => setQ(event.target.value)} /></div>
    {scan && <div className="m-field"><button type="button" style={{ minHeight: 44, width: '100%' }} onClick={() => message.info('请使用手机相机扫描加工单二维码')}>扫码</button></div>}
    {wo && options.data && !matched && <div className="m-empty">该加工单暂无您可报工的工序</div>}
    {!options.loading && !(options.data?.work_orders.length) && <div className="m-empty">暂无可报工的加工单</div>}
    {(options.data?.work_orders ?? []).map((item) => {
      const tasks = (options.data?.tasks ?? []).filter((row) => row.work_order_id === item.id);
      const done = tasks.filter((row) => row.execution === 'completed').length;
      return <Link key={item.id} to={`/m/report/order/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        <article className="m-card">
          <h3>{item.code} <span className="m-tag">生产中</span></h3>
          {listFields.includes('product') && <div>{item.product_name || '-'}</div>}
          <div className="m-row"><span>计划数 {item.plan_qty}</span><span>工序进度 {done}/{Math.max(tasks.length, 1)}</span></div>
          {listFields.includes('due') && <div className="m-row"><span>交货日期 {item.due_date?.slice(0, 10) || '-'}</span></div>}
        </article>
      </Link>;
    })}
    <nav className="m-tabs"><Link to="/m/report"><button className="on" type="button">报工</button></Link><Link to="/m/report/today"><button type="button">今日报工</button></Link></nav>
  </>;
}

function PickTask() {
  const { id = '' } = useParams();
  const { revision } = useKgd();
  const options = useOptions(`?work_order_id=${id}`, revision);
  const tasks = (options.data?.tasks ?? []).filter((item) => item.work_order_id === id);
  const order = options.data?.work_orders.find((item) => item.id === id);
  return <>
    <div className="m-head">{order?.code || '选择工序'}</div>
    {options.data && !tasks.length && <div className="m-empty">该加工单暂无您可报工的工序</div>}
    {tasks.map((task) => <Link key={task.id} to={`/m/report/task/${task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <article className="m-card">
        <h3>{task.process_name}</h3>
        <div className="m-row"><span>已报良品/计划数 {task.approved_good}/{task.plan_qty}</span></div>
        <div className="m-row"><span>{modeWageText(task.pricing_mode) || '-'}</span><span>{rateLabel(task.wage_rate) || '-'}</span></div>
      </article>
    </Link>)}
    <nav className="m-tabs"><Link to="/m/report"><button type="button">报工</button></Link><Link to="/m/report/today"><button type="button">今日报工</button></Link></nav>
  </>;
}

function ReportForm() {
  const { taskId = '' } = useParams();
  const { revision, session } = useKgd();
  const navigate = useNavigate();
  const options = useOptions('', revision);
  const task = (options.data?.tasks ?? []).find((item) => item.id === taskId);
  const order = options.data?.work_orders.find((item) => item.id === task?.work_order_id);
  const canProxy = options.data?.can_proxy ?? false;
  const [operator, setOperator] = useState(session.user.id);
  const [machineId, setMachineId] = useState('');
  const [good, setGood] = useState('1');
  const [defect, setDefect] = useState('0');
  const [picked, setPicked] = useState<{ id: string; qty: string }[]>([]);
  const [sheet, setSheet] = useState(false);
  const [start, setStart] = useState(nowShanghai());
  const [end, setEnd] = useState(nowShanghai());
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ code: string; good: string; defect: string; wage: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = useRef(new CommandKeys());
  const seconds = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60;
  const wage = wageAmount(task?.pricing_mode ?? 'piece', task?.wage_rate, good || '0', seconds);
  function applyTimes(nextStart: string, nextEnd: string) {
    const span = splitSpan(nextStart, nextEnd);
    if (!span) return;
    setHours(span.hours); setMinutes(span.minutes);
  }
  async function submit(complete: boolean) {
    if (!task || busy) return;
    const defectSum = picked.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    if (defectSum - (Number(defect) || 0) > 1e-9) { setError('不良品项数量之和不能超过不良品数'); return; }
    setBusy(true); setError('');
    const names = picked.map((item) => options.data?.defect_items.find((row) => row.id === item.id)?.name).filter(Boolean).join('、');
    const body = keys.current.prepare('/api/production-reports', reportCreatePayload({
      task_id: task.id, good_qty: good || '0', defect_qty: defect || '0', effective_seconds: seconds,
      operator_id: String(operator), include_operator: canProxy, defect_note: names, note: remark,
      started_at: start || undefined, ended_at: end || undefined, complete_task: complete,
    }));
    try {
      const created = await apiRequest<{ report: { id: string; code: string; estimated_wage?: string | null } }>('/api/production-reports', { method: 'POST', csrfToken: session.csrf_token, body });
      keys.current.complete('/api/production-reports', body);
      if (machineId || picked.length) {
        try { await apiRequest('/api/quality/bindings', { method: 'POST', csrfToken: session.csrf_token, body: { report_id: created.report.id, machine_id: machineId, defect_item_ids: picked.map((item) => item.id), defect_items: picked } }); }
        catch { setError('报工已保存，不良品项/机台未保存，请到报工记录中修改'); }
      }
      setDone({ code: created.report.code, good: good || '0', defect: defect || '0', wage: yuanLabel(created.report.estimated_wage || wage) || `${wage || '0'}元` });
    } catch (failure) { setError(showError(failure)); }
    finally { setBusy(false); }
  }
  if (done) return <div className="m-ok">
    <h2>报工成功</h2>
    <p>报工单号 {done.code}</p>
    <p>良品 {done.good} / 不良 {done.defect}</p>
    <p>预计工资 {done.wage.includes('元') ? done.wage : `${done.wage} 元`}</p>
    {error && <p>{error}</p>}
    <div className="m-actions" style={{ position: 'static' }}>
      <button type="button" onClick={() => { setDone(null); setGood('1'); setDefect('0'); setPicked([]); setRemark(''); }}>继续报工</button>
      <button type="button" className="primary" onClick={() => navigate('/m/report/today')}>查看今日报工</button>
    </div>
  </div>;
  if (options.data && !task) return <div className="m-empty">该加工单暂无您可报工的工序</div>;
  return <>
    <div className="m-head">报工</div>
    <article className="m-card">
      <div>加工单号 {order?.code || '-'}</div>
      <div>商品名 {order?.product_name || '-'}</div>
      <div>工序名 {task?.process_name || '-'}</div>
    </article>
    {error && <div className="m-card" style={{ color: '#f5222d' }}>{error}</div>}
    <label className="m-field"><span>生产人员 *</span>
      {canProxy ? <select value={operator} onChange={(event) => setOperator(event.target.value)}>{(task?.reporters ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <input readOnly value={options.data?.self.name || session.user.display_name} />}
    </label>
    <label className="m-field"><span>机台</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="">-</option>{(options.data?.machines ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="m-field"><span>良品数</span><input inputMode="decimal" value={good} onChange={(event) => setGood(event.target.value)} /></label>
    <label className="m-field"><span>不良品数</span><input inputMode="decimal" value={defect} onChange={(event) => setDefect(event.target.value)} /></label>
    <div className="m-field"><span>不良品项</span><button type="button" style={{ minHeight: 44, width: '100%' }} onClick={() => setSheet(true)}>{picked.length ? picked.map((item) => options.data?.defect_items.find((row) => row.id === item.id)?.name).join('、') : '点击选择不良品项'}</button></div>
    <label className="m-field"><span>开始时间</span><input type="datetime-local" value={start} onChange={(event) => { setStart(event.target.value); applyTimes(event.target.value, end); }} /></label>
    <label className="m-field"><span>结束时间</span><input type="datetime-local" value={end} onChange={(event) => { setEnd(event.target.value); applyTimes(start, event.target.value); }} /></label>
    <div className="m-field"><span>报工时长</span><div className="m-row"><input inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} /><span>小时</span><input inputMode="decimal" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><span>分钟</span></div></div>
    <label className="m-field"><span>备注</span><textarea value={remark} onChange={(event) => setRemark(event.target.value)} /></label>
    <article className="m-card">
      <h3>工资计算</h3>
      <div className="m-row"><span>工序</span><span>{task?.process_name || '-'}</span></div>
      <div className="m-row"><span>计价方式</span><span>{modeWageText(task?.pricing_mode) || '-'}</span></div>
      <div className="m-row"><span>工资单价</span><span>{rateLabel(task?.wage_rate) || '-'}</span></div>
      <div className="m-row"><span>工资</span><span>{yuanLabel(wage) || '-'}</span></div>
    </article>
    <div className="m-actions">
      <button type="button" disabled={busy} onClick={() => void submit(true)}>报工并完成</button>
      <button type="button" className="primary" disabled={busy} onClick={() => void submit(false)}>仅报工</button>
    </div>
    {sheet && <div className="m-sheet">
      <h3>不良品项</h3>
      {(options.data?.defect_items ?? []).map((item) => {
        const current = picked.find((row) => row.id === item.id);
        return <label key={item.id} className="m-row"><span><input type="checkbox" checked={!!current} onChange={(event) => setPicked((rows) => event.target.checked ? [...rows, { id: item.id, qty: '1' }] : rows.filter((row) => row.id !== item.id))} /> {item.name}</span>{current && <input style={{ width: 72 }} inputMode="decimal" value={current.qty} onChange={(event) => setPicked((rows) => rows.map((row) => row.id === item.id ? { ...row, qty: event.target.value } : row))} />}</label>;
      })}
      <button type="button" className="primary" style={{ minHeight: 44, width: '100%', marginTop: 12 }} onClick={() => setSheet(false)}>确定</button>
    </div>}
  </>;
}

function TodayPage() {
  const { revision, onExpired } = useKgd();
  const today = useRemote<Today>('/api/report-workbench/today?page=1&page_size=30', revision, onExpired);
  const items = today.data?.items ?? [];
  const sumGood = items.reduce((sum, item) => sum + Number(item.good_qty), 0);
  const sumDefect = items.reduce((sum, item) => sum + Number(item.defect_qty), 0);
  return <>
    <div className="m-head">今日报工</div>
    <article className="m-card">
      <div>报工数 <b className="m-red">{today.data?.summary.report_qty ?? '-'}</b></div>
      <div>良品数 <b className="m-red">{today.data?.summary.good_qty ?? '-'}</b> / 列表 {sumGood}</div>
      <div>不良品数 <b className="m-red">{today.data?.summary.defect_qty ?? '-'}</b> / 列表 {sumDefect}</div>
    </article>
    {items.map((item) => <article key={item.id} className="m-card">
      <h3>{item.work_order_code}</h3>
      <div>{item.product_name || '-'} · {item.process_name || '-'}</div>
      <div className="m-row"><span>良品 {item.good_qty}</span><span>不良 {item.defect_qty}</span></div>
      <div>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN', { hour12: false }) : '-'}</div>
    </article>)}
    <nav className="m-tabs"><Link to="/m/report"><button type="button">报工</button></Link><Link to="/m/report/today"><button className="on" type="button">今日报工</button></Link></nav>
  </>;
}
