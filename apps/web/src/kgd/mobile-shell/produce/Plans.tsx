import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { requestKey } from '../../../requestKey';
import { useKgd } from '../../context';
import { showError, useCommand } from '../../kit';
import { qtyText } from '../../qty';
import { Banner, Empty, Kv, numOf, percentOf, Tag } from './bits';

type Progress = { done: string; total: string };
type PlanRow = {
  id: string;
  code: string;
  name: string;
  analysis_status: 'pending' | 'analyzed' | 'void';
  process_progress: Progress;
  outsource_progress: Progress;
  purchase_progress: Progress;
  delivery_date: string | null;
  creator_name: string;
  created_at: string;
};

function analysisLabel(status: PlanRow['analysis_status']) {
  return status === 'analyzed' ? '已分析' : '未分析';
}

function sumProgress(rows: PlanRow[], key: 'process_progress' | 'outsource_progress' | 'purchase_progress') {
  const done = rows.reduce((sum, row) => sum + numOf(row[key]?.done), 0);
  const total = rows.reduce((sum, row) => sum + numOf(row[key]?.total), 0);
  return { done, total, pct: percentOf(done, total) };
}

export function PlanListPage({ keyword }: { keyword: string }) {
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) {
      if (/[\u4e00-\u9fa5]/.test(keyword)) params.set('name', keyword.trim());
      else params.set('code', keyword.trim());
    }
    params.set('page', '1');
    params.set('page_size', '30');
    return `/api/production-plans?${params}`;
  }, [keyword]);
  const remote = useRemote<{ items: PlanRow[]; total: number }>(path, revision, onExpired);
  const rows = remote.data?.items ?? [];
  const process = sumProgress(rows, 'process_progress');
  const outsource = sumProgress(rows, 'outsource_progress');
  const purchase = sumProgress(rows, 'purchase_progress');
  const today = new Date().toISOString().slice(0, 10);
  const risks = rows.filter((row) => {
    if (!row.delivery_date || row.delivery_date.slice(0, 10) >= today) return false;
    const total = numOf(row.process_progress?.total);
    return total <= 0 || numOf(row.process_progress?.done) < total;
  });

  return (
    <div data-testid="mp-plans">
      <div className="mp-hero">
        <div className="mp-hero-row"><span className="mp-ico">加</span><div><div>加工投产</div><b>{process.pct}%</b></div><div className="mp-bar"><i style={{ width: `${process.pct}%` }} /></div></div>
        <div className="mp-hero-row is-green"><span className="mp-ico">协</span><div><div>外协投产</div><b>{outsource.pct}%</b></div><div className="mp-bar is-green"><i style={{ width: `${outsource.pct}%` }} /></div></div>
        <div className="mp-hero-row"><span className="mp-ico">采</span><div><div>采购进度</div><b>{purchase.pct}%</b></div><div className="mp-bar"><i style={{ width: `${purchase.pct}%` }} /></div></div>
      </div>
      <div className="mp-risk"><span>延期风险提示</span><b>存在 {risks.length} 条计划存在延期风险</b></div>
      <Banner text={remote.error} />
      {remote.loading && <Empty text="正在读取生产计划…" />}
      {!remote.loading && !rows.length && <Empty text="暂无生产计划" />}
      {rows.map((row) => (
        <article key={row.id} className="mp-card" data-testid="mp-plan-card">
          <button type="button" className="mp-hit" onClick={() => navigate(`/ms/ProductionPlan/detail/${row.id}`)}>
            <div className="mp-card-top">
              <div>
                <p className="mp-sub">{row.code}</p>
                <h3>{row.name}</h3>
              </div>
              <Tag text={analysisLabel(row.analysis_status)} tone={row.analysis_status === 'analyzed' ? 'is-done' : 'is-wait'} />
            </div>
            <ProgressLine label="加工" tone="blue" progress={row.process_progress} />
            <ProgressLine label="外协" tone="green" progress={row.outsource_progress} />
            <ProgressLine label="采购" tone="blue" progress={row.purchase_progress} />
            <p className="mp-sub">交货 {row.delivery_date?.slice(0, 10) || '-'} · {row.creator_name || '-'}</p>
          </button>
        </article>
      ))}
    </div>
  );
}

