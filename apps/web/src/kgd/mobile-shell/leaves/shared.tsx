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

/** 叶子顶栏：返回 + 标题 + 细线放大镜 +（可选）＋下拉 / 保存。禁止标题下长搜索条+查询按钮。 */
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
    <div className="ms-c1c" data-testid="ms-leaf" data-key={leafKey}>
      <header className="ms-c1c-top">
        <button type="button" className="ms-c1c-back" aria-label="返回" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1 className="ms-c1c-title">{title}</h1>
        <div className="ms-c1c-actions" ref={plusRoot}>
          <button
            type="button"
            className="ms-icon-btn"
            aria-label={`${title}搜索`}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <IconSearch />
          </button>
          {saveLabel && onSave && (
            <button type="button" className="ms-c1c-save" onClick={onSave}>
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
                <div className="ms-plus-panel ms-c1c-plus" role="menu" aria-label="加号菜单">
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
        <div className="ms-c1c-filter">
          <input
            autoFocus
            value={searchValue ?? ''}
            onChange={(ev) => onSearchChange(ev.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`${title}筛选`}
          />
        </div>
      )}
      <div className="ms-c1c-body">{children}</div>
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
      <div className="ms-c1c-toast" role="status" data-testid="ms-c1c-toast">
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
