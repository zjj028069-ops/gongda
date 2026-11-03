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

function isSettingNode(node: MenuNode) {
  return /setting|dict-menu|perf-pay|auto-stock|^station$|stock-audit/i.test(node.key) || /设置|基础配置/.test(node.label);
}

/** 发现式列表：前 5 个业务入口 + 始终钉住设置组，保证生产/仓库设置 6 叶可点入 */
function firstChildren(menu: PrimaryMenu): { shown: MenuNode[]; overflow: string } {
  const kids = menu.children ?? [];
  if (!kids.length && menu.path) {
    return { shown: [{ key: menu.key, label: menu.label, path: menu.path }], overflow: '' };
  }
  const settings = kids.filter(isSettingNode);
  const others = kids.filter((node) => !isSettingNode(node));
  const top = others.slice(0, 5);
  const shownKeys = new Set([...top, ...settings].map((n) => n.key));
  const shown = [...top, ...settings.filter((n) => !top.some((t) => t.key === n.key))];
  const rest = kids.filter((n) => !shownKeys.has(n.key)).map((item) => item.label);
  return { shown, overflow: rest.length ? `${rest.join(' / ')}…` : '' };
}

export function FunctionsTab() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>('customer');
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
                    return (
                      <div key={node.key} className="ms-fn-group">
                        <div className="ms-fn-group-title">{node.label}</div>
                        {(isSettingNode(node) ? nested : nested.slice(0, 6)).map((leaf) => (
                          <button key={leaf.key} type="button" className="ms-fn-sub" onClick={() => openLeaf(leaf, menu)}>
                            <i className="ms-dot" />
                            <span>
                              {leaf.label}
                              {leaf.key === 'quote' && <small className="ms-fn-note">手机必留 · 可操作</small>}
                              {leaf.key === 'contract' && <small className="ms-fn-note">须选上游报价</small>}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <button key={node.key} type="button" className="ms-fn-sub" onClick={() => openLeaf(node, menu)}>
                      <i className="ms-dot" />
                      <span>
                        {node.label}
                        {node.key === 'quote' && <small className="ms-fn-note">手机必留 · 可操作</small>}
                        {node.key === 'contract' && <small className="ms-fn-note">须选上游报价</small>}
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