function ProgressLine({ label, progress, tone }: { label: string; progress: Progress; tone: 'blue' | 'green' }) {
  const pct = percentOf(progress?.done, progress?.total);
  return (
    <div className="mp-bar-line">
      <em>{label}</em>
      <div className={`mp-bar ${tone === 'green' ? 'is-green' : ''}`}><i style={{ width: `${pct}%` }} /></div>
      <span>{pct}% ({qtyText(progress?.done)}/{qtyText(progress?.total)})</span>
    </div>
  );
}

type PlanLine = { id: string; product_id: string; product_name: string; product_code: string; plan_qty: string; contract_code: string; customer_name: string; unit_name: string; note: string };
type ContractPick = { id: string; product_id: string; product_code: string; product_name: string; quantity: string; unit_name?: string; orderCode: string; customer: string };

export function PlanAddPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromContract = params.get('from') === 'contract';
  const { revision, onExpired } = useKgd();
  const command = useCommand();
  const products = useRemote<{ items: { id: string; code: string; name: string; unit_name?: string }[] }>('/api/products?page=1&page_size=100', revision, onExpired);
  const contracts = useRemote<{ items: { id: string; code: string; customer_name: string; lines: { id: string; product_id: string; product_code: string; product_name: string; quantity: string; unit_name?: string }[] }[] }>(fromContract ? '/api/sales-orders' : null, revision, onExpired);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [delivery, setDelivery] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<PlanLine[]>([]);
  const [productId, setProductId] = useState('');
  const [pickedContract, setPickedContract] = useState(!fromContract);

  const contractLines: ContractPick[] = (contracts.data?.items ?? []).flatMap((order) => order.lines.map((line) => ({
    ...line, orderCode: order.code, customer: order.customer_name,
  })));

  function addContract(line: ContractPick) {
    setLines((current) => [...current, {
      id: requestKey(),
      product_id: line.product_id,
      product_name: line.product_name,
      product_code: line.product_code,
      plan_qty: qtyText(line.quantity),
      contract_code: line.orderCode,
      customer_name: line.customer,
      unit_name: line.unit_name || '',
      note: '',
    }]);
    setPickedContract(true);
    if (!name.trim()) setName(`${line.product_name}计划`);
  }

  function addProduct() {
    const product = products.data?.items.find((item) => item.id === productId);
    if (!product) { command.setError('请选择商品'); return; }
    setLines((current) => [...current, {
      id: requestKey(), product_id: product.id, product_name: product.name, product_code: product.code,
      plan_qty: '', contract_code: '', customer_name: '', unit_name: product.unit_name || '', note: '',
    }]);
    setProductId('');
  }

  async function save() {
    if (fromContract && !lines.some((line) => line.contract_code)) { command.setError('请先选择合同商品'); return; }
    if (!name.trim()) { command.setError('请填写计划名称'); return; }
    if (lines.some((line) => !String(line.plan_qty).trim())) { command.setError('请填写计划数'); return; }
    try {
      const body = await command.send<{ plan: { id: string } }>('/api/production-plans', {
        code: code.trim() || undefined,
        name: name.trim(),
        delivery_date: delivery || null,
        note,
        lines: lines.map((line, index) => ({
          product_id: line.product_id,
          plan_qty: line.plan_qty,
          contract_code: line.contract_code,
          customer_name: line.customer_name,
          source: '自产',
          note: line.note,
          sequence: index + 1,
        })),
      });
      if (body?.plan.id) navigate(`/ms/ProductionPlan/detail/${body.plan.id}`);
      else navigate('/ms/ProductionPlan/list');
    } catch (failure) { command.setError(showError(failure)); }
  }

  if (fromContract && !pickedContract) {
    return (
      <div data-testid="ms-plan-contract-pick">
        <h3 style={{ marginTop: 0 }}>从合同商品生成</h3>
        <p className="mp-sub">对应 PC 新建计划里的「从合同商品中添加」。须先选上游合同商品。</p>
        <Banner text={contracts.error || command.error} />
        {contracts.loading && <Empty text="正在读取合同…" />}
        {!contracts.loading && !contractLines.length && <Empty text="暂无合同商品" />}
        {contractLines.map((line) => (
          <div key={line.id} className="mp-card">
            <div className="mp-card-top">
              <div>
                <h3>{line.orderCode}</h3>
                <p className="mp-sub">{line.customer} · {line.product_name}</p>
                <p className="mp-sub">数量 {qtyText(line.quantity)}</p>
              </div>
              <button type="button" className="mp-btn" onClick={() => addContract(line)}>添加</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="ms-plan-add">
      <Banner text={command.error} />
      <div className="mp-form">
        <label>计划名称 *<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>计划编号<input value={code} placeholder="留空则自动生成" onChange={(event) => setCode(event.target.value)} /></label>
        <label>交货日期<input type="date" value={delivery} onChange={(event) => setDelivery(event.target.value)} /></label>
        <label>备注<input value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      {!fromContract && (
        <div className="mp-tools" style={{ marginTop: 10 }}>
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">选择商品</option>
            {(products.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}
          </select>
          <button type="button" onClick={addProduct}>添加商品</button>
        </div>
      )}
      {fromContract && <button type="button" className="mp-btn" onClick={() => setPickedContract(false)}>继续从合同添加</button>}
      {lines.map((line) => (
        <div key={line.id} className="mp-card">
          <h3>{line.product_name}</h3>
          <p className="mp-sub">{line.contract_code ? `合同 ${line.contract_code} · ${line.customer_name}` : line.product_code}</p>
          <label className="mp-form">计划数<input value={line.plan_qty} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, plan_qty: event.target.value } : item))} /></label>
        </div>
      ))}
      <button type="button" className="mp-primary" style={{ marginTop: 12 }} disabled={command.busy} onClick={() => void save()}>创建生产计划</button>
    </div>
  );
}

