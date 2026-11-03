import type { ReactNode } from 'react';

export function numOf(value: string | number | null | undefined) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function percentOf(done: string | number | null | undefined, total: string | number | null | undefined) {
  const t = numOf(total);
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numOf(done) / t) * 100)));
}

export function ChipRow({ label, options, value, onChange }: {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mp-chips">
      {label && <span className="mp-chips-label">{label}</span>}
      <div className="mp-chips-scroll">
        {options.map((item) => (
          <button key={item.value} type="button" className={value === item.value ? 'on' : ''} onClick={() => onChange(item.value)}>{item.label}</button>
        ))}
      </div>
    </div>
  );
}

export function Bar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' }) {
  return (
    <div className={`mp-bar is-${tone}`} aria-hidden>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Tag({ text, tone }: { text: string; tone?: string }) {
  return <span className={`mp-tag ${tone || ''}`}>{text}</span>;
}

export function Sheet({ title, testId, onClose, children }: { title: string; testId?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="mp-sheet" role="dialog" aria-label={title} data-testid={testId || 'mp-sheet'}>
      <button type="button" className="mp-sheet-mask" aria-label="关闭" onClick={onClose} />
      <div className="mp-sheet-panel">
        <header>
          <b>{title}</b>
          <button type="button" onClick={onClose}>关闭</button>
        </header>
        <div className="mp-sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="mp-empty">{text}</div>;
}

export function Banner({ text }: { text: string }) {
  if (!text) return null;
  return <div className="mp-banner" role="alert">{text}</div>;
}

export function Kv({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mp-kv">
      <span>{label}</span>
      <b>{children}</b>
    </div>
  );
}

export function statusTone(execution: string) {
  if (execution === 'running') return 'is-run';
  if (execution === 'completed') return 'is-done';
  if (execution === 'paused' || execution === 'cancelled') return 'is-stop';
  return 'is-wait';
}

export const EXEC_TEXT: Record<string, string> = {
  not_started: '未开始', running: '生产中', paused: '已暂停', completed: '已完成', cancelled: '已取消',
};
export const TASK_TEXT: Record<string, string> = {
  not_started: '未开始', running: '进行中', paused: '已暂停', completed: '已完成', cancelled: '已取消',
};
