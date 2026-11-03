import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemote } from '../../../masterTools';
import { useKgd } from '../../context';
import { c4LeafByKey, msLeafUrl } from './c4Registry';
import { UPSTREAM_FIXTURES, type UpstreamOption } from './fixtures';

function mapRemote(kind: string, data: unknown): UpstreamOption[] {
  const items = (data as { items?: Record<string, unknown>[] } | null)?.items ?? [];
  if (!items.length) return [];

  if (kind === 'quotation') {
    return items
      .filter((row) => {
        const approval = String(row.approval ?? row.audit_status ?? '');
        const ok = approval === 'approved' || approval === 'exempt' || approval === '已审核' || approval === '不需审核';
        const open = !row.contract_id;
        return ok && open;
      })
      .slice(0, 40)
      .map((row) => ({
        id: String(row.id),
        title: String(row.code ?? row.id),
        sub: [row.customer_name, approvalLabel(row.approval ?? row.audit_status), '未建合同', moneyLabel(row.amount)].filter(Boolean).join(' · '),
      }));
  }

  if (kind === 'contract') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: [row.customer_name, String(row.lifecycle ?? row.approval ?? '')].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'customer' || kind === 'sea_customer') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.name ?? row.code ?? row.id),
      sub: [row.code, kind === 'sea_customer' ? '可领取' : ''].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'linkman') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.name ?? row.id),
      sub: [row.customer_name, row.title || '对接人'].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'salesperson') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id ?? row.user_id ?? row.name),
      title: String(row.display_name ?? row.name ?? row.id),
      sub: String(row.dept_name ?? row.department ?? '销售'),
    }));
  }

  return [];
}

function approvalLabel(value: unknown) {
  const raw = String(value ?? '');
  if (raw === 'approved' || raw === '已审核') return '已审核';
  if (raw === 'exempt' || raw === '不需审核') return '不需审核';
  return raw;
}

function moneyLabel(amount: unknown) {
  if (amount == null || amount === '') return '';
  const n = Number(amount);
  if (Number.isNaN(n)) return '';
  return `¥${n.toLocaleString('zh-CN')}`;
}

function remoteUrl(kind: string): string | null {
  if (kind === 'quotation') return '/api/money/quotations?contract=open';
  if (kind === 'contract') return '/api/money/contracts';
  if (kind === 'customer') return '/api/money/customers';
  if (kind === 'linkman') return '/api/crm/contacts';
  if (kind === 'sea_customer') return '/api/crm/sea';
  return null;
}

/**
 * 上游勾选：左勾、顶部已选、右上完成(N)。
 * 报价单创建只列出已审或不需审、且尚未建合同的报价。
 */
export function CustomerUpstreamPick() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const leafKey = params.get('key') || '';
  const kind = params.get('kind') || '';
  const title = params.get('title') || '选择';
  const mode = params.get('mode') || 'blank';
  const leaf = c4LeafByKey(leafKey);
  const url = remoteUrl(kind);
  const remote = useRemote(url, revision, onExpired);
  const options = useMemo(() => {
    const payload = remote.data as { items?: unknown[] } | null;
    if (payload && Array.isArray(payload.items) && payload.items.length) {
      const mapped = mapRemote(kind, payload);
      if (mapped.length || kind !== 'quotation') return mapped.length ? mapped : [];
    }
    if (kind === 'quotation' && payload && Array.isArray(payload.items) && payload.items.length) {
      const mapped = mapRemote(kind, payload);
      if (mapped.length) return mapped;
    }
    return UPSTREAM_FIXTURES[kind] ?? [];
  }, [kind, remote.data]);
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function complete() {
    if (!leaf || !picked.length) return;
    navigate(msLeafUrl(leaf, { action: mode, upstream: picked.join(','), toast: `已选 ${picked.length} 项` }));
  }

  const selected = options.filter((opt) => picked.includes(opt.id));

  return (
    <div className="c4-pick" data-testid="c4-upstream-pick" data-kind={kind} data-leaf={leafKey}>
      <header className="c4-pick-top">
        <button type="button" className="ms-back-inline" aria-label="返回" onClick={() => navigate(-1)}>‹</button>
        <div className="c4-pick-title-wrap">
          <h1>{title}</h1>
          <p className="c4-pick-selected" data-testid="c4-pick-selected">
            已选 {picked.length}
            {selected.length ? ` · ${selected.slice(0, 2).map((s) => s.title).join('、')}${selected.length > 2 ? '…' : ''}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="c4-pick-done"
          data-testid="c4-pick-done"
          disabled={!picked.length}
          onClick={complete}
        >
          完成({picked.length})
        </button>
      </header>
      <div className="c4-pick-list">
        {options.map((opt) => {
          const on = picked.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`c4-pick-row ${on ? 'is-on' : ''}`}
              data-testid="c4-pick-row"
              aria-pressed={on}
              onClick={() => toggle(opt.id)}
            >
              <span className={`c4-check ${on ? 'is-on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
              <span className="c4-pick-body">
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
