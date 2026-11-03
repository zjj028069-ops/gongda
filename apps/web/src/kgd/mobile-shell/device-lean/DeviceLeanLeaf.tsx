import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c6LeafByKey, msUpstreamUrl, type C6LeafDef } from './c6Registry';
import { renderC6Card, StationBoard } from './Cards';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES, type FixtureRow } from './fixtures';

function listPath(leaf: C6LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

function matchStatusTab(row: FixtureRow, tabKey: string, leafKey: string) {
  if (tabKey === 'all') return true;
  if (leafKey === 'pi-record') {
    if (tabKey === 'ok') return row.status === 'ok' || row.statusText.includes('正常');
    if (tabKey === 'bad') return row.status === 'bad' || row.statusText.includes('异常');
    if (tabKey === 'pending') return row.status === 'pending' || row.statusText.includes('待审');
  }
  if (leafKey === 'repair-order') {
    if (tabKey === 'wait') return row.status === 'wait' || row.statusText.includes('待修');
    if (tabKey === 'doing') return row.status === 'doing' || row.statusText.includes('维修中');
    if (tabKey === 'done') return row.status === 'done' || row.status === 'ok' || row.statusText.includes('已完成');
  }
  if (leafKey === 'device-qr') {
    if (tabKey === 'bound') return row.status === 'bound' || row.statusText.includes('已绑定');
    if (tabKey === 'unbound') return row.status === 'unbound' || row.statusText.includes('未绑定');
    if (tabKey === 'printed') return row.status === 'printed' || row.statusText.includes('已打印');
  }
  return true;
}

export function DeviceLeanLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c6LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [statusTab, setStatusTab] = useState('all');
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
    if (action === 'scan') setToast('已打开扫码');
    else if (action === 'import') setToast('已打开批量导入');
    else if (action === 'print') setToast('已打开批量打印');
    else if (action === 'claim') setToast('已认领任务');
    else if (action === 'dispatch' || action === 'from-plan') setToast('已从维保计划派工');
    else if (action === 'from-report') setToast('已转入维修工单');
    else if (action === 'from-template' || action === 'from-lib') setToast('已从标准库选择');
    else if (action === 'copy') setToast('已复制点检计划');
    else if (action === 'split') setToast('已拆分明细');
    else if (params.get('upstream') || params.get('linked')) {
      const linked = params.get('linked');
      setToast(linked ? `已选上游：${linked}` : `已选上游，进入${leaf.title}`);
    } else {
      setToast(`已执行：${action}`);
    }
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    next.delete('linked');
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
    if (leaf.layout === 'v1-station') {
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
      rows = rows.filter((r) => matchStatusTab(r, statusTab, leaf.key));
    }
    const needle = q.trim();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [
        row.code, row.name, row.device, row.deviceCode, row.owner, row.workshop,
        row.area, row.issue, row.subject, row.meeting, row.note, row.model,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, leaf, statusTab, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c6-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知设备维保/精益叶子</h2>
        <p className="ms-leaf-note">key={leafKey}</p>
      </div>
    );
  }

  function onPlusPick(item: PlusItem) {
    const up = leaf!.plusUpstream?.[item.key];
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    if (item.key === 'scan') {
      setToast('已打开扫码');
      return;
    }
    if (item.key === 'import') {
      setToast('已打开批量导入');
      return;
    }
    if (item.key === 'print') {
      setToast('已打开批量打印');
      return;
    }
    if (item.key === 'claim') {
      setToast('已认领任务');
      return;
    }
    setToast(`已打开：${item.label}`);
  }

  const groupedSettings = leaf.layout === 'v1-settings'
    ? Object.entries(
      filtered.reduce<Record<string, FixtureRow[]>>((acc, row) => {
        const g = row.group || '设置';
        (acc[g] ||= []).push(row);
        return acc;
      }, {}),
    )
    : [];

  return (
    <div
      className="c6-leaf"
      data-testid="c6-device-lean-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
      data-fixture={fromFixture ? '1' : '0'}
      data-temp={leaf.tempSkin ? '1' : '0'}
      data-locked={leaf.locked ? '1' : '0'}
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
      {toast && <div className="c6-toast" data-testid="c6-toast">{toast}</div>}
      {leaf.upstream && (
        <button
          type="button"
          className="c6-upstream-entry"
          data-testid="c6-upstream-entry"
          onClick={() => navigate(msUpstreamUrl(leaf))}
        >
          上游：{leaf.upstream.title} →
        </button>
      )}

      {leaf.layout === 'v3-status-tabs' && leaf.statusTabs && (
        <div className="c6-tabs underline" data-testid="c6-status-tabs" role="tablist">
          {leaf.statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`c6-tab ${statusTab === tab.key ? 'is-on' : ''}`}
              aria-selected={statusTab === tab.key}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {leaf.key === 'maint-break' && (
        <div className="c6-hero" data-testid="c6-break-hero">
          <span className="c6-hero-ico" aria-hidden>✓</span>
          <div>
            <strong>维保明细</strong>
            <p>设备维护保养记录明细查询</p>
            <small>· 标准符合性验证与实测判定</small>
          </div>
        </div>
      )}

      {leaf.key === 'lean-patrol' && (
        <div className="c6-summary" data-testid="c6-patrol-summary">
          <div>
            <strong>巡查点概览</strong>
            <span>今日已完成巡查</span>
          </div>
          <div className="c6-summary-num">
            <strong>{filtered.length || 12}</strong>
            <span>巡查点总数</span>
          </div>
        </div>
      )}

      {leaf.key === 'maint-content' && (
        <div className="c6-action-bar" data-testid="c6-content-actions">
          <button type="button" className="c6-action-main" onClick={() => onPlusPick({ key: 'blank', label: '新增内容' })}>
            ＋ 新增内容
          </button>
          <span className="c6-action-sep">|</span>
          <button type="button" className="c6-action-side" onClick={() => onPlusPick({ key: 'from-lib', label: '从标准库选' })}>
            从标准库选
          </button>
        </div>
      )}

      {leaf.layout === 'v1-station' && <StationBoard rows={filtered} />}

      {leaf.layout === 'v1-settings' && (
        <div className="c6-list" data-testid="c6-list">
          {groupedSettings.map(([group, rows]) => (
            <div key={group}>
              <div className="c6-group-title">{group}</div>
              {rows.map((row) => renderC6Card(leaf.layout, leaf.key, row))}
            </div>
          ))}
        </div>
      )}

      {leaf.layout !== 'v1-settings' && leaf.layout !== 'v1-station' && (
        <div className={`c6-list ${leaf.key === 'maint-task' || leaf.key === 'device-archive' ? 'is-table' : ''}`} data-testid="c6-list">
          {(leaf.key === 'maint-task' || leaf.key === 'device-archive') && (
            <div className="c6-table-head" data-testid="c6-table-head">
              {leaf.key === 'maint-task' && (
                <>
                  <span>任务号</span><span>设备</span><span>计划</span><span>执行人</span><span>截止</span><span>状态</span>
                </>
              )}
              {leaf.key === 'device-archive' && (
                <>
                  <span>编号</span><span>名称</span><span>型号</span><span>车间</span><span>负责人</span><span>状态</span>
                </>
              )}
            </div>
          )}
          {filtered.map((row) => renderC6Card(leaf.layout, leaf.key, row))}
          {!filtered.length && <div className="ms-empty">无匹配记录</div>}
        </div>
      )}

    </div>
  );
}
