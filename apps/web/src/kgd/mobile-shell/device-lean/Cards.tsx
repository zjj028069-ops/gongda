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

/** 版4 · 维保任务 */
export function MaintTaskCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-v4 c6-task" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-table-row">
        <div className="c6-col">
          <button type="button" className="c6-code">{row.code}</button>
        </div>
        <div className="c6-col">
          <strong>{row.device}</strong>
          <small>{row.deviceCode}</small>
        </div>
        <div className="c6-col">
          <strong>{row.plan}</strong>
          <small>{row.planSub}</small>
        </div>
        <div className="c6-col">
          <strong>{row.owner}</strong>
          <small>{row.ownerRole}</small>
        </div>
        <div className="c6-col">
          <strong>{row.deadline}</strong>
        </div>
        <div className="c6-col">
          <Pill tone={row.statusTone} text={row.statusText} />
        </div>
      </div>
    </article>
  );
}

/** 版4 · 维保记录 */
export function MaintRecordCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-v4" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <button type="button" className="c6-code">{row.code}</button>
        <Pill tone={row.statusTone} text={row.statusText} />
      </div>
      <div className="c6-device-line">
        <span className="c6-thumb sm" aria-hidden>设</span>
        <div>
          <strong>{row.device || row.name}</strong>
          <small>{row.deviceCode}</small>
        </div>
      </div>
      <div className="c6-v4-meta">
        <span>{row.owner}<small> · {row.ownerRole}</small></span>
        <span>{row.time}<small> {row.relative ? `(${row.relative})` : ''}</small></span>
      </div>
      {row.note && <p className="c6-note">{row.note}</p>}
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

/** 版1 · 维保内容疏朗 */
export function MaintContentCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-content" data-testid="c6-card" data-layout="v1-sparse">
      <span className="c6-thumb" aria-hidden>{row.iconGlyph || '内'}</span>
      <div className="c6-card-body">
        <div className="c6-v4-head">
          <h3>{row.name}</h3>
          {row.category && <span className="c6-cat">{row.category}</span>}
        </div>
        <p className="c6-sub">{row.note}</p>
        <p className="c6-sub">{row.standard} · {row.planSub}</p>
      </div>
      <span className={`c6-toggle ${row.enable !== false ? 'is-on' : ''}`} aria-hidden data-testid="c6-toggle"><i /></span>
    </article>
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

/** 版1 · 设置项 */
export function SettingCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-setting" data-testid="c6-card" data-layout="v1-settings">
      <span className="c6-thumb sm" aria-hidden>{row.iconGlyph || '设'}</span>
      <div className="c6-card-body">
        <h3>{row.name}</h3>
        <p className="c6-sub">{row.settingDesc}</p>
      </div>
      {row.settingSide && <span className="c6-setting-side">{row.settingSide}</span>}
      <span className={`c6-toggle ${row.settingOn ? 'is-on' : ''}`} aria-hidden data-testid="c6-toggle"><i /></span>
    </article>
  );
}

/** 版4 · 整改中心 */
export function RectifyCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-rectify" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <span className="c6-tag">整改任务</span>
        <Dot tone={row.statusTone} text={row.statusText} />
      </div>
      <div className="c6-v4-grid cols-2">
        <div><span>单号</span><strong className="is-accent">{row.code}</strong></div>
        <div><span>责任人</span><strong>{row.owner}</strong></div>
        <div><span>问题</span><strong>{row.issue}</strong></div>
        <div><span>日期</span><strong>{row.deadline}</strong></div>
        <div><span>来源</span><strong>{row.source}</strong></div>
      </div>
      <div className="c6-rectify-act">
        <button type="button" className="c6-btn-pill">{row.statusText}</button>
      </div>
    </article>
  );
}

/** 版4 · 精益会议 */
export function MeetingCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-meeting" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-meet-row"><span className="c6-thumb sm">题</span><div><small>主题</small><strong>{row.subject || row.name}</strong></div></div>
      <div className="c6-meet-row"><span className="c6-thumb sm">时</span><div><small>时间</small><strong>{row.time}</strong></div></div>
      <div className="c6-meet-row"><span className="c6-thumb sm">地</span><div><small>地点</small><strong>{row.location}</strong></div></div>
      <div className="c6-meet-row"><span className="c6-thumb sm">主</span><div><small>主持人</small><strong>{row.host}</strong></div></div>
      <div className="c6-meet-row"><span className="c6-thumb sm">人</span><div><small>参会</small><strong>{row.attendees}</strong></div></div>
      <div className="c6-meet-row"><span className="c6-thumb sm">态</span><div><small>状态</small><strong><Pill tone={row.statusTone} text={row.statusText} /></strong></div></div>
    </article>
  );
}

