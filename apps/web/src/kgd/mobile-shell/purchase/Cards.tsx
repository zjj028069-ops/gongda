import type { FixtureRow } from './fixtures';
import type { C3Layout } from './c3Registry';

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status, text }: { status: FixtureRow['status']; text: string }) {
  const cls =
    status === 'pending' ? 'is-pending'
      : status === 'approved' || status === 'pass' || status === 'auth' ? 'is-ok'
        : status === 'fail' || status === 'rejected' ? 'is-bad'
          : status === 'processing' || status === 'invoiced' ? 'is-blue'
            : status === 'draft' ? 'is-draft'
              : 'is-mute';
  return <span className={`c3-pill ${cls}`}>{text || '—'}</span>;
}

function Thumb({ label }: { label?: string }) {
  const ch = Array.from(label || '品')[0] || '品';
  return <span className="c3-thumb" aria-hidden>{ch}</span>;
}

/** 版1 疏朗 · 供应商 */
export function SupplierCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c3-card c3-sparse" data-testid="c3-card" data-layout="v1-sparse">
      <h3 className="c3-supplier-name">
        <span className="c3-muted">供应商名称</span>
        <strong>{row.partner}</strong>
      </h3>
      <dl className="c3-kv-list">
        <div><dt>编号</dt><dd>{row.code}</dd></div>
        <div><dt>联系人</dt><dd>{row.contact || '—'}</dd></div>
        <div><dt>电话</dt><dd>{row.phone || '—'}</dd></div>
        <div><dt>信用代码</dt><dd>{row.creditCode || '—'}</dd></div>
      </dl>
      <div className="c3-card-foot end">
        <button type="button" className="c3-mini-btn">拉链</button>
      </div>
    </article>
  );
}

