import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { c6LeafByKey, msLeafUrl } from './c6Registry';
import { UPSTREAM_FIXTURES } from './fixtures';

/** 上游勾选皮：左勾、顶已选、右上完成(N) */
export function DeviceLeanUpstreamPick() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const leafKey = params.get('key') || '';
  const kind = params.get('kind') || 'maint-plan';
  const title = params.get('title') || '选择上游';
  const mode = params.get('mode') || 'blank';
  const leaf = c6LeafByKey(leafKey);
  const options = useMemo(() => UPSTREAM_FIXTURES[kind] ?? [], [kind]);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function complete() {
    if (!leaf) {
      navigate('/ms/functions');
      return;
    }
    const names = options.filter((o) => selected.includes(o.id)).map((o) => o.title).join('、');
    navigate(msLeafUrl(leaf, {
      action: mode,
      upstream: selected.join(','),
      linked: names,
      toast: names ? `已选 ${selected.length} 项：${names}` : `已选 ${selected.length} 项进入${leaf.title}`,
    }));
  }

  return (
    <div className="c6-pick" data-testid="c6-upstream-pick" data-kind={kind} data-key={leafKey}>
      <header className="ms-top c6-leaf-top">
        <button type="button" className="ms-back-inline" aria-label="返回" onClick={() => navigate(-1)}>‹</button>
        <h1 className="ms-top-title c6-leaf-title">{title}</h1>
        <button
          type="button"
          className="c6-pick-done"
          data-testid="c6-pick-done"
          disabled={!selected.length}
          onClick={complete}
        >
          完成({selected.length})
        </button>
      </header>
      <div className="c6-pick-selected" data-testid="c6-pick-selected">
        已选 {selected.length}
        {selected.length ? ` · ${options.filter((o) => selected.includes(o.id)).map((o) => o.title).join('、')}` : ''}
      </div>
      <div className="c6-pick-list">
        {options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`c6-pick-row ${on ? 'is-on' : ''}`}
              data-testid="c6-pick-row"
              onClick={() => toggle(opt.id)}
            >
              <span className={`c6-check ${on ? 'is-on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
              <span>
                <strong>{opt.title}</strong>
                {opt.sub && <small>{opt.sub}</small>}
              </span>
            </button>
          );
        })}
        {!options.length && <div className="ms-empty">无可选项</div>}
      </div>
    </div>
  );
}
