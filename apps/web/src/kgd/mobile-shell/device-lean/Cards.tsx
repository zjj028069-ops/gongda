import type { FixtureRow } from './fixtures';
import type { C6Layout } from './c6Registry';
import { STATION_KPI } from './fixtures';

function Pill({ tone, text }: { tone?: FixtureRow['statusTone']; text: string }) {
  return <span className={`c6-pill is-${tone || 'mute'}`}>{text}</span>;
}

function Dot({ tone, text }: { tone?: FixtureRow['statusTone']; text: string }) {
  return (
    <span className={`c6-dot is-${tone || 'mute'}`}>
      <i />
      {text}
    </span>
  );
}

function LineIcon({ name }: { name?: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'factory':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
          <path fillRule="evenodd" d="M2.5 21h19v-1.6h-19V21zm1.6-2.8h15.8V9.4l-4.6 2.1V9.2L10.2 11.4V6.6L4.1 9.2v9zm3.1-.2v-2.6h2.1v2.6H7.2zm4.4 0v-2.6h2.1v2.6h-2.1zm4.6-5.2h1.8v1.6h-1.8v-1.6zm0 2.6h1.8V18h-1.8v-2.6z" />
        </svg>
      );
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></svg>;
    case 'chart':
      return <svg {...common}><path d="M4 19h16" /><path d="M7 16v-4M12 16V8M17 16v-6" /></svg>;
    case 'box':
      return <svg {...common}><path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3z" /><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" /></svg>;
    case 'clip':
      return <svg {...common}><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4.5h6v3H9zM9 11h6M9 15h4" /></svg>;
    case 'check':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="m8.5 12.2 2.3 2.3 4.7-5" /></svg>;
    case 'people':
      return <svg {...common}><circle cx="9" cy="9" r="2.4" /><circle cx="16" cy="10" r="2" /><path d="M4.5 18.5c.6-2.4 2.4-3.6 4.5-3.6s3.9 1.2 4.5 3.6M13.2 14.8c1.6.1 3 .9 3.6 2.7" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 3.5v3M16 3.5v3M4 10h16" /></svg>;
    case 'bell':
      return <svg {...common}><path d="M6 16h12l-1.2-2V10a4.8 4.8 0 0 0-9.6 0v4L6 16z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>;
    case 'qr':
      return <svg {...common}><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h2v2h-2zM18 14h1v5h-5v-2" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M12 4 3.5 19h17L12 4z" /><path d="M12 10v4M12 16.5h.01" /></svg>;
    case 'bolt':
      return <svg {...common}><path d="M13 3 6 13h5l-1 8 7-11h-5l1-7z" /></svg>;
    case 'drop':
      return <svg {...common}><path d="M12 3.5s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z" /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5z" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

function StatusCap({ tone, text }: { tone?: string; text: string }) {
  return <span className={`c6-cap is-${tone || 'mute'}`}>{text}</span>;
}

/** 版4 · 维保计划明细行卡 */
export function MaintPlanCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-v4" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <button type="button" className="c6-code">{row.code}</button>
        <Pill tone={row.statusTone} text={row.statusText} />
      </div>
      <h3>{row.name}</h3>
      <div className="c6-v4-grid">
        <div><span>设备</span><strong>{row.device}</strong><small>{row.deviceCode}</small></div>
        <div><span>周期</span><strong>{row.period || row.shift}</strong></div>
        <div><span>负责人</span><strong>{row.owner}</strong><small>{row.ownerRole}</small></div>
        <div><span>截止</span><strong>{row.deadline || '—'}</strong></div>
      </div>
    </article>
  );
}

/** 版3 · 维保任务状态 Tabs */
export function MaintTaskCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-status-row" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-thumb" aria-hidden>维</span>
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.code}</h3>
          <Pill tone={row.statusTone} text={row.statusText} />
        </div>
        <p className="c6-sub">{row.device || row.name} · {row.deviceCode || '—'}</p>
        <p className="c6-sub">{row.owner || '—'}{row.planSub ? ` · ${row.planSub}` : ''}</p>
      </div>
      <div className="c6-side">
        <span className="c6-time">{row.deadline || row.time || ''}</span>
        <span className="c6-chev" aria-hidden>›</span>
      </div>
    </article>
  );
}

