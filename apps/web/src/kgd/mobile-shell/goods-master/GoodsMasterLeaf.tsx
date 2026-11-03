import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import type { PlusItem } from '../types';
import { c5LeafByKey, msUpstreamUrl, type C5LeafDef } from './c5Registry';
import { renderC5Card } from './Cards';
import { CreateForm } from './CreateForm';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { FIXTURES, type FixtureRow } from './fixtures';

const CATEGORY_TABS = ['全部', '成品', '半成品', '原材料'] as const;
const STATUS_TABS = ['全部', '启用', '停用'] as const;

function listPath(leaf: C5LeafDef) {
  if (!leaf.listUrl) return null;
  if (!leaf.listQuery) return leaf.listUrl;
  return leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`;
}

function matchCategory(row: FixtureRow, tab: string) {
  if (tab === '全部') return true;
  return (row.category || '').includes(tab);
}

function matchStatus(row: FixtureRow, tab: string) {
  if (tab === '全部') return true;
  if (tab === '启用') return row.status === 'enabled' || row.status === 'running';
  return row.status === 'disabled' || row.status === 'idle' || row.status === 'maintain';
}

export function GoodsMasterLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c5LeafByKey(leafKey);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false);
  const [linkedGoods, setLinkedGoods] = useState('');
  const [categoryTab, setCategoryTab] = useState<(typeof CATEGORY_TABS)[number]>('全部');
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>('全部');
  const [processTab, setProcessTab] = useState<(typeof STATUS_TABS)[number]>('全部');
  const [goodsFilter, setGoodsFilter] = useState<string | null>(null);
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
    if (action === 'create' || (action === 'blank' && leaf.createForm)) {
      setCreating(true);
      setLinkedGoods(params.get('linked') || '');
    } else if (action === 'scan') {
      setToast('扫码新增入口已打开（皮）· 摄像头后续');
    } else if (action === 'import') {
      setToast('批量导入入口已打开（皮）');
    } else if (action === 'from-template') {
      setToast('从模板导入工序（皮）');
    } else if (action === 'from-person') {
      setToast('从人员派岗（皮）');
    } else if (action === 'from-goods') {
      setToast('从商品复制路线（皮）');
    } else if (action === 'bind-process') {
      setToast('从工序绑定附加组件（皮）');
    } else if (params.get('upstream')) {
      setToast(`上游已选，进入${leaf.title}（皮）`);
    } else {
      setToast(`${action} · 业务写回后续（皮）`);
    }
    const next = new URLSearchParams(params);
    next.delete('action');
    next.delete('upstream');
    next.delete('linked');
    setParams(next, { replace: true });
  }, [leaf, params, setParams]);

  const { items, fromFixture } = useMemo(() => {
    if (!leaf) return { items: [] as FixtureRow[], fromFixture: true };
    if (leaf.layout === 'v1-settings') {
      return { items: FIXTURES[leaf.key] ?? [], fromFixture: true };
    }
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    const reallyFixture = !(remote.data?.items?.length);
    let rows = reallyFixture ? (FIXTURES[leaf.key] ?? apiItems) : apiItems;
    // 工艺路线：API 若无 steps，用夹具步骤链补齐展示（皮），禁止只写工序数
    if (leaf.key === 'route') {
      const fixtureByCode = new Map((FIXTURES.route || []).map((r) => [r.code, r]));
      rows = rows.map((row) => {
        if (row.steps?.length) return row;
        const fix = fixtureByCode.get(row.code) || FIXTURES.route?.[0];
        return fix?.steps?.length ? { ...row, steps: fix.steps } : {
          ...row,
          steps: [
            { name: '下料' }, { name: '粗车' }, { name: '精车' }, { name: '热处理' }, { name: '检验' },
          ],
        };
      });
    }
    return { items: rows, fromFixture: reallyFixture };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    let rows = items;
    if (leaf?.layout === 'v3-category-tabs') rows = rows.filter((r) => matchCategory(r, categoryTab));
    if (leaf?.layout === 'v3-status-tabs') rows = rows.filter((r) => matchStatus(r, statusTab));
    if (leaf?.key === 'process') rows = rows.filter((r) => matchStatus(r, processTab));
    if (goodsFilter === 'stock') rows = rows.filter((r) => (r.stock ?? 0) > 0);
    if (goodsFilter === 'alarm') rows = rows.filter((r) => r.stock != null && r.stockMin != null && r.stock < r.stockMin);
    if (goodsFilter === 'stale') rows = rows.filter((r) => (r.stagnantDays ?? 0) >= 90 || r.name.includes('尼龙'));
    const needle = q.trim();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [
        row.code, row.name, row.spec, row.category, row.product, row.workshop,
        row.processName, row.bindProcess, row.location, row.tasks, row.staff,
      ].filter(Boolean).join(' ');
      return blob.includes(needle);
    });
  }, [items, leaf, categoryTab, statusTab, processTab, goodsFilter, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c5-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知生产资料叶子</h2>
        <p className="ms-leaf-note">key={leafKey}</p>
      </div>
    );
  }

  if (creating && leaf.createForm) {
    return (
      <CreateForm
        kind={leaf.key === 'bom' ? 'bom' : 'goods'}
        title={leaf.key === 'bom' ? '新增BOM' : '新增商品'}
        linkedGoods={linkedGoods}
        onCancel={() => setCreating(false)}
        onSave={() => {
          setCreating(false);
          setToast('已保存（皮提示 · 本波不接满落库写回）');
        }}
      />
    );
  }

  function onPlusPick(item: PlusItem) {
    if (item.key === 'blank' && leaf!.createForm) {
      if (leaf!.key === 'bom' && leaf!.plusUpstream?.blank) {
        navigate(msUpstreamUrl(leaf!, leaf!.plusUpstream.blank));
        return;
      }
      setCreating(true);
      return;
    }
    if (item.key === 'scan') {
      setToast('扫码新增入口已打开（皮）· 摄像头后续');
      return;
    }
    const up = leaf!.plusUpstream?.[item.key];
    if (up) {
      navigate(msUpstreamUrl(leaf!, up));
      return;
    }
    setToast(`${item.label} · 业务写回后续（皮）`);
  }

  const machineSummary = leaf.key === 'machine'
    ? {
      total: filtered.length,
      running: filtered.filter((r) => r.status === 'running').length,
      idle: filtered.filter((r) => r.status === 'idle').length,
      maintain: filtered.filter((r) => r.status === 'maintain').length,
    }
    : null;

  const statusCounts = leaf.layout === 'v3-status-tabs'
    ? {
      all: items.length,
      on: items.filter((r) => r.status === 'enabled').length,
      off: items.filter((r) => r.status === 'disabled').length,
    }
    : null;

  return (
    <div
      className="c5-leaf"
      data-testid="c5-goods-leaf"
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
      {toast && <div className="c5-toast" data-testid="c5-toast">{toast}</div>}
      {fromFixture && leaf.layout !== 'v1-settings' && (
        <p className="c5-fixture-hint">同源 API 暂无数据 · 使用夹具展示版型（不改业务语义）</p>
      )}
      {leaf.hardConstraint === 'no-template' && (
        <p className="c5-hard-hint" data-testid="c5-hard-no-template">
          硬约束：＋仅「新增商品｜扫码新增」· 禁止从模板 · 新增直进详情表单
        </p>
      )}
      {leaf.hardConstraint === 'step-chain' && (
        <p className="c5-hard-hint" data-testid="c5-hard-step-chain">
          硬约束：每卡必须画出连成线的工序步骤链，禁止只写工序数
        </p>
      )}

      {leaf.layout === 'v3-category-tabs' && (
        <>
          <div className="c5-tabs" data-testid="c5-category-tabs" role="tablist">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className={`c5-tab ${categoryTab === tab ? 'is-on' : ''}`}
                aria-selected={categoryTab === tab}
                onClick={() => setCategoryTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="c5-search-row">
            <label className="c5-search-box">
              <span aria-hidden>🔍</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={leaf.searchHint}
                aria-label="商品搜索"
              />
            </label>
            <button type="button" className="c5-query-btn">查询</button>
          </div>
          <div className="c5-capsules" data-testid="c5-goods-capsules">
            {[
              { key: 'scan', label: '扫码搜' },
              { key: 'stock', label: '只看有库存' },
              { key: 'stale', label: '呆滞物料' },
              { key: 'alarm', label: '库存报警' },
            ].map((cap) => (
              <button
                key={cap.key}
                type="button"
                className={`c5-capsule ${goodsFilter === cap.key ? 'is-on' : ''}`}
                onClick={() => setGoodsFilter((prev) => (prev === cap.key ? null : cap.key))}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </>
      )}

      {leaf.key === 'bom' && (
        <div className="c5-search-row">
          <label className="c5-search-box">
            <span aria-hidden>🔍</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={leaf.searchHint} aria-label="BOM搜索" />
          </label>
          <button type="button" className="c5-query-btn">查询</button>
        </div>
      )}

      {leaf.key === 'goods-base' && (
        <div className="c5-settings-banner" data-testid="c5-settings-banner">
          <div>
            <strong>基础开关</strong>
            <span>改后记得保存</span>
          </div>
          <button type="button" className="c5-btn-primary sm" onClick={() => setToast('设置已保存（皮）')}>保存</button>
        </div>
      )}

      {leaf.key === 'machine' && machineSummary && (
        <>
          <div className="c5-tip" data-testid="c5-machine-tip">
            提示：管理机台档案，查看运行状态、稼动率与当前工序。
          </div>
          <div className="c5-stat-card" data-testid="c5-machine-stat">
            <div><span>机台总数</span><strong className="is-accent">{machineSummary.total}</strong></div>
            <div><span>运行中</span><strong className="is-ok">{machineSummary.running}</strong></div>
            <div><span>空闲</span><strong>{machineSummary.idle}</strong></div>
            <div><span>维修中</span><strong className="is-warn">{machineSummary.maintain}</strong></div>
          </div>
        </>
      )}

      {leaf.key === 'process' && (
        <>
          <div className="c5-search-row">
            <label className="c5-search-box grow">
              <span aria-hidden>🔍</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={leaf.searchHint} aria-label="工序搜索" />
            </label>
            <button type="button" className="c5-filter-ico" aria-label="筛选">☰</button>
          </div>
          <div className="c5-seg" data-testid="c5-process-tabs" role="tablist">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className={`c5-seg-item ${processTab === tab ? 'is-on' : ''}`}
                onClick={() => setProcessTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </>
      )}

      {leaf.layout === 'v3-status-tabs' && statusCounts && (
        <>
          <div className="c5-tabs underline" data-testid="c5-status-tabs" role="tablist">
            {(
              [
                { tab: '全部' as const, label: `全部(${statusCounts.all})` },
                { tab: '启用' as const, label: `启用(${statusCounts.on})` },
                { tab: '停用' as const, label: `停用(${statusCounts.off})` },
              ]
            ).map((item) => (
              <button
                key={item.tab}
                type="button"
                role="tab"
                className={`c5-tab ${statusTab === item.tab ? 'is-on' : ''}`}
                onClick={() => setStatusTab(item.tab)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {(leaf.key === 'post' || leaf.key === 'extra') && (
            <div className="c5-search-row">
              <label className="c5-search-box grow">
                <span aria-hidden>🔍</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={leaf.searchHint} aria-label="搜索" />
              </label>
            </div>
          )}
        </>
      )}

      <div className={`c5-list ${leaf.key === 'process' ? 'is-minimal' : ''}`} data-testid="c5-list">
        {leaf.key === 'goods-base' && (
          <>
            <div className="c5-group-title">基础开关</div>
            {filtered.filter((r) => r.settingValue === '基础开关').map((row) => renderC5Card(leaf.layout, leaf.key, row))}
            <button type="button" className="c5-btn-primary block" onClick={() => setToast('设置已保存（皮）')}>保存</button>
            <div className="c5-group-title space">商品类别 <small>5 项</small></div>
            <div className="c5-cat-actions">
              <button type="button">+ 新增</button>
              <button type="button">全部展开</button>
              <button type="button">全部折叠</button>
            </div>
            <ul className="c5-cat-list" data-testid="c5-goods-categories">
              {['成品', '半成品', '毛坯', '包材配件', '外协加工'].map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <div>
                    <button type="button">上移</button>
                    <button type="button">下移</button>
                    <button type="button">新增</button>
                    <button type="button">修改</button>
                    <button type="button" className="is-danger">删除</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="c5-group-title space">BOM配比类别 <small>下滚可见</small></div>
            <ul className="c5-cat-list">
              {['成品', '半成品'].map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <div>
                    <button type="button">修改</button>
                    <button type="button" className="is-danger">删除</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {leaf.key !== 'goods-base' && filtered.map((row) => renderC5Card(leaf.layout, leaf.key, row))}
        {leaf.key !== 'goods-base' && !filtered.length && <div className="ms-empty">无匹配记录</div>}
      </div>
      <p className="c5-leaf-foot">
        PC path：{leaf.pcPath} · 定版 {leaf.layout}
        {leaf.plus === null ? ' · 无＋' : ''}
        {' · C5 生产资料皮'}
      </p>
    </div>
  );
}