type PlanDetail = PlanRow & { lines: { id: string; product_name: string; product_code: string; plan_qty: string; contract_code: string; customer_name: string }[]; note?: string };

export function PlanDetailPage({ id }: { id: string }) {
  const { revision, onExpired } = useKgd();
  const remote = useRemote<{ plan: PlanDetail }>(id ? `/api/production-plans/${id}` : null, revision, onExpired);
  const plan = remote.data?.plan;
  if (remote.loading) return <Empty text="正在读取生产计划…" />;
  if (!plan) return <Banner text={remote.error || '生产计划不存在'} />;
  return (
    <div data-testid="mp-plan-detail">
      <article className="mp-card">
        <div className="mp-card-top">
          <h3>{plan.name}</h3>
          <Tag text={analysisLabel(plan.analysis_status)} tone={plan.analysis_status === 'analyzed' ? 'is-done' : 'is-wait'} />
        </div>
        <p className="mp-sub">{plan.code}</p>
        <ProgressLine label="加工" tone="blue" progress={plan.process_progress} />
        <ProgressLine label="外协" tone="green" progress={plan.outsource_progress} />
        <ProgressLine label="采购" tone="blue" progress={plan.purchase_progress} />
      </article>
      <div className="mp-card">
        <Kv label="交货日期">{plan.delivery_date?.slice(0, 10) || '-'}</Kv>
        <Kv label="创建人">{plan.creator_name || '-'}</Kv>
      </div>
      {(plan.lines ?? []).map((line) => (
        <div key={line.id} className="mp-card">
          <h3>{line.product_name}</h3>
          <p className="mp-sub">{line.product_code} · 计划 {qtyText(line.plan_qty)} · {line.contract_code || '无合同'}</p>
        </div>
      ))}
    </div>
  );
}
