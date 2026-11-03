import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { c5LeafByKey, msLeafUrl } from './c5Registry';
import { UPSTREAM_FIXTURES } from './fixtures';

/** 上游勾选皮：左勾、顶已选、右上完成(N) */
export function GoodsMasterUpstreamPick() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const leafKey = params.get('key') || '';
  const kind = params.get('kind') || 'goods';
  const title = params.get('title') || '选择上游';
  const mode = params.get('mode') || 'blank';
  const leaf = c5LeafByKey(leafKey);
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
    const extra: Record<string, string> = {
      action: mode,
      upstream: selected.join(','),
      toast: `已选 ${selected.length} 项进入${leaf.title}（皮）`,
    };
    if (mode === 'blank' && kind === 'goods') {
      extra.action = 'create';
      extra.linked = names;
      extra.toast = names ? `已关联商品：${names}（皮）` : '新增BOM入口已打开（皮）';
    }
    if (leaf.createForm && (mode === 'blank' || mode === 'create')) {
      extra.action = 'create';
    }
    navigate(msLeafUrl(leaf, extra));
  }

  return (
    <div className="c5-pick" data-testid="c5-upstream-pick" data-kind={kind} data-key={leafKey}>
      <header className="ms-top c5-leaf-top">
        <button type="button" className="ms-back-inline" aria-label="返回" onClick={() => navigate(-1)}>‹</button>
        <h1 className="ms-top-title c5-leaf-title">{title}</h1>
        <button
          type="button"
          className="c5-pick-done"
          data-testid="c5-pick-done"
          disabled={!selected.length}
          onClick={complete}
        >
          完成({selected.length})
        </button>
      </header>
      <div className="c5-pick-selected" data-testid="c5-pick-selected">
        已选 {selected.length}
        {selected.length ? ` · ${options.filter((o) => selected.includes(o.id)).map((o) => o.title).join('、')}` : ''}
      </div>
      <div className="c5-pick-list">
        {options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`c5-pick-row ${on ? 'is-on' : ''}`}
              data-testid="c5-pick-row"
              onClick={() => toggle(opt.id)}
            >
              <span className={`c5-check ${on ? 'is-on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
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
