import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportCreatePayload } from '../../../domain/payloads';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { durationText, showError, useCommand, when } from '../../kit';
import { qtyText, sumQty } from '../../qty';
import { qualityText, settlementText } from '../../wage';
import { Banner, Empty, Sheet, Tag } from './bits';

type TaskOpt = {
  id: string;
  work_order_id: string;
  process_name: string;
  execution: string;
  plan_qty: string;
  approved_good: string;
  remaining_qty: string;
  pricing_mode: string;
  wage_rate: string | null;
  reporters: { id: string; name: string }[];
};
type Options = {
  work_orders: { id: string; code: string; product_name: string }[];
  tasks: TaskOpt[];
  machines: { id: string; code: string; name: string }[];
  self: { id: string; name: string };
  can_proxy: boolean;
};
type Today = { summary: { count: number; good_qty: string; defect_qty: string; report_qty: string }; items: unknown[]; total: number };

function useBench(query: string) {
  const { revision, onExpired } = useKgd();
  const [tick, setTick] = useState(0);
  const options = useRemote<Options>(`/api/report-workbench/options${query}`, revision + tick, onExpired);
  const today = useRemote<Today>('/api/report-workbench/today?page=1&page_size=30', revision + tick, onExpired);
  return { options, today, bump: () => setTick((value) => value + 1) };
}

