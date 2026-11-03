import { useEffect, useRef, useState } from 'react';
import type { PlusItem } from '../types';

type Props = {
  plusItems: PlusItem[];
  onPlusPick: (item: PlusItem) => void;
};

/** 右下角 FAB＋；气泡贴在加号上方（底栏场景） */
export function PlusFab({ plusItems, onPlusPick }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!plusItems.length) return null;

  return (
    <div className="c4-fab-wrap" ref={root} data-testid="c4-fab-wrap">
      {open && (
        <div className="ms-plus-panel c4-fab-panel" role="menu" aria-label="加号菜单" data-testid="c4-plus-panel">
          {plusItems.map((item) => (
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
      <button
        type="button"
        className="c4-fab"
        aria-label="加号菜单"
        aria-expanded={open}
        data-testid="c4-plus"
        onClick={() => setOpen((v) => !v)}
      >
        ＋
      </button>
    </div>
  );
}

function glyph(item: PlusItem) {
  if (item.key.includes('quote') || item.key.includes('from-quote')) return '报';
  if (item.key.includes('contract') || item.key.includes('from-contract')) return '合';
  if (item.key.includes('customer') || item.key.includes('link-customer')) return '客';
  if (item.key.includes('claim')) return '领';
  if (item.key.includes('assign')) return '分';
  if (item.key.includes('quick')) return '快';
  return '＋';
}
