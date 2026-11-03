import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../../api';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { IconSearch } from '../icons';
import { deeplinkHref } from '../nav';

type MsgRow = {
  id: string;
  kind: string;
  kind_text?: string;
  title?: string;
  body?: string;
  link_path?: string;
  read_at?: string | null;
  read_text?: string;
  created_text?: string;
};

type CenterPayload = {
  categories?: { key: string; name: string; unread?: number }[];
  items?: MsgRow[];
  unread?: number;
};

const KINDS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'alarm', label: '报警' },
  { key: 'todo', label: '待办' },
  { key: 'notice', label: '通知' },
];

function kindDotColor(kind: string) {
  if (kind === 'alarm') return '#f5222d';
  if (kind === 'todo') return '#fa8c16';
  if (kind === 'notice') return '#4184F4';
  return '#4184F4';
}

function shortTime(text?: string) {
  if (!text) return '';
  // API: YYYY-MM-DD HH:mm:ss → MM-DD HH:mm
  const m = String(text).match(/(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);
  if (m) return `${m[1]}-${m[2]} ${m[3]}`;
  return String(text).slice(5, 16);
}

/**
 * 阶段 C0 · 消息中心·消息列表（版5 极简）
 * 路由：/ms/message/list（功能栏叶子；壳「消息」Tab 仍为会话列表，互不吞并）
 * 本页无「新增消息」；顶栏仅工具（搜索 / 筛选）。
 */
export function MobileMessageListPage() {
  const navigate = useNavigate();
  const { revision, onExpired, onChanged, session } = useKgd();
  const [kind, setKind] = useState('all');
  const [read, setRead] = useState<'unread' | 'read' | 'all'>('unread');
  const [readMenu, setReadMenu] = useState(false);
  const [q, setQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams({ category: 'all', kind, read });
    return p.toString();
  }, [kind, read]);

  const remote = useRemote<CenterPayload>(`/api/messages/center?${query}`, revision, onExpired);
  const items = useMemo(() => {
    const list = remote.data?.items ?? [];
    const needle = q.trim();
    if (!needle) return list;
    return list.filter((item) => `${item.title ?? ''}${item.body ?? ''}`.includes(needle));
  }, [remote.data, q]);

  const unread = remote.data?.unread ?? 0;
  const readLabel = read === 'unread' ? '未读' : read === 'read' ? '已读' : '全部状态';

  async function markAllRead() {
    try {
      await apiRequest('/api/system/messages/read-all', {
        method: 'POST',
        body: {},
        csrfToken: session.csrf_token,
      });
      onChanged();
    } catch {
      /* 保持静默；列表会在 revision 刷新后对齐 */
    }
  }

  async function openMessage(item: MsgRow) {
    if (!item.read_at) {
      try {
        await apiRequest(`/api/system/messages/${item.id}/read`, {
          method: 'POST',
          body: {},
          csrfToken: session.csrf_token,
        });
        onChanged();
      } catch {
        /* 深链仍继续 */
      }
    }
    navigate(
      deeplinkHref({
        id: item.id,
        title: item.title || item.body || '消息详情',
        path: item.link_path || '',
        body: item.body || '',
      }),
    );
  }

  return (
    <div className="ms-msglist" data-testid="ms-message-list">
      <header className="ms-msglist-top">
        <button type="button" className="ms-back" onClick={() => navigate('/ms/functions')}>
          ‹ 返回
        </button>
        <h1 className="ms-msglist-title">
          消息列表
          {unread > 0 && <i className="ms-badge ms-msglist-badge">{unread > 99 ? '99+' : unread}</i>}
        </h1>
        <div className="ms-msglist-tools">
          <button
            type="button"
            className="ms-icon-btn"
            aria-label="筛选消息"
            aria-expanded={showSearch}
            onClick={() => setShowSearch((v) => !v)}
          >
            <IconSearch />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="ms-msglist-search">
          <input
            type="search"
            placeholder="搜索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="消息列表搜索"
          />
        </div>
      )}

      <div className="ms-msglist-tabs" role="tablist" aria-label="消息类型">
        {KINDS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={kind === tab.key}
            className={`ms-msglist-tab ${kind === tab.key ? 'is-on' : ''}`}
            data-testid={`ms-msg-kind-${tab.key}`}
            onClick={() => setKind(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <div className="ms-msglist-read-wrap">
          <button
            type="button"
            className="ms-msglist-read"
            data-testid="ms-msg-read-filter"
            aria-expanded={readMenu}
            onClick={() => setReadMenu((v) => !v)}
          >
            {readLabel}
            <span aria-hidden>▾</span>
          </button>
          {readMenu && (
            <div className="ms-msglist-read-menu" role="menu">
              {([
                ['unread', '未读'],
                ['read', '已读'],
                ['all', '全部'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  className={read === value ? 'is-on' : ''}
                  onClick={() => {
                    setRead(value);
                    setReadMenu(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ul className="ms-msglist-body">
        {items.map((item) => {
          const unreadDot = !item.read_at;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="ms-msg-row"
                data-testid={`ms-msg-row-${item.id}`}
                onClick={() => void openMessage(item)}
              >
                <span className="ms-msg-dots" aria-hidden>
                  <i className="ms-msg-kind-dot" style={{ background: kindDotColor(item.kind) }} />
                  {unreadDot && <i className="ms-msg-unread-dot" />}
                </span>
                <span className="ms-msg-main">
                  <span className="ms-msg-title">{item.title || item.body || '（无标题）'}</span>
                  {item.body && item.title ? <span className="ms-msg-body">{item.body}</span> : null}
                </span>
                <span className="ms-msg-time">{shortTime(item.created_text)}</span>
              </button>
            </li>
          );
        })}
        {!items.length && <li className="ms-empty">暂无消息</li>}
      </ul>

      <p className="ms-msglist-retain">消息仅保留三个月</p>

      <footer className="ms-msglist-foot">
        <button type="button" className="ms-btn" data-testid="ms-msg-back-wb" onClick={() => navigate('/ms/staging/area')}>
          返回工作台
        </button>
        <button type="button" className="ms-btn primary" data-testid="ms-msg-read-all" onClick={() => void markAllRead()}>
          全部标已读
        </button>
      </footer>
    </div>
  );
}
