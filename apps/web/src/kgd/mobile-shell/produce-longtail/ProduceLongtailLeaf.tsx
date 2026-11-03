import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c1bLeafByKey, msUpstreamUrl, type C1bLeafDef } from './c1bRegistry';
import { renderC1bCard } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES, type FixtureRow } from './fixtures';

function listPath(leaf: C1bLeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

function matchStatusTab(row: FixtureRow, tab: string) {
  if (tab === '全部') return true;
  if (tab === '待质检') return row.status === 'pending';
  if (tab === '已质检') return row.status === 'done';
  return row.statusText === tab || row.status === tab;
}

export function ProduceLongtailLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c1bLeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [statusTab, setStatusTab] = useState('全部');
  const url = leaf ? listPath(leaf) : null;
  const remote = useRemote<{ items?: Record<string, unknown>[] }>(url, revision, onExpired);

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
    if (params.get('upstream')) {
      setToast(`已选上游，进入${leaf.title}`);
    } else if (action === 'blank') {
      setToast(`${leaf.title}新增已打开`);
    } else {
      setToast(`${leaf.title}操作已打开`);
    }
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  const { items } = useMemo(() => {
    if (!leaf) return { items: [] as FixtureRow[] };
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyEmpty = !(remote.data?.items?.length);
    const rows = reallyEmpty ? (FIXTURES[leaf.key] ?? apiItems) : apiItems;
    return { items: rows };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    let rows = items;
    if (leaf?.layout === 'v3-status-tabs') rows = rows.filter((r) => matchStatusTab(r, statusTab));
    const needle = q.trim();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [
        row.code, row.name, row.product, row.productCode, row.processName, row.workOrder,
        row.supplier, row.planCode, row.planName, row.contractCode, row.category,
        row.expenseType, row.method, row.note, row.owner, row.creator,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, leaf, statusTab, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c1b-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知页面</h2>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    const up = leaf!.plusUpstream?.[item.key];
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    setToast(`${item.label}已打开`);
  }

  const tabs = leaf.statusTabs || ['全部', '待质检', '已质检'];
  const statusCounts = leaf.layout === 'v3-status-tabs'
    ? {
      all: items.length,
      pending: items.filter((r) => r.status === 'pending').length,
      done: items.filter((r) => r.status === 'done').length,
    }
    : null;

  return (
    <div
      className="c1b-leaf"
      data-testid="c1b-produce-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
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
      {toast && <div className="c1b-toast" data-testid="c1b-toast">{toast}</div>}

      {leaf.layout === 'v3-status-tabs' && statusCounts && (
        <div className="c1b-tabs underline" data-testid="c1b-status-tabs" role="tablist">
          {[
            { tab: '全部', label: `全部(${statusCounts.all})` },
            { tab: '待质检', label: `待质检(${statusCounts.pending})` },
            { tab: '已质检', label: `已质检(${statusCounts.done})` },
          ].filter((item) => tabs.includes(item.tab)).map((item) => (
            <button
              key={item.tab}
              type="button"
              role="tab"
              className={`c1b-tab ${statusTab === item.tab ? 'is-on' : ''}`}
              onClick={() => setStatusTab(item.tab)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="c1b-list" data-testid="c1b-list">
        {filtered.map((row) => renderC1bCard(leaf.layout, leaf.key, row))}
        {!filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
    </div>
  );
}
