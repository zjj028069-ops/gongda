import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c4LeafByKey, msUpstreamUrl, type C4LeafDef } from './c4Registry';
import { renderC4Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES } from './fixtures';

function listPath(leaf: C4LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

export function CustomerLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c4LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const url = leaf ? listPath(leaf) : null;
  const remote = useRemote<{ items?: Record<string, unknown>[]; settings?: Record<string, unknown> }>(url, revision, onExpired);

  useEffect(() => {
    const msg = params.get('toast');
    if (!msg) return;
    setToast(msg);
    const next = new URLSearchParams(params);
    next.delete('toast');
    setParams(next, { replace: true });
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [params, setParams]);

  useEffect(() => {
    const action = params.get('action');
    if (!action || !leaf) return;
    if (action === 'blank') setToast(`新增入口已打开（皮）· ${leaf.title}`);
    else if (action === 'quick') setToast('快速记录入口已打开（皮）');
    else if (action === 'claim') setToast('领取客户入口已打开（皮）· 领用→客户档案');
    else if (action === 'assign') setToast('分配销售入口已打开（皮）');
    else if (params.get('upstream')) setToast(`上游已选，进入${leaf.title}（皮）`);
    else setToast(`${action} · 业务写回后续`);
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  const { items, fromFixture } = useMemo(() => {
    if (!leaf) return { items: [], fromFixture: true };
    if (leaf.layout === 'v1-settings') {
      return { items: FIXTURES[leaf.key] ?? [], fromFixture: true };
    }
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyFixture = !(remote.data?.items?.length);
    return { items: reallyFixture ? (FIXTURES[leaf.key] ?? apiItems) : apiItems, fromFixture: reallyFixture };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return items;
    return items.filter((row) => {
      const blob = [
        row.code, row.partner, row.product, row.contact, row.phone,
        row.typeLabel, row.owner, row.applicant, row.category, row.invoiceType, row.title,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c4-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知客户叶子</h2>
        <p className="ms-leaf-note">key={leafKey}</p>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    const up = leaf!.plusUpstream?.[item.key] ?? (item.key === 'from-quote' ? leaf!.upstream : undefined);
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    setToast(`${item.label} · 业务写回后续（皮）`);
  }

  const summary = leaf.key === 'cash'
    ? {
      income: filtered.filter((r) => r.direction !== 'out').reduce((n, r) => n + (r.amount ?? 0), 0),
      expense: filtered.filter((r) => r.direction === 'out').reduce((n, r) => n + (r.amount ?? 0), 0),
    }
    : null;

  return (
    <div
      className="c4-leaf"
      data-testid="c4-customer-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
      data-fixture={fromFixture ? '1' : '0'}
      data-hard={leaf.hardConstraint || ''}
    >
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
        onSearchClose={() => setSearching(false)}
      />
      {toast && <div className="c4-toast" data-testid="c4-toast">{toast}</div>}
      {fromFixture && leaf.layout !== 'v1-settings' && (
        <p className="c4-fixture-hint">同源 API 暂无数据 · 使用夹具展示版型（不改业务语义）</p>
      )}
      {leaf.hardConstraint === 'quote-full' && (
        <p className="c4-hard-hint" data-testid="c4-hard-quote">
          硬约束：手机可查/开/新增/改审与 PC 同权；字段不删；行「生成合同」→合同订单
        </p>
      )}
      {leaf.hardConstraint === 'contract-upstream' && (
        <p className="c4-hard-hint" data-testid="c4-hard-contract">
          硬约束：必须保留「报价单创建」选上游报价；禁止只能空白新增
        </p>
      )}
      {leaf.key === 'customer-sea' && (
        <div className="c4-sea-banner" data-testid="c4-sea-banner">
          <h3>公海客户</h3>
          <p>以下客户当前无负责人，可领取跟进 · 领用为主，无空白新增客户</p>
        </div>
      )}
      {leaf.key === 'sales-price' && (
        <div className="c4-track-banner" data-testid="c4-track-banner">
          <span className="c4-set-ico" aria-hidden>价</span>
          <div>
            <p>销售价格追踪</p>
            <small>客户 · 产品 · 现价 / 上次价 · 变动 · 生效日</small>
          </div>
        </div>
      )}
      {summary && (
        <div className="c4-cash-summary" data-testid="c4-cash-summary">
          <div className="is-in">
            <span>累计收入</span>
            <strong>{summary.income.toLocaleString('zh-CN')}元</strong>
          </div>
          <div className="is-out">
            <span>累计支出</span>
            <strong>{summary.expense.toLocaleString('zh-CN')}元</strong>
          </div>
        </div>
      )}
      <div className={`c4-list ${leaf.key === 'customer-sea' ? 'is-sea-grid' : ''}`} data-testid="c4-list">
        {filtered.map((row) => renderC4Card(leaf.layout, leaf.key, row))}
        {!filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
      <p className="c4-leaf-foot">
        PC path：{leaf.pcPath} · 定版 {leaf.layout}
        {leaf.plus === null ? ' · 无＋' : ''}
        {leaf.key === 'customer-sea' ? ' · 领用为主' : ''}
        {' · 临时皮待 Allen 重选'}
      </p>
    </div>
  );
}
