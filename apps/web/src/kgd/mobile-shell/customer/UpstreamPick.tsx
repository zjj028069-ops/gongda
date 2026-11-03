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
        const approval = String(row.approval ?? '');
        const ok = approval === 'approved' || approval === 'exempt';
        const open = !row.contract_id;
        return ok && open;
      })
      .slice(0, 40)
      .map((row) => ({
        id: String(row.id),
        title: String(row.code ?? row.id),
        sub: [row.customer_name, approvalLabel(row.approval), '未建合同', moneyLabel(row.amount)].filter(Boolean).join(' · '),
      }));
  }

  if (kind === 'contract') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.code ?? row.id),
      sub: [row.customer_name, lifecycleLabel(row.lifecycle ?? row.approval)].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'customer') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.name ?? row.code ?? row.id),
      sub: [row.code, Array.isArray(row.tags) ? row.tags[0] : row.tags].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'linkman') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.name ?? row.id),
      sub: [row.customer_name, row.title || '对接人'].filter(Boolean).join(' · '),
    }));
  }

  if (kind === 'sea_customer') {
    return items.slice(0, 40).map((row) => ({
      id: String(row.id),
      title: String(row.name ?? row.code ?? row.id),
      sub: [row.code, '可领取'].filter(Boolean).join(' · '),
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
  if (raw === 'approved') return '已审核';
  if (raw === 'exempt') return '不需审核';
  return raw;
}

function lifecycleLabel(value: unknown) {
  const raw = String(value ?? '');
  if (raw === 'performing' || raw === '履约中') return '履约中';
  if (raw === 'completed' || raw === '已完成') return '已完成';
  if (raw === 'draft' || raw === '草稿') return '草稿';
  return raw || '合同';
}

function moneyLabel(amount: unknown) {
  if (amount == null || amount === '') return '';
  const n = Number(amount);
  if (Number.isNaN(n)) return '';
  return `¥${n.toLocaleString('zh-CN')}`;
}

function remoteUrl(kind: string): string | null {
  if (kind === 'quotation') return '/api/money/quotations?contract=open';
  if (kind === 'contract') return '/api/money/contracts?q=';
  if (kind === 'customer') return '/api/money/customers';
  if (kind === 'linkman') return '/api/crm/contacts';
  if (kind === 'sea_customer') return '/api/crm/sea';
  if (kind === 'salesperson') return null; // 夹具：现网销售员列表路径不一
  if (kind === 'audit_object') return null;
  return null;
}

/**
 * 上游勾选页：左勾、顶已选、右上完成(N)，对齐微信发起群聊。
 * 合同「报价单创建」仅展示已审/不需审且未建合同的报价。
 */
export function CustomerUpstreamPick() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { revision, onExpired } = useKgd();
  const leafKey = params.get('key') || '';
  const kind = params.get('kind') || '';
  const title = params.get('title') || '选择上游';
  const mode = params.get('mode') || 'blank';
  const leaf = c4LeafByKey(leafKey);
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
    <div className="c4-pick" data-testid="c4-upstream-pick" data-kind={kind} data-leaf={leafKey}>
      <header className="c4-pick-top">
        <button type="button" className="ms-back-inline" aria-label="返回" onClick={() => navigate(-1)}>‹</button>
        <div className="c4-pick-title-wrap">
          <h1>{title}</h1>
          <p className="c4-pick-selected" data-testid="c4-pick-selected">
            已选 {picked.length}
            {selected.length
              ? ` · ${selected.map((s) => s.title).slice(0, 2).join('、')}${selected.length > 2 ? '…' : ''}`
              : ''}
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
      {kind === 'quotation' && (
        <p className="c4-hard-hint" data-testid="c4-quote-upstream-hint">
          硬约束：仅已审核/不需审核且未建合同的报价可选
        </p>
      )}
      {fromFixture && <p className="c4-fixture-hint">本地暂无上游数据 · 展示夹具结构（业务写回不改）</p>}
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
