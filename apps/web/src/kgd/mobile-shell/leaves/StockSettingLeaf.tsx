import { useMemo, useState } from 'react';
import { LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

type SwitchRow = { key: string; label: string; tip: string; on: boolean };
type IoType = { id: string; name: string };

const SWITCH_FIXTURE: SwitchRow[] = [
  {
    key: 'limit_fg_in',
    label: '成品入库允许入库数量大于加工单计划数',
    tip: '开启后允许成品入库累计超过加工单计划数',
    on: true,
  },
  {
    key: 'hide_audit_status',
    label: '审核状态隐藏',
    tip: '无审核流程时不展示审核状态',
    on: false,
  },
  {
    key: 'limit_contract_out',
    label: '销售出库单出库数量限制',
    tip: '限制销售出库数量不超过合同销售数量',
    on: true,
  },
  {
    key: 'limit_purchase_in',
    label: '采购入库数量限制',
    tip: '限制采购入库数量不超过采购数量',
    on: true,
  },
  {
    key: 'return_supplier_detail',
    label: '退货单展示供应商更多信息',
    tip: '选择供应商时展示联系人、方式与地址',
    on: false,
  },
];

const IN_TYPES: IoType[] = [
  { id: 'i1', name: '采购入库' },
  { id: 'i2', name: '成品入库' },
  { id: 'i3', name: '其他入库' },
];

const OUT_TYPES: IoType[] = [
  { id: 'o1', name: '销售出库' },
  { id: 'o2', name: '生产出库' },
  { id: 'o3', name: '其他出库' },
];

/** 仓库·基础设置 · 疏朗分组（对齐商品设置疏朗皮） */
export function StockSettingLeaf() {
  const [switches, setSwitches] = useState(SWITCH_FIXTURE);
  const [inbound] = useState(IN_TYPES);
  const [outbound] = useState(OUT_TYPES);
  const [q, setQ] = useState('');
  const toast = useSkinToast();

  const switchList = useMemo(
    () => switches.filter((row) => matchQ(`${row.label} ${row.tip}`, q)),
    [switches, q],
  );
  const inList = useMemo(() => inbound.filter((row) => matchQ(row.name, q)), [inbound, q]);
  const outList = useMemo(() => outbound.filter((row) => matchQ(row.name, q)), [outbound, q]);

  return (
    <LeafChrome
      title="基础设置"
      leafKey="stock-setting"
      saveLabel="保存"
      onSave={() => toast.show('已保存')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索设置项…"
    >
      <section className="ms-group-card">
        <header className="ms-group-hd">
          <h2>基础开关</h2>
          <span>改后记得保存</span>
        </header>
        {switchList.map((row) => (
          <div key={row.key} className="ms-group-row">
            <div className="ms-group-text">
              <strong>{row.label}</strong>
              <p>{row.tip}</p>
            </div>
            <MsSwitch
              checked={row.on}
              label={row.label}
              onChange={(on) =>
                setSwitches((prev) => prev.map((item) => (item.key === row.key ? { ...item, on } : item)))
              }
            />
          </div>
        ))}
        <button type="button" className="ms-c1c-save-block" onClick={() => toast.show('已保存')}>
          保存
        </button>
      </section>

      <section className="ms-group-card">
        <header className="ms-group-hd">
          <h2>入库类型</h2>
          <span>{inList.length} 项</span>
        </header>
        {inList.map((row) => (
          <div key={row.id} className="ms-io-row">
            <span>{row.name}</span>
            <span className="ms-io-actions">
              <button type="button" onClick={() => toast.show('已打开修改')}>
                修改
              </button>
              <button type="button" className="danger" onClick={() => toast.show('已删除')}>
                删除
              </button>
            </span>
          </div>
        ))}
      </section>

      <section className="ms-group-card">
        <header className="ms-group-hd">
          <h2>出库类型</h2>
          <span>{outList.length} 项</span>
        </header>
        {outList.map((row) => (
          <div key={row.id} className="ms-io-row">
            <span>{row.name}</span>
            <span className="ms-io-actions">
              <button type="button" onClick={() => toast.show('已打开修改')}>
                修改
              </button>
              <button type="button" className="danger" onClick={() => toast.show('已删除')}>
                删除
              </button>
            </span>
          </div>
        ))}
      </section>
      {toast.node}
    </LeafChrome>
  );
}
