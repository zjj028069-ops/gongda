import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c2LeafByKey, msUpstreamUrl, type C2LeafDef } from './c2Registry';
import { renderC2Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES } from './fixtures';

const ALARM_CAPS = [
  { key: 'all', label: '全部' },
  { key: 'all_alarm', label: '全部报警' },
  { key: 'high', label: '上限' },
  { key: 'low', label: '下限' },
  { key: 'ok', label: '正常' },
  { key: 'stale', label: '呆滞' },
] as const;

function listPath(leaf: C2LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

export function WarehouseLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c2LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [alarm, setAlarm] = useState<string>('all');
  const [toast, setToast] = useState('');
  const url = leaf ? listPath(leaf) : null;
  const remote = useRemote<{ items?: Record<string, unknown>[]; summary?: { inbound_qty?: string; outbound_qty?: string } }>(url, revision, onExpired);

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
    if (action === 'scan') setToast('扫码');
    else if (action === 'blank' || action === 'direct') setToast('已打开新增');
    else if (params.get('upstream')) setToast(`已选上游 · ${leaf.title}`);
    else setToast('已处理');
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  const { items, fromFixture, flowSummary } = useMemo(() => {
    if (!leaf) return { items: [], fromFixture: true, flowSummary: null as null | { inQty: string; outQty: string } };
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const usedFixture = !(remote.data?.items?.length);
    const list = usedFixture ? (FIXTURES[leaf.key] ?? []) : apiItems;
    const summary = leaf.key === 'flow'
      ? {
          inQty: String(remote.data?.summary?.inbound_qty ?? (usedFixture ? '12,277' : '0')),
          outQty: String(remote.data?.summary?.outbound_qty ?? (usedFixture ? '2,750' : '0')),
        }
      : null;
    return { items: list, fromFixture: usedFixture, flowSummary: summary };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    return items.filter((row) => {
      if (leaf?.alarmCapsules && alarm !== 'all') {
        if (alarm === 'all_alarm' && !(row.alarm === 'high' || row.alarm === 'low' || row.alarm === 'stale')) return false;
        else if (alarm !== 'all_alarm' && row.alarm !== alarm) return false;
      }
      if (!needle) return true;
      const blob = [row.code, row.product, row.partner, row.warehouse, row.workOrder, row.contract, row.manager, row.docType]
        .filter(Boolean)
        .join(' ');
      return blob.includes(needle);
    });
  }, [items, q, alarm, leaf]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c2-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知仓库叶子</h2>
        <p className="ms-leaf-note">key={leafKey}</p>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    if (item.key === 'scan') {
      setToast('扫码');
      return;
    }
    const needsUpstream =
      item.key === 'from-wo' ||
      item.key === 'from-po' ||
      item.key === 'from-contract' ||
      item.key === 'from-ship' ||
      item.key === 'from-receipt' ||
      item.key === 'pick-type';
    if (needsUpstream && leaf!.upstream) {
      navigate(msUpstreamUrl(leaf!));
      return;
    }
    setToast(item.label);
  }

  return (
    <div className="c2-leaf" data-testid="c2-warehouse-leaf" data-key={leaf.key} data-layout={leaf.layout} data-fixture={fromFixture ? '1' : '0'}>
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
      {toast && <div className="c2-toast" data-testid="c2-toast">{toast}</div>}
      {leaf.alarmCapsules && (
        <div className="c2-capsules" data-testid="c2-alarm-capsules" role="tablist" aria-label="库存报警筛选">
          {ALARM_CAPS.map((cap) => (
            <button
              key={cap.key}
              type="button"
              role="tab"
              aria-selected={alarm === cap.key}
              className={`c2-cap ${alarm === cap.key ? 'is-on' : ''}`}
              onClick={() => setAlarm(cap.key)}
            >
              {cap.label}
            </button>
          ))}
        </div>
      )}
      {flowSummary && (
        <div className="c2-flow-summary" data-testid="c2-flow-summary">
          <span className="is-pos">累计入库 +{flowSummary.inQty}</span>
          <span className="is-neg">累计出库 -{flowSummary.outQty}</span>
        </div>
      )}
      <div className="c2-list" data-testid="c2-list">
        {filtered.map((row) => renderC2Card(leaf.layout, leaf.key, row))}
        {!filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
    </div>
  );
}
