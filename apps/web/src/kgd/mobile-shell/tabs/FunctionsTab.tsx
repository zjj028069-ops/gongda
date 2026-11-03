import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { primaryMenus, type MenuNode, type PrimaryMenu } from '../../menu';
import { IconChevron } from '../icons';
import { PRODUCE_MENU_PATH } from '../produce/paths';
import { L1_ICON_COLORS, glyphOf } from '../types';

function collectLeaves(nodes: MenuNode[]): MenuNode[] {
  const out: MenuNode[] = [];
  for (const node of nodes) {
    if (node.children?.length) out.push(...collectLeaves(node.children));
    else out.push(node);
  }
  return out;
}

function nodesOf(menu: PrimaryMenu): MenuNode[] {
  const kids = menu.children ?? [];
  if (!kids.length && menu.path) return [{ key: menu.key, label: menu.label, path: menu.path }];
  return kids;
}

export function FunctionsTab() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>('customer');
  const [moreOf, setMoreOf] = useState<Record<string, boolean>>({});
  const menus = useMemo(() => primaryMenus, []);

  function openLeaf(node: MenuNode, l1: PrimaryMenu) {
    const mirror = PRODUCE_MENU_PATH[node.key];
    if (mirror) {
      navigate(mirror);
      return;
    }
    const title = encodeURIComponent(node.label);
    const path = encodeURIComponent(node.path || '');
    const key = encodeURIComponent(node.key);
    const l1Key = encodeURIComponent(l1.key);
    navigate(`/ms/leaf?key=${key}&title=${title}&path=${path}&l1=${l1Key}`);
  }

  function renderNode(node: MenuNode, l1: PrimaryMenu) {
    const nested = node.children?.length ? collectLeaves(node.children) : [];
    if (nested.length) {
      return (
        <div key={node.key} className="ms-fn-group">
          <div className="ms-fn-group-title">{node.label}</div>
          {nested.map((leaf) => (
            <button key={leaf.key} type="button" className="ms-fn-sub" data-key={leaf.key} onClick={() => openLeaf(leaf, l1)}>
              <i className="ms-dot" />
              <span>{leaf.label}{leafNote(leaf.key)}</span>
            </button>
          ))}
        </div>
      );
    }
    return (
      <button key={node.key} type="button" className="ms-fn-sub" data-key={node.key} onClick={() => openLeaf(node, l1)}>
        <i className="ms-dot" />
        <span>{node.label}{leafNote(node.key)}</span>
      </button>
    );
  }

  return (
    <div className="ms-functions" data-testid="ms-functions">
      {menus.map((menu) => {
        const color = L1_ICON_COLORS[menu.key] || '#4184F4';
        const expanded = openKey === menu.key;
        const nodes = nodesOf(menu);
        const shown = nodes.slice(0, 5);
        const rest = nodes.slice(5);
        const more = !!moreOf[menu.key];
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
                {shown.map((node) => renderNode(node, menu))}
                {rest.length > 0 && (
                  <button type="button" className="ms-fn-more" data-testid={`ms-fn-more-${menu.key}`} onClick={() => setMoreOf((prev) => ({ ...prev, [menu.key]: !prev[menu.key] }))}>
                    {more ? '收起' : `更多（${rest.length}）`}
                  </button>
                )}
                {more && rest.map((node) => renderNode(node, menu))}
              </div>
            )}
          </div>
        );
      })}
      <p className="ms-fn-foot">共 {menus.length} 个一级 · 对齐现网 primaryMenus</p>
    </div>
  );
}

function leafNote(key: string) {
  if (key === 'quote') return <small className="ms-fn-note">手机必留 · 可操作</small>;
  if (key === 'contract') return <small className="ms-fn-note">须选上游报价</small>;
  if (key === 'plan-mrp') return <small className="ms-fn-note">生产计划MRP</small>;
  if (key === 'work-order') return <small className="ms-fn-note">直接创建｜合同创建</small>;
  return null;
}
