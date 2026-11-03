import { useMemo, useState } from 'react';
import { LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

type Rule = {
  id: string;
  name: string;
  trigger: string;
  autoIn: boolean;
  autoOut: boolean;
  enabled: boolean;
};

const FIXTURE: Rule[] = [
  { id: '1', name: '完工自动入库', trigger: '加工单完工', autoIn: true, autoOut: false, enabled: true },
  { id: '2', name: '报工扣料出库', trigger: '报工确认', autoIn: false, autoOut: true, enabled: true },
  { id: '3', name: '外协回货入库', trigger: '外协验收', autoIn: true, autoOut: false, enabled: false },
];

const PLUS = [
  { key: 'add', label: '新增规则' },
  { key: 'copy', label: '从模板复制' },
];

export function AutoStockLeaf() {
  const [rows, setRows] = useState(FIXTURE);
  const [q, setQ] = useState('');
  const toast = useSkinToast();
  const list = useMemo(() => rows.filter((r) => matchQ(`${r.name} ${r.trigger}`, q)), [rows, q]);

  return (
    <LeafChrome
      title="自动出入库设置"
      leafKey="auto-stock"
      plusItems={PLUS}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增规则' : '已打开从模板复制')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索规则…"
    >
      <div className="ms-c1c-cols" aria-hidden>
        <span>规则名称</span>
        <span>触发单据/场景</span>
        <span>自动入库</span>
        <span>自动出库</span>
        <span>启用</span>
      </div>
      <div className="ms-c1c-list">
        {list.map((row, index) => (
          <article key={row.id} className="ms-rule-card">
            <div className="ms-rule-hd">
              <span className="ms-rule-idx">{index + 1}</span>
              <strong>{row.name}</strong>
              <MsSwitch
                checked={row.enabled}
                label={`${row.name}启用`}
                onChange={(enabled) =>
                  setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled } : r)))
                }
              />
            </div>
            <div className="ms-rule-trigger">
              <span className="ms-rule-bolt" aria-hidden />
              <span>触发 {row.trigger}</span>
            </div>
            <div className="ms-rule-pills">
              <span className={`ms-pill ${row.autoIn ? 'on' : 'off'}`}>自动入库 · {row.autoIn ? '开' : '关'}</span>
              <span className={`ms-pill ${row.autoOut ? 'on' : 'off'}`}>自动出库 · {row.autoOut ? '开' : '关'}</span>
            </div>
          </article>
        ))}
        {!list.length && <div className="ms-c1c-empty">暂无规则</div>}
      </div>
      {toast.node}
    </LeafChrome>
  );
}
