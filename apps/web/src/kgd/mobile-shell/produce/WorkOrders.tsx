import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workOrderCreatePayload, documentActionPayload } from '../../../domain/payloads';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { showError, useCommand } from '../../kit';
import { cmpQty, qtyText, subQty } from '../../qty';
import { priorityText } from '../../wage';
import { printDocs, type PrintDoc } from '../../print';
import { Banner, ChipRow, Empty, EXEC_TEXT, Kv, percentOf, Sheet, statusTone, Tag } from './bits';

type Row = {
  id: string;
  code: string;
  plan_qty: string;
  output_qty: string;
  execution: string;
  priority?: string;
  due_date?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  product_snapshot: { name?: string; code?: string; specification?: string };
  process_progress?: { done: number; total: number } | null;
  task_progress?: { done: string; total: string } | null;
  current_process?: string;
  stock_qty?: string;
  schedule_no?: number;
  parent_id?: string | null;
  contract_id?: string | null;
  contract_line_id?: string | null;
  contract_code?: string;
  version?: number;
  overdue?: boolean;
};

type ListPayload = {
  items: Row[];
  total: number;
  counts: Record<string, number>;
  summary: { plan_qty: string; output_qty: string };
};

type ContractLine = {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: string;
  orderCode: string;
  customer: string;
  remain: string;
  open: boolean;
};

const chip = (value: string, label: string, count?: number) => ({ value, label: count === undefined ? label : `${label}(${count})` });