/** 版4 明细行卡 · 计划/采购单/付款/发票/检验 */
export function DetailCard({ row, kind }: { row: FixtureRow; kind: string }) {
  if (kind === 'purchase-plan') {
    return (
      <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
        <div className="c3-card-head">
          <button type="button" className="c3-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c3-date">{row.date}</span>
        </div>
        <div className="c3-plan-row">
          <Thumb label={row.product} />
          <div className="c3-card-body">
            <h3>{row.product}</h3>
            <p className="c3-sub">{row.spec}</p>
            <p className="c3-kv">需求量 <strong>{(row.qty ?? 0).toLocaleString('zh-CN')} pcs</strong></p>
          </div>
        </div>
      </article>
    );
  }

  if (kind === 'purchase-pay') {
    return (
      <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
        <div className="c3-card-head">
          <button type="button" className="c3-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <p className="c3-meta">{row.partner}</p>
        <div className="c3-pay-grid">
          <div><span className="c3-muted">金额</span><strong>{money(row.amount)}</strong></div>
          <div><span className="c3-muted">方式</span><strong>{row.method || '—'}</strong></div>
          <div><span className="c3-muted">银行</span><strong>{row.bank || '—'}</strong></div>
        </div>
      </article>
    );
  }

  if (kind === 'purchase-invoice') {
    return (
      <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
        <div className="c3-card-head">
          <button type="button" className="c3-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c3-date">{row.date}</span>
        </div>
        <p className="c3-meta">{row.partner}</p>
        <div className="c3-pay-grid">
          <div><span className="c3-muted">金额</span><strong>{money(row.amount)}</strong></div>
          <div><span className="c3-muted">税率</span><strong>{row.taxRate || '—'}</strong></div>
        </div>
      </article>
    );
  }

  if (kind === 'mt-list') {
    return (
      <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
        <div className="c3-card-head">
          <button type="button" className="c3-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <div className="c3-plan-row">
          <Thumb label={row.product} />
          <div className="c3-card-body">
            <h3>{row.product}</h3>
            <p className="c3-sub">批次 {row.batch || '—'} · 抽样 {row.sampleQty || '—'}</p>
            <p className="c3-sub">检验员 {row.inspector || '—'}</p>
          </div>
        </div>
      </article>
    );
  }

  if (kind === 'mt-lines') {
    const line = row.lines?.[0];
    return (
      <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
        <div className="c3-card-head">
          <span className="c3-ico-pill" aria-hidden><Thumb label={row.product} /></span>
          <h3 className="c3-inline-title">{row.product}</h3>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <dl className="c3-kv-list compact">
          <div><dt>方法</dt><dd>{line?.method || '—'}</dd></div>
          <div><dt>标准</dt><dd>{line?.standard || '—'}</dd></div>
          <div><dt>实测</dt><dd>{line?.actual || '—'}</dd></div>
          <div><dt>备注</dt><dd>{line?.note || '—'}</dd></div>
        </dl>
      </article>
    );
  }

  // purchase-order default
  return (
    <article className="c3-card c3-detail" data-testid="c3-card" data-layout="v4-detail">
      <div className="c3-card-head">
        <button type="button" className="c3-code">{row.code}</button>
        <StatusPill status={row.status} text={row.statusText} />
        <span className="c3-date">{row.date}</span>
      </div>
      {row.partner && <p className="c3-meta">{row.partner}</p>}
      {(row.lines?.length || row.product) && (
        <div className="c3-lines">
          {(row.lines ?? [{ name: row.product || '商品', qty: row.qty ?? 0, amount: row.amount }]).map((line, i) => (
            <div key={`${line.name}-${i}`} className="c3-line">
              <Thumb label={line.name} />
              <span className="c3-line-name">{line.name}{line.spec ? ` ${line.spec}` : ''}</span>
              <span className="c3-line-qty">× {line.qty ?? 0}</span>
              {line.amount != null && <span className="c3-line-amt">{money(line.amount)}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="c3-card-foot">
        <span>明细 {row.lineCount ?? row.lines?.length ?? 0} 行</span>
        <strong>合计 {money(row.amount)}</strong>
      </div>
      <div className="c3-card-foot end actions">
        <button type="button" className="c3-link">入库</button>
        <button type="button" className="c3-link">付款</button>
      </div>
    </article>
  );
}

/** 版1 疏朗 · 检验规范 / 审核设置 */
export function SparseSpecCard({ row, kind }: { row: FixtureRow; kind: string }) {
  if (kind === 'purchase-audit') {
    return (
      <article className="c3-card c3-sparse" data-testid="c3-card" data-layout="v1-sparse">
        <div className="c3-card-head">
          <button type="button" className="c3-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <div className="c3-sparse-body">
          <span className="c3-wh-ico" aria-hidden>审</span>
          <div>
            <h3>{row.product}</h3>
            <p className="c3-sub">{row.subLabel}</p>
            {row.note && <p className="c3-sub">{row.note}</p>}
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="c3-card c3-sparse" data-testid="c3-card" data-layout="v1-sparse">
      <div className="c3-spec-row">
        <span className="c3-wh-ico" aria-hidden>✓</span>
        <div className="c3-spec-cols">
          <div>
            <strong>{row.code}</strong>
            <small>{row.note || '检验规范'}</small>
          </div>
          <div>
            <strong>{row.product}</strong>
            <small>{row.subLabel}</small>
          </div>
          <div>
            <strong>{row.category}</strong>
            <small>{row.version}</small>
          </div>
        </div>
        <button type="button" className="c3-more" aria-label="更多">⋮</button>
      </div>
    </article>
  );
}

/** 版1 设置入口卡 */
export function SettingsCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c3-card c3-setting" data-testid="c3-card" data-layout="v1-settings">
      <span className="c3-set-ico" aria-hidden>{row.settingIcon || '设'}</span>
      <div>
        <h3>{row.product}</h3>
        <p className="c3-sub">{row.settingDesc}</p>
      </div>
      <span className="c3-chevron" aria-hidden>›</span>
    </article>
  );
}

/** 版4 价格追踪 */
export function PriceTrackCard({ row }: { row: FixtureRow }) {
  const up = (row.changePct ?? 0) > 0;
  const down = (row.changePct ?? 0) < 0;
  return (
    <article className="c3-card c3-track" data-testid="c3-card" data-layout="v4-track">
      <div className="c3-track-main">
        <Thumb label={row.product} />
        <div>
          <h3>{row.product}</h3>
          <p className="c3-sub">{row.code}</p>
          <p className="c3-sub">{row.partner}</p>
        </div>
      </div>
      <div className="c3-track-prices">
        <div>
          <span className="c3-muted">最近价</span>
          <strong>{(row.lastPrice ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
          <small>{row.unit}</small>
        </div>
        <div>
          <span className="c3-muted">上次价</span>
          <strong>{(row.prevPrice ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
          <small>{row.unit}</small>
        </div>
        <div className={up ? 'is-up' : down ? 'is-down' : ''}>
          <span className="c3-muted">涨跌幅</span>
          <strong>{up ? '↑' : down ? '↓' : ''} {(row.changePct ?? 0) > 0 ? '+' : ''}{(row.changePct ?? 0).toFixed(2)}%</strong>
          <small>{up ? '↑' : down ? '↓' : ''} {Math.abs(row.changeAmt ?? 0).toLocaleString('zh-CN')}</small>
        </div>
        <div>
          <span className="c3-muted">追踪日</span>
          <strong className="c3-date-strong">{row.date}</strong>
          <small>{row.note}</small>
        </div>
      </div>
    </article>
  );
}

export function renderC3Card(layout: C3Layout, leafKey: string, row: FixtureRow) {
  if (leafKey === 'supplier') return <SupplierCard key={row.id} row={row} />;
  if (layout === 'v1-settings') return <SettingsCard key={row.id} row={row} />;
  if (layout === 'v4-track') return <PriceTrackCard key={row.id} row={row} />;
  if (layout === 'v1-sparse') return <SparseSpecCard key={row.id} row={row} kind={leafKey} />;
  return <DetailCard key={row.id} row={row} kind={leafKey} />;
}