export function ReportWorkbenchPage() {
  const [params, setParams] = useSearchParams();
  const sheet = params.get('sheet');
  const command = useCommand();
  const [orderId, setOrderId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [step, setStep] = useState(1);
  const [machineId, setMachineId] = useState('');
  const [scan, setScan] = useState('');
  const { options, today, bump } = useBench(orderId ? `?work_order_id=${orderId}` : '');
  const orders = options.data?.work_orders ?? [];
  const tasks = (options.data?.tasks ?? []).filter((task) => !orderId || task.work_order_id === orderId);
  const current = tasks.find((task) => task.id === taskId) || tasks.find((task) => task.execution === 'running') || tasks[0];
  const order = orders.find((item) => item.id === (current?.work_order_id || orderId));
  const queue = tasks.filter((task) => task.id !== current?.id);
  const machine = (options.data?.machines ?? []).find((item) => item.id === machineId);
  const person = options.data?.self?.name || current?.reporters?.[0]?.name || '-';
  const reported = Number(current?.approved_good || 0);
  const plan = Number(current?.plan_qty || 0);

  function close() {
    const next = new URLSearchParams(params);
    next.delete('sheet');
    setParams(next, { replace: true });
  }

  async function submit(task: TaskOpt | undefined, good: string) {
    if (!task) { command.setError('请选择工序'); return; }
    if ((Number(good) || 0) <= 0) { command.setError('良品与不良合计必须大于零'); return; }
    try {
      await command.send('/api/production-reports', reportCreatePayload({
        task_id: task.id,
        good_qty: good,
        defect_qty: '0',
        effective_seconds: 0,
        operator_id: options.data?.self?.id,
        include_operator: Boolean(options.data?.can_proxy),
      }));
      setStep(1);
      bump();
      close();
    } catch (failure) { command.setError(showError(failure)); }
  }

  const matched = scan.trim()
    ? (options.data?.work_orders ?? []).filter((item) => `${item.code}${item.product_name}`.toLowerCase().includes(scan.trim().toLowerCase()))
    : [];

  return (
    <div data-testid="mp-report-wb">
      <Banner text={options.error || command.error} />
      <article className="mp-card">
        <div className="mp-card-top">
          <span className="mp-tag is-run">当前任务</span>
          <span>{order?.code || '未选择加工单'} · {current ? <Tag text={current.execution === 'running' ? '进行中' : current.execution === 'not_started' ? '待报工' : '已完成'} tone={current.execution === 'running' ? 'is-run' : 'is-wait'} /> : null}</span>
        </div>
        <p className="mp-sub">工序 {current?.process_name || '暂无工序'}</p>
        <div className="mp-big">
          <span className="mp-sub">已报</span>
          <span className="n">{Math.round(reported)}</span>
          <span className="d">/ {Math.round(plan) || 0}</span>
          <span className="mp-sub">计划</span>
        </div>
        <p className="mp-sub">快速报工（+件）</p>
        <div className="mp-steps">
          {[1, 5, 10].map((n) => <button key={n} type="button" className={step === n ? 'on' : ''} onClick={() => setStep(n)}>+{n}</button>)}
        </div>
        <button type="button" className="mp-primary" disabled={command.busy || !current} onClick={() => void submit(current, String(step))}>确认报工</button>
        <div className="mp-meta">
          <div>设备 {machine ? machine.code : '未选机台'}</div>
          <div>人员 {person}</div>
        </div>
        {(options.data?.machines ?? []).length > 0 && (
          <label className="mp-form" style={{ marginTop: 8 }}>
            <span>机台</span>
            <select value={machineId} onChange={(event) => setMachineId(event.target.value)}>
              <option value="">不指定</option>
              {(options.data?.machines ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}
            </select>
          </label>
        )}
      </article>
      <article className="mp-card">
        <div className="mp-card-top"><h3>待报工队列</h3></div>
        {!queue.length && <Empty text="暂无其他待报工序" />}
        {queue.slice(0, 6).map((task) => {
          const wo = orders.find((item) => item.id === task.work_order_id);
          return (
            <button key={task.id} type="button" className="mp-line" onClick={() => { setOrderId(task.work_order_id); setTaskId(task.id); }}>
              <span>{wo?.code || task.work_order_id.slice(0, 8)}</span>
              <span>{task.process_name}</span>
              <Tag text={task.execution === 'running' ? '进行中' : '待报工'} tone={task.execution === 'running' ? 'is-run' : 'is-wait'} />
            </button>
          );
        })}
      </article>
      <div className="mp-foot-stats">
        <div>今日 <b>{today.data?.summary.report_qty ?? today.data?.summary.count ?? 0}</b></div>
        <div>待报工 <b>{queue.length}</b></div>
      </div>
      {sheet === 'scan' && (
        <Sheet title="扫码报工" testId="mp-wb-scan" onClose={close}>
          <label className="mp-form"><span>加工单号 / 商品</span><input value={scan} onChange={(event) => setScan(event.target.value)} placeholder="扫描或输入" /></label>
          {matched.map((item) => (
            <button key={item.id} type="button" className="mp-line" onClick={() => { setOrderId(item.id); setTaskId(''); close(); }}>
              {item.code} · {item.product_name}
            </button>
          ))}
          {scan.trim() && !matched.length && <Empty text="没有匹配的可报工加工单" />}
        </Sheet>
      )}
      {sheet === 'manual' && (
        <Sheet title="手工报工" testId="mp-wb-manual" onClose={close}>
          <ManualForm
            orders={orders}
            tasks={options.data?.tasks ?? []}
            busy={command.busy}
            onSubmit={(task, good) => void submit(task, good)}
          />
        </Sheet>
      )}
    </div>
  );
}

function ManualForm({ orders, tasks, busy, onSubmit }: {
  orders: { id: string; code: string; product_name: string }[];
  tasks: TaskOpt[];
  busy: boolean;
  onSubmit: (task: TaskOpt, good: string) => void;
}) {
  const [orderId, setOrderId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [good, setGood] = useState('1');
  const [q, setQ] = useState('');
  const shown = orders.filter((item) => !q.trim() || `${item.code}${item.product_name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const list = tasks.filter((task) => !orderId || task.work_order_id === orderId);
  const task = list.find((item) => item.id === taskId);
  return (
    <div className="mp-form">
      <label>扫描或输入单号<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="加工单号 / 商品" /></label>
      <label>加工单
        <select value={orderId} onChange={(event) => { setOrderId(event.target.value); setTaskId(''); }}>
          <option value="">选择加工单</option>
          {shown.map((item) => <option key={item.id} value={item.id}>{item.code} {item.product_name}</option>)}
        </select>
      </label>
      <label>工序
        <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
          <option value="">选择工序</option>
          {list.map((item) => <option key={item.id} value={item.id}>{item.process_name}</option>)}
        </select>
      </label>
      <label>良品数<input inputMode="decimal" value={good} onChange={(event) => setGood(event.target.value)} /></label>
      <button type="button" className="mp-primary" disabled={busy || !task} onClick={() => task && onSubmit(task, good)}>提交报工</button>
    </div>
  );
}

type Report = {
  id: string;
  code: string;
  work_order_id: string;
  task_id: string;
  operator_id: string;
  good_qty: string;
  defect_qty: string;
  approval: string;
  created_at: string;
  note?: string;
  quality_status?: string;
  settlement_status?: string;
  report_type?: string;
  effective_seconds?: number;
};
type Order = { id: string; code: string; execution: string; product_snapshot: { name?: string; code?: string; unit_name?: string }; tasks: { id: string; process_name: string }[] };

export function ReportRecordPage({ keyword }: { keyword: string }) {
  const [params, setParams] = useSearchParams();
  const sheet = params.get('sheet');
  const { revision, onExpired } = useKgd();
  const command = useCommand();
  const reports = useRemote<{ items: Report[]; summary: { report_qty: string; defect_qty: string } }>(`/api/production-reports?page=1&page_size=50`, revision, onExpired);
  const orders = useRemote<{ items: Order[] }>('/api/work-orders?page=1&page_size=100', revision, onExpired);
  const members = useRemote<{ items: { id: string; display_name: string }[] }>('/api/team-members', revision, onExpired);
  const options = useRemote<Options>(sheet ? '/api/report-workbench/options' : null, revision, onExpired);
  const nameOf = (id: string) => members.data?.items.find((item) => String(item.id) === id)?.display_name ?? '';
  const orderOf = (id: string) => orders.data?.items.find((item) => item.id === id);
  const rows = useMemo(() => (reports.data?.items ?? []).filter((row) => row.approval !== 'reversed').filter((row) => {
    if (!keyword.trim()) return true;
    const order = orderOf(row.work_order_id);
    const task = order?.tasks.find((item) => item.id === row.task_id);
    const blob = `${order?.code ?? ''} ${order?.product_snapshot.name ?? ''} ${task?.process_name ?? ''} ${nameOf(row.operator_id)}`;
    return blob.toLowerCase().includes(keyword.trim().toLowerCase());
  }), [keyword, reports.data?.items, orders.data?.items, members.data?.items]);

  function close() {
    const next = new URLSearchParams(params);
    next.delete('sheet');
    setParams(next, { replace: true });
  }

  async function submit(task: { id: string }, good: string) {
    try {
      await command.send('/api/production-reports', reportCreatePayload({
        task_id: task.id, good_qty: good, defect_qty: '0', effective_seconds: 0,
        operator_id: options.data?.self?.id, include_operator: Boolean(options.data?.can_proxy),
      }));
      close();
    } catch (failure) { command.setError(showError(failure)); }
  }

  return (
    <div data-testid="mp-report-records">
      <p className="mp-sub">版1 现网疏朗行卡 · 皮待 Allen 重选。字段跟报工记录列表，不另造口径。</p>
      <Banner text={reports.error || command.error} />
      {reports.loading && <Empty text="正在读取报工记录…" />}
      {!reports.loading && !rows.length && <Empty text="暂无报工记录" />}
      {rows.map((row) => {
        const order = orderOf(row.work_order_id);
        const task = order?.tasks.find((item) => item.id === row.task_id);
        return (
          <article key={row.id} className="mp-card" data-testid="mp-report-card">
            <div className="mp-card-top">
              <h3>{order?.code || row.code}</h3>
              <Tag text={settlementText(row.settlement_status)} tone={row.settlement_status === 'settled' ? 'is-done' : 'is-wait'} />
            </div>
            <p className="mp-sub">{order?.product_snapshot.name || '-'} · {task?.process_name || '工序'}</p>
            <p className="mp-sub">报工 {sumQty([row.good_qty, row.defect_qty])} · 良品 {qtyText(row.good_qty)} · 不良 {qtyText(row.defect_qty)}</p>
            <p className="mp-sub">{nameOf(row.operator_id) || '报工人'} · {when(row.created_at) || row.created_at} · {row.report_type === 'rework' ? '返工报工' : '生产报工'}</p>
            <p className="mp-sub">质检 {qualityText(row.quality_status) || '-'} · 时长 {durationText(row.effective_seconds ?? 0) || '0'}</p>
          </article>
        );
      })}
      {(sheet === 'manual' || sheet === 'scan') && (
        <Sheet title={sheet === 'scan' ? '扫码报工' : '新增报工'} testId={sheet === 'scan' ? 'mp-rec-scan' : 'mp-rec-manual'} onClose={close}>
          <ManualForm
            orders={options.data?.work_orders ?? []}
            tasks={options.data?.tasks ?? []}
            busy={command.busy}
            onSubmit={(task, good) => void submit(task, good)}
          />
        </Sheet>
      )}
    </div>
  );
}