export function WorkOrderListPage({ keyword }: { keyword: string }) {
  const navigate = useNavigate();
  const { revision, onExpired, session } = useKgd();
  const command = useCommand();
  const [status, setStatus] = useState('all');
  const [late, setLate] = useState('all');
  const [priority, setPriority] = useState('all');
  const [expand, setExpand] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [batch, setBatch] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [more, setMore] = useState<Row | null>(null);
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (late === 'yes') params.set('overdue', '1');
    if (late === 'no') params.set('overdue', '0');
    if (priority !== 'all') params.set('priority', priority);
    if (keyword.trim()) {
      if (/[\u4e00-\u9fa5]/.test(keyword)) params.set('product', keyword.trim());
      else params.set('code', keyword.trim());
    }
    params.set('page', '1');
    params.set('page_size', '50');
    return `/api/progress/work-orders?${params}`;
  }, [keyword, late, priority, status]);
  const remote = useRemote<ListPayload>(path, revision, onExpired);
  const counts = remote.data?.counts;
  const all = remote.data?.items ?? [];
  const rows = expand ? all : all.filter((row) => !row.parent_id);

  async function batchStart() {
    const picked = rows.filter((row) => chosen.includes(row.id));
    if (!picked.length) { command.setError('请先勾选加工单'); return; }
    const lines: string[] = [];
    for (const row of picked) {
      if (row.execution !== 'not_started') { lines.push(`${row.code}：只有未开始的加工单可以开始`); continue; }
      try {
        await command.send(`/api/work-orders/${row.id}/actions`, documentActionPayload('start', row.version ?? 0));
        lines.push(`${row.code}：已开始生产`);
      } catch (failure) { lines.push(`${row.code}：${showError(failure)}`); }
    }
    setChosen([]);
    setBatch(false);
    command.setError(lines.join('；'));
  }

  async function saveSchedule() {
    const ids = rows.filter((row) => !row.parent_id).map((row) => row.id);
    if (!ids.length) { command.setError('没有可排的加工单'); return; }
    try {
      await command.send('/api/work-orders/schedule', { ids });
      setSchedule(false);
    } catch (failure) { command.setError(showError(failure)); }
  }

  function printRow(row: Row) {
    const doc: PrintDoc = {
      title: '加工单',
      fields: [
        ['加工单号', row.code], ['商品', row.product_snapshot.name ?? ''], ['计划数', qtyText(row.plan_qty)],
        ['实际生产数', qtyText(row.output_qty)], ['状态', EXEC_TEXT[row.execution] ?? row.execution],
        ['优先级', priorityText(row.priority)], ['交货日期', row.due_date?.slice(0, 10) ?? ''],
        ['计划开始', row.planned_start?.slice(0, 10) ?? ''], ['计划结束', row.planned_end?.slice(0, 10) ?? ''],
      ],
      columns: ['工序进度', '任务进度'],
      rows: [[`${row.process_progress?.done ?? 0}/${row.process_progress?.total ?? 0}`, `${row.task_progress?.done ?? '0'}/${row.task_progress?.total ?? '0'}`]],
    };
    if (!printDocs([doc], '加工单')) command.setError('浏览器拦截了打印窗口，请允许弹出窗口后重试');
  }

  return (
    <div data-testid="mp-work-orders">
      <ChipRow label="工单状态" value={status} onChange={setStatus} options={[
        chip('all', '全部', counts?.all), chip('not_started', '未开始', counts?.not_started), chip('running', '生产中', counts?.running),
        chip('completed', '已完成', counts?.completed), chip('cancelled', '已取消', counts?.cancelled), chip('paused', '已暂停', counts?.paused),
      ]} />
      <ChipRow label="是否逾期" value={late} onChange={setLate} options={[chip('all', '全部', counts?.all), chip('yes', '已逾期', counts?.overdue), chip('no', '未逾期', counts?.on_time)]} />
      <ChipRow label="优先级" value={priority} onChange={setPriority} options={[chip('all', '全部', counts?.all), chip('urgent', '加急', counts?.urgent), chip('normal', '正常', counts?.normal), chip('delayed', '延期', counts?.delayed)]} />
      <div className="mp-tools">
        <button type="button" onClick={() => setBatch(true)}>批量操作{chosen.length ? `(${chosen.length})` : ''}</button>
        <button type="button" onClick={() => setExpand((value) => !value)}>{expand ? '收起子单' : '展开子单'}</button>
        <button type="button" onClick={() => setSchedule(true)}>排单</button>
      </div>
      <div className="mp-summary">
        <span>【总计划数】<b>{qtyText(remote.data?.summary.plan_qty)}</b></span>
        <span>【实际生产数】<b>{qtyText(remote.data?.summary.output_qty)}</b></span>
      </div>
      <Banner text={remote.error || command.error} />
      {remote.loading && <Empty text="正在读取加工单…" />}
      {!remote.loading && !rows.length && <Empty text="暂无加工单" />}
      {rows.map((row) => {
        const pct = percentOf(row.task_progress?.done, row.task_progress?.total);
        return (
          <article key={row.id} className="mp-card" data-testid="mp-wo-card">
            <div className="mp-card-top">
              <label className="mp-check">
                <input type="checkbox" checked={chosen.includes(row.id)} onChange={(event) => setChosen((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
                <button type="button" className="mp-hit" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.id}`)}><h3>{row.code}</h3></button>
              </label>
              <span className="mp-links">
                <button type="button" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.id}?tab=wages`)}>工资单</button>
                <button type="button" onClick={() => printRow(row)}>打印</button>
                <button type="button" onClick={() => setMore(row)}>更多</button>
              </span>
            </div>
            <button type="button" className="mp-hit" onClick={() => navigate(`/ms/inside_produce_bill/detail/${row.id}`)}>
              <p className="mp-sub" style={{ fontSize: 16, color: '#111', fontWeight: 650 }}>{row.product_snapshot.name || '未命名商品'}</p>
              <p className="mp-sub">排单序号 {row.schedule_no && row.schedule_no > 0 ? row.schedule_no : '-'} · 计划数 {qtyText(row.plan_qty)} · 库存 {row.stock_qty?.trim() || '无'}</p>
              <p className="mp-sub">交期 {row.due_date?.slice(0, 10) || '-'} · {row.current_process || '未排工序'} · {pct}%</p>
              <div className="mp-bar-line"><BarSafe value={pct} /><span>{row.task_progress?.done ?? '0'}/{row.task_progress?.total ?? '0'}</span></div>
            </button>
            <div className="mp-card-top" style={{ marginTop: 8 }}>
              <span className="mp-sub">{row.contract_code?.trim() || ''}</span>
              <Tag text={EXEC_TEXT[row.execution] ?? row.execution} tone={statusTone(row.execution)} />
            </div>
          </article>
        );
      })}
      {batch && (
        <Sheet title="批量操作" testId="mp-wo-batch" onClose={() => setBatch(false)}>
          <p className="mp-sub">已勾选 {chosen.length} 张。开始生产沿用现网规则：仅未开始的加工单可以开工。</p>
          <button type="button" className="mp-primary" disabled={!session.csrf_token || command.busy} onClick={() => void batchStart()}>批量开始</button>
        </Sheet>
      )}
      {schedule && (
        <Sheet title="排单" testId="mp-wo-schedule" onClose={() => setSchedule(false)}>
          <p className="mp-sub">按当前列表顺序写入排单序号（与 PC「排单」同一接口）。</p>
          {rows.filter((row) => !row.parent_id).map((row, index) => <div key={row.id} className="mp-line"><span>{index + 1}. {row.code}</span><span>{row.product_snapshot.name}</span></div>)}
          <button type="button" className="mp-primary" disabled={command.busy} onClick={() => void saveSchedule()}>保存排单</button>
        </Sheet>
      )}
      {more && (
        <Sheet title={more.code} onClose={() => setMore(null)}>
          <button type="button" className="mp-btn" onClick={() => navigate(`/ms/inside_produce_bill/detail/${more.id}`)}>查看详情</button>
        </Sheet>
      )}
    </div>
  );
}

