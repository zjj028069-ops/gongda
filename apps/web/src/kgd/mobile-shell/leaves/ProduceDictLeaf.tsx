import { useMemo, useState } from 'react';
import { LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

type DictItem = { id: string; name: string; value: string; enabled: boolean };
type DictCat = { key: string; label: string; items: DictItem[] };

const FIXTURE: DictCat[] = [
  {
    key: 'priority',
    label: '优先级',
    items: [
      { id: 'p0', name: '紧急', value: 'P0', enabled: true },
      { id: 'p1', name: '高', value: 'P1', enabled: true },
      { id: 'p2', name: '普通', value: 'P2', enabled: true },
    ],
  },
  {
    key: 'pause',
    label: '暂停原因',
    items: [
      { id: 'wait', name: '待料', value: '—', enabled: true },
      { id: 'fault', name: '设备故障', value: '—', enabled: true },
    ],
  },
  {
    key: 'pricing',
    label: '计价方式',
    items: [
      { id: 'piece', name: '计件', value: '按件数计算', enabled: true },
      { id: 'time', name: '计时', value: '按小时计算', enabled: true },
    ],
  },
  {
    key: 'defect',
    label: '不良类型',
    items: [
      { id: 'scratch', name: '划伤', value: '外观', enabled: true },
      { id: 'dim', name: '尺寸超差', value: '尺寸', enabled: true },
    ],
  },
  {
    key: 'shift',
    label: '班次',
    items: [
      { id: 'day', name: '白班', value: '08:00-20:00', enabled: true },
      { id: 'night', name: '夜班', value: '20:00-08:00', enabled: true },
    ],
  },
];

const PLUS = [
  { key: 'add', label: '新增配置' },
  { key: 'import', label: '从模板导入' },
];

/** 基础配置 · 定版2 分类优先 */
export function ProduceDictLeaf() {
  const [cats, setCats] = useState(FIXTURE);
  const [active, setActive] = useState(FIXTURE[0].key);
  const [q, setQ] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FIXTURE.map((c) => [c.key, true])),
  );
  const toast = useSkinToast();

  const filtered = useMemo(
    () =>
      cats
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) => matchQ(`${item.name} ${item.value} ${cat.label}`, q)),
        }))
        .filter((cat) => !q.trim() || cat.items.length || matchQ(cat.label, q)),
    [cats, q],
  );

  function toggleItem(catKey: string, id: string, enabled: boolean) {
    setCats((prev) =>
      prev.map((cat) =>
        cat.key !== catKey
          ? cat
          : { ...cat, items: cat.items.map((item) => (item.id === id ? { ...item, enabled } : item)) },
      ),
    );
  }

  return (
    <LeafChrome
      title="基础配置"
      leafKey="produce-dict-menu"
      plusItems={PLUS}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增配置' : '已打开从模板导入')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索配置项…"
    >
      <div className="ms-dict">
        <nav className="ms-dict-nav" aria-label="配置分类">
          {cats.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`ms-dict-nav-item ${active === cat.key ? 'is-on' : ''}`}
              onClick={() => {
                setActive(cat.key);
                setOpenMap((m) => ({ ...m, [cat.key]: true }));
                document.getElementById(`dict-cat-${cat.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {cat.label}
            </button>
          ))}
        </nav>
        <div className="ms-dict-main">
          {filtered.map((cat) => (
            <section key={cat.key} id={`dict-cat-${cat.key}`} className="ms-dict-card">
              <button
                type="button"
                className="ms-dict-card-hd"
                onClick={() => setOpenMap((m) => ({ ...m, [cat.key]: !m[cat.key] }))}
              >
                <span>配置项：{cat.label}</span>
                <span className="ms-dict-chev">{openMap[cat.key] === false ? '›' : '˅'}</span>
              </button>
              {openMap[cat.key] !== false && (
                <div className="ms-dict-table">
                  <div className="ms-dict-th">
                    <span>配置项</span>
                    <span>值</span>
                    <span>启用</span>
                  </div>
                  {cat.items.map((item) => (
                    <div key={item.id} className="ms-dict-tr">
                      <span>{item.name}</span>
                      <span className="ms-muted">{item.value}</span>
                      <MsSwitch
                        checked={item.enabled}
                        label={`${item.name}启用`}
                        onChange={(next) => toggleItem(cat.key, item.id, next)}
                      />
                    </div>
                  ))}
                  {!cat.items.length && <div className="ms-c1c-empty">暂无配置项</div>}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      {toast.node}
    </LeafChrome>
  );
}
