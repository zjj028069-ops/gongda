import type { FixtureRow } from './fixtures';
import type { C9Layout } from './c9Registry';

function Pill({ tone, text }: { tone?: FixtureRow['statusTone']; text: string }) {
  return <span className={`c9-pill is-${tone || 'mute'}`}>{text}</span>;
}

function Dot({ tone, text }: { tone?: FixtureRow['statusTone']; text: string }) {
  return (
    <span className={`c9-dot is-${tone || 'mute'}`}>
      <i />
      {text}
    </span>
  );
}

function Spark({ values, tone }: { values?: number[]; tone?: FixtureRow['statusTone'] }) {
  const pts = values?.length ? values : [40, 50, 55, 60, 58, 62, 65];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = Math.max(max - min, 1);
  const d = pts
    .map((v, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * 48;
      const y = 18 - ((v - min) / span) * 16;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className={`c9-spark is-${tone || 'ok'}`} viewBox="0 0 48 20" width="48" height="20" aria-hidden>
      <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function splitTime(raw?: string) {
  if (!raw) return { date: '—', clock: '' };
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2) return { date: parts[0], clock: parts.slice(1).join(' ') };
  if (raw.includes('-') && raw.length > 10) {
    return { date: raw.slice(0, 10), clock: raw.slice(11) };
  }
  return { date: raw, clock: '' };
}

/** 版4 · 物联场景明细行卡 */
export function SceneCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c9-card c9-scene" data-testid="c9-card" data-layout="v4-detail-lines">
      <span className="c9-thumb sm" aria-hidden>{row.iconGlyph || '景'}</span>
      <div className="c9-card-body">
        <div className="c9-v4-head">
          <button type="button" className="c9-code">{row.code}</button>
          <Dot tone={row.statusTone} text={row.statusText} />
        </div>
        <h3>{row.name}</h3>
        <div className="c9-scene-meta">
          <span>网关 {row.gateway || '—'}</span>
          <span>设备 {row.deviceCount ?? '—'}</span>
          <span className="c9-rate">
            {row.onlineRate || '—'}
            <Spark values={row.spark} tone={row.statusTone} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** 版3 · 传感器状态 Tabs 行卡 */
export function SensorStatusCard({ row }: { row: FixtureRow }) {
  const offline = row.status === 'offline' || row.statusText.includes('离线');
  const alarm = row.status === 'alarm' || row.statusText.includes('告警') || row.statusText.includes('报警');
  const reading = offline
    ? '--'
    : alarm && row.alarmHint
      ? row.alarmHint
      : row.value
        ? `${row.value}${row.unit ? ` ${row.unit}` : ''}`
        : '—';
  const place = [row.workshop, row.line].filter(Boolean).join(' | ') || row.scene || '—';

  return (
    <article className="c9-card c9-sensor-status" data-testid="c9-card" data-layout="v3-status-tabs">
      <span className="c9-thumb" aria-hidden>{row.iconGlyph || '测'}</span>
      <div className="c9-card-body">
        <h3>{row.name}</h3>
        <p className="c9-sub">设备ID: {row.deviceCode || row.code}</p>
        <p className="c9-sub">{place}</p>
      </div>
      <div className="c9-side c9-sensor-side">
        <Dot tone={row.statusTone} text={row.statusText} />
        <strong className={`c9-reading ${offline ? 'is-mute' : ''} ${alarm ? 'is-bad' : ''}`}>{reading}</strong>
        {row.time ? <span className="c9-time">{row.time}</span> : null}
        <span className="c9-chev" aria-hidden>›</span>
      </div>
    </article>
  );
}

/** 版3 · 报警记录状态 Tabs 卡 */
export function AlarmCard({ row }: { row: FixtureRow }) {
  const { date, clock } = splitTime(row.time);
  return (
    <article className="c9-card c9-alarm" data-testid="c9-card" data-layout="v3-status-tabs">
      <div className={`c9-sev is-${row.levelTone || 'low'}`} aria-label={row.level}>
        <strong>{row.levelTone === 'critical' || row.levelTone === 'high' ? '!' : 'i'}</strong>
        <span>{row.level || '低'}</span>
      </div>
      <div className="c9-card-body">
        <div className="c9-v4-head">
          <h3>{row.name}</h3>
          <Pill tone={row.statusTone} text={row.statusText} />
        </div>
        <p className="c9-sub">设备: {row.device || '—'}{row.deviceCode ? ` (ID: ${row.deviceCode})` : ''}</p>
        <p className="c9-sub">位置: {row.location || '—'}</p>
      </div>
      <div className="c9-side">
        <span className="c9-time is-stack">
          <em>{date}</em>
          {clock ? <em>{clock}</em> : null}
        </span>
        <span className="c9-chev" aria-hidden>›</span>
      </div>
    </article>
  );
}

/** 版5 · 基础设置极简开关行 */
export function SettingSwitchRow({
  row,
  on,
  onToggle,
}: {
  row: FixtureRow;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="c9-switch-row" data-testid="c9-card" data-layout="v5-switch-rows">
      <span className={`c9-entry-ico soft is-${row.settingTone || 'blue'}`} aria-hidden>{row.iconGlyph || '设'}</span>
      <div className="c9-card-body">
        <h3>{row.name}</h3>
        <p className="c9-sub">{row.settingDesc}</p>
      </div>
      <button
        type="button"
        className={`c9-switch ${on ? 'is-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={row.name}
        data-testid="c9-switch"
        onClick={onToggle}
      >
        <i />
      </button>
    </div>
  );
}

export function renderC9Card(
  layout: C9Layout,
  leafKey: string,
  row: FixtureRow,
  opts?: {
    onOpen?: () => void;
    switchOn?: boolean;
    onSwitch?: () => void;
  },
) {
  if (leafKey === 'iot-scene') return <SceneCard key={row.id} row={row} />;
  if (leafKey === 'iot-sensor') return <SensorStatusCard key={row.id} row={row} />;
  if (leafKey === 'iot-alarm') return <AlarmCard key={row.id} row={row} />;
  if (leafKey === 'iot-base') {
    return (
      <SettingSwitchRow
        key={row.id}
        row={row}
        on={opts?.switchOn ?? !!row.settingOn}
        onToggle={() => opts?.onSwitch?.()}
      />
    );
  }
  return (
    <article key={row.id} className="c9-card" data-testid="c9-card" data-layout={layout}>
      <h3>{row.name}</h3>
      <p className="c9-sub">{row.code}</p>
    </article>
  );
}
