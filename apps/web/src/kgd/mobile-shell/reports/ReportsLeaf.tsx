import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { c7LeafByKey, type C7LeafDef } from './c7Registry';
import { renderC7Card } from './Cards';
import { C7_FIXTURES, type C7Row } from './fixtures';
import { LeafChrome } from './LeafChrome';
import { mapApiItems } from './mapApi';
import { screenViewerUrl } from './ScreenViewer';

const PERIODS = ['今天', '本周', '本月', '本季度', '本年'] as const;

function listPath(leaf: C7LeafDef, period: string) {
  if (!leaf.listUrl) return null;
  const base = leaf.listQuery
    ? (leaf.listUrl.includes('?') ? `${leaf.listUrl}&${leaf.listQuery}` : `${leaf.listUrl}?${leaf.listQuery}`)
    : leaf.listUrl;
  if (!leaf.periodChips) return base;
  const u = new URL(base, 'http://local');
  u.searchParams.set('period', period);
  return `${u.pathname}?${u.searchParams.toString()}`;
}

export function ReportsLeaf({ leafKey }: { leafKey: string }) {
  const leaf = c7LeafByKey(leafKey);
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<string>('本月');
  const [toast, setToast] = useState('');

  const url = leaf ? listPath(leaf, period) : null;
  const remote = useRemote<{ items?: Record<string, unknown>[]; views?: unknown[]; message?: string }>(url, revision, onExpired);

  const { items, fromFixture } = useMemo(() => {
    if (!leaf) return { items: [] as C7Row[], fromFixture: true };
    const apiItems = mapApiItems(leaf, remote.data?.items ?? []);
    // purchase-statement 可能只回 views/message，无 items
    const usedFixture = !apiItems.length;
    const list = usedFixture ? (C7_FIXTURES[leaf.key] ?? []) : apiItems;
    return { items: list, fromFixture: usedFixture };
  }, [leaf, remote.data]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return items;
    return items.filter((row) => (row.blob || [row.title, row.code, row.partner, row.subtitle].join(' ')).includes(needle));
  }, [items, q]);

  if (!leaf) {
    return (
      <div className="ms-leaf" data-testid="c7-leaf-miss">
        <button type="button" className="ms-back" onClick={() => navigate(-1)}>‹ 返回</button>
        <h2>未知报表</h2>
      </div>
    );
  }

  function onOpenScreen(row: C7Row) {
    if (!row.screenId) {
      setToast('暂时无法打开大屏');
      window.setTimeout(() => setToast(''), 2000);
      return;
    }
    // 夹具 id 无真实大屏：外链仍可走，iframe 可能空白；给出产品话术
    if (String(row.screenId).startsWith('fixture-')) {
      setToast('大屏配置暂不可用，请稍后重试');
      window.setTimeout(() => setToast(''), 2000);
    }
    navigate(screenViewerUrl(row));
  }

  function onWriteAttempt() {
    setToast('当前仅支持查询查看');
    window.setTimeout(() => setToast(''), 2000);
  }

  return (
    <div
      className="c7-leaf"
      data-testid="c7-reports-leaf"
      data-key={leaf.key}
      data-layout={leaf.layout}
      data-kind={leaf.kind}
      data-fixture={fromFixture ? '1' : '0'}
    >
      <LeafChrome
        title={leaf.title}
        onBack={() => navigate('/ms/functions')}
        onSearch={() => setSearching(true)}
        plusItems={null}
        searching={searching}
        searchHint={leaf.searchHint}
        searchValue={q}
        onSearchChange={setQ}
        onSearchClose={() => setSearching(false)}
      />
      {toast && <div className="c7-toast" data-testid="c7-toast">{toast}</div>}
      {leaf.periodChips && (
        <div className="c7-periods" data-testid="c7-periods" role="tablist" aria-label="时间范围">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`c7-period ${period === p ? 'is-on' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="c7-list" data-testid="c7-list">
        {filtered.map((row) => renderC7Card(leaf.layout, row, onOpenScreen))}
        {!filtered.length && (
          <div className="ms-empty" data-testid="c7-empty">
            暂无数据
            {leaf.kind !== 'screen' && (
              <button type="button" className="c7-quiet-btn" onClick={onWriteAttempt}>刷新试试</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