/** 版4 · 会议待办 */
export function TodoCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-todo" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <h3>{row.name}</h3>
        <Pill tone={row.statusTone} text={row.statusText} />
      </div>
      <p className="c6-sub">{row.note}</p>
      <div className="c6-v4-grid cols-2">
        <div><span>来源会议</span><strong>{row.meeting}</strong><small>{row.meetingTime}</small></div>
        <div><span>责任人</span><strong>{row.owner}</strong><small>{row.ownerRole}</small></div>
        <div><span>期限</span><strong>{row.deadline}</strong></div>
        <div><span>优先级</span><strong><Dot tone={(row.priorityTone as FixtureRow['statusTone']) || 'mute'} text={row.priority || '—'} /></strong></div>
      </div>
    </article>
  );
}

/** 版4 · 现场巡查 */
export function PatrolCard({ row }: { row: FixtureRow }) {
  return (
    <article className="c6-card c6-patrol" data-testid="c6-card" data-layout="v4-detail-lines">
      <div className="c6-v4-head">
        <h3>📍 {row.name}</h3>
        <Pill tone={row.statusTone} text={row.statusText} />
      </div>
      <div className="c6-v4-grid cols-2">
        <div><span>区域</span><strong>{row.area}</strong></div>
        <div><span>发现项</span><strong>{row.found ?? 0}</strong></div>
        <div><span>结果</span><strong>{row.result}</strong></div>
        <div><span>巡查人</span><strong>{row.owner}</strong></div>
      </div>
      <p className="c6-time-line">时间 {row.time}</p>
    </article>
  );
}

/** 版1 · 精益工作站图表皮 */
export function StationBoard({ rows }: { rows: FixtureRow[] }) {
  const max = Math.max(...STATION_KPI.bars.map((b) => b.value), 1);
  return (
    <div className="c6-station" data-testid="c6-station-board">
      <div className="c6-kpi-row">
        <div className="c6-kpi">
          <span>达成率</span>
          <strong className="is-accent">{STATION_KPI.rate}</strong>
          <small className="is-ok">{STATION_KPI.rateDelta}</small>
        </div>
        <div className="c6-kpi">
          <span>OEE</span>
          <strong className="is-ok">{STATION_KPI.oee}</strong>
          <small className="is-ok">{STATION_KPI.oeeDelta}</small>
        </div>
      </div>
      <div className="c6-chart-card" data-testid="c6-station-chart">
        <div className="c6-chart-head">
          <strong>本周报工</strong>
          <small>单位: 小时</small>
        </div>
        <div className="c6-bars">
          {STATION_KPI.bars.map((bar) => (
            <div key={bar.day} className="c6-bar-col">
              <span className="c6-bar-val">{bar.value}</span>
              <div className="c6-bar" style={{ height: `${Math.round((bar.value / max) * 100)}%` }} />
              <span className="c6-bar-day">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="c6-wo-list">
        <div className="c6-wo-head"><span>工单 / 产线</span><span>状态 / 达成率</span></div>
        {rows.map((row) => (
          <article key={row.id} className="c6-card c6-wo-row" data-testid="c6-card" data-layout="v1-station">
            <span className="c6-thumb sm">单</span>
            <div className="c6-card-body">
              <strong>{row.code}</strong>
              <small>产线: {row.workshop || row.name}</small>
            </div>
            <Pill tone={row.statusTone} text={row.statusText} />
            <strong className="c6-rate">{row.result}</strong>
            <span className="c6-chev">›</span>
          </article>
        ))}
      </div>
      <div className="c6-kpi-row">
        <div className="c6-kpi">
          <span>今日计划报工</span>
          <strong className="is-accent">{STATION_KPI.planHours} 小时</strong>
          <small>已完成 {STATION_KPI.doneHours} 小时</small>
        </div>
        <div className="c6-kpi">
          <span>在制工单数</span>
          <strong className="is-ok">{STATION_KPI.wip} 个</strong>
          <small className="is-ok">{STATION_KPI.wipDelta}</small>
        </div>
      </div>
    </div>
  );
}

export function renderC6Card(layout: C6Layout, leafKey: string, row: FixtureRow) {
  if (leafKey === 'maint-plan') return <MaintPlanCard key={row.id} row={row} />;
  if (leafKey === 'maint-task') return <MaintTaskCard key={row.id} row={row} />;
  if (leafKey === 'maint-record') return <MaintRecordCard key={row.id} row={row} />;
  if (leafKey === 'maint-break') return <MaintBreakCard key={row.id} row={row} />;
  if (leafKey === 'maint-content') return <MaintContentCard key={row.id} row={row} />;
  if (leafKey === 'pi-plan') return <PiPlanCard key={row.id} row={row} />;
  if (leafKey === 'pi-record') return <PiRecordCard key={row.id} row={row} />;
  if (leafKey === 'repair-order') return <RepairCard key={row.id} row={row} />;
  if (leafKey === 'device-archive') return <ArchiveCard key={row.id} row={row} />;
  if (leafKey === 'device-qr') return <QrCard key={row.id} row={row} />;
  if (leafKey === 'equip-base' || leafKey === 'lean-setting') return <SettingCard key={row.id} row={row} />;
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
