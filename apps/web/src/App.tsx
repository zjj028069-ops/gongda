import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest, hasPermission, errorMessage, isAbort, roleName } from './api';
import type { Session, Unit } from './api';
import { Audit } from './Audit';
import { PlatformSettings, TenantSwitcher } from './PlatformSettings';
import { ConfigurationSettings } from './ConfigurationSettings';
import { AssetSettings } from './AssetSettings';
import { Notifications } from './EventSettings';
import { Overview } from './Overview';
import { Products } from './Products';
import { MasterData } from './MasterData';
import { DesignPreview } from './DesignPreview';
import { BusinessDocuments } from './BusinessDocuments';
import { MobileReportPrototype } from './MobileReportPrototype';
import { MobileReport } from './MobileReport';
import { ProductionCorrections } from './ProductionCorrections';
import { BusinessCompletion } from './BusinessCompletion';
const ExpensesReports = lazy(() => import('./ExpensesReports').then(m => ({default:m.ExpensesReports})));
const WarehouseOperations = lazy(() => import('./WarehouseOperations').then(m => ({default:m.WarehouseOperations})));
import { ProductionDesk } from './ProductionDesk';
import { Loading, Notice } from './shared';
const ControlConsole = lazy(() => import('./ControlConsole').then(m => ({default:m.ControlConsole})));

type Page = 'overview' | 'products' | 'audit' | 'planned' | 'units' | 'processes' | 'routes' | 'boms' | 'workflow_preview' | 'mobile_preview' | 'document_preview' | 'platform' | 'configuration' | 'assets' | 'notifications' | 'sales' | 'production' | 'stock' | 'mobile_report' | 'business_completion' | 'expenses_reports' | 'warehouse_operations' | 'corrections';
const plannedModules = [
  { name: '质量扩展', icon: '◇', description: '自动抽样方案、不良目录与委外质检仍待后续' },
  { name: '计划与排程', icon: '▦', description: '甘特排程、父子工单与多工厂协同仍待后续' },
];

function validSession(value: unknown): value is Session {
  const result = value as Partial<Session> | null;
  return !!result && typeof result.csrf_token === 'string' && !!result.csrf_token
    && !!result.user && result.user.id !== undefined && typeof result.user.display_name === 'string'
    && !!result.tenant && result.tenant.id !== undefined && typeof result.tenant.name === 'string'
    && typeof result.tenant.slug === 'string' && ['all', 'department', 'self'].includes(result.data_scope ?? '') && Array.isArray(result.permissions) && result.permissions.every(item => typeof item === 'string') && ['admin', 'planner', 'worker'].includes(result.role ?? '');
}

export default function App() {
  return window.location.pathname.startsWith('/platform-admin') ? <Suspense fallback={<Loading />}><ControlConsole /></Suspense> : <TenantApp />;
}

function TenantApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreRetry, setRestoreRetry] = useState(0);
  const [connectionError, setConnectionError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setRestoring(true);
    setConnectionError('');
    apiRequest<Session>('/api/auth/me', { signal: controller.signal })
      .then((result) => {
        if (!validSession(result)) throw new Error('登录会话响应格式无法识别。');
        setSession(result);
      })
      .catch((failure: unknown) => {
        if (isAbort(failure)) return;
        setSession(null);
        if (!(failure instanceof ApiError && failure.status === 401)) setConnectionError(errorMessage(failure));
      })
      .finally(() => { if (!controller.signal.aborted) setRestoring(false); });
    return () => controller.abort();
  }, [restoreRetry]);

  const expired = useCallback(() => {
    setSession(null);
    setLogoutError('');
    setLoginNotice('会话已失效，请重新登录。尚未提交的内容不会自动写入。');
  }, []);

  async function logout() {
    if (!session || logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError('');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', csrfToken: session.csrf_token });
      setSession(null);
      setLoginNotice('已退出登录。可以使用其他企业的账号重新登录。');
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) expired();
      else setLogoutError(`退出未完成：${errorMessage(failure)}`);
    } finally { setLogoutBusy(false); }
  }

  if (restoring) return <div className="startup-screen"><Brand /><Loading label="正在确认登录状态…" /></div>;
  if (!session) return <Login connectionError={connectionError} notice={loginNotice} onRetry={() => setRestoreRetry((value) => value + 1)} onLogin={(result) => { setConnectionError(''); setLoginNotice(''); setLogoutError(''); setSession(result); }} />;
  return <Workspace key={`${session.tenant.id}:${session.user.id}:${session.role}`} session={session} onExpired={expired} onSession={setSession} onLogout={logout} logoutBusy={logoutBusy} logoutError={logoutError} />;
}

