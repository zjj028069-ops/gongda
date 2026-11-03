import { useMemo, useState } from 'react';
import { IconChevron } from '../icons';
import { LeafChrome, matchQ, useSkinToast } from './shared';

type Plan = {
  id: string;
  name: string;
  role: string;
  price: string;
  coeff: string;
  enabled: boolean;
};

const FIXTURE: Plan[] = [
  { id: '1', name: '精车计件标准', role: '精车工 · 精车', price: '¥12.50/件', coeff: '1.20', enabled: true },
  { id: '2', name: '粗车计时方案', role: '粗车工 · 粗车', price: '¥45.00/时', coeff: '系数1.00', enabled: true },
  { id: '3', name: '热处理绩效', role: '热处理 · 热处理', price: '¥8.00/件', coeff: '系数0.90', enabled: false },
];

const PLUS = [
  { key: 'add', label: '新增方案' },
  { key: 'copy', label: '从模板复制' },
];

export function PerfPayLeaf() {
  const [rows, setRows] = useState(FIXTURE);
  const [q, setQ] = useState('');
  const toast = useSkinToast();
  const list = useMemo(() => rows.filter((r) => matchQ(`${r.name} ${r.role} ${r.price}`, q)), [rows, q]);

  return (
    <LeafChrome
      title="绩效工资设置"
      leafKey="perf-pay"
      plusItems={PLUS}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增方案' : '已打开从模板复制')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索方案…"
    >
      <div className="ms-c1c-list">
        {list.map((row) => (
          <article key={row.id} className="ms-pay-card">
            <div className="ms-pay-left">
              <span className="ms-pay-k">方案</span>
              <strong>{row.name}</strong>
              <span className="ms-pay-k">适用岗位/工序</span>
              <span className="ms-pay-v">{row.role}</span>
            </div>
            <div className="ms-pay-right">
              <span className="ms-pay-k">计件单价</span>
              <strong className="ms-pay-price">{row.price}</strong>
              <span className="ms-pay-k">绩效系数</span>
              <button
                type="button"
                className="ms-pay-coeff"
                onClick={() => toast.show('已打开系数设置')}
              >
                {row.coeff}
                <IconChevron />
              </button>
              <button
                type="button"
                className={`ms-pay-tag ${row.enabled ? 'on' : 'off'}`}
                onClick={() =>
                  setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)))
                }
              >
                {row.enabled ? '启用' : '停用'}
              </button>
            </div>
          </article>
        ))}
        {!list.length && <div className="ms-c1c-empty">暂无绩效方案</div>}
      </div>
      {toast.node}
    </LeafChrome>
  );
}
