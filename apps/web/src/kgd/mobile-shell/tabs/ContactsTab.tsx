import { useMemo, useState } from 'react';
import { IconChevron } from '../icons';
import { useKgd } from '../../context';
import { useRemote } from '../../../masterTools';

type Category = 'user' | 'customer' | 'supplier' | 'sea';

const CATEGORIES: { id: Category; label: string; glyph: string; color: string; subtitle: string }[] = [
  { id: 'user', label: '用户', glyph: '用', color: '#4184F4', subtitle: '用户 · 内部同事' },
  { id: 'customer', label: '客户', glyph: '客', color: '#34A853', subtitle: '客户 · 客商档案' },
  { id: 'supplier', label: '供应商', glyph: '供', color: '#F5A623', subtitle: '供应商 · 采购往来' },
  { id: 'sea', label: '公海', glyph: '海', color: '#8B6BC9', subtitle: '公海 · 待领用' },
];

type Person = { id: string; name: string; meta: string; color: string; tag: string };

const FALLBACK_USERS: Person[] = [
  { id: 'u1', name: '张工', meta: '生产一部 · 生产工 · 尾号 6688', color: '#4184F4', tag: '用户' },
  { id: 'u2', name: '文员小李', meta: '销售部 · 文员 · 负责客户跟单', color: '#34A853', tag: '用户' },
  { id: 'u3', name: '王班长', meta: '一车间 · 班长', color: '#8B6BC9', tag: '用户' },
  { id: 'u4', name: '采购小陈', meta: '采购部 · 采购', color: '#2AA8A0', tag: '用户' },
];

const FALLBACK_CUSTOMERS: Person[] = [
  { id: 'c1', name: '华东精密', meta: '客户 · 跟进中', color: '#34A853', tag: '客户' },
  { id: 'c2', name: '南方机电', meta: '客户 · 合同进行中', color: '#4184F4', tag: '客户' },
];

const FALLBACK_SUPPLIERS: Person[] = [
  { id: 's1', name: '宏达钢材', meta: '供应商 · 原料', color: '#F5A623', tag: '供应商' },
];

const FALLBACK_SEA: Person[] = [
  { id: 'sea1', name: '待领公海线索 A', meta: '公海 · 未分配', color: '#8B6BC9', tag: '公海' },
];

export function ContactsTab() {
  const [cat, setCat] = useState<Category>('user');
  const { revision, onExpired } = useKgd();
  const users = useRemote<{ items?: { id: string; display_name?: string; name?: string; department_name?: string; role_name?: string }[] }>(
    cat === 'user' ? '/api/system/users?page=1&page_size=20' : null,
    revision,
    onExpired,
  );
  const customers = useRemote<{ items?: { id: string; name?: string; short_name?: string; follow_status?: string }[] }>(
    cat === 'customer' ? '/api/customers?page=1&page_size=20' : null,
    revision,
    onExpired,
  );

  const people = useMemo(() => {
    if (cat === 'user') {
      const rows = users.data?.items;
      if (rows?.length) {
        return rows.slice(0, 30).map((row, index) => ({
          id: String(row.id),
          name: row.display_name || row.name || '用户',
          meta: [row.department_name, row.role_name].filter(Boolean).join(' · ') || '内部同事',
          color: ['#4184F4', '#34A853', '#8B6BC9', '#2AA8A0', '#E85D4C'][index % 5]!,
          tag: '用户',
        }));
      }
      return FALLBACK_USERS;
    }
    if (cat === 'customer') {
      const rows = customers.data?.items;
      if (rows?.length) {
        return rows.slice(0, 30).map((row, index) => ({
          id: String(row.id),
          name: row.name || row.short_name || '客户',
          meta: row.follow_status ? `客户 · ${row.follow_status}` : '客户档案',
          color: ['#34A853', '#4184F4', '#2AA8A0'][index % 3]!,
          tag: '客户',
        }));
      }
      return FALLBACK_CUSTOMERS;
    }
    if (cat === 'supplier') return FALLBACK_SUPPLIERS;
    return FALLBACK_SEA;
  }, [cat, users.data, customers.data]);

  const current = CATEGORIES.find((item) => item.id === cat)!;

  return (
    <div className="ms-contacts" data-testid="ms-contacts">
      <div className="ms-cat-list" role="list">
        {CATEGORIES.map((item) => {
          const active = item.id === cat;
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={`ms-cat-row ${active ? 'is-active' : ''}`}
              data-cat={item.id}
              aria-pressed={active}
              onClick={() => setCat(item.id)}
            >
              <span className="ms-avatar sm" style={{ background: item.color }}>{item.glyph}</span>
              <span className="ms-cat-label">{item.label}</span>
              <IconChevron className="ms-chevron" />
            </button>
          );
        })}
      </div>

      <div className="ms-section-label">{current.subtitle}</div>

      <div className="ms-people">
        {people.map((person) => (
          <button key={person.id} type="button" className="ms-person-row" aria-label={person.name}>
            <span className="ms-avatar" style={{ background: person.color }}>
              {Array.from(person.name)[0]}
            </span>
            <span className="ms-person-main">
              <span className="ms-person-name">
                {person.name}
                <em className="ms-tag-role">{person.tag}</em>
              </span>
              <span className="ms-person-meta">{person.meta}</span>
            </span>
          </button>
        ))}
        {!people.length && <div className="ms-empty">暂无{current.label}</div>}
      </div>
    </div>
  );
}
