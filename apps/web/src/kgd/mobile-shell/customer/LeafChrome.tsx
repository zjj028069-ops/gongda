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

/** 叶子顶栏：返回 + 标题 + 细线放大镜 +（可选）＋气泡贴在加号下方 */
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
      <header className="ms-top c4-leaf-top" data-testid="c4-leaf-top">
        <button type="button" className="ms-icon-btn" aria-label="关闭搜索" onClick={onSearchClose}>‹</button>
        <label className="c4-inline-search">
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
    <header className="ms-top c4-leaf-top" data-testid="c4-leaf-top">
      <button type="button" className="ms-back-inline" onClick={onBack} aria-label="返回">‹</button>
      <h1 className="ms-top-title c4-leaf-title">{title}</h1>
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
              data-testid="c4-plus"
              onClick={() => setOpen((v) => !v)}
            >
              <IconPlusCircle />
            </button>
            {open && (
              <div className="ms-plus-panel" role="menu" aria-label="加号菜单" data-testid="c4-plus-panel">
                {plusItems!.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className="ms-plus-item"
                    data-plus-key={item.key}
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
  if (item.key === 'from-quote') return '报';
  if (item.key === 'from-contract') return '合';
  if (item.key === 'claim' || item.key === 'link-customer') return '客';
  if (item.key === 'assign') return '销';
  return '＋';
}
