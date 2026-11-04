import { useEffect, useRef, useState } from 'react';
import { IconPlusCircle, IconSearch } from '../icons';
import type { PlusItem } from '../types';

type Props = {
  title: string;
  onBack: () => void;
  onSearch: () => void;
  plusItems: PlusItem[] | null;
  onPlusPick: (item: PlusItem) => void;
  searching?: boolean;
  searchHint?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClose?: () => void;
};

/** 叶子顶栏：返回 + 标题 + 细线放大镜 +（可选）细线＋微信气泡 */
export function LeafChrome({
  title,
  onBack,
  onSearch,
  plusItems,
  onPlusPick,
  searching,
  searchHint,
  searchValue,
  onSearchChange,
  onSearchClose,
}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const showPlus = Array.isArray(plusItems) && plusItems.length > 0;

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (searching) {
    return (
      <header className="ms-top c3-leaf-top" data-testid="c3-leaf-top">
        <button type="button" className="ms-icon-btn" aria-label="关闭搜索" onClick={onSearchClose}>‹</button>
        <label className="c3-inline-search">
          <span className="sr-only">搜索</span>
          <input
            autoFocus
            value={searchValue ?? ''}
            onChange={(ev) => onSearchChange?.(ev.target.value)}
            placeholder={searchHint || '搜索'}
            aria-label="叶子搜索框"
          />
        </label>
      </header>
    );
  }

  return (
    <header className="ms-top c3-leaf-top" data-testid="c3-leaf-top">
      <button type="button" className="ms-back-inline" onClick={onBack} aria-label="返回">‹</button>
      <h1 className="ms-top-title c3-leaf-title">{title}</h1>
      <div className="ms-top-actions" ref={root}>
        <button type="button" className="ms-icon-btn" aria-label={`${title}搜索`} onClick={onSearch}>
          <IconSearch />
        </button>
        {showPlus && (
          <>
            <button
              type="button"
              className="ms-icon-btn"
              aria-label="加号菜单"
              aria-expanded={open}
              data-testid="c3-plus"
              onClick={() => setOpen((v) => !v)}
            >
              <IconPlusCircle />
            </button>
            {open && (
              <div className="ms-plus-panel" role="menu" aria-label="加号菜单" data-testid="c3-plus-panel">
                {plusItems!.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className="ms-plus-item"
                    onClick={() => {
                      setOpen(false);
                      onPlusPick(item);
                    }}
                  >
                    <span className="ms-plus-glyph" aria-hidden>{glyph(item)}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function glyph(item: PlusItem) {
  if (item.key.includes('scan')) return '扫';
  if (item.key.includes('contract')) return '合';
  if (item.key.includes('plan')) return '计';
  if (item.key.includes('goods') || item.key.includes('pick-goods')) return '品';
  if (item.key.includes('po') || item.key.includes('from-po')) return '采';
  if (item.key.includes('demand')) return '需';
  if (item.key.includes('supplier')) return '供';
  return '＋';
}
