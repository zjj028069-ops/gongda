import { useState } from 'react';
import type { FixtureRow } from './fixtures';
import type { C1bLayout } from './c1bRegistry';

function StatusPill({ status, text }: { status: string; text: string }) {
  const cls =
    status === 'done' || status === 'settled' || status === 'shared' || status === 'enabled' || status === 'used' || status === 'active'
      ? 'is-ok'
      : status === 'running' || status === 'pending'
        ? 'is-pending'
        : status === 'void' || status === 'cancelled' || status === 'disabled' || status === 'none'
          ? 'is-mute'
          : status === 'unsettled' || status === 'draft' || status === 'unused'
            ? 'is-warn'
            : 'is-mute';
  return <span className={`c1b-pill ${cls}`}>{text || '—'}</span>;
}

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** 版4 · 明细行卡 */
export function DetailLinesCard({ row, leafKey }: { row: FixtureRow; leafKey: string }) {
  return (
    <article className="c1b-card c1b-detail" data-testid="c1b-card" data-layout="v4-detail-lines" data-key={leafKey}>
      <div className="c1b-card-head">
        <button type="button" className="c1b-code">{row.code}</button>
        <StatusPill status={row.status} text={row.statusText} />
        <span className="c1b-date">{row.date || '—'}</span>
      </div>
      <h3>{row.name}</h3>
      <p className="c1b-sub">
        {[
          row.category,
          row.contractCode ? `合同 ${row.contractCode}` : '',
          row.product,
          row.supplier,
          row.expenseType,
          row.method,
          row.processName,
          row.workOrder ? `加工单 ${row.workOrder}` : '',
        ].filter(Boolean).join(' · ') || '—'}
      </p>
      {row.progressText && <p className="c1b-sub">{row.progressText}</p>}
      {row.amount != null && leafKey === 'cost' && (
        <p className="c1b-amt-inline">金额 <strong>{money(row.amount)}</strong></p>
      )}
      {(row.planQty != null || row.workOrderCount != null) && leafKey === 'project' && (
        <p className="c1b-sub">
          计划数 {row.planQty ?? '—'} · 工单 {row.completedWorkOrderCount ?? 0}/{row.workOrderCount ?? 0}
        </p>
      )}
      <ul className="c1b-lines" data-testid="c1b-detail-lines">
        {(row.lines || []).map((line, idx) => (
          <li key={`${row.id}-${idx}`}>
            <em>{line.short}</em>
            <span>{line.name}{line.meta ? ` · ${line.meta}` : ''}</span>
            {line.qty != null && <strong>{leafKey === 'cost' ? money(line.qty) : `x${line.qty}`}</strong>}
          </li>
        ))}
      </ul>
      <div className="c1b-card-foot">
        <span>明细 {row.lineCount ?? row.lines?.length ?? 0} 行</span>
        {leafKey === 'os-order' && row.planQty != null && <strong>计划 {row.planQty}</strong>}
        {leafKey === 'cost' && row.amount != null && <strong>{money(row.amount)}</strong>}
        {leafKey === 'qc-spot-line' && (
          <strong>良品 {row.goodQty ?? 0} · 不良 {row.defectQty ?? 0}</strong>
        )}
      </div>
    </article>
  );
}

/** 版1 · 疏朗 */
export function SparseCard({ row, leafKey }: { row: FixtureRow; leafKey: string }) {
  return (
    <article className="c1b-card c1b-sparse" data-testid="c1b-card" data-layout="v1-sparse" data-key={leafKey}>
      <div className="c1b-sparse-top">
        <div>
          <button type="button" className="c1b-code">{row.code}</button>
          <h3>{row.name}</h3>
          {leafKey === 'material-analysis' && (
            <>
              <p className="c1b-sub">计划 {row.planCode || '—'} · {row.planName || '—'}</p>
              <div className="c1b-kv-row">
                <div><span>加工</span><strong>{row.processDemand ?? 0}</strong></div>
                <div><span>外协</span><strong>{row.outsourceDemand ?? 0}</strong></div>
                <div><span>采购</span><strong>{row.purchaseDemand ?? 0}</strong></div>
              </div>
              <p className="c1b-sub">分析人 {row.owner || '—'} · {row.date || '—'}</p>
            </>
          )}
          {leafKey === 'os-content' && (
            <>
              <p className="c1b-sub">检查项 {row.itemCount ?? 0} · 创建人 {row.creator || '—'}</p>
              {row.note && <p className="c1b-sub">{row.note}</p>}
              <p className="c1b-sub">{row.date || '—'}</p>
            </>
          )}
          {leafKey === 'defect' && (
            <p className="c1b-sub">创建 {row.date || '—'} · {row.creator || '—'}</p>
          )}
        </div>
        <StatusPill status={row.status} text={row.statusText} />
      </div>
    </article>
  );
}