/** 版3 · 维保记录，对齐点检记录行卡 */
export function MaintRecordCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-pi-rec" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-thumb" aria-hidden>记</span>
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.device || row.name}</h3>
          <Pill tone={row.statusTone} text={row.statusText} />
        </div>
        <p className="c6-sub">执行人：{row.owner || '—'}</p>
        <p className="c6-sub">设备编号：{row.deviceCode || row.code}</p>
      </div>
      <div className="c6-side">
        <span className="c6-time">{row.time}</span>
        <span className="c6-chev" aria-hidden>›</span>
      </div>
    </article>
  );
}

/** 版4 · 维保明细 */
export function MaintBreakCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-break" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-break-item">
        <span className="c6-thumb sm" aria-hidden>{row.iconGlyph || '项'}</span>
        <strong>{row.item || row.name}</strong>
      </div>
      <dl className="c6-break-grid">
        <div><dt>标准</dt><dd>{row.standard || '—'}</dd></div>
        <div><dt>实测</dt><dd>{row.measured || '—'}</dd></div>
        <div><dt>单位</dt><dd>{row.unit || '—'}</dd></div>
        <div><dt>判定</dt><dd><span className="c6-judge">{row.judge || row.statusText}</span></dd></div>
      </dl>
    </article>
  );
}

