import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c3LeafByKey, msUpstreamUrl, type C3LeafDef } from './c3Registry';
import { renderC3Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES } from './fixtures';

function listPath(leaf: C3LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

export function PurchaseLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c3LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
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
    if (action === 'scan') setToast('已打开扫码报检');
    else if (action === 'blank') setToast(`已打开：${leaf.title}`);
    else if (params.get('upstream')) setToast(`已选上游，进入${leaf.title}`);
    else setToast(`已执行：${action}`);
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
      const blob = [row.code, row.partner, row.product, row.contact, row.phone, row.batch, row.inspector, row.category]
        .filter(Boolean)
        .join(' ');
      return blob.includes(needle);
    });
  }, [items, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c3-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知采购叶子</h2>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    if (item.key === 'scan') {
      setToast('已打开扫码报检');
      return;
    }
    const up = leaf!.plusUpstream?.[item.key] ?? (item.key === 'from-po' || item.key === 'from-demand' ? leaf!.upstream : undefined);
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    setToast(`已打开：${item.label}`);
  }

  return (
    <div
      className="c3-leaf"
      data-testid="c3-purchase-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
      data-fixture={fromFixture ? '1' : '0'}
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
      {toast && <div className="c3-toast" data-testid="c3-toast">{toast}</div>}
      {leaf.key === 'purchase-price' && (
        <div className="c3-track-banner" data-testid="c3-track-banner">
          <span className="c3-set-ico" aria-hidden>价</span>
          <div>
            <p>实时追踪采购价格变化，掌控成本波动，助力采购决策</p>
            <small>智能预警 · 数据驱动 · 降本增效</small>
          </div>
        </div>
      )}
      <div className="c3-list" data-testid="c3-list">
        {filtered.map((row) => renderC3Card(leaf.layout, leaf.key, row))}
        {!filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
    </div>
  );
}
