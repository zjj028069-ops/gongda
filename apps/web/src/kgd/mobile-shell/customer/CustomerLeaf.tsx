import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { renderC4Card } from './Cards';
import { c4LeafByKey, msLeafUrl, msUpstreamUrl, type C4LeafDef } from './c4Registry';
import { FIXTURES, type FixtureRow } from './fixtures';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';

function listPath(leaf: C4LeafDef) {
  if (!leaf.listUrl) return null;
  return leaf.listQuery ? `${leaf.listUrl}${leaf.listUrl.includes('?') ? '&' : '?'}${leaf.listQuery}` : leaf.listUrl;
}

function safeToast(msg: string) {
  if (/夹具|硬约束|临时皮|定版|同源|Playwright|（皮）|\(皮\)/.test(msg)) return '已完成';
  return msg;
}

function monthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : '';
}

function thisMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sumAmount(rows: FixtureRow[]) {
  return rows.reduce((n, row) => n + (row.amount ?? 0), 0);
}

function pct(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function fmtPct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function CustomerLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c4LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [switchMap, setSwitchMap] = useState<Record<string, boolean>>({});
  const [auditMap, setAuditMap] = useState<Record<string, boolean>>({});
  const url = leaf ? listPath(leaf) : null;
  const remote = useRemote<{ items?: Record<string, unknown>[] }>(url, revision, onExpired);

  useEffect(() => {
    const msg = params.get('toast');
    if (!msg) return;
    setToast(safeToast(msg));
    const next = new URLSearchParams(params);
    next.delete('toast');
    setParams(next, { replace: true });
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [params, setParams]);

  useEffect(() => {
    const action = params.get('action');
    if (!action || !leaf) return;
    if (params.get('upstream')) {
      const n = String(params.get('upstream') || '').split(',').filter(Boolean).length;
      setToast(n ? `已选 ${n} 项` : '已选择');
    } else if (action === 'quick') setToast('已打开快速记录');
    else if (action === 'blank') setToast('已打开新增');
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    next.delete('toast');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  const items = useMemo(() => {
    if (!leaf) return [] as FixtureRow[];
    if (leaf.layout === 'v5-switch') return FIXTURES[leaf.key] ?? [];
    const apiItems = remote.data?.items ?? [];
    if (apiItems.length) return mapApiItems(leaf, apiItems);
    return FIXTURES[leaf.key] ?? [];
  }, [leaf, remote.data]);

  useEffect(() => {
    if (!leaf) return;
    if (leaf.layout === 'v5-switch') {
      const next: Record<string, boolean> = {};
      for (const row of items) next[row.id] = !!row.settingOn;
      setSwitchMap(next);
    }
    if (leaf.layout === 'v5-audit') {
      const next: Record<string, boolean> = {};
      for (const row of items) next[row.id] = row.active !== false && row.statusText !== '免审';
      setAuditMap(next);
    }
  }, [leaf, items]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    let rows = items;
    if (leaf?.key === 'customer-sea') {
      rows = [...rows].sort((a, b) => (b.daysIdle ?? 0) - (a.daysIdle ?? 0));
    }
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [
        row.code, row.partner, row.shortName, row.product, row.contact, row.phone,
        row.typeLabel, row.owner, row.applicant, row.category, row.invoiceType, row.title, row.city,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, q, leaf?.key]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c4-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未找到页面</h2>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    const up = leaf!.plusUpstream?.[item.key] ?? (item.key === 'from-quote' ? leaf!.upstream : undefined);
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    if (item.key === 'quick') setToast('已打开快速记录');
    else setToast(item.key === 'blank' ? '已打开新增' : `已打开：${item.label}`);
  }

  function goContract() {
    const contract = c4LeafByKey('contract');
    if (contract) navigate(msLeafUrl(contract));
  }

  function goCash() {
    const cash = c4LeafByKey('cash');
    if (cash) navigate(msLeafUrl(cash));
  }

  function onClaim() {
    const up = leaf!.plusUpstream?.claim;
    if (up) navigate(msUpstreamUrl(leaf!, up));
  }

  function onSwitch(row: FixtureRow) {
    setSwitchMap((prev) => {
      const nextOn = !(prev[row.id] ?? !!row.settingOn);
      setToast(nextOn ? `已开启：${row.product}` : `已关闭：${row.product}`);
      return { ...prev, [row.id]: nextOn };
    });
  }

  function onAuditCycle(row: FixtureRow) {
    setAuditMap((prev) => {
      const need = !(prev[row.id] ?? true);
      setToast(need ? `已设为需审核：${row.product}` : `已设为免审：${row.product}`);
      return { ...prev, [row.id]: need };
    });
  }

  const income = filtered.filter((row) => row.direction !== 'out').reduce((n, row) => n + (row.amount ?? 0), 0);
  const expense = filtered.filter((row) => row.direction === 'out').reduce((n, row) => n + (row.amount ?? 0), 0);
  const curKey = thisMonthKey();
  const oldKey = prevMonthKey();
  const curRows = filtered.filter((row) => monthKey(row.date) === curKey);
  const oldRows = filtered.filter((row) => monthKey(row.date) === oldKey);
  const feeNow = sumAmount(curRows);
  const feePrev = sumAmount(oldRows);
  const overdue = filtered.filter((row) => /逾期/.test(row.statusText)).reduce((n, row) => n + (row.amount ?? 0), 0);
  const overduePrev = oldRows.filter((row) => /逾期/.test(row.statusText)).reduce((n, row) => n + (row.amount ?? 0), 0);
  const featured = filtered[0];
  const idle = featured?.daysIdle ?? 0;

  return (
    <div className="c4-leaf" data-testid="c4-customer-leaf" data-key={leaf.key} data-layout={leaf.layout}>
      <LeafChrome
        title={leaf.title}
        onBack={() => navigate('/ms/functions')}
        onSearch={() => setSearching(true)}
        plusItems={leaf.plus}
        onPlusPick={onPlusPick}
        searching={searching}
        searchHint={leaf.searchHint}
        searchValue={q}
        onSearchChange={setQ}
        onSearchClose={() => { setSearching(false); setQ(''); }}
      />
      {toast && <div className="c4-toast" data-testid="c4-toast">{toast}</div>}

      {leaf.key === 'quote' && (
        <div className="c4-doc-hero" data-testid="c4-quote-hero">
          <span className="c4-doc-badge" aria-hidden>¥</span>
          <h2>合同报价单</h2>
          <i />
        </div>
      )}

      {leaf.key === 'cash' && (
        <div className="c4-cash-summary" data-testid="c4-cash-summary">
          <span>累计收入 <b className="is-up">+¥{income.toLocaleString('zh-CN')}</b></span>
          <span>累计支出 <b className="is-down">-¥{expense.toLocaleString('zh-CN')}</b></span>
        </div>
      )}

      {leaf.key === 'invoice' && (
        <section className="c4-overview" data-testid="c4-invoice-overview">
          <header>
            <h2>发票总览</h2>
            <p>展示当前列表的汇总</p>
          </header>
          <div className="c4-metrics">
            <article>
              <p>发票总额（含税）</p>
              <strong>{moneyPlain(sumAmount(filtered))}</strong>
              <small>较上月 {fmtPct(pct(feeNow, feePrev))}</small>
            </article>
            <article>
              <p>本月开票金额</p>
              <strong>{moneyPlain(feeNow)}</strong>
              <small>较上月 {fmtPct(pct(feeNow, feePrev))}</small>
            </article>
            <article className="is-alert">
              <p>逾期未回款金额</p>
              <strong>{moneyPlain(overdue)}</strong>
              <small>较上月 {fmtPct(pct(overdue, overduePrev))}</small>
            </article>
          </div>
          <div className="c4-list-head">
            <div><h3>发票列表</h3><p>共 {filtered.length} 条记录</p></div>
            <button type="button" onClick={() => setSearching(true)}>筛选</button>
          </div>
        </section>
      )}

      {leaf.key === 'sales-fee' && (
        <section className="c4-fee-hero" data-testid="c4-fee-hero">
          <div className="c4-fee-total">
            <span className="c4-round-ico" aria-hidden>费</span>
            <div>
              <p>本月销售费用合计</p>
              <strong>{moneyPlain(feeNow || sumAmount(filtered))}</strong>
            </div>
          </div>
          <div className="c4-fee-sub">
            <div><p>费用笔数</p><b>{(feeNow ? curRows.length : filtered.length)} 笔</b></div>
            <div><p>较上月增长</p><b className="is-up">{fmtPct(pct(feeNow || sumAmount(filtered), feePrev))}</b></div>
          </div>
          <h3 className="c4-section">费用列表</h3>
        </section>
      )}

      {leaf.key === 'customer-sea' && featured && (
        <section className="c4-idle-hero" data-testid="c4-sea-hero">
          <p className="c4-idle-chip">当前空闲天数：{idle}天</p>
          <h2>{idle}天未跟进</h2>
        </section>
      )}

      {leaf.layout === 'v5-audit' && (
        <div className="c4-audit-head">
          <span>文档类型</span>
          <button type="button" data-testid="c4-add-type" onClick={() => onPlusPick({ key: 'blank', label: '新增审核流程' })}>+ 添加类型</button>
        </div>
      )}

      <div
        className={`c4-list ${leaf.layout === 'wx-row' ? 'is-wx' : ''} ${leaf.layout === 'v5-audit' ? 'is-audit' : ''} ${leaf.layout === 'v5-switch' ? 'is-switch' : ''}`}
        data-testid="c4-list"
      >
        {filtered.map((row) => renderC4Card(leaf.layout, leaf.key, row, {
          onGenerateContract: goContract,
          onRevise: () => setToast('已提交改审'),
          onClaim,
          onCashIn: goCash,
          onCashOut: () => setToast('已打开支出'),
          onCall: () => setToast(row.phone ? `正在拨打 ${row.phone}` : '暂无电话'),
          onSwitch: () => onSwitch(row),
          switchOn: switchMap[row.id] ?? !!row.settingOn,
          onAuditCycle: () => onAuditCycle(row),
          auditNeed: auditMap[row.id] ?? (row.active !== false && row.statusText !== '免审'),
          onPriceDetail: () => setToast('已打开价格趋势'),
        }))}
        {!filtered.length && <div className="ms-empty">暂无记录</div>}
      </div>
    </div>
  );
}

function moneyPlain(n: number) {
  const digits = Number.isInteger(Math.abs(n)) ? 0 : 2;
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
