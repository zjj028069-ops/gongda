import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mesAbsPath } from '../../../mesBase';

/**
 * 大屏全屏查看：同源 `/_screen/pd/:id` 外链/内嵌。
 * 不做手机大屏编辑器。
 */
export function ScreenViewer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const title = params.get('title') || '数据大屏';
  const pwd = params.get('pwd') || '';

  const href = useMemo(() => {
    if (!id) return '';
    const q = pwd ? `?pwd=${encodeURIComponent(pwd)}` : '';
    return `${window.location.origin}${mesAbsPath(`/_screen/pd/${id}`)}${q}`;
  }, [id, pwd]);

  if (!id) {
    return (
      <div className="c7-viewer" data-testid="c7-screen-viewer">
        <header className="c7-viewer-top">
          <button type="button" className="ms-back-inline" onClick={() => navigate(-1)} aria-label="返回">‹</button>
          <h1>大屏</h1>
        </header>
        <p className="c7-viewer-empty">未找到大屏</p>
      </div>
    );
  }

  return (
    <div className="c7-viewer" data-testid="c7-screen-viewer" data-screen-id={id}>
      <header className="c7-viewer-top">
        <button type="button" className="ms-back-inline" onClick={() => navigate(-1)} aria-label="返回">‹</button>
        <h1>{title}</h1>
        <a className="c7-viewer-ext" href={href} target="_blank" rel="noopener noreferrer" data-testid="c7-screen-ext">
          外链打开
        </a>
      </header>
      <iframe className="c7-viewer-frame" title={title} src={href} data-testid="c7-screen-frame" />
    </div>
  );
}

export function screenViewerUrl(row: { screenId?: string; title: string; accessPassword?: string }) {
  const q = new URLSearchParams({
    id: row.screenId || '',
    title: row.title,
  });
  if (row.accessPassword) q.set('pwd', row.accessPassword);
  return `/ms/screen?${q.toString()}`;
}
