import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { IconChevron, IconSearch } from '../icons';
import { leafPath } from '../nav';

type TodoItem = { key: string; name: string; count: number; link?: string };
type Summary = {
  todos?: { customer?: TodoItem[]; equip?: TodoItem[] };
};
type ProgressList = { counts?: { overdue?: string | number } };

const TODO_LINKS: Record<string, string> = {
  pending_contracts: '/customer_contract/list?chip.approval=pending',
  pending_invoices: '/customer_invoice/list?chip.status=pending',
  overdue_work_orders: '/inside_produce_bill/list?chip.overdue=yes',
};

const SHORTCUTS: { key: string; label: string; to: string; kind: 'leaf' | 'external'; icon: 'contract' | 'wo' | 'report' | 'cash' }[] = [
  { key: 'contract_add', label: '新增合同', to: '/customer_contract/list?add=1', kind: 'leaf', icon: 'contract' },
  { key: 'work_order_add', label: '创建加工单', to: '/inside_produce_bill/add?mode=direct', kind: 'leaf', icon: 'wo' },
  { key: 'report', label: '报工', to: '/m/report', kind: 'external', icon: 'report' },
  { key: 'cash', label: '收款', to: '/customer_financier/list', kind: 'leaf', icon: 'cash' },
];

function ShortcutGlyph({ kind }: { kind: (typeof SHORTCUTS)[number]['icon'] }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'contract') {
    return (
      <svg {...common}>
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
      </svg>
    );
  }
  if (kind === 'wo') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="M7 15.5 10.2 11l2.6 3.2L16.5 9" />
      </svg>
    );
  }
  if (kind === 'report') {
    return (
      <svg {...common}>
        <path d="M7 7.5h10v11H7z" />
        <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
        <circle cx="12" cy="13" r="1.4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4.5 8.5h15v9.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V8.5z" />
      <path d="M8 8.5V7a4 4 0 0 1 8 0v1.5" />
      <path d="M4.5 12h15" />
    </svg>
  );
}

/**
 * 阶段 C0 · 手机工作台（版5 今日要点）
 * 路由：/ms/staging/area（功能栏叶子；兼容任务书 /m/staging/area → 重定向）
 */
export function MobileWorkbenchPage() {
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const summary = useRemote<Summary>('/api/workplace/summary', revision, onExpired);
  const wo = useRemote<ProgressList>('/api/progress/work-orders?page=1&page_size=1', revision, onExpired);

  const points = useMemo(() => {
    const customer = summary.data?.todos?.customer ?? [];
    const byKey = Object.fromEntries(customer.map((item) => [item.key, item]));
    const overdue = Number(wo.data?.counts?.overdue ?? 0);
    return [
      {
        key: 'pending_contracts',
        name: '待审合同',
        count: Number(byKey.pending_contracts?.count ?? 0),
        path: TODO_LINKS.pending_contracts,
      },
      {
        key: 'pending_invoices',
        name: '待开票',
        count: Number(byKey.pending_invoices?.count ?? 0),
        path: TODO_LINKS.pending_invoices,
      },
      {
        key: 'overdue_work_orders',
        name: '逾期加工单',
        count: overdue,
        path: TODO_LINKS.overdue_work_orders,
      },
    ];
  }, [summary.data, wo.data]);

  function openPcPath(title: string, path: string, key: string) {
    navigate(leafPath({ key, title, path, l1: 'workplace' }));
  }

  function onShortcut(item: (typeof SHORTCUTS)[number]) {
    if (item.kind === 'external') {
      navigate(item.to);
      return;
    }
    openPcPath(item.label, item.to, item.key);
  }

  return (
    <div className="ms-wb" data-testid="ms-workbench">
      <header className="ms-wb-top">
        <button type="button" className="ms-back" onClick={() => navigate('/ms/functions')}>
          ‹ 返回
        </button>
        <h1 className="ms-wb-brand">赛德瑞克MES</h1>
        <button
          type="button"
          className="ms-icon-btn"
          aria-label="工作台搜索"
          onClick={() => navigate('/ms/search/functions')}
        >
          <IconSearch style={{ color: '#4184F4' }} />
        </button>
      </header>

      <section className="ms-wb-card" aria-label="今日要点">
        <h2 className="ms-wb-card-title">今日要点</h2>
        <ul className="ms-wb-points">
          {points.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className="ms-wb-point"
                data-testid={`ms-wb-point-${item.key}`}
                onClick={() => openPcPath(item.name, item.path, item.key)}
              >
                <span>{item.name}</span>
                <span className="ms-wb-point-right">
                  <em>{item.count}</em>
                  <IconChevron className="ms-chevron" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ms-wb-card" aria-label="快捷">
        <h2 className="ms-wb-card-title">快捷</h2>
        <div className="ms-wb-grid">
          {SHORTCUTS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="ms-wb-tile"
              data-testid={`ms-wb-shortcut-${item.key}`}
              onClick={() => onShortcut(item)}
            >
              <span className="ms-wb-tile-icon">
                <ShortcutGlyph kind={item.icon} />
              </span>
              <span className="ms-wb-tile-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
