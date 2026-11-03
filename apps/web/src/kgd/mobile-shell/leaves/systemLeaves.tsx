import { useMemo, useState } from 'react';
import { useKgd } from '../../context';
import { roleName } from '../../../api';
import { Glyph, LeafChrome, MsSwitch, PillTabs, SegTabs, matchQ, useSkinToast } from './shared';

/** 个人中心 · 版1 疏朗分组 · 双入口 */
export function PersonalLeaf() {
  const { session, onLogout, logoutBusy } = useKgd();
  const toast = useSkinToast();
  const name = session.user.display_name || '张工';
  const glyph = Array.from(name)[0] || '用';
  const [form, setForm] = useState({
    name,
    username: session.user.username || 'zhangg',
    dept: '生产管理部/生产一部',
    team: '默认团队',
    role: roleName(session.role) || '生产工',
    phone: '',
    code: '',
    oldPwd: '',
    newPwd: '',
    confirmPwd: '',
  });

  return (
    <LeafChrome
      title="个人中心"
      leafKey="personal"
      plusItems={[
        { key: 'edit', label: '编辑资料' },
        { key: 'logout', label: '退出登录' },
      ]}
      onPlus={(item) => {
        if (item.key === 'logout') {
          void onLogout();
          return;
        }
        toast.show('已进入编辑资料');
      }}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索设置项…"
    >
      <section className="ms-c8-card profile">
        <Glyph text={glyph} color="#4184F4" round />
        <div>
          <strong>{form.name}</strong>
          <span className="ms-c8-badge ok">{form.role}</span>
          <em className="ms-muted">尾号 6688</em>
        </div>
      </section>
      <section className="ms-c8-card group">
        <header className="ms-c8-group-hd">个人资料</header>
        {[
          ['姓名', 'name'],
          ['用户名', 'username'],
          ['部门', 'dept'],
          ['团队', 'team'],
          ['角色', 'role'],
        ].map(([label, key]) => (
          <label key={key} className="ms-c8-field">
            <span>{label}</span>
            <input
              value={form[key as keyof typeof form]}
              onChange={(ev) => setForm((f) => ({ ...f, [key]: ev.target.value }))}
            />
          </label>
        ))}
        <button type="button" className="ms-c8-btn solid block" onClick={() => toast.show('资料已保存')}>
          保存
        </button>
      </section>
      <section className="ms-c8-card group">
        <header className="ms-c8-group-hd">更换手机</header>
        <label className="ms-c8-field">
          <span>新手机号</span>
          <input
            placeholder="新手机号"
            value={form.phone}
            onChange={(ev) => setForm((f) => ({ ...f, phone: ev.target.value }))}
          />
        </label>
        <label className="ms-c8-field row">
          <span>短信验证码</span>
          <input value={form.code} onChange={(ev) => setForm((f) => ({ ...f, code: ev.target.value }))} />
          <button type="button" className="ms-c8-btn ghost sm" onClick={() => toast.show('验证码已发送')}>
            获取验证码
          </button>
        </label>
      </section>
      <section className="ms-c8-card group">
        <header className="ms-c8-group-hd">修改密码</header>
        {[
          ['原密码', 'oldPwd'],
          ['新密码', 'newPwd'],
          ['确认密码', 'confirmPwd'],
        ].map(([label, key]) => (
          <label key={key} className="ms-c8-field">
            <span>{label}</span>
            <input
              type="password"
              value={form[key as keyof typeof form]}
              onChange={(ev) => setForm((f) => ({ ...f, [key]: ev.target.value }))}
            />
          </label>
        ))}
      </section>
      <button
        type="button"
        className="ms-c8-btn ghost block"
        disabled={logoutBusy}
        onClick={() => void onLogout()}
      >
        {logoutBusy ? '正在退出…' : '退出登录'}
      </button>
      {toast.node}
    </LeafChrome>
  );
}

