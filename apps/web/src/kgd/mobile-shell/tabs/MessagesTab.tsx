type SessionRow = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  pinned?: boolean;
  group?: boolean;
  color: string;
  glyph: string;
};

/** 纯会话列表皮；审批/系统/报工均为会话行（禁止独立待办区） */
const DEMO: SessionRow[] = [
  { id: '1', name: '审批助手', preview: '报价合同待审 BJ-2026-012 · ¥128,000', time: '刚刚', unread: 2, pinned: true, color: '#4184F4', glyph: '审' },
  { id: '2', name: '系统通知', preview: '报工确认 · 半成品入库 WO-8841', time: '09:28', unread: 3, pinned: true, color: '#F5A623', glyph: '系' },
  { id: '3', name: '文员小李', preview: '请您审批一下这份报价', time: '昨天', unread: 1, color: '#34A853', glyph: '李' },
  { id: '4', name: '一车间生产群', preview: '张工：CNC-03 精车工序已报工', time: '昨天', group: true, color: '#8B6BC9', glyph: '一' },
  { id: '5', name: '王班长', preview: '明天下午三点开精益会议', time: '周一', color: '#E85D4C', glyph: '王' },
  { id: '6', name: '采购小陈', preview: '供应商交期已确认，可下单', time: '周一', color: '#2AA8A0', glyph: '陈' },
  { id: '7', name: '报工助手', preview: '今日报工 12 条待确认', time: '上周', color: '#5B9CF5', glyph: '报' },
  { id: '8', name: '仓库通知', preview: '原料入库单 RK-339 已审核', time: '上周', color: '#C49A3C', glyph: '仓' },
];

export function MessagesTab() {
  return (
    <div className="ms-list ms-messages" data-testid="ms-messages">
      {DEMO.map((row) => (
        <button key={row.id} type="button" className="ms-session-row" aria-label={`会话 ${row.name}`}>
          <span className="ms-avatar" style={{ background: row.color }}>
            {row.glyph}
            {!!row.unread && <i className="ms-badge">{row.unread}</i>}
          </span>
          <span className="ms-session-main">
            <span className="ms-session-top">
              <span className="ms-session-name">
                {row.name}
                {row.pinned && <em className="ms-tag-pin">置顶</em>}
                {row.group && <em className="ms-tag-group">群</em>}
              </span>
              <span className="ms-session-time">{row.time}</span>
            </span>
            <span className="ms-session-preview">{row.preview}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
