import type { C7Layout } from './c7Registry';
import type { C7Row } from './fixtures';

function StatusPill({ text, tone }: { text?: string; tone?: C7Row['statusTone'] }) {
  if (!text) return null;
  const cls = tone === 'pending' ? 'is-pending' : tone === 'ok' ? 'is-ok' : tone === 'draft' ? 'is-draft' : 'is-mute';
  return <span className={`c7-pill ${cls}`}>{text}</span>;
}

function Thumb({ label }: { label?: string }) {
  const ch = Array.from(label || '报')[0] || '报';
  return <span className="c7-thumb" aria-hidden>{ch}</span>;
}

/** 版4 明细行卡 · 列表/对账单/明细 */
export function DetailRowCard({ row }: { row: C7Row }) {
  return (
    <article className="c7-card c7-detail" data-testid="c7-card" data-layout="v4-detail">
      <div className="c7-card-head">
        {row.code ? <button type="button" className="c7-code">{row.code}</button> : <span className="c7-code muted">{row.title}</span>}
        <StatusPill text={row.status} tone={row.statusTone} />
        {row.date && <span className="c7-date">{row.date}</span>}
      </div>
      {(row.partner || row.subtitle || row.meta) && (
        <p className="c7-meta">{[row.partner, row.subtitle, row.meta].filter(Boolean).join(' · ')}</p>
      )}
      {row.code && <h3 className="c7-card-title">{row.title}</h3>}
      {row.lines?.length ? (
        <div className="c7-lines">
          {row.lines.map((line) => (
            <div key={`${line.name}-${line.value}`} className="c7-line">
              <Thumb label={line.name} />
              <span className="c7-line-name">{line.name}</span>
              <span className="c7-line-val">{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {row.amount && (
        <div className="c7-card-foot">
          <span>{row.lines?.length ? `明细 ${row.lines.length} 项` : '汇总'}</span>
          <strong>{row.amount}</strong>
        </div>
      )}
    </article>
  );
}

/** 版1 疏朗 · 分析/趋势/柏拉图/汇总 · 关键指标卡 */
export function SparseMetricCard({ row }: { row: C7Row }) {
  return (
    <article className="c7-card c7-sparse" data-testid="c7-card" data-layout="v1-sparse">
      <div className="c7-sparse-top">
        <div>
          <h3>{row.title}</h3>
          {row.subtitle && <p className="c7-sub">{row.subtitle}</p>}
        </div>
        {row.date && <span className="c7-date">{row.date}</span>}
      </div>
      <div className="c7-metrics" data-testid="c7-metrics">
        {(row.metrics ?? []).map((m) => (
          <div key={m.label} className={`c7-metric ${m.tone ? `tone-${m.tone}` : ''}`}>
            <span className="c7-muted">{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

/** 大屏管理 · 只读列表，点开全屏查看 */
export function ScreenCard({ row, onOpen }: { row: C7Row; onOpen: (row: C7Row) => void }) {
  return (
    <article className="c7-card c7-screen" data-testid="c7-card" data-layout="v1-screen">
      <div className="c7-screen-body">
        <span className="c7-screen-ico" aria-hidden>屏</span>
        <div>
          <h3>{row.title}</h3>
          <p className="c7-sub">{[row.module, row.layout].filter(Boolean).join(' · ')}</p>
          {row.description && <p className="c7-sub">{row.description}</p>}
        </div>
      </div>
      <div className="c7-card-foot end">
        <button type="button" className="c7-link" data-testid="c7-open-screen" onClick={() => onOpen(row)}>
          查看大屏
        </button>
      </div>
    </article>
  );
}

export function renderC7Card(layout: C7Layout, row: C7Row, onOpenScreen?: (row: C7Row) => void) {
  if (layout === 'v1-screen') {
    return <ScreenCard key={row.id} row={row} onOpen={(r) => onOpenScreen?.(r)} />;
  }
  if (layout === 'v1-sparse') {
    return <SparseMetricCard key={row.id} row={row} />;
  }
  return <DetailRowCard key={row.id} row={row} />;
}
