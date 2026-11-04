import type { FixtureRow } from './fixtures';
import type { C3Layout } from './c3Registry';

export type CardCtx = {
  onCall?: () => void;
  onCopy?: () => void;
  onSwitch?: () => void;
  switchOn?: boolean;
};

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function yuan(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return `¥${money(n)}`;
}

function toneOf(text: string) {
  if (/不合格|拒绝|停用|已停/.test(text)) return 'bad';
  if (/待/.test(text)) return 'warn';
  if (/生产|处理|开票/.test(text)) return 'info';
  if (/合格|确认|审核|付款|认证|有效|启用/.test(text)) return 'ok';
  if (/草稿/.test(text)) return 'mute';
  return 'mute';
}

function Pill({ text }: { text: string }) {
  if (!text) return null;
  return <span className={`c3-pill is-${toneOf(text)}`}>{text}</span>;
}

function Thumb({ label }: { label?: string }) {
  const ch = Array.from(label || '品')[0] || '品';
  return <span className="c3-thumb" aria-hidden>{ch}</span>;
}

function LineIcon({ name }: { name?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'shield':
      return <svg {...common}><path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5z" /><path d="m8.8 12.1 2.2 2.2 4.3-4.6" /></svg>;
    case 'doc':
      return <svg {...common}><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" /><path d="M14 3.5V8h4.5M8 12h8M8 16h5" /></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="9" r="3" /><path d="M6 19.2c.8-2.6 2.8-3.9 6-3.9s5.2 1.3 6 3.9" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.8" /></svg>;
    case 'chart':
      return <svg {...common}><path d="M4 19h16" /><path d="M7 16v-4M12 16V8M17 16v-6" /></svg>;
    case 'cart':
      return <svg {...common}><path d="M4 6h2l1.4 9.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L20 9H7" /><circle cx="10" cy="19.2" r="1.2" /><circle cx="17" cy="19.2" r="1.2" /></svg>;
    case 'file':
      return <svg {...common}><path d="M7 4h8l3 3v13H7z" /><path d="M15 4v3h3M9 12h6M9 16h4" /></svg>;
    case 'tag':
      return <svg {...common}><path d="M4 12.5 12.2 4.3A2 2 0 0 1 13.6 3.7H19v5.4a2 2 0 0 1-.6 1.4L11.5 18 4 12.5z" /><circle cx="16.2" cy="7.8" r="1" fill="currentColor" /></svg>;
    case 'bell':
      return <svg {...common}><path d="M6 16h12l-1.2-2V10a4.8 4.8 0 0 0-9.6 0v4L6 16z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>;
    case 'check':
      return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="m8.5 12.2 2.3 2.3 4.6-5" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

/** 版2 关键字段 · 对齐客户管理：联系人 / 电话 / 编号 / 企业名，拨号优先 */
export function SupplierKeyCard({ row, onCall, onCopy }: { row: FixtureRow; onCall?: () => void; onCopy?: () => void }) {
  const who = row.contact || '未留联系人';
  const letter = Array.from(who)[0] || '供';
  return (
    <article className="c3-card c3-key" data-testid="c3-card" data-layout="v2-keyfields">
      <div className="c3-key-head">
        <span className="c3-avatar" aria-hidden>{letter}</span>
        <div>
          <h3>{who}</h3>
          <p>{row.code}</p>
        </div>
      </div>
      <p className="c3-key-line">联系人：{who}</p>
      <div className="c3-key-action">
        <p>电话：{row.phone || '暂无电话'}</p>
        <button type="button" className="c3-btn solid" data-testid="c3-call" onClick={onCall}>拨号</button>
      </div>
      <div className="c3-key-action">
        <p>编号：{row.code || '—'}</p>
        <button type="button" className="c3-btn ghost" data-testid="c3-copy" onClick={onCopy}>复制</button>
      </div>
      <p className="c3-key-line">企业名：{row.partner || '—'}</p>
    </article>
  );
}

/** 版4 明细行卡 · 采购计划（窄屏一行看全：计划号、物料、规格、需求量、交期、状态） */
export function PlanLine({ row }: { row: FixtureRow }) {
  return (
    <article className="c3-card c3-plan-card" data-testid="c3-card" data-layout="v4-detail-lines">
      <div className="c3-card-head">
        <button type="button" className="c3-code">{row.code}</button>
        <Pill text={row.statusText} />
      </div>
      <div className="c3-plan-body">
        <Thumb label={row.product} />
        <div>
          <strong>{row.product || '—'}</strong>
          <small>{row.sku}</small>
          <p>{row.spec || '—'}</p>
        </div>
      </div>
      <div className="c3-plan-meta">
        <span>需求量 <b>{(row.qty ?? 0).toLocaleString('zh-CN')} pcs</b></span>
        <span>交期 <b>{row.date || '—'}</b></span>
      </div>
    </article>
  );
}

/** 版4 明细行卡 · 采购单 */
export function OrderCard({ row }: { row: FixtureRow }) {
  const lines = row.lines?.length
    ? row.lines
    : [{ name: row.product || '商品', qty: row.qty ?? 0, amount: row.amount }];
  return (
    <article className="c3-card c3-order" data-testid="c3-card" data-layout="v4-detail-lines">
      <div className="c3-card-head">
        <button type="button" className="c3-code">{row.code}</button>
        <Pill text={row.statusText} />
        <span className="c3-date">{row.date}</span>
      </div>
      {row.partner && <p className="c3-meta">供应商 {row.partner}</p>}
      <div className="c3-order-lines">
        {lines.map((line, i) => (
          <div key={`${line.name}-${i}`} className="c3-order-line">
            <strong>{line.name}{line.spec ? ` ${line.spec}` : ''}</strong>
            <p>数量：{line.qty ?? 0}</p>
            <p>金额：{line.amount ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="c3-card-foot">
        <span>明细 {row.lineCount ?? lines.length} 行</span>
        <strong>合计 {yuan(row.amount)}</strong>
      </div>
      <div className="c3-card-foot end actions">
        <button type="button" className="c3-link">入库</button>
        <button type="button" className="c3-link">付款</button>
      </div>
    </article>
  );
}

/** 版2 金额优先 · 付款 / 发票行 */
export function AmountRow({ row }: { row: FixtureRow }) {
  return (
    <article className="c3-amt-row" data-testid="c3-card" data-layout="v2-amount">
      <div className="c3-amt">
        <strong>{money(row.amount)}</strong>
        <small>CNY</small>
      </div>
      <div className="c3-amt-who">
        <strong>{row.partner || '—'}</strong>
        <small>{row.supplierCode || row.code}</small>
      </div>
      <div className="c3-amt-when">
        <strong>{row.date || '—'}</strong>
        <small>{row.time || row.statusText || ''}</small>
      </div>
    </article>
  );
}

export function InvoiceSummary({ rows }: { rows: FixtureRow[] }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const partners = new Set(rows.map((row) => row.partner).filter(Boolean)).size;
  const latest = [...rows.map((row) => row.date).filter(Boolean)].sort().at(-1) || '—';
  return (
    <section className="c3-inv-board" data-testid="c3-inv-overview">
      <div>
        <span className="c3-inv-ico" aria-hidden>票</span>
        <p>发票金额</p>
        <strong>{yuan(total)}</strong>
      </div>
      <div>
        <span className="c3-inv-ico" aria-hidden>供</span>
        <p>供应商</p>
        <strong>{partners}</strong>
      </div>
      <div>
        <span className="c3-inv-ico" aria-hidden>日</span>
        <p>开票日</p>
        <strong>{latest}</strong>
      </div>
    </section>
  );
}

/** 版2 结果优先 · 对齐全检：检验结果置顶 */
export function QcResultCard({ row }: { row: FixtureRow }) {
  const bad = row.status === 'fail' || /不合格/.test(row.statusText);
  return (
    <article className="c3-card c3-qc" data-testid="c3-card" data-layout="v2-result">
      <header className="c3-qc-top">
        <span>检验单号</span>
        <b>{row.code}</b>
        <span>检验日期</span>
        <b>{row.date || '—'}</b>
      </header>
      <div className="c3-qc-people">
        <div><span>检验员</span><strong>{row.inspector || '—'}</strong></div>
        <div><span>供应商</span><strong>{row.partner || '—'}</strong></div>
      </div>
      <div className={`c3-qc-result ${bad ? 'is-bad' : 'is-ok'}`}>
        <span className="c3-round" aria-hidden>检</span>
        <span>检验结果</span>
        <strong>{row.statusText || '—'}</strong>
      </div>
      <div className="c3-qc-kv">
        <span className="c3-round" aria-hidden>物</span>
        <div>
          <p>物料名称</p>
          <strong>{row.product || '—'}</strong>
          {row.sku && <small>{row.sku}</small>}
        </div>
      </div>
      <div className="c3-qc-kv">
        <span className="c3-round" aria-hidden>批</span>
        <div>
          <p>批次号</p>
          <strong>{row.batch || '—'}</strong>
        </div>
      </div>
      {(row.standard || row.sampleQty) && (
        <div className="c3-qc-more">
          {row.standard && <p>检验标准<span>{row.standard}</span></p>}
          {row.sampleQty && <p>检验数量<span>{row.sampleQty}</span></p>}
        </div>
      )}
    </article>
  );
}

/** 版4 明细行卡 · 检验明细（项目 / 方法 / 标准 / 实测 / 判定 / 备注） */
export function QcLine({ row }: { row: FixtureRow }) {
  const line = row.lines?.[0];
  return (
    <article className="c3-card c3-qcline-card" data-testid="c3-card" data-layout="v4-detail-lines">
      <div className="c3-card-head">
        <Thumb label={row.product} />
        <strong className="c3-qcline-title">{row.product || line?.name || '—'}</strong>
        <span className="c3-judge">{line?.verdict || row.statusText || '—'}</span>
      </div>
      <dl className="c3-qcline-grid">
        <div><dt>方法</dt><dd>{line?.method || '—'}</dd></div>
        <div><dt>标准</dt><dd>{line?.standard || '—'}</dd></div>
        <div><dt>实测</dt><dd>{line?.actual || '—'}</dd></div>
        <div><dt>备注</dt><dd>{line?.note || '—'}</dd></div>
      </dl>
    </article>
  );
}

/** 版5 极简 · 检验规范 */
export function SpecRow({ row }: { row: FixtureRow }) {
  const off = /停/.test(row.statusText);
  return (
    <article className="c3-spec-row" data-testid="c3-card" data-layout="v5-minimal">
      <h3>{row.product || row.code}</h3>
      <span className={`c3-spec-pill ${off ? 'is-off' : 'is-on'}`}>{row.statusText || '有效'}</span>
    </article>
  );
}

/** 版5 极简开关行 */
export function SwitchRow({ row, on, onToggle }: { row: FixtureRow; on: boolean; onToggle?: () => void }) {
  return (
    <div className="c3-switch-row" data-testid="c3-card" data-layout="v5-switch">
      <span className="c3-line-ico" aria-hidden><LineIcon name={row.iconKey} /></span>
      <div>
        <h3>{row.product}</h3>
        {row.settingDesc && <p>{row.settingDesc}</p>}
      </div>
      <button
        type="button"
        className={`c3-switch ${on ? 'is-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={row.product}
        data-testid="c3-switch"
        onClick={onToggle}
      >
        <i />
      </button>
    </div>
  );
}

/** 版2 现价 / 变动优先 · 对齐销售价格追踪 */
export function PriceRow({ row }: { row: FixtureRow }) {
  const pct = row.changePct ?? 0;
  const up = pct > 0;
  const down = pct < 0;
  const delta = row.changeAmt ?? 0;
  return (
    <article className="c3-price-row" data-testid="c3-card" data-layout="v2-price">
      <div className="c3-price-now">
        <strong>¥ {money(row.lastPrice)}</strong>
        <small>/ {row.unit || '件'}</small>
      </div>
      <div className={`c3-price-chg ${up ? 'is-up' : down ? 'is-down' : ''}`}>
        <strong>{down ? '↓' : up ? '↑' : '—'} {pct > 0 ? '+' : ''}{pct.toFixed(2)}%</strong>
        <small>较上次 {delta === 0 ? '—' : `${delta > 0 ? '↑' : '↓'}${money(Math.abs(delta))}`}</small>
      </div>
      <div className="c3-price-mat">
        <strong>{row.code}</strong>
        <small>{row.product}</small>
        {row.partner && <small>{row.partner}</small>}
      </div>
    </article>
  );
}

export function renderC3Card(layout: C3Layout, leafKey: string, row: FixtureRow, ctx: CardCtx = {}) {
  if (leafKey === 'supplier' || layout === 'v2-keyfields') {
    return <SupplierKeyCard key={row.id} row={row} onCall={ctx.onCall} onCopy={ctx.onCopy} />;
  }
  if (leafKey === 'purchase-plan') return <PlanLine key={row.id} row={row} />;
  if (leafKey === 'purchase-order') return <OrderCard key={row.id} row={row} />;
  if (layout === 'v2-amount') return <AmountRow key={row.id} row={row} />;
  if (layout === 'v2-result') return <QcResultCard key={row.id} row={row} />;
  if (leafKey === 'mt-lines') return <QcLine key={row.id} row={row} />;
  if (layout === 'v5-minimal') return <SpecRow key={row.id} row={row} />;
  if (layout === 'v5-switch') {
    return <SwitchRow key={row.id} row={row} on={!!ctx.switchOn} onToggle={ctx.onSwitch} />;
  }
  if (layout === 'v2-price') return <PriceRow key={row.id} row={row} />;
  return <OrderCard key={row.id} row={row} />;
}