function BarSafe({ value }: { value: number }) {
  return <div className="mp-bar"><i style={{ width: `${value}%` }} /></div>;
}

type OrderDetail = {
  id: string;
  code: string;
  plan_qty: string;
  output_qty: string;
  execution: string;
  due_date?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  priority?: string;
  note?: string;
  contract_code?: string;
  product_snapshot: { name?: string; code?: string; specification?: string };
  tasks: { id: string; process_name: string; execution: string; plan_qty: string; approved_good: string }[];
};

export function WorkOrderDetailPage({ id }: { id: string }) {
  const [params] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const remote = useRemote<{ work_order: OrderDetail }>(id ? `/api/work-orders/${id}` : null, revision, onExpired);
  const order = remote.data?.work_order;
  const tab = params.get('tab');
  if (remote.loading) return <Empty text="正在读取加工单…" />;
  if (!order) return <Banner text={remote.error || '加工单不存在'} />;
  const done = order.tasks.reduce((sum, task) => sum + Number(task.approved_good || 0), 0);
  const total = order.tasks.reduce((sum, task) => sum + Number(task.plan_qty || 0), 0);
  const pct = percentOf(done, total);
  const current = order.tasks.find((task) => task.execution !== 'completed' && task.execution !== 'cancelled');
  return (
    <div data-testid="mp-wo-detail">
      <article className="mp-card">
        <p className="mp-sub">单号 {order.code}</p>
        <h3 style={{ fontSize: 20, marginTop: 6 }}>品名：{order.product_snapshot.name || '-'}</h3>
        <p className="mp-sub">状态：{EXEC_TEXT[order.execution] ?? order.execution}</p>
        <div className="mp-bar-line"><BarSafe value={pct} /><b style={{ color: '#4184F4' }}>{pct}%</b></div>
      </article>
      <div className="mp-card">
        <Kv label="交货日期">{order.due_date?.slice(0, 10) || '-'}</Kv>
        <Kv label="工序进度">{current?.process_name || (order.tasks.length ? '已完成' : '-')}</Kv>
        <Kv label="任务进度">{pct}% ({Math.round(done)}/{Math.round(total) || 0})</Kv>
        <Kv label="计划开始">{order.planned_start?.slice(0, 10) || '-'}</Kv>
        <Kv label="计划结束">{order.planned_end?.slice(0, 10) || '-'}</Kv>
        <Kv label="优先级">{priorityText(order.priority)}</Kv>
        <Kv label="计划数">{qtyText(order.plan_qty)}</Kv>
        {order.contract_code && <Kv label="合同">{order.contract_code}</Kv>}
      </div>
      {tab === 'wages' && (
        <div className="mp-card" data-testid="mp-wo-wages">
          <h3>工资单</h3>
          <p className="mp-sub">计件/计时仍由报工写入时的工资快照计算，此处只列出工序进度，不改公式。</p>
          {order.tasks.map((task) => (
            <div key={task.id} className="mp-line"><span>{task.process_name}</span><span>良品 {qtyText(task.approved_good)} / {qtyText(task.plan_qty)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

type ProcessItem = { id: string; code: string; name: string; active?: boolean; pricing_mode?: 'piece' | 'time'; wage_rate?: string | null };
type ProductItem = { id: string; code: string; name: string; active?: boolean };

export function WorkOrderAddPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const direct = params.get('mode') === 'direct';
  const { revision, onExpired } = useKgd();
  const command = useCommand();
  const contracts = useRemote<{ items: { id: string; code: string; approval: string; customer_name: string; lines: { id: string; product_id: string; product_code: string; product_name: string; quantity: string }[] }[] }>(direct ? null : '/api/money/contracts', revision, onExpired);
  const scheduled = useRemote<{ items: { contract_line_id?: string | null; execution: string; plan_qty: string }[] }>(direct ? null : '/api/progress/work-orders?page=1&page_size=200', revision, onExpired);
  const products = useRemote<{ items: ProductItem[] }>(direct ? '/api/products?page=1&page_size=100' : null, revision, onExpired);
  const processes = useRemote<{ items: ProcessItem[] }>('/api/processes', revision, onExpired);
  const [lineId, setLineId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [productId, setProductId] = useState('');
  const [plan, setPlan] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('none');
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const usedQty = (id: string) => (scheduled.data?.items ?? []).filter((row) => row.contract_line_id === id && row.execution !== 'cancelled').reduce((sum, row) => sum + Number(row.plan_qty || 0), 0);
  const lines: ContractLine[] = (contracts.data?.items ?? [])
    .filter((order) => order.approval === 'approved' || order.approval === 'exempt')
    .flatMap((order) => order.lines.map((item) => {
      const remain = subQty(item.quantity, String(usedQty(item.id)));
      return { ...item, orderCode: order.code, customer: order.customer_name, remain, open: cmpQty(item.quantity, String(usedQty(item.id))) > 0 };
    }));
  const needle = keyword.trim();
  const shown = lines.filter((line) => !needle || `${line.orderCode}${line.product_name}${line.product_code}${line.customer}`.includes(needle));
  const line = lines.find((item) => item.id === lineId);
  const activeProcesses = (processes.data?.items ?? []).filter((item) => item.active !== false);

  async function save() {
    if (!direct && !line) { command.setError('请先选择合同订单商品'); return; }
    if (direct && !productId) { command.setError('请选择商品'); return; }
    if (!plan.trim()) { command.setError('请填写计划数'); return; }
    if (!picked.length) { command.setError('请至少添加一道工序'); return; }
    try {
      const created = await command.send<{ work_order: { id: string } }>('/api/work-orders', workOrderCreatePayload({
        ...(direct ? { product_id: productId } : { contract_line_id: line!.id }),
        quantity: plan,
        requires_fg_inspection: false,
        require_cost: false,
        priority,
        due_date: due || null,
        planned_start: planStart || null,
        planned_end: planEnd || null,
        note,
        tasks: picked.map((id) => {
          const proc = activeProcesses.find((item) => String(item.id) === id);
          return { process_id: id, unit_ratio: '1', pricing_mode: proc?.pricing_mode || 'piece', wage_rate: proc?.wage_rate ?? null };
        }),
      }));
      const next = created?.work_order.id;
      if (next) navigate(`/ms/inside_produce_bill/detail/${next}`);
    } catch (failure) { command.setError(showError(failure)); }
  }

  if (!direct && !line) {
    return (
      <div data-testid="ms-contract-pick">
        <h3 style={{ marginTop: 0 }}>选择合同订单商品</h3>
        <p className="mp-sub">合同创建必须先勾选上游合同订单商品，不能跳过直接空白新增。</p>
        <Banner text={contracts.error || command.error} />
        <label className="mp-form"><span>合同编号 / 商品</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索已审核合同" /></label>
        {contracts.loading && <Empty text="正在读取合同…" />}
        {!contracts.loading && !shown.length && <Empty text={needle ? '没有匹配的已审核合同行' : '没有未投产的已审核合同行'} />}
        {shown.map((item) => (
          <div key={item.id} className="mp-card" data-testid="mp-contract-line">
            <div className="mp-card-top">
              <div>
                <h3>{item.orderCode}</h3>
                <p className="mp-sub">{item.product_name} · {item.product_code}</p>
                <p className="mp-sub">{item.customer || '客户'} · 未投产 {item.remain}</p>
              </div>
              <button type="button" className="mp-btn" disabled={!item.open} onClick={() => { setLineId(item.id); setPlan(item.remain === '0' ? '' : item.remain); }}>
                {item.open ? '选择' : '已投满'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid={direct ? 'ms-wo-direct' : 'ms-wo-from-contract'}>
      <Banner text={command.error} />
      <div className="mp-form">
        {!direct && line && (
          <div className="mp-card">
            <p className="mp-sub">上游合同</p>
            <h3>{line.orderCode}</h3>
            <p className="mp-sub">{line.product_code} {line.product_name}</p>
            <button type="button" className="mp-btn" onClick={() => setLineId('')}>重选合同商品</button>
          </div>
        )}
        {direct && (
          <label>商品 *
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">选择商品</option>
              {(products.data?.items ?? []).filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}
            </select>
          </label>
        )}
        <label>计划数 *<input value={plan} inputMode="decimal" onChange={(event) => setPlan(event.target.value)} /></label>
        <label>交货日期<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
        <label>优先级
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="none">无</option>
            <option value="urgent">加急</option>
            <option value="normal">正常</option>
            <option value="delayed">延期</option>
          </select>
        </label>
        <label>计划开始<input type="date" value={planStart} onChange={(event) => setPlanStart(event.target.value)} /></label>
        <label>计划结束<input type="date" value={planEnd} onChange={(event) => setPlanEnd(event.target.value)} /></label>
        <label>备注<input value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      <h3>工序</h3>
      <p className="mp-sub">至少一道。计价方式与工资单价沿用工序主数据，不在手机端改公式。</p>
      {activeProcesses.map((item) => (
        <label key={item.id} className="mp-check">
          <input type="checkbox" checked={picked.includes(String(item.id))} onChange={(event) => setPicked((current) => event.target.checked ? [...current, String(item.id)] : current.filter((id) => id !== String(item.id)))} />
          {item.name} · {item.code}
        </label>
      ))}
      {!activeProcesses.length && <Empty text="暂无可用工序" />}
      <button type="button" className="mp-primary" style={{ marginTop: 12 }} disabled={command.busy} onClick={() => void save()}>创建加工单</button>
    </div>
  );
}
