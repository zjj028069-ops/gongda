import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c9LeafByKey, type C9LeafDef } from './c9Registry';
import { renderC9Card } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES, type FixtureRow } from './fixtures';

function listPath(leaf: C9LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

function matchStatusTab(row: FixtureRow, tabKey: string) {
  if (tabKey === 'all') return true;
  if (tabKey === 'open') return row.status === 'open' || row.statusText.includes('未处理') || row.statusText.includes('待');
  if (tabKey === 'doing') return row.status === 'doing' || row.statusText.includes('处理中');
  if (tabKey === 'closed') return row.status === 'closed' || row.statusText.includes('已关闭') || row.statusText.includes('已消');
  return true;
}

export function IotLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c9LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [statusTab, setStatusTab] = useState('all');
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
    if (action === 'import' || action === 'from-template') setToast('已打开导入');
    else if (action === 'export') setToast('已打开导出');
    else setToast(`已打开：${action}`);
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  useEffect(() => {
    setStatusTab('all');
    setQ('');
  }, [leafKey]);

  const { items, fromFixture } = useMemo(() => {
    if (!leaf) return { items: [] as FixtureRow[], fromFixture: true };
    if (leaf.layout === 'v1-settings') {
      return { items: FIXTURES[leaf.key] ?? [], fromFixture: true };
    }
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyFixture = !(remote.data?.items?.length);
    const rows = reallyFixture ? (FIXTURES[leaf.key] ?? apiItems) : apiItems;
    return { items: rows, fromFixture: reallyFixture };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    let rows = items;
    if (leaf?.layout === 'v3-status-tabs') {
      rows = rows.filter((r) => matchStatusTab(r, statusTab));
    }
    const needle = q.trim();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [
        row.code, row.name, row.gateway, row.workshop, row.line, row.kind,
        row.scene, row.point, row.device, row.deviceCode, row.location, row.level,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, leaf, statusTab, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c9-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知物联叶子</h2>
        <p className="ms-leaf-note">key={leafKey}</p>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    if (item.key === 'import' || item.key === 'from-template') {
      setToast('已打开导入');
      return;
    }
    if (item.key === 'export') {
      setToast('已打开导出');
      return;
    }
    setToast(`已打开：${item.label}`);
  }

  function onSettingOpen(row: FixtureRow) {
    setToast(`已打开：${row.name}`);
  }

  return (
    <div
      className="c9-leaf"
      data-testid="c9-iot-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
      data-fixture={fromFixture ? '1' : '0'}
      data-temp={leaf.tempSkin ? '1' : '0'}
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
      {toast && <div className="c9-toast" data-testid="c9-toast">{toast}</div>}

      {leaf.key === 'iot-scene' && (
        <div className="c9-hero" data-testid="c9-scene-hero">
          <strong>万物互联 · 智控生产</strong>
          <p>连接设备 · 感知数据 · 驱动决策</p>
          <span className="c9-hero-badge">全面感知 · 实时在线 · 智能联动</span>
        </div>
      )}

      {leaf.key === 'iot-sensor' && (
        <div className="c9-panel-head" data-testid="c9-sensor-head">
          <span className="c9-thumb sm" aria-hidden>感</span>
          <div>
            <strong>传感器监控</strong>
            <p>实时监控测点数据与状态</p>
          </div>
        </div>
      )}

      {leaf.layout === 'v3-status-tabs' && leaf.statusTabs && (
        <div className="c9-tabs underline" data-testid="c9-status-tabs" role="tablist">
          {leaf.statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`c9-tab ${statusTab === tab.key ? 'is-on' : ''}`}
              aria-selected={statusTab === tab.key}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {leaf.key === 'iot-alarm' && (
        <div className="c9-section-title" data-testid="c9-alarm-count">
          <i />
          报警列表 ({filtered.length})
        </div>
      )}

      <div className={`c9-list ${leaf.layout === 'v1-settings' ? 'is-sparse' : ''}`} data-testid="c9-list">
        {filtered.map((row) => renderC9Card(leaf.layout, leaf.key, row, () => onSettingOpen(row)))}
        {!filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
    </div>
  );
}
