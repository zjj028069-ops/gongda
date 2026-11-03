import type { FixtureBill } from './fixtures';
import type { C2Layout } from './c2Registry';

function StatusPill({ status, text }: { status: FixtureBill['status']; text: string }) {
  const cls = status === 'pending' ? 'is-pending' : status === 'approved' ? 'is-ok' : status === 'draft' ? 'is-draft' : 'is-mute';
  return <span className={`c2-pill ${cls}`}>{text || '—'}</span>;
}

function Thumb({ label }: { label?: string }) {
  const ch = Array.from(label || '品')[0] || '品';
  return <span className="c2-thumb" aria-hidden>{ch}</span>;
}

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** 版4 报警胶囊 · 库存 */
export function AlarmStockCard({ row }: { row: FixtureBill }) {
  const tone = row.alarm === 'high' ? 'tone-high' : row.alarm === 'low' ? 'tone-low' : row.alarm === 'stale' ? 'tone-stale' : 'tone-ok';
  return (
    <article className={`c2-card c2-alarm ${tone}`} data-testid="c2-card" data-layout="v4-alarm">
      <i className="c2-alarm-bar" aria-hidden />
      <Thumb label={row.product} />
      <div className="c2-card-body">
        <h3>{row.product}</h3>
        <p className="c2-sub">{row.warehouse}</p>
        <p className="c2-kv">
          <span>库存数量 <strong>{row.qty ?? 0}</strong></span>
          <span className="c2-muted">[上限 {row.upper ?? '—'} / 下限 {row.lower ?? '—'}]</span>
        </p>
        <p className="c2-kv">成本金额 {money(row.costAmount)}</p>
      </div>
    </article>
  );
}

