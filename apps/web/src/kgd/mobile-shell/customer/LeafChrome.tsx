/** 叶子顶栏：返回 + 标题 + 细线放大镜（真机顶栏仅放大镜，＋改 FAB） */
import { IconSearch } from '../icons';

type Props = {
  title: string;
  onBack: () => void;
  onSearch: () => void;
  searching?: boolean;
  searchHint?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClose?: () => void;
};

export function LeafChrome({
  title,
  onBack,
  onSearch,
  searching,
  searchHint,
  searchValue,
  onSearchChange,
  onSearchClose,
}: Props) {
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
      <div className="ms-top-actions">
        <button type="button" className="ms-icon-btn" aria-label={`${title}搜索`} data-testid="c4-search" onClick={onSearch}>
          <IconSearch />
        </button>
      </div>
    </header>
  );
}
