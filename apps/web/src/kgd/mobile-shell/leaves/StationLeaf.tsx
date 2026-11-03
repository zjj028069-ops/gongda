import { useMemo, useState } from 'react';
import { LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

type Station = {
  id: string;
  name: string;
  machine: string;
  process: string;
  location: string;
  enabled: boolean;
};

const FIXTURE: Station[] = [
  { id: '1', name: '精车一号站', machine: 'CNC-03', process: '精车', location: '一车间A区', enabled: true },
  { id: '2', name: '粗车线站', machine: 'CNC-01', process: '粗车', location: '一车间B区', enabled: true },
  { id: '3', name: '热处理站', machine: 'HT-02', process: '热处理', location: '二车间', enabled: false },
];

const PLUS = [
  { key: 'add', label: '新增工作站' },
  { key: 'import', label: '从机台导入' },
];

export function StationLeaf() {
  const [rows, setRows] = useState(FIXTURE);
  const [q, setQ] = useState('');
  const toast = useSkinToast();
  const list = useMemo(
    () => rows.filter((r) => matchQ(`${r.name} ${r.machine} ${r.process} ${r.location}`, q)),
    [rows, q],
  );

  return (
    <LeafChrome
      title="工作站设置"
      leafKey="station"
      plusItems={PLUS}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增工作站' : '已打开从机台导入')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索工作站…"
    >
      <div className="ms-c1c-cols ms-station-cols" aria-hidden>
        <span>工作站名称</span>
        <span>绑定机台/工序</span>
        <span>位置</span>
        <span>启用</span>
      </div>
      <div className="ms-c1c-list">
        {list.map((row, index) => (
          <article key={row.id} className="ms-station-card">
            <div className="ms-station-hd">
              <span className="ms-rule-idx">{index + 1}</span>
              <strong>{row.name}</strong>
              {row.enabled ? (
                <MsSwitch
                  checked
                  label={`${row.name}启用`}
                  onChange={() =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: false } : r)))
                  }
                />
              ) : (
                <button
                  type="button"
                  className="ms-station-off"
                  onClick={() =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: true } : r)))
                  }
                >
                  停用
                </button>
              )}
            </div>
            <ul className="ms-station-meta">
              <li>
                <span>绑定机台</span>
                <em>{row.machine}</em>
              </li>
              <li>
                <span>绑定工序</span>
                <em>{row.process}</em>
              </li>
              <li>
                <span>位置</span>
                <b>{row.location}</b>
              </li>
            </ul>
          </article>
        ))}
        {!list.length && <div className="ms-c1c-empty">暂无工作站</div>}
      </div>
      {toast.node}
    </LeafChrome>
  );
}
