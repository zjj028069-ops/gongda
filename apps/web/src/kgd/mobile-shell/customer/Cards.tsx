import { useState } from 'react';
import type { FixtureRow } from './fixtures';
import type { C4Layout } from './c4Registry';

export type CardCtx = {
  onGenerateContract?: () => void;
  onRevise?: () => void;
  onClaim?: () => void;
  onCashIn?: () => void;
  onCashOut?: () => void;
  onSwitch?: () => void;
  switchOn?: boolean;
  onAuditCycle?: () => void;
  auditNeed?: boolean;
  onPriceDetail?: () => void;
  onCall?: () => void;
};

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  const digits = Number.isInteger(Math.abs(n)) ? 0 : 2;
  const body = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? '-' : ''}¥${body}`;
}

function signed(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  const digits = Number.isInteger(Math.abs(n)) ? 0 : 2;
  const body = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? '-' : '+'}¥${body}`;
}

function Chevron() {
  return (
    <svg className="c4-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M7.2 3.8h2.1l1.2 3-1.5 1a12 12 0 0 0 5.2 5.2l1-1.5 3 1.2v2.1c0 .7-.5 1.3-1.2 1.4A15 15 0 0 1 5.8 5c.1-.7.7-1.2 1.4-1.2z" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function toneOf(text: string) {
  if (/逾期|拒绝|作废/.test(text)) return 'bad';
  if (/待|审批中/.test(text)) return 'warn';
  if (/部分/.test(text)) return 'info';
  if (/已开票|已报销|已审批|已确认|执行中|通过|启用/.test(text)) return 'ok';
  if (/免审|不需/.test(text)) return 'ok';
  return 'mute';
}

function StatusPill({ text }: { text: string }) {
  if (!text) return null;
  return <span className={`c4-pill is-${toneOf(text)}`}>{text}</span>;
}

function Avatar({ label }: { label?: string }) {
  const ch = Array.from(label || '客')[0] || '客';
  return <span className="c4-avatar" aria-hidden>{ch}</span>;
}

export function CustomerKeyCard({ row, onCall }: { row: FixtureRow; onCall?: () => void }) {
  return (
    <article className="c4-card c4-key" data-testid="c4-card" data-layout="v2-keyfields">
      <div className="c4-key-main">
        <p className="c4-code-quiet">{row.code}</p>
        <h3>{row.partner || '未命名客户'}</h3>
        <p className="c4-key-sub">{row.shortName || row.contact || row.partner}</p>
        <p className="c4-key-phone">{row.phone || '暂无电话'}</p>
      </div>
      <button type="button" className="c4-call" data-testid="c4-call" aria-label="拨打电话" onClick={onCall}>
        <PhoneIcon />
      </button>
    </article>
  );
}

export function WxRow({ row, kind }: { row: FixtureRow; kind: 'linkman' | 'follow' }) {
  const title = kind === 'linkman' ? (row.contact || '未命名') : (row.partner || '未命名');
  const sub = kind === 'linkman'
    ? [row.partner, row.title].filter(Boolean).join(' · ')
    : [row.typeLabel, row.subLabel].filter(Boolean).join(' · ');
  return (
    <article className="c4-wx" data-testid="c4-card" data-layout="wx-row">
      <Avatar label={title} />
      <div className="c4-wx-body">
        <h3>{title}</h3>
        <p>{sub || '—'}</p>
        {kind === 'follow' && <p className="c4-wx-meta">{[row.owner, row.nextFollow ? `下次 ${row.nextFollow}` : ''].filter(Boolean).join(' · ')}</p>}
      </div>
    </article>
  );
}

export function QuoteCard({ row, onGenerateContract, onRevise }: { row: FixtureRow; onGenerateContract?: () => void; onRevise?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="c4-quote" data-testid="c4-card" data-layout="v2-amount">
      <div className="c4-amount-panel">
        <div className="c4-amount-top">
          <span className="c4-round-ico" aria-hidden>¥</span>
          <div>
            <p className="c4-k">报价金额</p>
            <strong className="c4-hero-amt">{money(row.amount)}</strong>
          </div>
          <span className="c4-priority">{row.priority ? '优先' : (row.statusText || '报价')}</span>
        </div>
        <div className="c4-amount-line">
          <span className="c4-round-ico" aria-hidden>单</span>
          <div><p className="c4-k">报价编号</p><b>{row.code}</b></div>
        </div>
        <div className="c4-amount-line">
          <span className="c4-round-ico" aria-hidden>客</span>
          <div><p className="c4-k">客户</p><b>{row.partner || '—'}</b></div>
        </div>
      </div>
      <button type="button" className="c4-fold" data-testid="c4-quote-detail" onClick={() => setOpen((v) => !v)}>
        <span className="c4-round-ico soft" aria-hidden>详</span>
        <span>报价详情</span>
        <Chevron />
      </button>
      {open && (
        <div className="c4-fold-body">
          <p>有效期 {row.note || '—'}</p>
          {(row.lines ?? []).map((line) => (
            <p key={line.name}>{line.name}{line.qty ? ` ×${line.qty}` : ''} {line.amount != null ? money(line.amount) : ''}</p>
          ))}
          {!row.lines?.length && <p>暂无明细</p>}
        </div>
      )}
      <div className="c4-link-row">
        <span>报价编号</span><b>{row.code}</b><Chevron />
      </div>
      <div className="c4-link-row">
        <span>客户</span><b>{row.partner || '—'}</b><Chevron />
      </div>
      <div className="c4-link-row">
        <span>状态</span><b>{row.statusText || '—'}</b><Chevron />
      </div>
      <div className="c4-ops">
        <button type="button" data-testid="c4-gen-contract" onClick={onGenerateContract}>生成合同</button>
        <button type="button" data-testid="c4-revise" onClick={onRevise}>改审</button>
        <button type="button" onClick={() => setOpen(true)}>更多</button>
      </div>
    </article>
  );
}

export function ContractCard({ row, onCashIn, onCashOut }: { row: FixtureRow; onCashIn?: () => void; onCashOut?: () => void }) {
  return (
    <article className="c4-card c4-contract" data-testid="c4-card" data-layout="v2-amount">
      <div className="c4-contract-head">
        <div>
          <b className="c4-contract-code">{row.code}</b>
          <span className="c4-contract-name">{row.partner}</span>
        </div>
        <span className="c4-pill is-info">{row.statusText || '执行中'}</span>
      </div>
      <div className="c4-split-amt">
        <div>
          <p>合同金额</p>
          <strong>{money(row.amount)}</strong>
        </div>
        <div className="is-debt">
          <p>欠款</p>
          <strong>{row.arrears == null ? '—' : money(row.arrears).replace('-¥', '¥-')}</strong>
        </div>
      </div>
      {row.address && <p className="c4-address">{row.address}</p>}
      <div className="c4-ops quiet">
        <button type="button" onClick={onCashIn}>收款</button>
        <button type="button" onClick={onCashOut}>支出</button>
        <button type="button">更多</button>
      </div>
    </article>
  );
}

export function CashCard({ row }: { row: FixtureRow }) {
  const out = row.direction === 'out';
  const amt = row.amount == null ? undefined : out ? -Math.abs(row.amount) : Math.abs(row.amount);
  return (
    <article className="c4-card c4-cash" data-testid="c4-card" data-layout="v2-amount">
      <div>
        <p className="c4-code-quiet">{row.code}</p>
        <h3>{row.partner || '—'}</h3>
        <span className={`c4-io ${out ? 'is-out' : 'is-in'}`}>{row.typeLabel || (out ? '支出' : '收入')}</span>
      </div>
      <strong className={out ? 'is-down' : 'is-up'}>{signed(amt)}</strong>
    </article>
  );
}

export function InvoiceCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c4-card c4-invoice" data-testid="c4-card" data-layout="v2-overview">
      <div className="c4-inv-head">
        <span className="c4-round-ico" aria-hidden>票</span>
        <b>{row.code}</b>
        <strong className="c4-inv-amt">{money(row.amount)}</strong>
      </div>
      <p>客户<span>{row.partner || '—'}</span></p>
      <p>类型<span>{row.invoiceType || '—'}</span></p>
      <p>状态<StatusPill text={row.statusText} /></p>
      <p>开票日期<span>{row.date || '—'}</span></p>
    </article>
  );
}