function Brand() {
  return <div className="brand"><span className="brand-symbol" aria-hidden="true">工</span><span>工单协作平台<small>企业生产协作</small></span></div>;
}

function Login({ connectionError, notice, onRetry, onLogin }: { connectionError: string; notice: string; onRetry: () => void; onLogin: (session: Session) => void }) {
  const [slug, setSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<Session>('/api/auth/login', { method: 'POST', body: { tenant_slug: slug.trim(), username: username.trim(), password } });
      if (!validSession(result)) throw new Error('登录响应格式无法识别。');
      setPassword('');
      onLogin(result);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  return <div className="login-layout">
    <section className="login-intro"><Brand /><div className="login-story"><span className="intro-label">企业工作空间</span><h1>让每一份档案<br />有清晰的归属。</h1><p>从可靠的企业数据基础开始，连接产品、人员与操作记录。</p><div className="intro-features"><span>企业账号</span><span>产品档案</span><span>操作审计</span></div></div><div className="intro-foot">当前交付阶段 · 生产主线</div><div className="intro-decoration" aria-hidden="true"><span /><span /><span /></div></section>
    <main className="login-main"><div className="login-card"><div className="eyebrow">欢迎回来</div><h2>登录工作空间</h2><p className="login-subtitle">使用已开通企业的账号访问销售、生产和库存。</p>
      {connectionError && <Notice><div>{connectionError}</div><button className="text-button" type="button" onClick={onRetry}>重新确认连接</button></Notice>}
      {notice && <Notice kind="info">{notice}</Notice>}
      {error && <Notice>{error}</Notice>}
      <form onSubmit={submit} className="login-form">
        <label className="form-field"><span>企业标识</span><input value={slug} onChange={(event) => setSlug(event.target.value)} disabled={busy} required autoComplete="organization" placeholder="请输入企业标识" autoCapitalize="none" spellCheck={false} /></label>
        <label className="form-field"><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy} required autoComplete="username" placeholder="请输入账号" autoCapitalize="none" spellCheck={false} /></label>
        <label className="form-field"><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required autoComplete="current-password" placeholder="请输入密码" /></label>
        <button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? '正在登录…' : '登录工作空间'}<span aria-hidden="true">→</span></button>
      </form><p className="login-help">企业标识与账号由企业管理员提供。</p><p className="login-help">平台运营人员请使用 <a href="/platform-admin">平台管理后台</a>。</p><div className="login-stage">销售、加工、报工、库存和发货已落库。采购、检验、工价、成本与收付款已接入真实业务。</div>
    </div></main>
  </div>;
}

