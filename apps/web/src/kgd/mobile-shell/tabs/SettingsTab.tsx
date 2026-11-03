import { useNavigate } from 'react-router-dom';
import { useKgd } from '../../context';
import { IconChevron } from '../icons';
import { roleName } from '../../../api';

type Row = { key: string; label: string; value?: string; glyph: string; color: string; path?: string; action?: 'logout' | 'about' };

const GROUP_A: Row[] = [
  { key: 'enterprise', label: '企业信息', value: '演示', glyph: '企', color: '#4184F4', path: '/setting/enterprise/setting' },
  { key: 'basics', label: '通用', value: '语言 / 时区', glyph: '通', color: '#2AA8A0', path: '/setting/basics' },
  { key: 'sms', label: '短信', value: '模板 / 通道', glyph: '信', color: '#F5A623', path: '/setting/sms' },
  { key: 'codes', label: '编号规则', value: '单据前缀', glyph: '号', color: '#8B6BC9', path: '/setting/customCodeRules' },
];

const GROUP_B: Row[] = [
  { key: 'personal', label: '个人 / 帐套', value: '切换帐套', glyph: '人', color: '#34A853', path: '/account' },
  { key: 'notice', label: '通知', value: '已开启', glyph: '铃', color: '#E85D4C', path: '/ms/leaf?key=notice&title=%E9%80%9A%E7%9F%A5' },
  { key: 'security', label: '安全', value: '改密 / 手机', glyph: '锁', color: '#E85A9B', path: '/account' },
];

/** C1c：生产设置 4 叶 */
const GROUP_PRODUCE: Row[] = [
  { key: 'produce-dict-menu', label: '基础配置', value: '生产设置', glyph: '配', color: '#4184F4', path: '/setting/produce/dictionary' },
  { key: 'perf-pay', label: '绩效工资设置', value: '生产设置', glyph: '绩', color: '#2AA8A0', path: '/setting/PerformancePay/list' },
  { key: 'auto-stock', label: '自动出入库设置', value: '生产设置', glyph: '自', color: '#F5A623', path: '/setting/auto_stock_manage' },
  { key: 'station', label: '工作站设置', value: '生产设置', glyph: '站', color: '#8B6BC9', path: '/setting/produce/station' },
];

/** C1c：仓库设置 2 叶 */
const GROUP_STOCK: Row[] = [
  { key: 'stock-setting', label: '基础设置', value: '仓库设置', glyph: '仓', color: '#34A853', path: '/setting/stock/setting' },
  { key: 'stock-audit', label: '审核设置', value: '仓库设置', glyph: '审', color: '#E85D4C', path: '/setting/stock/audit_setting' },
];

export function SettingsTab() {
  const { session, onLogout, logoutBusy } = useKgd();
  const navigate = useNavigate();
  const name = session.user.display_name;
  const glyph = Array.from(name)[0] || '用';

  function openRow(row: Row) {
    if (row.action === 'logout') {
      void onLogout();
      return;
    }
    if (row.action === 'about') {
      navigate('/ms/leaf?key=about&title=' + encodeURIComponent('关于赛德瑞克 MES'));
      return;
    }
    if (!row.path) return;
    if (row.path.startsWith('/ms/')) navigate(row.path);
    else navigate(`/ms/leaf?key=${encodeURIComponent(row.key)}&title=${encodeURIComponent(row.label)}&path=${encodeURIComponent(row.path)}`);
  }

  return (
    <div className="ms-settings" data-testid="ms-settings">
      <button type="button" className="ms-profile" onClick={() => navigate('/ms/leaf?key=personal&title=%E4%B8%AA%E4%BA%BA%E4%B8%AD%E5%BF%83&path=%2Faccount')}>
        <span className="ms-avatar lg" style={{ background: '#4184F4' }}>{glyph}</span>
        <span className="ms-profile-main">
          <strong>{name}</strong>
          <span>用户 · {roleName(session.role)}</span>
          <span>帐套：{session.tenant.name}</span>
        </span>
        <IconChevron className="ms-chevron" />
      </button>

      <div className="ms-set-group">
        {GROUP_A.map((row) => (
          <button key={row.key} type="button" className="ms-set-row" onClick={() => openRow(row)}>
            <span className="ms-avatar sm" style={{ background: row.color }}>{row.glyph}</span>
            <span className="ms-set-label">{row.label}</span>
            <span className="ms-set-value">{row.value}</span>
            <IconChevron className="ms-chevron" />
          </button>
        ))}
      </div>

      <div className="ms-set-group">
        {GROUP_B.map((row) => (
          <button key={row.key} type="button" className="ms-set-row" onClick={() => openRow(row)}>
            <span className="ms-avatar sm" style={{ background: row.color }}>{row.glyph}</span>
            <span className="ms-set-label">{row.label}</span>
            <span className="ms-set-value">{row.value}</span>
            <IconChevron className="ms-chevron" />
          </button>
        ))}
      </div>

      <div className="ms-set-group" data-group="produce-setting">
        {GROUP_PRODUCE.map((row) => (
          <button key={row.key} type="button" className="ms-set-row" data-leaf-key={row.key} onClick={() => openRow(row)}>
            <span className="ms-avatar sm" style={{ background: row.color }}>{row.glyph}</span>
            <span className="ms-set-label">{row.label}</span>
            <span className="ms-set-value">{row.value}</span>
            <IconChevron className="ms-chevron" />
          </button>
        ))}
      </div>

      <div className="ms-set-group" data-group="wh-setting">
        {GROUP_STOCK.map((row) => (
          <button key={row.key} type="button" className="ms-set-row" data-leaf-key={row.key} onClick={() => openRow(row)}>
            <span className="ms-avatar sm" style={{ background: row.color }}>{row.glyph}</span>
            <span className="ms-set-label">{row.label}</span>
            <span className="ms-set-value">{row.value}</span>
            <IconChevron className="ms-chevron" />
          </button>
        ))}
      </div>

      <div className="ms-set-group">
        <button type="button" className="ms-set-row" onClick={() => openRow({ key: 'about', label: '关于赛德瑞克 MES', glyph: '关', color: '#333', action: 'about' })}>
          <span className="ms-avatar sm" style={{ background: '#333' }}>关</span>
          <span className="ms-set-label">关于赛德瑞克 MES</span>
          <IconChevron className="ms-chevron" />
        </button>
      </div>

      <div className="ms-set-group">
        <button type="button" className="ms-set-row" disabled={logoutBusy} onClick={() => openRow({ key: 'logout', label: '退出登录', glyph: '退', color: '#9E9E9E', action: 'logout' })}>
          <span className="ms-avatar sm" style={{ background: '#9E9E9E' }}>退</span>
          <span className="ms-set-label">{logoutBusy ? '正在退出…' : '退出登录'}</span>
          <IconChevron className="ms-chevron" />
        </button>
      </div>
    </div>
  );
}
