import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlusCircle, IconSearch } from '../icons';

export type LeafPlusItem = { key: string; label: string };

type ChromeProps = {
  title: string;
  leafKey: string;
  plusItems?: LeafPlusItem[];
  onPlus?: (item: LeafPlusItem) => void;
  saveLabel?: string;
  onSave?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: ReactNode;
};

/** 叶子顶栏：返回 + 标题 + 细线放大镜 +（可选）＋微信气泡 / 保存。禁止标题下长搜索条+查询。 */
export function LeafChrome({
  title,
  leafKey,
  plusItems,
  onPlus,
  saveLabel,
  onSave,
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索…',
  children,
}: ChromeProps) {
  const navigate = useNavigate();
  const [plusOpen, setPlusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const plusRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!plusRoot.current?.contains(ev.target as Node)) setPlusOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="ms-c8" data-testid="ms-leaf" data-key={leafKey}>
      <header className="ms-c8-top">
        <button type="button" className="ms-c8-back" aria-label="返回" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1 className="ms-c8-title">{title}</h1>
        <div className="ms-c8-actions" ref={plusRoot}>
          <button
            type="button"
            className="ms-icon-btn"
            aria-label={`${title}搜索`}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <IconSearch />
          </button>
          {saveLabel && onSave && (
            <button type="button" className="ms-c8-save" onClick={onSave}>
              {saveLabel}
            </button>
          )}
          {!!plusItems?.length && (
            <>
              <button
                type="button"
                className="ms-icon-btn"
                aria-label="加号菜单"
                aria-expanded={plusOpen}
                onClick={() => setPlusOpen((v) => !v)}
              >
                <IconPlusCircle />
              </button>
              {plusOpen && (
                <div className="ms-plus-panel ms-c8-plus" role="menu" aria-label="加号菜单">
                  {plusItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      className="ms-plus-item"
                      onClick={() => {
                        setPlusOpen(false);
                        onPlus?.(item);
                      }}
                    >
                      <span className="ms-plus-glyph" aria-hidden>
                        ＋
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </header>
      {searchOpen && onSearchChange && (
        <div className="ms-c8-filter">
          <input
            autoFocus
            value={searchValue ?? ''}
            onChange={(ev) => onSearchChange(ev.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`${title}筛选`}
          />
        </div>
      )}
      <div className="ms-c8-body">{children}</div>
    </div>
  );
}

export function MsSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`ms-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

export function useSkinToast() {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);
  return {
    toast,
    show: (msg: string) => setToast(msg),
    node: toast ? (
      <div className="ms-c8-toast" role="status" data-testid="ms-c8-toast">
        {toast}
      </div>
    ) : null,
  };
}

export function matchQ(text: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}

export function Glyph({ text, color = '#4184F4', round }: { text: string; color?: string; round?: boolean }) {
  return (
    <span className={`ms-c8-glyph ${round ? 'is-round' : ''}`} style={{ background: color }} aria-hidden>
      {text.slice(0, 1)}
    </span>
  );
}

export function SegTabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="ms-c8-segs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          className={`ms-c8-seg ${value === item.key ? 'is-on' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PillTabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="ms-c8-pills">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`ms-c8-pill ${value === item.key ? 'is-on' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