/** 版2 · 结果优先（良品/不良或合格/不合格） */
export function ResultFirstCard({ row, leafKey }: { row: FixtureRow; leafKey: string }) {
  const main = leafKey === 'os-receipt'
    ? (row.passQty ?? 0)
    : (row.goodQty ?? 0);
  const sideLabel = leafKey === 'os-receipt' ? '合格数' : '良品数';
  const bad = leafKey === 'os-receipt' ? (row.failQty ?? 0) : (row.defectQty ?? 0);
  return (
    <article className="c1b-card c1b-result2" data-testid="c1b-card" data-layout="v2-result" data-key={leafKey}>
      <div className="c1b-result2-main">
        <button type="button" className="c1b-code">{row.code}</button>
        <h3>{row.product || row.name}</h3>
        <p className="c1b-sub">
          {[
            row.processName,
            row.workOrder ? (leafKey === 'os-receipt' ? `外协 ${row.workOrder}` : `加工单 ${row.workOrder}`) : '',
            row.supplier,
            row.machine,
          ].filter(Boolean).join(' · ') || '—'}
        </p>
        <p className="c1b-result2-meta">
          <StatusPill status={row.status} text={row.statusText} />
          <span>不良 {bad} · {row.date || '—'}</span>
        </p>
      </div>
      <div className="c1b-result2-side">
        <strong>{main}</strong>
        <span>{sideLabel}</span>
      </div>
    </article>
  );
}

/** 版2 · 金额优先 */
export function AmountFirstCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c1b-card c1b-amt2" data-testid="c1b-card" data-layout="v2-amt">
      <div className="c1b-amt2-main">
        <button type="button" className="c1b-code">{row.code}</button>
        <h3>{row.supplier || '供应商'}</h3>
        <p className="c1b-sub">{row.product}</p>
        <p className="c1b-sub">
          外协 {row.workOrder || '—'} · 合格 {row.passQty ?? 0}
          {row.unitPrice != null ? ` · 单价 ${money(row.unitPrice)}` : ''}
        </p>
        <p className="c1b-result2-meta">
          <StatusPill status={row.status} text={row.statusText} />
          <span>{row.date || '—'}</span>
        </p>
      </div>
      <div className="c1b-amt2-side">
        <strong>{money(row.amount)}</strong>
        <span>结算金额</span>
      </div>
    </article>
  );
}

/** 版3 · 状态 Tabs 下列卡 */
export function StatusTabCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c1b-card c1b-status" data-testid="c1b-card" data-layout="v3-status-tabs">
      <span className="c1b-thumb" aria-hidden>{row.iconGlyph || Array.from(row.name || '检')[0]}</span>
      <div className="c1b-card-body">
        <div className="c1b-card-head">
          <h3>{row.name} <small className="c1b-code-inline">{row.code}</small></h3>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <p className="c1b-sub">
          {[row.product, row.processName, row.workOrder ? `加工单 ${row.workOrder}` : ''].filter(Boolean).join(' · ') || '—'}
        </p>
        <p className="c1b-sub">
          抽检 {row.qty ?? 0} · 良品 {row.goodQty ?? 0} · 不良 {row.defectQty ?? 0}
          {row.creator ? ` · ${row.creator}` : ''}
        </p>
      </div>
    </article>
  );
}

/** 版1 · 疏朗 + 展开＋ */
export function ExpandCard({ row }: { row: FixtureRow }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="c1b-card c1b-expand" data-testid="c1b-card" data-layout="v1-expand" data-open={open ? '1' : '0'}>
      <div
        className="c1b-expand-toggle"
        data-testid="c1b-expand-toggle"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="c1b-expand-main">
          <span className="c1b-code">{row.code}</span>
          <h3>{row.product || row.name}</h3>
          <p className="c1b-sub">
            加工单 {row.workOrder || '—'} · 数量 {row.qty ?? 0} · {row.date || '—'}
          </p>
        </div>
        <div className="c1b-expand-side">
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c1b-expand-plus" aria-hidden>{open ? '−' : '＋'}</span>
        </div>
      </div>
      {open && (
        <ul className="c1b-expand-body" data-testid="c1b-expand-body">
          {(row.expandBody || []).map((line) => (
            <li key={line}>{line}</li>
          ))}
          {!row.expandBody?.length && <li>暂无更多明细</li>}
        </ul>
      )}
    </article>
  );
}

export function renderC1bCard(layout: C1bLayout, leafKey: string, row: FixtureRow) {
  if (layout === 'v4-detail-lines') return <DetailLinesCard key={row.id} row={row} leafKey={leafKey} />;
  if (layout === 'v1-sparse') return <SparseCard key={row.id} row={row} leafKey={leafKey} />;
  if (layout === 'v2-result') return <ResultFirstCard key={row.id} row={row} leafKey={leafKey} />;
  if (layout === 'v2-amt') return <AmountFirstCard key={row.id} row={row} />;
  if (layout === 'v3-status-tabs') return <StatusTabCard key={row.id} row={row} />;
  if (layout === 'v1-expand') return <ExpandCard key={row.id} row={row} />;
  return (
    <article key={row.id} className="c1b-card" data-testid="c1b-card" data-layout={layout}>
      <h3>{row.name}</h3>
      <p className="c1b-sub">{row.code}</p>
    </article>
  );
}
