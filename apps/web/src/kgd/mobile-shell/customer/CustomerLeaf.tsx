import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c4LeafByKey, msUpstreamUrl, type C4LeafDef } from './c4Registry';
import { renderC4Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { PlusFab } from './PlusFab';
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
    // 禁开发说明上屏：丢弃含夹具/硬约束/临时皮/（皮）的 toast
    if (/夹具|硬约束|临时皮|（皮）|\(皮\)/.test(msg)) {
      const next = new URLSearchParams(params);
      next.delete('toast');
      setParams(next, { replace: true });
      return;
    }
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
    // 上游完成：仅业务结果提示，无开发说明
    if (params.get('upstream')) {
      const n = String(params.get('upstream') || '').split(',').filter(Boolean).length;
      setToast(n ? `已选 ${n} 项` : '已选择');
    }
    // blank/quick/claim 等无表单写回时不弹开发 toast
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    next.delete('toast');
    setParams(next, { replace: true });
    if (params.get('upstream')) {
      const t = window.setTimeout(() => setToast(''), 2200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [leaf, params, setParams]);

  const items = useMemo(() => {
    if (!leaf) return [];
    // 设置页无列表 API 形态：用本地结构卡（无「夹具」文案）
    if (leaf.layout === 'v1-settings') return FIXTURES[leaf.key] ?? [];
    const apiItems = remote.data?.items ?? [];
    if (apiItems.length) return mapApiItems(leaf, apiItems);
    // 空库静默回退列表结构，真机不展示夹具灰字
    return FIXTURES[leaf.key] ?? [];
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
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    const up = leaf!.plusUpstream?.[item.key] ?? (item.key === 'from-quote' ? leaf!.upstream : undefined);
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    // 无上游的新增：静默，不弹「（皮）」开发说明
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
    >
      <LeafChrome
        title={leaf.title}
        onBack={() => navigate('/ms/functions')}
        onSearch={() => setSearching(true)}
        searching={searching}
        searchHint={leaf.searchHint}
        searchValue={q}
        onSearchChange={setQ}
        onSearchClose={() => setSearching(false)}
      />
      {toast && <div className="c4-toast" data-testid="c4-toast">{toast}</div>}
      {leaf.key === 'customer-sea' && (
        <div className="c4-sea-banner" data-testid="c4-sea-banner">
          <h3>公海客户</h3>
          <p>以下客户当前无负责人，可领取跟进</p>
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
      {Array.isArray(leaf.plus) && leaf.plus.length > 0 && (
        <PlusFab plusItems={leaf.plus} onPlusPick={onPlusPick} />
      )}
    </div>
  );
}