/** 版4 明细行卡 · 单据 */
export function DetailBillCard({ row, mode }: { row: FixtureBill; mode?: 'flow' | 'taking' | 'transfer' | 'default' }) {
  if (mode === 'flow') {
    const out = row.direction === 'out';
    return (
      <article className="c2-card c2-detail" data-testid="c2-card" data-layout="v4-detail">
        <div className="c2-card-head">
          <button type="button" className="c2-code">{row.code}</button>
          <span className="c2-date">{row.time || row.date}</span>
        </div>
        <div className="c2-tags">
          <span className={`c2-pill ${out ? 'is-out' : 'is-in'}`}>{row.docType || (out ? '出库' : '入库')}</span>
          {row.warehouse && <span className="c2-pill is-wh">{row.warehouse}</span>}
        </div>
        <div className="c2-flow-row">
          <Thumb label={row.product} />
          <div className="c2-card-body">
            <h3>{row.product}</h3>
          </div>
          <div className="c2-flow-nums">
            <div>
              <span className="c2-muted">数量</span>
              <strong className={out ? 'is-neg' : 'is-pos'}>{out ? `-${row.qty ?? 0}` : `+${row.qty ?? 0}`}</strong>
            </div>
            <div>
              <span className="c2-muted">结存</span>
              <strong>{row.balance ?? '—'}</strong>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (mode === 'taking') {
    const diff = Number(row.qty ?? 0);
    return (
      <article className="c2-card c2-detail" data-testid="c2-card" data-layout="v4-detail">
        <div className="c2-card-head">
          <button type="button" className="c2-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c2-date">{row.date}</span>
        </div>
        <p className="c2-meta">仓库 {row.warehouse}</p>
        <div className="c2-taking-table">
          <div className="c2-taking-head"><span>品名</span><span>账面</span><span>实盘</span><span>盈亏</span></div>
          {(row.lines ?? []).map((line, i) => (
            <div key={`${line.name}-${i}`} className="c2-taking-row">
              <span className="c2-taking-name"><Thumb label={line.name} />{line.name}</span>
              <span>{line.book ?? '—'}</span>
              <span>{line.actual ?? '—'}</span>
              <span className={(line.diff ?? 0) > 0 ? 'is-pos' : (line.diff ?? 0) < 0 ? 'is-neg' : ''}>
                {(line.diff ?? 0) > 0 ? `+${line.diff}` : line.diff ?? 0}
              </span>
            </div>
          ))}
        </div>
        <div className="c2-card-foot">
          <span>明细 {row.lineCount ?? row.lines?.length ?? 0} 行</span>
          <strong className={diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : ''}>盈亏合计 {diff > 0 ? `+${diff}` : diff}</strong>
        </div>
      </article>
    );
  }

  const context =
    mode === 'transfer'
      ? `调出 ${row.fromWh || '—'} → 调入 ${row.toWh || '—'}`
      : [row.partner, row.workOrder ? `加工单 ${row.workOrder}` : '', row.contract ? `合同 ${row.contract}` : '', row.warehouse]
          .filter(Boolean)
          .join(' · ');

  const showAmount = row.amount != null && row.amount > 0;
  return (
    <article className="c2-card c2-detail" data-testid="c2-card" data-layout="v4-detail">
      <div className="c2-card-head">
        <button type="button" className="c2-code">{row.code}</button>
        <StatusPill status={row.status} text={row.statusText} />
        <span className="c2-date">{row.date}</span>
      </div>
      {context && <p className="c2-meta">{context}</p>}
      {(row.lines?.length || row.product) && (
        <div className="c2-lines">
          {(row.lines ?? [{ name: row.product || '商品', qty: row.qty ?? 0, amount: row.amount }]).map((line, i) => (
            <div key={`${line.name}-${i}`} className="c2-line">
              <Thumb label={line.name} />
              <span className="c2-line-name">{line.name}{line.spec ? ` ${line.spec}` : ''}</span>
              <span className="c2-line-qty">× {line.qty ?? 0}</span>
              {line.amount != null && <span className="c2-line-amt">{money(line.amount)}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="c2-card-foot">
        <span>明细 {row.lineCount ?? row.lines?.length ?? 0} 行</span>
        {showAmount
          ? <strong>合计金额 {money(row.amount)}</strong>
          : <strong>合计 {row.qty ?? 0} 件</strong>}
      </div>
    </article>
  );
}

/** 版2 数量优先 · 销售出库 */
export function QtyFirstCard({ row }: { row: FixtureBill }) {
  return (
    <article className="c2-card c2-qty2" data-testid="c2-card" data-layout="v2-qty">
      <div className="c2-qty2-main">
        <button type="button" className="c2-code">{row.code}</button>
        <h3>{row.partner || '客户'}</h3>
        <p className="c2-sub">仓库 {row.warehouse || '—'}</p>
        <p className="c2-sub">{row.product}</p>
        <p className="c2-qty2-meta">
          <StatusPill status={row.status} text={row.statusText} />
          <span>{row.qty ?? 0}件 · {row.date}</span>
        </p>
      </div>
      <div className="c2-qty2-side">
        <strong>{row.qty ?? 0}</strong>
        <span>出库数量</span>
      </div>
    </article>
  );
}

/** 版1 疏朗 · 生产退料 / 仓库档案 */
export function SparseCard({ row, kind }: { row: FixtureBill; kind: 'return' | 'warehouse' }) {
  if (kind === 'warehouse') {
    return (
      <article className="c2-card c2-sparse" data-testid="c2-card" data-layout="v1-sparse">
        <div className="c2-card-head">
          <button type="button" className="c2-code">{row.code}</button>
          <span className={`c2-pill ${row.active === false ? 'is-draft' : 'is-ok'}`}>{row.statusText || '启用'}</span>
        </div>
        <div className="c2-sparse-body">
          <span className="c2-wh-ico" aria-hidden>仓</span>
          <div>
            <h3>{row.product}</h3>
            <p className="c2-sub">负责人 {row.manager || '—'}</p>
            <p className="c2-sub">{row.address || '—'}</p>
            {row.note && <p className="c2-sub">备注 {row.note}</p>}
          </div>
        </div>
        <div className="c2-card-foot end">
          <button type="button" className="c2-link">修改</button>
        </div>
      </article>
    );
  }
  return (
    <article className="c2-card c2-sparse" data-testid="c2-card" data-layout="v1-sparse">
      <div className="c2-sparse-top">
        <div>
          <button type="button" className="c2-code">{row.code}</button>
          <p className="c2-sub">加工单 {row.workOrder || '—'}</p>
          <p className="c2-sub">退回仓库 {row.warehouse || '—'}</p>
          <p className="c2-product-line"><Thumb label={row.product} />{row.product}</p>
        </div>
        <div className="c2-sparse-right">
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c2-date">{row.date}</span>
        </div>
      </div>
      <div className="c2-qty-compare">
        <div>
          <span className="c2-muted">领料数</span>
          <strong>{row.issueQty ?? 0} 件</strong>
        </div>
        <i className="c2-vsep" aria-hidden />
        <div>
          <span className="c2-muted">退料数</span>
          <strong className="is-accent">{row.returnQty ?? row.qty ?? 0} 件</strong>
        </div>
      </div>
    </article>
  );
}

export function renderC2Card(layout: C2Layout, leafKey: string, row: FixtureBill) {
  if (layout === 'v4-alarm') return <AlarmStockCard key={row.id} row={row} />;
  if (layout === 'v2-qty') return <QtyFirstCard key={row.id} row={row} />;
  if (layout === 'v1-sparse') {
    return <SparseCard key={row.id} row={row} kind={leafKey === 'warehouse-list' ? 'warehouse' : 'return'} />;
  }
  const mode = leafKey === 'flow' ? 'flow' : leafKey === 'check' ? 'taking' : leafKey === 'transfer' ? 'transfer' : 'default';
  return <DetailBillCard key={row.id} row={row} mode={mode} />;
}
