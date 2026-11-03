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
  if (tabKey === 'online') return row.status === 'online' || row.statusText.includes('在线');
  if (tabKey === 'offline') return row.status === 'offline' || row.statusText.includes('离线');
  if (tabKey === 'alarm') {
    return row.status === 'alarm' || row.statusText.includes('告警') || row.statusText.includes('报警');
  }
  return true;
}

function sensorSectionLabel(tabKey: string) {
  if (tabKey === 'online') return '在线传感器';
  if (tabKey === 'offline') return '离线传感器';
  if (tabKey === 'alarm') return '告警传感器';
  return '全部传感器';
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
    if (leaf.layout === 'v5-switch-rows') {
      return { items: FIXTURES[leaf.key] ?? [], fromFixture: true };
    }
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyFixture = !(remote.data?.items?.length);
    const rows = reallyFixture ? (FIXTURES[leaf.key] ?? apiItems) : apiItems;
    return { items: rows, fromFixture: reallyFixture };
  }, [leaf, remote.data]);

  useEffect(() => {
    if (!leaf || leaf.layout !== 'v5-switch-rows') return;
    const next: Record<string, boolean> = {};
    for (const row of items) next[row.id] = !!row.settingOn;
    setSwitchMap(next);
  }, [leaf, items]);

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
        row.settingDesc,
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

  function onSwitch(row: FixtureRow) {
    setSwitchMap((prev) => {
      const nextOn = !(prev[row.id] ?? !!row.settingOn);
      setToast(nextOn ? `已开启：${row.name}` : `已关闭：${row.name}`);
      return { ...prev, [row.id]: nextOn };
    });
  }

  return (
    <div
      className="c9-leaf"
      data-testid="c9-iot-leaf"
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
      {toast && <div className="c9-toast" data-testid="c9-toast">{toast}</div>}

      {leaf.key === 'iot-scene' && (
        <div className="c9-hero" data-testid="c9-scene-hero">
          <strong>万物互联 · 智控生产</strong>
          <p>连接设备 · 感知数据 · 驱动决策</p>
          <span className="c9-hero-badge">全面感知 · 实时在线 · 智能联动</span>
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

      {leaf.key === 'iot-sensor' && (
        <div className="c9-list-meta" data-testid="c9-sensor-meta">
          <span className="c9-section-title tight">
            <i />
            {sensorSectionLabel(statusTab)} ({filtered.length})
          </span>
          <span className="c9-sort">默认排序 ▾</span>
        </div>
      )}

      {leaf.key === 'iot-alarm' && (
        <div className="c9-section-title" data-testid="c9-alarm-count">
          <i />
          报警列表 ({filtered.length})
        </div>
      )}

      {leaf.layout === 'v5-switch-rows' ? (
        <div className="c9-switch-panel" data-testid="c9-list">
          {filtered.map((row) => renderC9Card(leaf.layout, leaf.key, row, {
            switchOn: switchMap[row.id] ?? !!row.settingOn,
            onSwitch: () => onSwitch(row),
          }))}
          {!filtered.length && <div className="ms-empty">无匹配记录</div>}
        </div>
      ) : (
        <div className="c9-list" data-testid="c9-list">
          {filtered.map((row) => renderC9Card(leaf.layout, leaf.key, row))}
          {!filtered.length && <div className="ms-empty">无匹配记录</div>}
        </div>
      )}

      {leaf.key === 'iot-sensor' && (
        <div className="c9-tip" data-testid="c9-sensor-tip">
          <span className="c9-tip-ico" aria-hidden>✓</span>
          <div>
            <strong>数据每10秒更新一次</strong>
            <p>如需查看历史数据或配置设备，请进入详情页</p>
          </div>
        </div>
      )}
    </div>
  );
}
