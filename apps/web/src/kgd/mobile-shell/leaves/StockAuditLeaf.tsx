import { useMemo, useState } from 'react';
import { LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

type Flow = {
  id: string;
  name: string;
  tip: string;
  enabled: boolean;
};

const FIXTURE: Flow[] = [
  {
    id: '1',
    name: '入库单需审核',
    tip: '新建或修改入库单时需要审核确认',
    enabled: true,
  },
  {
    id: '2',
    name: '出库单需审核',
    tip: '新建或修改出库单时需要审核确认',
    enabled: true,
  },
  {
    id: '3',
    name: '调拨单免审',
    tip: '符合条件的调拨单可免审核直接生效',
    enabled: false,
  },
];

const PLUS = [{ key: 'add', label: '新增审核流程' }];

export function StockAuditLeaf() {
  const [rows, setRows] = useState(FIXTURE);
  const [q, setQ] = useState('');
  const toast = useSkinToast();
  const list = useMemo(() => rows.filter((r) => matchQ(`${r.name} ${r.tip}`, q)), [rows, q]);

  return (
    <LeafChrome
      title="审核设置"
      leafKey="stock-audit"
      plusItems={PLUS}
      onPlus={() => toast.show('已打开新增审核流程')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索审核流程…"
    >
      <div className="ms-audit-sec">
        <h2 className="ms-audit-title">审核规则</h2>
        <div className="ms-c1c-list">
          {list.map((row) => (
            <article key={row.id} className="ms-audit-card">
              <span className={`ms-audit-ico ${row.enabled ? 'on' : 'off'}`} aria-hidden>
                审
              </span>
              <div className="ms-audit-text">
                <strong>{row.name}</strong>
                <p>{row.tip}</p>
              </div>
              <span className={`ms-audit-flag ${row.enabled ? 'on' : 'off'}`}>{row.enabled ? '开' : '关'}</span>
              <MsSwitch
                checked={row.enabled}
                label={row.name}
                onChange={(enabled) =>
                  setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled } : r)))
                }
              />
            </article>
          ))}
          {!list.length && <div className="ms-c1c-empty">暂无审核流程</div>}
        </div>
      </div>
      {toast.node}
    </LeafChrome>
  );
}