/** 版5 · 极简开关行（维保内容 / 设置） */
export function SwitchRow({
  row,
  on,
  onToggle,
}: {
  row: FixtureRow;
  on: boolean;
  onToggle: () => void;
}) {
  if (row.navOnly) {
    return (
      <button type="button" className="c6-nav-row" data-testid="c6-card" data-layout="v5-switch-rows" onClick={onToggle}>
        <span className="c6-line-ico" aria-hidden><LineIcon name={row.iconKey} /></span>
        <strong>{row.name}</strong>
      </button>
    );
  }
  return (
    <div className="c6-switch-row" data-testid="c6-card" data-layout="v5-switch-rows">
      <span className="c6-line-ico" aria-hidden><LineIcon name={row.iconKey || 'gear'} /></span>
      <div className="c6-card-body">
        <h3>{row.name}</h3>
      </div>
      <button
        type="button"
        className={`c6-switch ${on ? 'is-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={row.name}
        data-testid="c6-switch"
        onClick={onToggle}
      >
        <i />
      </button>
    </div>
  );
}

/** 版4 · 点检计划 */
export function PiPlanCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-v4" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <h3>{row.name}</h3>
        <Pill tone={row.statusTone} text={row.statusText} />
      </div>
      <div className="c6-v4-grid cols-3">
        <div><span>设备</span><strong>{row.device}</strong></div>
        <div><span>班次</span><strong>{row.shift}</strong></div>
        <div><span>周期</span><strong>{row.period}</strong></div>
        <div><span>负责人</span><strong>{row.owner}</strong><small>{row.ownerRole}</small></div>
      </div>
    </article>
  );
}

/** 版3 · 点检记录状态 Tabs 卡 */
export function PiRecordCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-pi-rec" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-thumb" aria-hidden>{row.iconGlyph || '点'}</span>
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.name}</h3>
          <Pill tone={row.statusTone} text={row.statusText} />
        </div>
        <p className="c6-sub">区域：{row.area || '—'}</p>
        <p className="c6-sub">设备编号：{row.deviceCode || row.code}</p>
      </div>
      <div className="c6-side">
        <span className="c6-time">{row.time}</span>
        <span className="c6-chev" aria-hidden>›</span>
      </div>
    </article>
  );
}

/** 版3 · 维修工单 */
export function RepairCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-repair" data-testid="c6-card" data-layout="v3-status-tabs">
      <div className="c6-v4-head">
        <Dot tone={row.statusTone} text={row.statusText} />
        <span className={`c6-prio is-${row.priorityTone || 'mute'}`}>{row.priority}</span>
      </div>
      <h3 className="c6-wo">{row.code}</h3>
      <p className="c6-sub">{row.device} | {row.workshop}</p>
      <div className="c6-repair-foot">
        <span>{row.time}</span>
        <span>{row.owner}</span>
        <span className={`is-${row.slaTone || 'mute'}`}>{row.sla}</span>
      </div>
    </article>
  );
}

/** 版4 · 设备档案明细行 */
export function ArchiveCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-archive" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-table-row archive">
        <div className="c6-col">
          <button type="button" className="c6-code">{row.code}</button>
        </div>
        <div className="c6-col"><strong>{row.name}</strong></div>
        <div className="c6-col"><span>{row.model}</span></div>
        <div className="c6-col"><span>{row.workshop}</span></div>
        <div className="c6-col"><span>{row.owner}</span></div>
        <div className="c6-col"><Pill tone={row.statusTone} text={row.statusText} /></div>
      </div>
    </article>
  );
}

/** 版3 · 设备二维码 */
export function QrCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-qr" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-thumb qr" aria-hidden>码</span>
      <div className="c6-card-body">
        <h3>{row.name}</h3>
        <p className="c6-sub">设备编码：{row.deviceCode || row.code}</p>
        <Dot tone={row.statusTone} text={row.statusText} />
      </div>
      <span className="c6-chev" aria-hidden>›</span>
    </article>
  );
}

/** 版3 · 整改中心状态 Tabs */
export function RectifyCard({ row }: { row: FixtureRow }) {
  const capTone = row.statusText.includes('关闭') ? 'mute' : row.statusText.includes('整改中') ? 'info' : 'bad';
  return (
    <article className="c6-card c6-rectify-v3" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-thumb solid" aria-hidden><LineIcon name="factory" /></span>
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.issue || row.name}</h3>
          <StatusCap tone={capTone} text={row.statusText} />
        </div>
        <p className="c6-sub">设备编号：{row.deviceCode || row.code}</p>
        <p className="c6-meta-line">
          <span>{row.area || row.location || '—'}</span>
          <span>{row.time || row.deadline || ''}</span>
        </p>
      </div>
    </article>
  );
}

/** 版3 · 精益会议状态 Tabs */
export function MeetingCard({ row }: { row: FixtureRow }) {
  const accent = row.accent || 'blue';
  return (
    <article className={`c6-card c6-meet-v3 is-${accent}`} data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-accent-bar" aria-hidden />
      <span className={`c6-round-ico is-${accent}`} aria-hidden><LineIcon name={row.iconKey || 'factory'} /></span>
      <div className="c6-card-body">
        <h3>{row.subject || row.name}</h3>
        <p className="c6-sub">{row.location || '—'} · {row.host || '—'}</p>
        <p className="c6-sub">{row.attendees || ''}</p>
      </div>
      <div className="c6-meet-side">
        <strong>{row.timeRange || row.time}</strong>
        {row.dayLabel && <span className={`c6-day is-${row.dayTone || 'today'}`}>{row.dayLabel}</span>}
        <StatusCap tone={row.statusTone} text={row.statusText} />
      </div>
    </article>
  );
}

/** 版3 · 会议待办状态 Tabs */
export function TodoCard({ row }: { row: FixtureRow }) {
  return (
    <article className={`c6-card c6-todo-v3 is-${row.accent || 'blue'}`} data-testid="c6-card" data-layout="v3-status-tabs">
      <span className="c6-accent-bar" aria-hidden />
      <div className="c6-card-body">
        <div className="c6-todo-head">
          <StatusCap tone={row.statusTone} text={row.statusText} />
          <h3>{row.name}</h3>
          {row.priority && <span className={`c6-prio is-${row.priorityTone || 'mute'}`}>{row.priority}</span>}
        </div>
        <p className="c6-sub">{row.time || row.deadline}</p>
        <p className="c6-sub">{row.location || row.meeting || ''}</p>
        <p className="c6-sub">发起人：{row.owner || '—'}</p>
      </div>
      <span className="c6-chev" aria-hidden>›</span>
    </article>
  );
}

/** 版3 · 现场巡查状态 Tabs */
export function PatrolCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-patrol-v3" data-testid="c6-card" data-layout="v3-status-tabs">
      <span className={`c6-led is-${row.accent || 'blue'}`} aria-hidden />
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.name}</h3>
          <StatusCap tone={row.statusTone} text={row.statusText} />
        </div>
        <p className="c6-sub">{row.area || '—'}</p>
        <p className="c6-sub">责任人：{row.owner || '—'}</p>
      </div>
      <div className="c6-patrol-side">
        {row.timeLabel && <small>{row.timeLabel}</small>}
        <strong>{row.time}</strong>
        {row.chip && <span className={`c6-chip is-${row.chipTone || 'info'}`}>{row.chip}</span>}
      </div>
    </article>
  );
}

/** 版2 · 精益工作站关键 KPI 优先 */
export function StationBoard() {
  const maxQty = 2000;
  const points = STATION_KPI.trend.map((item, index) => {
    const x = ((index + 0.5) / STATION_KPI.trend.length) * 100;
    const y = 100 - item.rate;
    return { ...item, x, y };
  });
  const poly = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <div className="c6-station c6-station-v2" data-testid="c6-station-board">
      <div className="c6-kpi-banner">
        <span className="c6-kpi-banner-ico" aria-hidden><LineIcon name="check" /></span>
        <strong>关键 KPI 看板</strong>
        <div className="c6-kpi-banner-date">
          <span>{STATION_KPI.refreshedAt}</span>
          <small>{STATION_KPI.refreshHint}</small>
        </div>
      </div>
      <div className="c6-kpi3">
        <div>
          <span className="c6-kpi-ico is-blue" aria-hidden><LineIcon name="chart" /></span>
          <span>达成率</span>
          <strong className="is-blue">{STATION_KPI.rate}</strong>
          <small className="is-up">↑ {STATION_KPI.rateDelta}</small>
        </div>
        <div>
          <span className="c6-kpi-ico is-red" aria-hidden><LineIcon name="alert" /></span>
          <span>异常</span>
          <strong className="is-red">{STATION_KPI.abnormal}</strong>
          <small>{STATION_KPI.abnormalDelta}</small>
        </div>
        <div>
          <span className="c6-kpi-ico is-orange" aria-hidden><LineIcon name="clip" /></span>
          <span>待整改</span>
          <strong className="is-orange">{STATION_KPI.todo}</strong>
          <small>{STATION_KPI.todoDelta}</small>
        </div>
      </div>
      <div className="c6-chart-card" data-testid="c6-station-chart">
        <div className="c6-chart-head">
          <strong><i className="c6-led is-blue" /> 生产趋势 (近7日)</strong>
        </div>
        <div className="c6-legend">
          <span><i className="c6-legend-line" /> 达成率 (%)</span>
          <span><i className="c6-legend-bar" /> 产量 (件)</span>
        </div>
        <div className="c6-combo">
          <div className="c6-combo-y">
            <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
          </div>
          <div className="c6-combo-plot">
            <svg className="c6-combo-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <polyline points={poly} fill="none" stroke="#4184F4" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </svg>
            {points.map((p) => (
              <span key={p.day} className="c6-combo-dot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <em>{p.rate}%</em>
              </span>
            ))}
            <div className="c6-combo-bars">
              {STATION_KPI.trend.map((item) => (
                <div key={item.day} className="c6-combo-col">
                  <span className="c6-qty">{item.qty}</span>
                  <div className="c6-combo-bar" style={{ height: `${Math.round((item.qty / maxQty) * 78)}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="c6-combo-y is-right">
            <span>2000</span><span>1500</span><span>1000</span><span>500</span><span>0</span>
          </div>
        </div>
        <div className="c6-combo-x">
          {STATION_KPI.trend.map((item) => <span key={item.day}>{item.day}</span>)}
        </div>
        <div className="c6-axis-name">
          <span>达成率 (%)</span>
          <span>产量 (件)</span>
        </div>
      </div>
    </div>
  );
}

export function renderC6Card(
  layout: C6Layout,
  leafKey: string,
  row: FixtureRow,
  opts?: { switchOn?: boolean; onSwitch?: () => void },
) {
  if (leafKey === 'maint-plan') return <MaintPlanCard key={row.id} row={row} />;
  if (leafKey === 'maint-task') return <MaintTaskCard key={row.id} row={row} />;
  if (leafKey === 'maint-record') return <MaintRecordCard key={row.id} row={row} />;
  if (leafKey === 'maint-break') return <MaintBreakCard key={row.id} row={row} />;
  if (leafKey === 'maint-content' || leafKey === 'equip-base' || leafKey === 'lean-setting') {
    return (
      <SwitchRow
        key={row.id}
        row={row}
        on={opts?.switchOn ?? !!(row.settingOn ?? row.enable)}
        onToggle={() => opts?.onSwitch?.()}
      />
    );
  }
  if (leafKey === 'pi-plan') return <PiPlanCard key={row.id} row={row} />;
  if (leafKey === 'pi-record') return <PiRecordCard key={row.id} row={row} />;
  if (leafKey === 'repair-order') return <RepairCard key={row.id} row={row} />;
  if (leafKey === 'device-archive') return <ArchiveCard key={row.id} row={row} />;
  if (leafKey === 'device-qr') return <QrCard key={row.id} row={row} />;
  if (leafKey === 'lean-rectify') return <RectifyCard key={row.id} row={row} />;
  if (leafKey === 'lean-meeting') return <MeetingCard key={row.id} row={row} />;
  if (leafKey === 'lean-todo') return <TodoCard key={row.id} row={row} />;
  if (leafKey === 'lean-patrol') return <PatrolCard key={row.id} row={row} />;
  return (
    <article key={row.id} className="c6-card" data-testid="c6-card" data-layout={layout}>
      <h3>{row.name}</h3>
      <p className="c6-sub">{row.code}</p>
    </article>
  );
}