export function FeeCard({ row }: { row: FixtureRow }) {
  const warn = /待/.test(row.statusText);
  const mid = /审批/.test(row.statusText) && !warn;
  return (
    <article className="c4-card c4-fee" data-testid="c4-card" data-layout="v2-amount">
      <span className={`c4-fee-ico ${warn ? 'is-warn' : mid ? 'is-ok' : 'is-info'}`} aria-hidden>费</span>
      <div className="c4-fee-body">
        <div className="c4-fee-top">
          <h3>{row.typeLabel}</h3>
          <strong className={warn ? 'is-warn' : mid ? 'is-ok' : ''}>{money(row.amount)}</strong>
          <Chevron />
        </div>
        <p>客户：{row.partner || '—'}</p>
        <p>日期：{row.date || '—'}</p>
        <StatusPill text={row.statusText} />
      </div>
    </article>
  );
}

export function SeaCard({ row, onClaim }: { row: FixtureRow; onClaim?: () => void }) {
  const [more, setMore] = useState(false);
  const days = row.daysIdle ?? 0;
  return (
    <article className="c4-card c4-sea" data-testid="c4-card" data-layout="v2-idle">
      <div className="c4-sea-head">
        <span className="c4-round-ico" aria-hidden>厂</span>
        <h3>{row.partner}</h3>
        {row.industry && <span className="c4-tag">{row.industry}</span>}
      </div>
      <p className="c4-sea-meta">
        {row.category && <span>{row.category}</span>}
        {row.city && <span>{row.city}</span>}
      </p>
      <div className="c4-sea-idle">
        <span className="c4-round-ico soft" aria-hidden>期</span>
        <div>
          <p>空闲天数 <b>{days}天</b></p>
          <small>该客户已超过{days}天未跟进，建议及时认领跟进</small>
        </div>
      </div>
      <button type="button" className="c4-claim" data-testid="c4-claim" onClick={onClaim}>认领客户</button>
      <button type="button" className="c4-fold slim" onClick={() => setMore((v) => !v)}>
        <span className="c4-round-ico soft" aria-hidden>客</span>
        <span>更多客户信息</span>
        <Chevron />
      </button>
      {more && (
        <div className="c4-fold-body">
          <p>编号 {row.code || '—'}</p>
          <p>联系人 {row.contact || '—'}</p>
          <p>电话 {row.phone || '—'}</p>
        </div>
      )}
    </article>
  );
}

