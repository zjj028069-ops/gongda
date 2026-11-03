import type { FixtureRow } from './fixtures';
import type { C5Layout } from './c5Registry';

function Tone({ tone, text }: { tone?: FixtureRow['categoryTone']; text: string }) {
  const cls = tone === 'fg' ? 'is-fg' : tone === 'semi' ? 'is-semi' : tone === 'raw' ? 'is-raw' : 'is-other';
  return <span className={`c5-cat ${cls}`}>{text}</span>;
}

function StatusDot({ status, text }: { status: FixtureRow['status']; text: string }) {
  const cls =
    status === 'enabled' || status === 'running' ? 'is-ok'
      : status === 'disabled' || status === 'idle' ? 'is-mute'
        : status === 'maintain' || status === 'alarm' ? 'is-warn'
          : 'is-mute';
  return (
    <span className={`c5-status ${cls}`}>
      <i />
      {text}
    </span>
  );
}

/** 版3 · 商品列表（类别 Tabs 下列卡） */
export function GoodsCard({ row }: { row: FixtureRow }) {
  const alarm = row.stock != null && row.stockMin != null && row.stock < row.stockMin;
  return (
    <article className="c5-card c5-goods" data-testid="c5-card" data-layout="v3-category-tabs">
      <span className="c5-thumb" aria-hidden>{row.iconGlyph || '品'}</span>
      <div className="c5-card-body">
        <div className="c5-card-head">
          <button type="button" className="c5-code">{row.code}</button>
          {row.category && <Tone tone={row.categoryTone} text={row.category} />}
        </div>
        <h3>{row.name}</h3>
        {row.spec && <p className="c5-sub">规格 {row.spec}</p>}
        <p className="c5-stock">
          可用库存 <strong>{row.stock ?? '—'}</strong>
          {row.unit ? ` ${row.unit}` : ''}
        </p>
        {(row.stockMin != null || row.stockMax != null) && (
          <p className="c5-sub">下限 {row.stockMin ?? '—'} · 上限 {row.stockMax ?? '—'}</p>
        )}
        {alarm && <span className="c5-alarm" data-testid="c5-stock-alarm">下限报警</span>}
      </div>
    </article>
  );
}

/** 版4 · BOM 明细行卡 */
export function BomCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c5-card c5-bom" data-testid="c5-card" data-layout="v4-detail-lines">
      <button type="button" className="c5-code">{row.code}</button>
      <h3>{row.name}</h3>
      <div className="c5-bom-meta">
        {row.category && <Tone tone={row.categoryTone} text={row.category} />}
        <span className="c5-sub">商品 : {row.product || '—'}</span>
      </div>
      <ul className="c5-bom-lines" data-testid="c5-bom-lines">
        {(row.lines || []).map((line, idx) => (
          <li key={`${row.id}-${idx}`}>
            <em>{line.short}</em>
            <span>{line.name}</span>
            <strong>x{line.qty}</strong>
          </li>
        ))}
      </ul>
      <div className="c5-card-foot">
        <span>子件数合计 {row.lineCount ?? row.lines?.reduce((n, l) => n + l.qty, 0) ?? 0}件</span>
        <StatusDot status={row.status} text={row.statusText} />
        <span className="c5-date">{row.date || '—'}</span>
      </div>
    </article>
  );
}

/** 版1 · 商品设置疏朗分组 */
export function SettingsCard({ row }: { row: FixtureRow }) {
  const isSwitch = row.settingKey === 'dup_name' || row.settingKey === 'auto_code' || row.settingKey === 'scan_login';
  return (
    <article className="c5-card c5-setting" data-testid="c5-card" data-layout="v1-settings">
      <div className="c5-setting-main">
        <h3>{row.name}</h3>
        <p className="c5-sub">{row.settingDesc}</p>
      </div>
      {isSwitch ? (
        <span className={`c5-toggle ${row.settingOn ? 'is-on' : ''}`} aria-hidden data-testid="c5-toggle">
          <i />
        </span>
      ) : (
        <span className="c5-setting-side">{row.statusText}</span>
      )}
    </article>
  );
}

/** 版1 · 机台疏朗卡 */
export function MachineCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c5-card c5-machine" data-testid="c5-card" data-layout="v1-sparse" data-status={row.status}>
      <div className="c5-machine-head">
        <span className={`c5-thumb is-${row.status}`} aria-hidden>{row.iconGlyph || '机'}</span>
        <div>
          <h3>{row.code}</h3>
          <p className="c5-sub">{row.name} · {row.location || '—'}</p>
        </div>
        <StatusDot status={row.status} text={row.statusText} />
      </div>
      <dl className="c5-kv-grid">
        <div><dt>当前工序</dt><dd>{row.processName || '—'}{row.processCode ? ` ${row.processCode}` : ''}</dd></div>
        <div><dt>稼动率</dt><dd className={row.utilRate ? 'is-accent' : ''}>{row.utilRate != null ? `${row.utilRate}%` : '—'}</dd></div>
        <div><dt>负责人</dt><dd>{row.owner || '—'}</dd></div>
      </dl>
    </article>
  );
}

