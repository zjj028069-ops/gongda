import type { FixtureRow } from './fixtures';
import type { C4Layout } from './c4Registry';

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status, text }: { status: FixtureRow['status']; text: string }) {
  const cls =
    status === 'pending' ? 'is-pending'
      : status === 'approved' || status === 'pass' || status === 'auth' || status === 'enabled' || status === 'completed' ? 'is-ok'
        : status === 'fail' || status === 'rejected' ? 'is-bad'
          : status === 'processing' || status === 'invoiced' ? 'is-blue'
            : status === 'draft' ? 'is-draft'
              : 'is-mute';
  return <span className={`c4-pill ${cls}`}>{text || '—'}</span>;
}

function Thumb({ label }: { label?: string }) {
  const ch = Array.from(label || '客')[0] || '客';
  return <span className="c4-thumb" aria-hidden>{ch}</span>;
}

/** 版1 疏朗 · 客户列表 */
export function CustomerCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c4-card c4-sparse" data-testid="c4-card" data-layout="v1-sparse">
      <div className="c4-card-head">
        <button type="button" className="c4-code">{row.code}</button>
        <StatusPill status={row.status} text={row.statusText} />
      </div>
      <h3 className="c4-customer-name">{row.partner}</h3>
      {row.customerType && <span className="c4-type-tag">{row.customerType}</span>}
      {row.phone && <p className="c4-phone">{row.phone}</p>}
      <div className="c4-card-foot end actions">
        <button type="button" className="c4-mini-btn is-ok">{row.tag || '启用'}</button>
        <button type="button" className="c4-link">修改</button>
        <button type="button" className="c4-link">更多</button>
      </div>
    </article>
  );
}

/** 版1 疏朗 · 联系人 */
export function LinkmanCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c4-card c4-sparse" data-testid="c4-card" data-layout="v1-sparse">
      <div className="c4-sparse-body">
        <Thumb label={row.contact || row.partner} />
        <div>
          <h3>{row.contact}</h3>
          <p className="c4-sub">职位 {row.title || '—'}</p>
          {row.tag && <span className="c4-type-tag">{row.tag}</span>}
          <p className="c4-sub">🏢 {row.partner}</p>
          <p className="c4-sub">📱 手机 {row.phone || '—'}</p>
        </div>
        <StatusPill status={row.status} text={row.statusText || '启用'} />
      </div>
    </article>
  );
}

/** 版1 疏朗 · 公海 */
export function SeaCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c4-card c4-sparse c4-sea" data-testid="c4-card" data-layout="v1-sparse">
      <div className="c4-sparse-body">
        <span className="c4-wh-ico" aria-hidden>厂</span>
        <div>
          <h3>{row.partner}</h3>
          <p className="c4-sub">◇ 行业 {row.category || '—'}</p>
          <p className="c4-sub">⏱ 未跟进 {row.daysIdle ?? '—'} 天</p>
        </div>
      </div>
      <div className="c4-card-foot end">
        <button type="button" className="c4-mini-btn">{row.statusText || '可领取'}</button>
      </div>
    </article>
  );
}

/** 版4 明细 · 跟单/报价/合同/收支/发票/费用 */
export function DetailCard({ row, kind }: { row: FixtureRow; kind: string }) {
  if (kind === 'follow') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-plan-row">
          <Thumb label={row.partner} />
          <div className="c4-card-body">
            <div className="c4-card-head">
              <h3>{row.partner}</h3>
              <StatusPill status={row.status} text={row.statusText} />
            </div>
            <p className="c4-sub">{row.category || '—'}</p>
            <p className="c4-kv">{row.typeLabel} · <span className="c4-dot">●</span> {row.subLabel}</p>
            <p className="c4-sub">负责人 {row.owner || '—'}</p>
            <p className="c4-sub">下次跟进 {row.nextFollow || '—'}</p>
          </div>
        </div>
      </article>
    );
  }

  if (kind === 'quote') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-card-head">
          <button type="button" className="c4-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <dl className="c4-kv-list compact">
          <div><dt>客户</dt><dd>{row.partner}</dd></div>
          <div><dt>金额</dt><dd><strong>{money(row.amount)}</strong></dd></div>
          <div><dt>有效期</dt><dd>{row.note || '—'}</dd></div>
        </dl>
        <div className="c4-card-foot end actions">
          <button type="button" className="c4-link">生成合同</button>
          <button type="button" className="c4-link">改审</button>
          <button type="button" className="c4-link">更多</button>
        </div>
      </article>
    );
  }

  if (kind === 'contract') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-card-head">
          <button type="button" className="c4-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <h3 className="c4-customer-name">{row.partner}</h3>
        <p className="c4-sub">{row.address || row.note || '—'}</p>
        <p className="c4-kv">合同金额 <strong>{money(row.amount)}</strong></p>
        <div className="c4-card-foot end actions">
          <button type="button" className="c4-link">收款</button>
          <button type="button" className="c4-link">支出</button>
          <button type="button" className="c4-link">更多</button>
        </div>
      </article>
    );
  }

  if (kind === 'cash') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-card-head">
          <button type="button" className="c4-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <h3 className="c4-customer-name">{row.partner}</h3>
        <p className="c4-sub">
          收/支 {row.typeLabel || (row.direction === 'out' ? '支出' : '收入')} · 金额{' '}
          <strong className={row.direction === 'out' ? 'is-down' : 'is-up'}>{money(row.amount)}</strong>
        </p>
        {row.note && <p className="c4-sub">{row.note}</p>}
      </article>
    );
  }

  if (kind === 'invoice') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-card-head">
          <button type="button" className="c4-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
        </div>
        <p className="c4-meta">{row.partner}</p>
        <div className="c4-pay-grid">
          <div><span className="c4-muted">金额</span><strong>{money(row.amount)}</strong></div>
          <div><span className="c4-muted">票种</span><strong>{row.invoiceType || '—'}</strong></div>
        </div>
      </article>
    );
  }

  if (kind === 'sales-fee') {
    return (
      <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
        <div className="c4-card-head">
          <button type="button" className="c4-code">{row.code}</button>
          <StatusPill status={row.status} text={row.statusText} />
          <span className="c4-date">{row.date}</span>
        </div>
        <div className="c4-plan-row">
          <Thumb label={row.typeLabel} />
          <div className="c4-card-body">
            <h3>{row.typeLabel}</h3>
            <p className="c4-sub">{row.partner}</p>
            <p className="c4-kv">金额 <strong className="c4-amt">{money(row.amount)}</strong></p>
            <p className="c4-sub">申请人 {row.applicant || '—'}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="c4-card c4-detail" data-testid="c4-card" data-layout="v4-detail">
      <div className="c4-card-head">
        <button type="button" className="c4-code">{row.code}</button>
        <StatusPill status={row.status} text={row.statusText} />
      </div>
      <p className="c4-meta">{row.partner}</p>
      {row.amount != null && <p className="c4-kv">金额 <strong>{money(row.amount)}</strong></p>}
    </article>
  );
}

