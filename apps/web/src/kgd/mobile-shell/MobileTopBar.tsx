import { useEffect, useRef, useState } from 'react';
import { IconPlusCircle, IconSearch } from './icons';
import type { PlusItem, ShellTab } from './types';
import { TAB_LABEL, plusItemsFor } from './types';

type Props = {
  tab: ShellTab;
  title?: string;
  onSearch: () => void;
  onPlusPick: (item: PlusItem) => void;
  hideActions?: boolean;
};

export function MobileTopBar({ tab, title, onSearch, onPlusPick, hideActions }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = plusItemsFor(tab);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="ms-top" data-tab={tab}>
      <h1 className="ms-top-title">{title || TAB_LABEL[tab]}</h1>
      {!hideActions && (
        <div className="ms-top-actions" ref={root}>
          <button type="button" className="ms-icon-btn" aria-label={`${TAB_LABEL[tab]}搜索`} onClick={onSearch}>
            <IconSearch />
          </button>
          <button
            type="button"
            className="ms-icon-btn"
            aria-label="加号菜单"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <IconPlusCircle />
          </button>
          {open && (
            <div className="ms-plus-panel" role="menu" aria-label="加号菜单">
              {items.map((item) => (
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
        </div>
      )}
    </header>
  );
}

function glyph(item: PlusItem) {
  if (item.key.includes('friend') || item.key.includes('customer')) return '友';
  if (item.key.includes('group')) return '群';
  if (item.key.includes('supplier')) return '供';
  if (item.key.includes('scan')) return '扫';
  if (item.reserved === 'quote') return '报';
  if (item.reserved === 'contract-from-quote') return '合';
  return '＋';
}