/** 版5 · 工序极简行 */
export function ProcessCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c5-card c5-process" data-testid="c5-card" data-layout="v5-minimal">
      <div className="c5-process-row">
        <h3>{row.name}</h3>
        <span className={`c5-pill ${row.status === 'enabled' ? 'is-ok' : 'is-bad'}`}>{row.statusText}</span>
      </div>
      <p className="c5-meta-line">
        {row.code} · {row.pricing || '计价'} · {row.wage || '—'} · {row.hours || '—'}
      </p>
    </article>
  );
}

/** 版3 · 岗位状态 Tabs 卡 */
export function PostCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c5-card c5-post" data-testid="c5-card" data-layout="v3-status-tabs">
      <span className="c5-thumb" aria-hidden>{row.iconGlyph || '岗'}</span>
      <div className="c5-card-body">
        <div className="c5-card-head">
          <h3>{row.name} <small className="c5-code-inline">{row.code}</small></h3>
          <StatusDot status={row.status} text={row.statusText} />
        </div>
        <p className="c5-sub">📍 {row.workshop || '—'} · 👥 {row.headcount ?? 0}人 · {row.staff || '—'}</p>
        <p className="c5-sub">⚙ {row.tasks || '—'}</p>
      </div>
    </article>
  );
}

/** 版4 · 工艺路线 + 迷你步骤链（必须画出连线步骤，禁止只写工序数） */
export function RouteCard({ row }: { row: FixtureRow }) {
  const on = row.status === 'enabled';
  const steps = row.steps || [];
  return (
    <article
      className={`c5-card c5-route ${on ? 'is-on' : 'is-off'}`}
      data-testid="c5-card"
      data-layout="v4-step-chain"
      data-route-status={row.status}
    >
      <span className="c5-route-rail" aria-hidden />
      <button type="button" className="c5-chevron" aria-hidden>›</button>
      <dl className="c5-route-kv">
        <div><dt>路线编号</dt><dd className="is-accent">{row.code}</dd></div>
        <div><dt>名称</dt><dd>{row.name}</dd></div>
        <div><dt>商品</dt><dd>{row.product || '—'}</dd></div>
        <div><dt>版本</dt><dd>{row.versionLabel || '—'}</dd></div>
        <div><dt>启用状态</dt><dd><StatusDot status={row.status} text={row.statusText} /></dd></div>
      </dl>
      <div className="c5-step-chain" data-testid="c5-step-chain" data-on={on ? '1' : '0'}>
        <div className="c5-step-line" aria-hidden />
        {steps.map((step, idx) => (
          <div className="c5-step" key={`${row.id}-s${idx}`}>
            <i className="c5-step-node" />
            <span>{step.name}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

/** 版3 · 工序附加组件 */
export function ExtraCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c5-card c5-extra" data-testid="c5-card" data-layout="v3-status-tabs">
      <div className="c5-extra-main">
        <div className="c5-card-head">
          <span className="c5-doc" aria-hidden>📄</span>
          <h3>{row.name}</h3>
          <small className="c5-code-inline">{row.code}</small>
        </div>
        <p className="c5-sub">⚙ 适用工序:</p>
        <p className="c5-bind">{row.bindProcess || '—'}</p>
      </div>
      <div className="c5-extra-side">
        <span className="c5-extra-type">
          {row.extraType === 'qc' ? '质检附加' : '报工附加'}
        </span>
        <span className={`c5-badge ${row.status === 'enabled' ? 'is-ok' : 'is-mute'}`}>{row.statusText}</span>
      </div>
    </article>
  );
}

export function renderC5Card(layout: C5Layout, leafKey: string, row: FixtureRow) {
  if (leafKey === 'goods-list') return <GoodsCard key={row.id} row={row} />;
  if (leafKey === 'bom') return <BomCard key={row.id} row={row} />;
  if (leafKey === 'goods-base') return <SettingsCard key={row.id} row={row} />;
  if (leafKey === 'machine') return <MachineCard key={row.id} row={row} />;
  if (leafKey === 'process') return <ProcessCard key={row.id} row={row} />;
  if (leafKey === 'post') return <PostCard key={row.id} row={row} />;
  if (leafKey === 'route') return <RouteCard key={row.id} row={row} />;
  if (leafKey === 'extra') return <ExtraCard key={row.id} row={row} />;
  return (
    <article key={row.id} className="c5-card" data-testid="c5-card" data-layout={layout}>
      <h3>{row.name}</h3>
      <p className="c5-sub">{row.code}</p>
    </article>
  );
}
