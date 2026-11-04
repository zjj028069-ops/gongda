import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c3LeafByKey, msUpstreamUrl, type C3LeafDef } from './c3Registry';
import { InvoiceSummary, renderC3Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES, type FixtureRow } from './fixtures';

function listPath(leaf: C3LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

const TABLE_HEAD: Record<string, string[]> = {
  'purchase-pay': ['金额', '供应商', '付款日'],
  'purchase-invoice': ['金额', '供应商', '开票日'],
  'mt-spec': ['规范名', '状态'],
  'purchase-price': ['最新单价', '涨跌幅', '物料'],
};

const LINE_CAPTION: Record<string, string> = {
  'purchase-plan': '计划号 · 物料 · 规格 · 需求量 · 交期 · 状态',
  'mt-lines': '项目 · 方法 · 标准 · 实测 · 判定 · 备注',
};

export function PurchaseLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c3LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [switchMap, setSwitchMap] = useState<Record<string, boolean>>({});
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
    if (!leaf) return { items: [] as FixtureRow[], fromFixture: true };
    if (leaf.layout === 'v5-switch') {
      return { items: FIXTURES[leaf.key] ?? [], fromFixture: true };
    }
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyFixture = !(remote.data?.items?.length);
    return { items: reallyFixture ? (FIXTURES[leaf.key] ?? apiItems) : apiItems, fromFixture: reallyFixture };
  }, [leaf, remote.data]);

  useEffect(() => {
    if (!leaf || leaf.layout !== 'v5-switch') return;
    const next: Record<string, boolean> = {};
    for (const row of items) next[row.id] = !!row.settingOn;
    setSwitchMap(next);
  }, [leaf, items]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return items;
    return items.filter((row) => {
      const blob = [
        row.code, row.partner, row.product, row.contact, row.phone, row.batch,
        row.inspector, row.category, row.sku, row.supplierCode, row.spec, row.settingDesc,
      ].filter(Boolean).join(' ');
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

  function onSwitch(row: FixtureRow) {
    setSwitchMap((prev) => {
      const nextOn = !(prev[row.id] ?? !!row.settingOn);
      setToast(nextOn ? `已开启：${row.product}` : `已关闭：${row.product}`);
      return { ...prev, [row.id]: nextOn };
    });
  }

  const head = TABLE_HEAD[leaf.key];
  const grouped = leaf.layout === 'v5-switch'
    ? Object.entries(filtered.reduce<Record<string, FixtureRow[]>>((acc, row) => {
      const g = row.group || leaf.title;
      (acc[g] ||= []).push(row);
      return acc;
    }, {}))
    : [];

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
      {leaf.key === 'purchase-invoice' && <InvoiceSummary rows={filtered} />}
      {leaf.layout === 'v5-switch' && (
        <div className="c3-switch-panel" data-testid="c3-list">
          {grouped.map(([group, rows]) => (
            <section key={group} className={leaf.key === 'supplier-setting' ? 'is-card' : ''}>
              {leaf.key !== 'supplier-setting' && (
                <div className="c3-v5-section"><span>{group}</span></div>
              )}
              {rows.map((row) => renderC3Card(leaf.layout, leaf.key, row, {
                switchOn: switchMap[row.id] ?? !!row.settingOn,
                onSwitch: () => onSwitch(row),
              }))}
            </section>
          ))}
          {!filtered.length && <div className="ms-empty">无匹配记录</div>}
        </div>
      )}
      {leaf.layout !== 'v5-switch' && (
        <div className={`c3-list ${head ? `is-table is-${leaf.key}` : ''}`} data-testid="c3-list">
          {LINE_CAPTION[leaf.key] && <p className="c3-line-caption">{LINE_CAPTION[leaf.key]}</p>}
          {head && (
            <div className={`c3-table-head is-${leaf.key}`} data-testid="c3-table-head">
              {head.map((label) => <span key={label}>{label}</span>)}
            </div>
          )}
          {filtered.map((row) => renderC3Card(leaf.layout, leaf.key, row, {
            onCall: () => setToast(row.phone ? `正在拨打 ${row.phone}` : '暂无电话'),
            onCopy: () => {
              const text = row.code || '';
              if (text && navigator.clipboard?.writeText) void navigator.clipboard.writeText(text).catch(() => undefined);
              setToast(text ? `已复制 ${text}` : '无可复制内容');
            },
          }))}
          {!filtered.length && <div className="ms-empty">无匹配记录</div>}
        </div>
      )}
    </div>
  );
}
