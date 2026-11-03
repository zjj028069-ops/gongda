import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { c2LeafByKey, msLeafUrl } from './c2Registry';
import { UPSTREAM_FIXTURES, type UpstreamOption } from './fixtures';

function mapRemote(kind: string, data: unknown): UpstreamOption[] {
  const items = (data as { items?: Record<string, unknown>[] } | null)?.items ?? [];
  if (!items.length) return [];
  if (kind === 'purchase_order') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: [row.supplier_name, '采购单'].filter(Boolean).join(' · '),
    }));
  }
  if (kind === 'work_order') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: String((row.product_snapshot as { name?: string } | undefined)?.name ?? row.product_name ?? '加工单'),
    }));
  }
  if (kind === 'contract') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: String(row.customer_name ?? '合同'),
    }));
  }
  if (kind === 'purchase_receipt') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: [row.order_code, row.warehouse_name].filter(Boolean).join(' · '),
    }));
  }
  if (kind === 'shipment') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: String(row.customer_name ?? '出库单'),
    }));
  }
  if (kind === 'io_type_in' || kind === 'io_type_out') {
    const dir = kind === 'io_type_in' ? 'in' : 'out';
    const types = ((data as { io_types?: Record<string, unknown>[] } | null)?.io_types ?? items)
      .filter((row) => !row.direction || row.direction === dir);
    return types.map((row) => ({
      id: String(row.id ?? row.name),
      title: String(row.name ?? row.id),
      sub: dir === 'in' ? '入库类型' : '出库类型',
    }));
  }
  return [];
}

function remoteUrl(kind: string): string | null {
  if (kind === 'purchase_order') return '/api/money/purchase-orders?q=';
  if (kind === 'work_order') return '/api/work-orders?page=1&page_size=50';
  if (kind === 'contract') return '/api/money/contracts?q=';
  if (kind === 'purchase_receipt') return '/api/warehouse/purchase-receipts';
  if (kind === 'shipment') return '/api/warehouse/shipments';
  if (kind === 'io_type_in' || kind === 'io_type_out') return '/api/warehouse/settings';
  return null;
}

/**
 * 上游勾选页：左勾、顶已选、右上完成(N)，对齐微信发起群聊。
 * 即使本地库空数据也保留结构（夹具兜底）。
 */
export function UpstreamPick() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const leafKey = params.get('key') || '';
  const kind = params.get('kind') || '';
  const title = params.get('title') || '选择上游';
  const mode = params.get('mode') || 'blank';
  const leaf = c2LeafByKey(leafKey);
  const url = remoteUrl(kind);
  const remote = useRemote(url, revision, onExpired);
  const options = useMemo(() => {
    const mapped = mapRemote(kind, remote.data);
    if (mapped.length) return mapped;
    return UPSTREAM_FIXTURES[kind] ?? [];
  }, [kind, remote.data]);
  const fromFixture = !(mapRemote(kind, remote.data).length);
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function complete() {
    if (!leaf) {
      navigate(-1);
      return;
    }
    const ids = picked.join(',');
    navigate(msLeafUrl(leaf, { action: mode, upstream: ids, toast: `已选上游 ${picked.length} 项` }));
  }

  const selected = options.filter((opt) => picked.includes(opt.id));

  return (
    <div className="c2-pick" data-testid="c2-upstream-pick" data-kind={kind} data-leaf={leafKey}>
      <header className="c2-pick-top">
        <button type="button" className="ms-back-inline" aria-label="返回" onClick={() => navigate(-1)}>‹</button>
        <div className="c2-pick-title-wrap">
          <h1>{title}</h1>
          <p className="c2-pick-selected" data-testid="c2-pick-selected">
            已选 {picked.length}{selected.length ? ` · ${selected.map((s) => s.title).slice(0, 2).join('、')}${selected.length > 2 ? '…' : ''}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="c2-pick-done"
          data-testid="c2-pick-done"
          disabled={!picked.length}
          onClick={complete}
        >
          完成({picked.length})
        </button>
      </header>
      {fromFixture && <p className="c2-fixture-hint">本地暂无上游数据 · 展示夹具结构（业务写回不改）</p>}
      <div className="c2-pick-list">
        {options.map((opt) => {
          const on = picked.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`c2-pick-row ${on ? 'is-on' : ''}`}
              data-testid="c2-pick-row"
              aria-pressed={on}
              onClick={() => toggle(opt.id)}
            >
              <span className={`c2-check ${on ? 'is-on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
              <span className="c2-pick-body">
                <strong>{opt.title}</strong>
                {opt.sub && <small>{opt.sub}</small>}
              </span>
            </button>
          );
        })}
        {!options.length && <div className="ms-empty">暂无可选项</div>}
      </div>
    </div>
  );
}