function Workspace({ session, onExpired, onSession, onLogout, logoutBusy, logoutError }: { session: Session; onSession: (session: Session) => void; onExpired: () => void; onLogout: () => void; logoutBusy: boolean; logoutError: string }) {
  const [page, setPage] = useState<Page>('overview');
  const [planned, setPlanned] = useState(plannedModules[0].name);
  const [revision, setRevision] = useState(0);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const allowed = hasPermission(session, 'audit.read');
  const masterReadable = hasPermission(session, 'master.read');
  const allScope = session.data_scope === 'all';
  const salesOk = hasPermission(session, 'sales.read') && allScope;
  const productionOk = hasPermission(session, 'production.read') && allScope;
  const stockOk = hasPermission(session, 'inventory.read') && allScope;
  const reportOk = hasPermission(session, 'production.report') && allScope;

  useEffect(() => {
    if (!masterReadable || !allScope) { setUnits([]); setUnitsLoading(false); setUnitsError(''); return; }
    const controller = new AbortController();
    setUnitsLoading(true); setUnitsError('');
    apiRequest<{ items: Unit[] }>('/api/units', { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result.items)) throw new Error('计量单位数据格式无法识别。');
        setUnits(result.items.filter((item) => item.active !== false));
      })
      .catch((failure: unknown) => {
        if (isAbort(failure)) return;
        if (failure instanceof ApiError && failure.status === 401) onExpired();
        else setUnitsError(errorMessage(failure));
      })
      .finally(() => { if (!controller.signal.aborted) setUnitsLoading(false); });
    return () => controller.abort();
  }, [onExpired, revision, masterReadable, allScope]);

  function navigate(next: Page) { setPage(next); setMobileMenu(false); }
  const changed = useCallback(() => {
    setRevision((value) => value + 1);
    apiRequest<Session>('/api/auth/me').then(onSession).catch((failure: unknown) => { if (failure instanceof ApiError && failure.status === 401) onExpired(); });
  }, [onSession, onExpired]);
  return <div className="app-layout">
    {mobileMenu && <button className="sidebar-shade" aria-label="关闭导航" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}><Brand /><div className="workspace-chip"><span className="workspace-dot" /><span>{session.tenant.name}<small>{session.tenant.slug}</small></span></div>
      <nav aria-label="主导航"><div className="nav-label">工作空间</div><NavButton active={page === 'overview'} icon="▦" label="企业概览" onClick={() => navigate('overview')} /><NavButton active={page === 'products'} icon="▣" label="产品档案" disabled={!masterReadable} onClick={() => navigate('products')} /><NavButton active={page === 'audit'} icon="≡" label="操作审计" disabled={!allowed} onClick={() => navigate('audit')} />
        <NavButton active={page === 'notifications'} icon="✉" label="站内消息" onClick={() => navigate('notifications')} /><div className="nav-label nav-label-gap">基础规则</div><NavButton active={page === 'units'} icon="◈" label="计量单位" disabled={!masterReadable || !allScope} onClick={() => navigate('units')} /><NavButton active={page === 'processes'} icon="≋" label="生产工序" disabled={!masterReadable || !allScope} onClick={() => navigate('processes')} /><NavButton active={page === 'routes'} icon="⇢" label="工艺路线" disabled={!masterReadable || !allScope} onClick={() => navigate('routes')} /><NavButton active={page === 'boms'} icon="⊞" label="产品 BOM" disabled={!masterReadable || !allScope} onClick={() => navigate('boms')} /><div className="nav-label nav-label-gap">平台配置</div><NavButton active={page === 'platform'} icon="◉" label="企业组织与权限" onClick={() => navigate('platform')} /><NavButton active={page === 'configuration'} icon="⚙" label="字段与界面配置" disabled={!hasPermission(session, 'configuration.read')} onClick={() => navigate('configuration')} /><NavButton active={page === 'assets'} icon="⌕" label="附件与服务额度" disabled={!hasPermission(session, 'attachments.read')} onClick={() => navigate('assets')} /><div className="nav-label nav-label-gap">生产主线</div><NavButton active={page === 'sales'} icon="⇄" label="销售订单" disabled={!salesOk} onClick={() => navigate('sales')} /><NavButton active={page === 'production'} icon="▤" label="加工与报工" disabled={!productionOk} onClick={() => navigate('production')} /><NavButton active={page === 'stock'} icon="▣" label="库存与发货" disabled={!stockOk} onClick={() => navigate('stock')} /><NavButton active={page === 'mobile_report'} icon="▯" label="手机报工" disabled={!reportOk} onClick={() => navigate('mobile_report')} /><NavButton active={page === 'corrections'} icon="◇" label="返工与报工更正" disabled={!productionOk} onClick={() => navigate('corrections')} /><NavButton active={page === 'business_completion'} icon="¥" label="采购、算料与财务" disabled={!allScope || !['procurement.read','quality.read','planning.read','payroll.read','finance.read'].some(x=>hasPermission(session,x))} onClick={() => navigate('business_completion')} /><NavButton active={page === 'expenses_reports'} icon="◴" label="费用与期间报表" disabled={!allScope || !['production.read','inventory.read','payroll.read','finance.read'].some(x=>hasPermission(session,x))} onClick={() => navigate('expenses_reports')} /><NavButton active={page === 'warehouse_operations'} icon="⇆" label="调拨与盘点" disabled={!allScope || !hasPermission(session,'inventory.read')} onClick={() => navigate('warehouse_operations')} /><div className="nav-label nav-label-gap">预检原型</div><NavButton active={page === 'document_preview'} icon="▤" label="业务单据原型" disabled={!masterReadable || !allScope} preview onClick={() => navigate('document_preview')} /><NavButton active={page === 'workflow_preview'} icon="◇" label="状态规则预检" disabled={!masterReadable || !allScope} preview onClick={() => navigate('workflow_preview')} /><NavButton active={page === 'mobile_preview'} icon="▯" label="手机报工原型" disabled={!masterReadable || !allScope} preview onClick={() => navigate('mobile_preview')} /><div className="nav-label nav-label-gap">后续业务模块</div>{plannedModules.map((module) => <NavButton key={module.name} active={page === 'planned' && planned === module.name} icon={module.icon} label={module.name} planned onClick={() => { setPlanned(module.name); navigate('planned'); }} />)}
      </nav><div className="sidebar-foot"><span className="badge badge-stage">生产主线</span><p>费用报表与调拨盘点已接入</p></div>
    </aside>
    <div className="workspace-content"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" aria-label="展开导航" aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}>☰</button><span className="topbar-company">{session.tenant.name}</span><span className="topbar-divider" /><span className="topbar-stage">阶段五 · 建设中</span></div><div className="topbar-user"><TenantSwitcher session={session} onExpired={onExpired} onSession={onSession} /><span className="avatar" aria-hidden="true">{Array.from(session.user.display_name)[0] || '用'}</span><div><strong>{session.user.display_name}</strong><small>{roleName(session.role)}</small></div><button className="button button-quiet logout-button" disabled={logoutBusy} onClick={onLogout}>{logoutBusy ? '正在退出…' : '退出登录'}</button></div></header>
      <main className="page-content">{logoutError && <Notice>{logoutError}</Notice>}{page === 'overview' && <Overview session={session} revision={revision} onExpired={onExpired} />}{page === 'products' && <Products session={session} units={units} unitsLoading={unitsLoading} unitsError={unitsError} revision={revision} onExpired={onExpired} onChanged={changed} />}{(page === 'units' || page === 'processes' || page === 'routes' || page === 'boms') && <MasterData kind={page} session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'sales' && <ProductionDesk mode="sales" session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'production' && <ProductionDesk mode="production" session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'stock' && <ProductionDesk mode="stock" session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'corrections' && <ProductionCorrections session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'business_completion' && <BusinessCompletion session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'expenses_reports' && <Suspense fallback={<Loading />}><ExpensesReports session={session} revision={revision} onExpired={onExpired} onChanged={changed} /></Suspense>}{page === 'warehouse_operations' && <Suspense fallback={<Loading />}><WarehouseOperations session={session} revision={revision} onExpired={onExpired} onChanged={changed} /></Suspense>}{page === 'mobile_report' && <MobileReport session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'document_preview' && <BusinessDocuments session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'workflow_preview' && <DesignPreview mode='business' session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'mobile_preview' && <MobileReportPrototype session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'audit' && <Audit session={session} revision={revision} onExpired={onExpired} />}{page === 'platform' && <PlatformSettings session={session} revision={revision} onExpired={onExpired} onChanged={changed} onSession={onSession} />}{page === 'configuration' && <ConfigurationSettings session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'assets' && <AssetSettings session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'notifications' && <Notifications session={session} revision={revision} onExpired={onExpired} onChanged={changed} />}{page === 'planned' && <Planned title={planned} onProducts={() => navigate('products')} />}</main>
      <footer className="workspace-footer">工单协作平台 · <a href="/platform-admin">平台管理后台</a> <span>当前企业：{session.tenant.name}</span></footer>
    </div>
  </div>;
}

