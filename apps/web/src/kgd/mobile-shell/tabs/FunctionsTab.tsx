import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { primaryMenus, type MenuNode, type PrimaryMenu } from '../../menu';
import { IconChevron } from '../icons';
import { L1_ICON_COLORS, glyphOf } from '../types';

function collectLeaves(nodes: MenuNode[]): MenuNode[] {
  const out: MenuNode[] = [];
  for (const node of nodes) {
    if (node.children?.length) out.push(...collectLeaves(node.children));
    else out.push(node);
  }
  return out;
}

function firstChildren(menu: PrimaryMenu): { shown: MenuNode[]; overflow: string } {
  const kids = menu.children ?? [];
  if (!kids.length && menu.path) {
    return { shown: [{ key: menu.key, label: menu.label, path: menu.path }], overflow: '' };
  }
  /** 物联、客户、供应/采购、设备维保、精益叶子必须功能树可达，禁止 slice 挤掉 */
  if (menu.key === 'iot' || menu.key === 'customer' || menu.key === 'supply' || menu.key === 'device' || menu.key === 'lean') {
    return { shown: kids, overflow: '' };
  }
  const top = kids.slice(0, 5);
  const rest = kids.slice(5).map((item) => item.label);
  return { shown: top, overflow: rest.length ? `${rest.join(' / ')}…` : '' };
}

export function FunctionsTab() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>('iot');
  const menus = useMemo(() => primaryMenus, []);

  function openLeaf(node: MenuNode, l1: PrimaryMenu) {
    const title = encodeURIComponent(node.label);
    const path = encodeURIComponent(node.path || '');
    const key = encodeURIComponent(node.key);
    const l1Key = encodeURIComponent(l1.key);
    navigate(`/ms/leaf?key=${key}&title=${title}&path=${path}&l1=${l1Key}`);
  }

  return (
    <div className="ms-functions" data-testid="ms-functions">
      {menus.map((menu) => {
        const color = L1_ICON_COLORS[menu.key] || '#4184F4';
        const expanded = openKey === menu.key;
        const { shown, overflow } = firstChildren(menu);
        return (
          <div key={menu.key} className={`ms-fn-block ${expanded ? 'is-open' : ''}`} data-l1={menu.key}>
            <button
              type="button"
              className="ms-fn-row"
              aria-expanded={expanded}
              onClick={() => setOpenKey((prev) => (prev === menu.key ? null : menu.key))}
            >
              <span className="ms-avatar sm" style={{ background: color }}>{glyphOf(menu.label)}</span>
              <span className="ms-fn-label">{menu.label}</span>
              <span className={`ms-chevron-wrap ${expanded ? 'down' : ''}`} aria-hidden>
                <IconChevron />
              </span>
            </button>
            {expanded && (
              <div className="ms-fn-subs">
                {shown.map((node) => {
                  const nested = node.children?.length ? collectLeaves(node.children) : [];
                  if (nested.length) {
                    const shownLeaves = (menu.key === 'customer' || menu.key === 'supply' || menu.key === 'device' || menu.key === 'lean') ? nested : nested.slice(0, 6);
                    return (
                      <div key={node.key} className="ms-fn-group">
                        <div className="ms-fn-group-title">{node.label}</div>
                        {shownLeaves.map((leaf) => (
                          <button
                            key={leaf.key}
                            type="button"
                            className="ms-fn-sub"
                            data-leaf-key={leaf.key}
                            onClick={() => openLeaf(leaf, menu)}
                          >
                            <i className="ms-dot" />
                            <span>{leaf.label}</span>
                          </button>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={node.key}
                      type="button"
                      className="ms-fn-sub"
                      data-leaf-key={node.key}
                      onClick={() => openLeaf(node, menu)}
                    >
                      <i className="ms-dot" />
                      <span>
                        {node.label}
                        {node.key === 'plan' && <small className="ms-fn-note">生产计划MRP · 物料分析</small>}
                      </span>
                    </button>
                  );
                })}
                {overflow && <div className="ms-fn-overflow">{overflow}</div>}
              </div>
            )}
          </div>
        );
      })}
      <p className="ms-fn-foot">共 {menus.length} 个一级 · 对齐现网 primaryMenus</p>
    </div>
  );
}