/** 版1 · 审核设置 */
export function AuditCard({ row }: { row: FixtureRow }) {
  const on = row.active !== false && row.status !== 'draft';
  return (
    <article className="c4-card c4-sparse" data-testid="c4-card" data-layout="v1-sparse">
      <div className="c4-sparse-body">
        <span className="c4-wh-ico" aria-hidden>审</span>
        <div>
          <h3>{row.product}</h3>
          <p className="c4-sub">{row.subLabel}</p>
          {row.note && <p className="c4-sub">{row.note}</p>}
        </div>
        <span className={`c4-toggle ${on ? 'is-on' : ''}`} aria-hidden>
          <i />
          <em>{row.statusText || (on ? '开' : '关')}</em>
        </span>
      </div>
    </article>
  );
}

/** 版1 设置入口卡 */
export function SettingsCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c4-card c4-setting" data-testid="c4-card" data-layout="v1-settings">
      <span className="c4-set-ico" aria-hidden>{row.settingIcon || '设'}</span>
      <div>
        <h3>{row.product}</h3>
        {row.settingValue && <p className="c4-setting-value">{row.settingValue}</p>}
        <p className="c4-sub">{row.settingDesc}</p>
      </div>
      {row.status === 'enabled' && <span className={`c4-toggle is-on`} aria-hidden><i /></span>}
    </article>
  );
}

/** 版4 价格追踪 */
export function PriceTrackCard({ row }: { row: FixtureRow }) {
  const up = (row.changePct ?? 0) > 0;
  const down = (row.changePct ?? 0) < 0;
  return (
    <article className="c4-card c4-track" data-testid="c4-card" data-layout="v4-track">
      <div className="c4-track-kv">
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>厂</span><small>客户</small></div>
        <strong>{row.partner}</strong>
      </div>
      <div className="c4-track-kv">
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>品</span><small>产品</small></div>
        <strong>{row.product}</strong>
      </div>
      <div className="c4-track-kv">
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>¥</span><small>现价</small></div>
        <strong>¥{row.lastPrice ?? 0}</strong>
      </div>
      <div className="c4-track-kv">
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>¥</span><small>上次价</small></div>
        <strong>¥{row.prevPrice ?? 0}</strong>
      </div>
      <div className={`c4-track-kv ${up ? 'is-up' : down ? 'is-down' : ''}`}>
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>变</span><small>变动</small></div>
        <strong>{up ? '+' : ''}{(row.changePct ?? 0).toFixed(0)}%</strong>
      </div>
      <div className="c4-track-kv">
        <div className="c4-track-key"><span className="c4-wh-ico" aria-hidden>日</span><small>生效日</small></div>
        <strong>{row.date || '—'}</strong>
      </div>
    </article>
  );
}

export function renderC4Card(layout: C4Layout, leafKey: string, row: FixtureRow) {
  if (leafKey === 'customer-list') return <CustomerCard key={row.id} row={row} />;
  if (leafKey === 'linkman') return <LinkmanCard key={row.id} row={row} />;
  if (leafKey === 'customer-sea') return <SeaCard key={row.id} row={row} />;
  if (leafKey === 'customer-audit') return <AuditCard key={row.id} row={row} />;
  if (layout === 'v1-settings') return <SettingsCard key={row.id} row={row} />;
  if (layout === 'v4-track') return <PriceTrackCard key={row.id} row={row} />;
  return <DetailCard key={row.id} row={row} kind={leafKey} />;
}