const USERS = [
  { id: '1', name: '张工', status: '启用', meta: 'zhangg · 生产工 · 生产一部 · 138****6688', color: '#4184F4' },
  { id: '2', name: '李质检', status: '启用', meta: 'liqj · 质检员 · 质检一部 · 139****1122', color: '#34A853' },
  { id: '3', name: '王仓管', status: '启用', meta: 'wangcg · 仓管 · 仓储部 · 137****3344', color: '#F5A623' },
  { id: '4', name: '虚拟报工机', status: '虚拟', meta: 'virt-rpt · 虚拟账号 · 生产 · —', color: '#7AA7F7' },
  { id: '5', name: '赵设备', status: '禁用', meta: 'zhaosb · 设备员 · 设备部 · 136****5566', color: '#9E9E9E' },
  { id: '6', name: '陈财务', status: '启用', meta: 'chencw · 财务 · 财务部 · 135****7788', color: '#8B6BC9' },
  { id: '7', name: '周主管', status: '启用', meta: 'zhouzg · 主管 · 生产管理部 · 134****9900', color: '#E85D4C' },
];

/** 用户管理 · 版5 极简 */
export function UsersLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const list = useMemo(
    () =>
      USERS.filter((u) => {
        if (tab === 'on' && u.status !== '启用') return false;
        if (tab === 'off' && u.status !== '禁用') return false;
        return matchQ(`${u.name} ${u.meta}`, q);
      }),
    [q, tab],
  );
  return (
    <LeafChrome
      title="用户管理"
      leafKey="users"
      plusItems={[
        { key: 'add', label: '新增用户' },
        { key: 'scan', label: '扫码加人' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增用户' : '已打开扫码加人')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜用户名 / 姓名 / 手机"
    >
      <div className="ms-c8-toolbar">
        <button type="button" className="ms-c8-mini" onClick={() => toast.show('已打开批量')}>
          批量
        </button>
        <button type="button" className="ms-c8-mini" onClick={() => toast.show('已打开筛选')}>
          筛选
        </button>
        <SegTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'on', label: '启用' },
            { key: 'off', label: '禁用' },
          ]}
        />
      </div>
      <section className="ms-c8-card flat">
        {list.map((u) => (
          <button key={u.id} type="button" className="ms-c8-navrow user" onClick={() => toast.show(`已打开「${u.name}」`)}>
            <Glyph text={u.name} color={u.color} round />
            <span className="ms-c8-row-main">
              <strong>
                {u.name}
                <span className={`ms-c8-badge ${u.status === '启用' ? 'ok' : u.status === '虚拟' ? 'info' : 'off'}`}>
                  {u.status}
                </span>
              </strong>
              <em>{u.meta}</em>
            </span>
            <i>›</i>
          </button>
        ))}
      </section>
      {toast.node}
    </LeafChrome>
  );
}

const ROLES = [
  { id: '1', g: '管', color: '#8B6BC9', name: '系统管理员', summary: '全模块 · 全部权限', users: '3 人', scope: '全部', on: true },
  { id: '2', g: '产', color: '#4184F4', name: '生产工', summary: '报工 / 加工单只读', users: '28 人', scope: '本部门', on: true },
  { id: '3', g: '仓', color: '#34A853', name: '仓库管理员', summary: '出入库 / 盘点', users: '6 人', scope: '仓库', on: true },
  { id: '4', g: '质', color: '#F5A623', name: '质检员', summary: '质检录入 / 不良', users: '5 人', scope: '质检', on: true },
  { id: '5', g: '财', color: '#7AA7F7', name: '财务', summary: '应收应付 / 对账', users: '2 人', scope: '财务', on: true },
  { id: '6', g: '客', color: '#9E9E9E', name: '客服人员', summary: '客户跟进只读', users: '0 人', scope: '客户', on: false },
];

/** 角色管理 · 版4 明细行卡 */
export function RolesLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [roles, setRoles] = useState(ROLES);
  const list = useMemo(
    () =>
      roles.filter((r) => {
        if (tab === 'on' && !r.on) return false;
        if (tab === 'off' && r.on) return false;
        return matchQ(`${r.name} ${r.summary}`, q);
      }),
    [roles, tab, q],
  );
  return (
    <LeafChrome
      title="角色管理"
      leafKey="roles"
      plusItems={[
        { key: 'add', label: '新增角色' },
        { key: 'copy', label: '从角色复制' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增角色' : '已打开从角色复制')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="角色名"
    >
      <div className="ms-c8-toolbar">
        <button type="button" className="ms-c8-mini" onClick={() => toast.show('创建时间')}>
          创建时间
        </button>
        <button type="button" className="ms-c8-mini" onClick={() => toast.show('启用状态')}>
          启用状态
        </button>
        <SegTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'on', label: '启用' },
            { key: 'off', label: '禁用' },
          ]}
        />
      </div>
      {list.map((r) => (
        <article key={r.id} className="ms-c8-card detail">
          <header className="ms-c8-row">
            <Glyph text={r.g} color={r.color} />
            <span className="ms-c8-row-main">
              <strong>
                {r.name}
                <span className={`ms-c8-badge ${r.on ? 'ok' : 'off'}`}>{r.on ? '启用' : '禁用'}</span>
              </strong>
              <em>权限概要 · {r.summary}</em>
            </span>
            <MsSwitch
              checked={r.on}
              label={`${r.name}启用`}
              onChange={(next) => setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: next } : x)))}
            />
          </header>
          <div className="ms-c8-grid2">
            <div>
              <span className="ms-muted">用户数</span>
              <em>{r.users}</em>
            </div>
            <div>
              <span className="ms-muted">数据范围</span>
              <em>{r.scope}</em>
            </div>
            <div>
              <span className="ms-muted">创建时间</span>
              <em>2024-06-01</em>
            </div>
            <div>
              <span className="ms-muted">操作</span>
              <em>
                <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开修改')}>
                  修改
                </button>
                <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已删除角色')}>
                  删除
                </button>
              </em>
            </div>
          </div>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}