export function PriceCard({ row, onPriceDetail }: { row: FixtureRow; onPriceDetail?: () => void }) {
  const pct = row.changePct ?? 0;
  const down = pct < 0;
  const up = pct > 0;
  return (
    <article className="c4-card c4-price" data-testid="c4-card" data-layout="v2-price">
      <div className="c4-price-hero">
        <div>
          <strong>¥{row.lastPrice ?? 0}</strong>
          <p>较上次变化</p>
        </div>
        <em className={down ? 'is-down' : up ? 'is-up' : ''}>{down ? '▼' : up ? '▲' : '—'} {pct > 0 ? '+' : ''}{Number(pct.toFixed(1))}%</em>
      </div>
      <div className="c4-price-split">
        <div><p>产品</p><b><i>品</i>{row.product || '—'}</b></div>
        <div><p>客户</p><b><i>厂</i>{row.partner || '—'}</b></div>
      </div>
      <div className="c4-kv"><span>当前销售价格</span><b>¥{row.lastPrice ?? 0} /{row.unit || '件'}</b></div>
      <div className="c4-kv"><span>上次价格</span><b>¥{row.prevPrice ?? 0} /{row.unit || '件'}</b></div>
      <div className="c4-kv"><span>价格生效日期</span><b>{row.date || '—'}</b></div>
      <div className="c4-kv"><span>最后更新人</span><b>{row.updater || '—'}</b></div>
      <button type="button" className="c4-trend" onClick={onPriceDetail}>
        <span>价格趋势（最近6次）</span>
        <em>查看详情</em>
      </button>
    </article>
  );
}

export function SwitchRow({ row, on, onSwitch }: { row: FixtureRow; on: boolean; onSwitch?: () => void }) {
  return (
    <article className="c4-card c4-switch-row" data-testid="c4-card" data-layout="v5-switch">
      <div>
        <h3>{row.product}</h3>
        <p>{row.settingDesc}</p>
      </div>
      <button
        type="button"
        className={`c4-switch ${on ? 'is-on' : ''}`}
        data-testid="c4-switch"
        role="switch"
        aria-checked={on}
        aria-label={row.product}
        onClick={onSwitch}
      >
        <i />
      </button>
    </article>
  );
}

export function AuditRow({ row, need, onCycle }: { row: FixtureRow; need: boolean; onCycle?: () => void }) {
  return (
    <article className="c4-audit-row" data-testid="c4-card" data-layout="v5-audit">
      <div>
        <h3>{row.product}</h3>
        <p>{row.subLabel}</p>
      </div>
      <button type="button" className={`c4-audit-pill ${need ? 'is-need' : 'is-free'}`} data-testid="c4-audit-pill" onClick={onCycle}>
        {need ? '需审核' : '免审'}
        <Chevron />
      </button>
    </article>
  );
}

export function renderC4Card(layout: C4Layout, leafKey: string, row: FixtureRow, ctx: CardCtx = {}) {
  if (leafKey === 'customer-list') return <CustomerKeyCard key={row.id} row={row} onCall={ctx.onCall} />;
  if (leafKey === 'linkman') return <WxRow key={row.id} row={row} kind="linkman" />;
  if (leafKey === 'follow') return <WxRow key={row.id} row={row} kind="follow" />;
  if (leafKey === 'quote') {
    return <QuoteCard key={row.id} row={row} onGenerateContract={ctx.onGenerateContract} onRevise={ctx.onRevise} />;
  }
  if (leafKey === 'contract') return <ContractCard key={row.id} row={row} onCashIn={ctx.onCashIn} onCashOut={ctx.onCashOut} />;
  if (leafKey === 'cash') return <CashCard key={row.id} row={row} />;
  if (leafKey === 'invoice') return <InvoiceCard key={row.id} row={row} />;
  if (leafKey === 'sales-fee') return <FeeCard key={row.id} row={row} />;
  if (leafKey === 'customer-sea') return <SeaCard key={row.id} row={row} onClaim={ctx.onClaim} />;
  if (layout === 'v5-switch') return <SwitchRow key={row.id} row={row} on={!!ctx.switchOn} onSwitch={ctx.onSwitch} />;
  if (layout === 'v5-audit') return <AuditRow key={row.id} row={row} need={ctx.auditNeed !== false} onCycle={ctx.onAuditCycle} />;
  if (layout === 'v2-price') return <PriceCard key={row.id} row={row} onPriceDetail={ctx.onPriceDetail} />;
  return <CustomerKeyCard key={row.id} row={row} onCall={ctx.onCall} />;
}