function NavButton({ active, icon, label, onClick, disabled = false, planned = false, preview = false }: { active: boolean; icon: string; label: string; onClick: () => void; disabled?: boolean; planned?: boolean; preview?: boolean }) {
  return <button className={`nav-button ${active ? 'nav-button-active' : ''}`} onClick={onClick} disabled={disabled} aria-current={active ? 'page' : undefined} title={disabled ? '当前角色没有查看权限' : undefined}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{planned && <small>开发中</small>}{preview && <small>预检</small>}</button>;
}

function Planned({ title, onProducts }: { title: string; onProducts: () => void }) {
  return <><div className="page-heading"><div><div className="eyebrow">业务模块 / 开发阶段</div><h1>{title}</h1><p>此模块处于后续开发阶段。</p></div><span className="badge badge-amber">尚未开放业务操作</span></div><section className="panel roadmap-panel"><div className="roadmap-icon" aria-hidden="true">◇</div><h2>先建立可靠的数据基础</h2><p>销售、加工单、报工、领料、成品入库和分批发货已经落库。这里列出的是尚待开发的质量扩展和排程功能。</p><button className="button button-primary" onClick={onProducts}>查看产品档案</button><div className="roadmap-grid">{plannedModules.map((module) => <div key={module.name}><strong>{module.name}</strong><span>开发阶段</span><p>{module.description}</p></div>)}</div></section></>;
}