const TEAMS = [
  { id: '1', region: '东莞', name: '生产一部', count: 18, desc: '主管 张工 · 钣金件产线报工与机台排产', avatars: ['张', '李', '王'] },
  { id: '2', region: '东莞', name: '质检一组', count: 6, desc: '主管 李质检 · 进料与成品抽检', avatars: ['李', '赵'] },
  { id: '3', region: '东莞', name: '仓储东莞', count: 8, desc: '主管 王仓管 · 原料与成品库', avatars: ['王', '陈', '周'] },
  { id: '4', region: '苏州', name: '苏州装配', count: 12, desc: '主管 陈工 · 泵站总装', avatars: ['陈', '刘'] },
  { id: '5', region: '苏州', name: '苏州售后', count: 4, desc: '主管 周客 · 华东售后工单', avatars: ['周'] },
  { id: '6', region: '默认', name: '默认团队', count: 3, desc: '系统预置 · 未分配人员暂挂', avatars: ['系'] },
];

/** 团队管理 · 版3 地区Tabs */
export function TeamsLeaf() {
  const toast = useSkinToast();
  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const counts = {
    all: TEAMS.length,
    东莞: TEAMS.filter((t) => t.region === '东莞').length,
    苏州: TEAMS.filter((t) => t.region === '苏州').length,
    默认: TEAMS.filter((t) => t.region === '默认').length,
  };
  const filtered = useMemo(
    () => TEAMS.filter((t) => (region === 'all' || t.region === region) && matchQ(`${t.name} ${t.desc}`, q)),
    [region, q],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof TEAMS>();
    for (const t of filtered) {
      const arr = map.get(t.region) || [];
      arr.push(t);
      map.set(t.region, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <LeafChrome
      title="团队管理"
      leafKey="teams"
      plusItems={[
        { key: 'add', label: '新增团队' },
        { key: 'member', label: '添加成员' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增团队' : '已打开添加成员')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="团队名 / 主管 / 地址"
    >
      <PillTabs
        value={region}
        onChange={setRegion}
        items={[
          { key: 'all', label: `全部 ${counts.all}` },
          { key: '东莞', label: `东莞 ${counts.东莞}` },
          { key: '苏州', label: `苏州 ${counts.苏州}` },
          { key: '默认', label: `默认 ${counts.默认}` },
        ]}
      />
      {grouped.map(([reg, items]) => (
        <div key={reg} className="ms-c8-region">
          <header className="ms-c8-sec-hd">
            <strong>
              {reg}厂区 · {items.length} 个团队
            </strong>
          </header>
          {items.map((t) => (
            <article key={t.id} className="ms-c8-card">
              <header className="ms-c8-card-hd">
                <strong>{t.name}</strong>
                <span className="ms-c8-badge info">{t.count} 人</span>
              </header>
              <p className="ms-c8-desc">{t.desc}</p>
              <div className="ms-c8-avatars">
                {t.avatars.map((a) => (
                  <Glyph key={a} text={a} color="#4184F4" round />
                ))}
                {t.count > t.avatars.length && <span className="ms-c8-more">+{t.count - t.avatars.length}</span>}
              </div>
              <footer className="ms-c8-card-ft end">
                <button type="button" className="ms-c8-link muted" onClick={() => toast.show('已打开添加下级')}>
                  添加下级
                </button>
                <button type="button" className="ms-c8-link muted" onClick={() => toast.show('已打开修改')}>
                  修改
                </button>
              </footer>
            </article>
          ))}
        </div>
      ))}
      {toast.node}
    </LeafChrome>
  );
}

const DEPTS = [
  { id: '1', g: '产', color: '#4184F4', name: '生产管理部', sub: '一级 · 下挂 生产一部 / 质检一部', badge: '2 下级', level: '一级', parent: '—', children: '生产一部 / 质检一部' },
  { id: '2', g: '-', color: '#7AA7F7', name: '生产一部', sub: '叶子节点', badge: '叶子', level: '二级', parent: '生产管理部', children: '无' },
  { id: '3', g: '采', color: '#34A853', name: '采销部', sub: '一级 · 下挂 采购组 / 销售组', badge: '2 下级', level: '一级', parent: '—', children: '采购组 / 销售组' },
  { id: '4', g: '售', color: '#F5A623', name: '售后部', sub: '一级 · 下挂 现场组 / 远程组', badge: '2 下级', level: '一级', parent: '—', children: '现场组 / 远程组' },
  { id: '5', g: '总', color: '#8B6BC9', name: '总经理办公室', sub: '一级 · 无下级', badge: '无下级', level: '一级', parent: '(空=顶级)', children: '无' },
];

/** 部门管理 · 版4 明细行卡 */
export function DepartmentsLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const list = useMemo(
    () =>
      DEPTS.filter((d) => {
        if (tab === 'l1' && d.level !== '一级') return false;
        if (tab === 'has' && d.badge.includes('无') ) return false;
        if (tab === 'none' && !d.badge.includes('无') && d.badge !== '叶子') return false;
        if (tab === 'none' && d.badge === '叶子') return true;
        return matchQ(`${d.name} ${d.sub}`, q);
      }),
    [q, tab],
  );
  return (
    <LeafChrome
      title="部门管理"
      leafKey="departments"
      plusItems={[
        { key: 'add', label: '新增部门' },
        { key: 'child', label: '新增下级' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增部门' : '已打开新增下级')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="部门名称 / 创建时间"
    >
      <PillTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'all', label: '全部' },
          { key: 'l1', label: '一级' },
          { key: 'has', label: '有下级' },
          { key: 'none', label: '无下级' },
        ]}
      />
      {list.map((d) => (
        <article key={d.id} className="ms-c8-card detail">
          <header className="ms-c8-row">
            <Glyph text={d.g} color={d.color} />
            <span className="ms-c8-row-main">
              <strong>{d.name}</strong>
              <em>{d.sub}</em>
            </span>
            <span className="ms-c8-badge info">{d.badge}</span>
          </header>
          <div className="ms-c8-grid2">
            <div>
              <span className="ms-muted">部门名称</span>
              <em>{d.name}</em>
            </div>
            <div>
              <span className="ms-muted">创建时间</span>
              <em>2024-03-12</em>
            </div>
            <div>
              <span className="ms-muted">下级/上级部门</span>
              <em>
                {d.children} / {d.parent}
              </em>
            </div>
            <div>
              <span className="ms-muted">操作</span>
              <em className="ms-c8-ops">
                <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开新增下级')}>
                  新增下级
                </button>
                <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开修改')}>
                  修改
                </button>
                <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已删除部门')}>
                  删除
                </button>
              </em>
            </div>
          </div>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}

const LOGS = [
  {
    id: '1',
    g: '改',
    color: '#4184F4',
    bar: '#4184F4',
    title: '修改用户',
    sub: '用户管理',
    content: '手机号变更',
    who: '张工',
    client: '企业Web',
    time: '10-28 14:22',
    before: '138****2211',
    after: '139****8800',
  },
  {
    id: '2',
    g: '审',
    color: '#F5A623',
    bar: '#F5A623',
    title: '审核通过加工单',
    sub: '生产管理',
    content: 'WO-261101-03',
    who: '周主管',
    client: '企业Web',
    time: '10-28 11:08',
  },
  {
    id: '3',
    g: '模',
    color: '#8B6BC9',
    bar: '#8B6BC9',
    title: '载入行业模板',
    sub: '企业信息',
    content: '通用制造',
    who: '系统管理员',
    client: '企业Web',
    time: '10-27 09:40',
  },
  {
    id: '4',
    g: '登',
    color: '#34A853',
    bar: '#34A853',
    title: '登录',
    sub: '帐号安全',
    content: 'admin.local',
    who: '系统管理员',
    client: '手机壳',
    time: '10-27 08:01',
  },
];

/** 操作日志 · 版4 明细行卡 · ＋=筛选｜清空条件 */
export function AuditLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState('1');
  const list = useMemo(() => LOGS.filter((l) => matchQ(`${l.title} ${l.content} ${l.who}`, q)), [q]);
  return (
    <LeafChrome
      title="操作日志"
      leafKey="audit"
      plusItems={[
        { key: 'filter', label: '筛选' },
        { key: 'clear', label: '清空条件' },
      ]}
      onPlus={(item) => toast.show(item.key === 'filter' ? '已打开筛选' : '已清空条件')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="操作 | 内容 | 操作人"
    >
      <div className="ms-c8-toolbar wrap">
        {['操作端', '操作人', '操作', '时间起止'].map((label) => (
          <button key={label} type="button" className="ms-c8-mini" onClick={() => toast.show(`已打开${label}`)}>
            {label}
          </button>
        ))}
      </div>
      {list.map((log) => (
        <article
          key={log.id}
          className={`ms-c8-card detail log ${openId === log.id ? 'is-open' : ''}`}
          style={{ borderLeftColor: log.bar }}
          onClick={() => setOpenId((id) => (id === log.id ? '' : log.id))}
        >
          <header className="ms-c8-row">
            <Glyph text={log.g} color={log.color} />
            <span className="ms-c8-row-main">
              <strong>{log.title}</strong>
              <em>{log.sub}</em>
            </span>
          </header>
          <div className="ms-c8-grid2">
            <div>
              <span className="ms-muted">操作内容</span>
              <em>{log.content}</em>
            </div>
            <div>
              <span className="ms-muted">操作端</span>
              <em>{log.client}</em>
            </div>
            <div>
              <span className="ms-muted">操作人</span>
              <em>{log.who}</em>
            </div>
            <div>
              <span className="ms-muted">操作时间</span>
              <em>{log.time}</em>
            </div>
          </div>
          {openId === log.id && log.before && (
            <div className="ms-c8-diff">
              <div>
                <span className="ms-muted">改前</span>
                <em className="before">{log.before}</em>
              </div>
              <div>
                <span className="ms-muted">改后</span>
                <em className="after">{log.after}</em>
              </div>
            </div>
          )}
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}

/** 通用设置 · 版1 现网疏朗分组 · 双入口 */
export function BasicsLeaf() {
  const toast = useSkinToast();
  const [qr, setQr] = useState(true);
  const [wm, setWm] = useState(true);
  const [wmText, setWmText] = useState('赛德瑞克 · 东莞厂区 · {操作人} · {时间}');
  const units = ['台', '个', '次', 'PCS', 'KG', '套', 'T', '支'];
  const statuses = [
    { name: '忙碌', color: '#E85D4C' },
    { name: '空闲', color: '#34A853' },
  ];
  return (
    <LeafChrome
      title="通用设置"
      leafKey="basics"
      plusItems={[
        { key: 'unit', label: '新增单位' },
        { key: 'status', label: '新增工作状态' },
      ]}
      onPlus={(item) => toast.show(item.key === 'unit' ? '已打开新增单位' : '已打开新增工作状态')}
      saveLabel="保存"
      onSave={() => toast.show('通用设置已保存')}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索设置项…"
    >
      <section className="ms-c8-card group">
        <header className="ms-c8-card-hd">
          <strong>基础开关</strong>
          <span className="ms-muted">改后记得保存</span>
        </header>
        <div className="ms-c8-row">
          <span className="ms-c8-row-main">
            <strong>二维码页显示维修记录</strong>
            <em>开启后，产品/设备二维码页展示维修记录</em>
          </span>
          <MsSwitch checked={qr} onChange={setQr} label="二维码页显示维修记录" />
        </div>
        <div className="ms-c8-row">
          <span className="ms-c8-row-main">
            <strong>拍照水印</strong>
            <em>报工/巡检/维保拍照叠加水印文案</em>
          </span>
          <MsSwitch checked={wm} onChange={setWm} label="拍照水印" />
        </div>
        <label className="ms-c8-field">
          <span>水印文案</span>
          <input value={wmText} onChange={(ev) => setWmText(ev.target.value)} />
        </label>
        <button type="button" className="ms-c8-btn solid block" onClick={() => toast.show('通用设置已保存')}>
          保存
        </button>
      </section>
      <section className="ms-c8-card group">
        <header className="ms-c8-card-hd">
          <strong>单位字典</strong>
          <span className="ms-muted">8 项 · 工业件</span>
        </header>
        <div className="ms-c8-tags left">
          {units.map((u) => (
            <span key={u}>{u}</span>
          ))}
        </div>
        {units.slice(0, 4).map((u, i) => (
          <div key={u} className="ms-c8-row compact">
            <Glyph text={String(i + 1)} color="#E8F0FE" />
            <span className="ms-c8-row-main">{u}</span>
            <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开修改')}>
              修改
            </button>
            <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已删除单位')}>
              删除
            </button>
          </div>
        ))}
      </section>
      <section className="ms-c8-card group">
        <header className="ms-c8-card-hd">
          <strong>工作状态字典</strong>
        </header>
        {statuses.map((s) => (
          <div key={s.name} className="ms-c8-row compact">
            <i className="ms-c8-status-dot" style={{ background: s.color }} />
            <span className="ms-c8-row-main">{s.name}</span>
            <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开修改')}>
              修改
            </button>
            <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已删除状态')}>
              删除
            </button>
          </div>
        ))}
      </section>
      {toast.node}
    </LeafChrome>
  );
}

/** 企业信息设置 · 版5 极简 · 双入口 · ＋勿画新增企业 */
export function CompanyLeaf() {
  const toast = useSkinToast();
  const [mods, setMods] = useState({ produce: true, after: false, device: true });
  return (
    <LeafChrome
      title="企业信息设置"
      leafKey="company"
      plusItems={[
        { key: 'tpl', label: '载入行业模板' },
        { key: 'clear', label: '清空数据' },
      ]}
      onPlus={(item) => toast.show(item.key === 'tpl' ? '已打开载入行业模板' : '已打开清空数据确认')}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索设置项…"
    >
      <section className="ms-c8-card">
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开企业资料')}>
          <Glyph text="赛" color="#4184F4" />
          <span className="ms-c8-row-main">
            <strong>
              赛德瑞克精密机械 <span className="ms-c8-badge info">标准版</span>
            </strong>
            <em>企业名称 · 头像 · 扫码页展示</em>
          </span>
          <i>›</i>
        </button>
        <div className="ms-c8-navrow static">
          <span className="ms-c8-row-main">
            <strong>系统到期时间</strong>
            <em>2027-04-30 · 剩余 180 天</em>
          </span>
          <span className="ms-c8-badge warn">只读</span>
        </div>
      </section>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>功能模块</strong>
        </header>
        {(
          [
            ['produce', '生产模块'],
            ['after', '售后模块'],
            ['device', '设备维保模块'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="ms-c8-row">
            <span className="ms-c8-row-main">{label}</span>
            <MsSwitch
              checked={mods[key]}
              label={label}
              onChange={(next) => setMods((m) => ({ ...m, [key]: next }))}
            />
          </div>
        ))}
      </section>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>其他</strong>
        </header>
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('即将开放')}>
          <span className="ms-c8-row-main">绑定企微 / 钉钉</span>
          <span className="ms-muted">即将开放 ›</span>
        </button>
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开载入行业模板')}>
          <span className="ms-c8-row-main">载入行业模板</span>
          <span className="ms-c8-link">通用制造 ›</span>
        </button>
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开清空数据确认')}>
          <span className="ms-c8-row-main danger-text">清空系统数据</span>
          <i>›</i>
        </button>
      </section>
      <button type="button" className="ms-c8-btn solid block" onClick={() => toast.show('企业信息已保存')}>
        保存
      </button>
      {toast.node}
    </LeafChrome>
  );
}

/** 短信设置 · 版2 余量英雄 · 双入口 */
export function SmsLeaf() {
  const toast = useSkinToast();
  return (
    <LeafChrome
      title="短信设置"
      leafKey="sms"
      plusItems={[
        { key: 'buy', label: '购买套餐' },
        { key: 'logs', label: '查看发送记录' },
      ]}
      onPlus={(item) => toast.show(item.key === 'buy' ? '已打开购买套餐' : '已打开发送记录')}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索记录…"
    >
      <section className="ms-c8-hero">
        <span>当前剩余短信</span>
        <strong>
          1,286 <small>条</small>
        </strong>
        <em>工业件通知通道 · 工单完工 / 到货质检 / 报工提醒</em>
        <p>低余量时请及时购买套餐</p>
      </section>
      <header className="ms-c8-sec-hd">
        <strong>充值套餐</strong>
      </header>
      <div className="ms-c8-packs">
        {[
          { n: '2,000', price: '¥249' },
          { n: '5,000', price: '¥399', hot: true },
          { n: '10,000', price: '¥749' },
        ].map((p) => (
          <div key={p.n} className={`ms-c8-pack ${p.hot ? 'hot' : ''}`}>
            {p.hot && <span className="ms-c8-hot">推荐</span>}
            <strong>{p.n} 条</strong>
            <em>{p.price}</em>
            <button type="button" className="ms-c8-btn solid sm" onClick={() => toast.show('已打开购买套餐')}>
              购买
            </button>
          </div>
        ))}
      </div>
      <section className="ms-c8-card flat">
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开购买套餐')}>
          <span className="ms-c8-row-main">购买套餐</span>
          <span className="ms-c8-link">联系平台 ›</span>
        </button>
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开充值记录')}>
          <span className="ms-c8-row-main">充值记录</span>
          <span className="ms-muted">套餐/金额/条数/时间 ›</span>
        </button>
        <button type="button" className="ms-c8-navrow" onClick={() => toast.show('已打开发送记录')}>
          <span className="ms-c8-row-main">发送记录</span>
          <span className="ms-muted">手机号/内容/时间 ›</span>
        </button>
      </section>
      <header className="ms-c8-sec-hd">
        <strong>最近发送</strong>
      </header>
      <section className="ms-c8-card flat">
        <div className="ms-c8-chat">
          <Glyph text="发" color="#34A853" />
          <span className="ms-c8-chat-main">
            <strong>138****6621</strong>
            <em>【赛德瑞克】工单 WO-241018 已完工入库</em>
          </span>
          <time>10-28</time>
        </div>
      </section>
      {toast.node}
    </LeafChrome>
  );
}

const CODE_RULES = [
  { id: '01', name: '报价单号', rule: 'BJ + 年月日 + 流水号', preview: 'BJ20261005001', note: '元素 1 固定文本 BJ · 流水 3 位起 1', cat: '单据类' },
  { id: '02', name: '客户编号', rule: 'KH + 流水号', preview: 'KH000001', note: '主数据编号 · 流水 6 位', cat: '主数据' },
  { id: '03', name: '加工单号', rule: 'JG + 年月日 + 流水号', preview: 'JG20261101003', note: '工业件工单 · 与生产报工同源', cat: '单据类' },
  { id: '04', name: '销售出库单号', rule: 'HTCK + 年月日 + 流水号', preview: 'HTCK20261028012', note: '仓库出库 · 共 44 条可下滑', cat: '仓库出入' },
];

/** 自定义编号规则 · 版1 疏朗卡片 · 双入口 · ＋=筛选｜列配置 */
export function CodeRulesLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const list = useMemo(
    () => CODE_RULES.filter((r) => (cat === 'all' || r.cat === cat) && matchQ(`${r.name} ${r.rule} ${r.preview}`, q)),
    [q, cat],
  );
  return (
    <LeafChrome
      title="自定义编号规则"
      leafKey="code-rules"
      plusItems={[
        { key: 'filter', label: '筛选' },
        { key: 'cols', label: '列配置' },
      ]}
      onPlus={(item) => toast.show(item.key === 'filter' ? '已打开筛选' : '已打开列配置')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="编号名称, 如 '报价单'"
    >
      <PillTabs
        value={cat}
        onChange={setCat}
        items={[
          { key: 'all', label: '全部 44' },
          { key: '单据类', label: '单据类' },
          { key: '主数据', label: '主数据' },
          { key: '仓库出入', label: '仓库出入' },
        ]}
      />
      {list.map((r) => (
        <article key={r.id} className="ms-c8-card">
          <header className="ms-c8-card-hd">
            <span className="ms-c8-idx">{r.id}</span>
            <strong>{r.name}</strong>
            <span className="ms-c8-badge info">预置</span>
          </header>
          <p className="ms-c8-desc">规则 · {r.rule}</p>
          <div className="ms-c8-preview">
            <span>编号预览</span>
            <strong>{r.preview}</strong>
          </div>
          <footer className="ms-c8-card-ft">
            <span className="ms-muted">{r.note}</span>
            <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开修改')}>
              修改
            </button>
          </footer>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}
