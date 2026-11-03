import { useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { MobileTopBar } from './MobileTopBar';
import { LeafPlaceholder } from './LeafPlaceholder';
import { SearchPage } from './SearchPage';
import { ContactsTab } from './tabs/ContactsTab';
import { FunctionsTab } from './tabs/FunctionsTab';
import { MessagesTab } from './tabs/MessagesTab';
import { SettingsTab } from './tabs/SettingsTab';
import type { PlusItem, ShellTab } from './types';
import { TAB_LABEL, TAB_PATH, tabFromPath } from './types';
import { c7LeafByKey, c7LeafByPath, isC7Key, msC7LeafUrl, ReportsLeaf, ScreenViewer } from './reports';
import './mobile-shell.css';
import './reports/c7-reports.css';

function parseSearchScope(pathname: string): ShellTab | null {
  const m = pathname.match(/^\/ms\/search\/(messages|contacts|functions|settings)/);
  return (m?.[1] as ShellTab | undefined) ?? null;
}

export function MobileFourTabShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchScope = parseSearchScope(location.pathname);
  const isLeaf = location.pathname.startsWith('/ms/leaf');
  const isScreen = location.pathname.startsWith('/ms/screen');
  const tab = useMemo(() => tabFromPath(location.pathname) ?? 'messages', [location.pathname]);
  const leafParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const leafKey = leafParams.get('key') || '';
  const leafPath = leafParams.get('path') || '';
  const isC7Leaf = isLeaf && (isC7Key(leafKey) || !!c7LeafByPath(leafPath));
  const c7Key = isC7Key(leafKey) ? leafKey : (c7LeafByPath(leafPath)?.key ?? '');

  /** PC 窄屏路径 → /ms 叶子；其它非 /ms 进消息栏 */
  useEffect(() => {
    if (location.pathname.startsWith('/ms')) return;
    const leaf = c7LeafByPath(location.pathname);
    if (leaf) {
      navigate(msC7LeafUrl(leaf), { replace: true });
      return;
    }
    navigate(TAB_PATH.messages, { replace: true });
  }, [location.pathname, navigate]);

  if (!location.pathname.startsWith('/ms')) {
    const leaf = c7LeafByPath(location.pathname);
    if (leaf) return <Navigate to={msC7LeafUrl(leaf)} replace />;
    return <Navigate to={TAB_PATH.messages} replace />;
  }

  function onPlusPick(item: PlusItem) {
    if (item.reserved === 'quote') {
      navigate('/ms/leaf?key=quote&title=' + encodeURIComponent('合同报价单') + '&path=' + encodeURIComponent('/contract_quotation_bill/list') + '&l1=customer');
      return;
    }
    if (item.reserved === 'contract-from-quote') {
      navigate('/ms/leaf?key=contract-from-quote&title=' + encodeURIComponent('报价单创建合同') + '&path=' + encodeURIComponent('/customer_contract/list') + '&l1=customer');
      return;
    }
    if (item.key === 'add-customer') {
      navigate('/ms/leaf?key=customer-list&title=' + encodeURIComponent('新增客户') + '&path=' + encodeURIComponent('/customer/list'));
      return;
    }
    if (item.key === 'add-supplier') {
      navigate('/ms/leaf?key=supplier&title=' + encodeURIComponent('新增供应商') + '&path=' + encodeURIComponent('/supplier/list'));
      return;
    }
    const c7 = c7LeafByKey(item.key);
    if (c7) {
      navigate(msC7LeafUrl(c7));
      return;
    }
    navigate(`/ms/leaf?key=${encodeURIComponent(item.key)}&title=${encodeURIComponent(item.label)}`);
  }

  const deep = isLeaf || isScreen;
  const showChrome = !deep;
  const title = deep ? undefined : searchScope ? `${TAB_LABEL[searchScope]}搜索` : undefined;

  return (
    <div className="ms-shell" data-testid="ms-shell" data-active-tab={searchScope || tab} data-c7={isC7Leaf || isScreen ? 'reports' : undefined}>
      {showChrome && (
        <MobileTopBar
          tab={searchScope || tab}
          title={title}
          onSearch={() => navigate(`/ms/search/${searchScope || tab}`)}
          onPlusPick={onPlusPick}
          hideActions={false}
        />
      )}
      <div className={`ms-body ${deep ? 'is-leaf' : ''}`}>
        {searchScope && <SearchPage scope={searchScope} />}
        {!searchScope && isScreen && <ScreenViewer />}
        {!searchScope && isLeaf && isC7Leaf && <ReportsLeaf leafKey={c7Key} />}
        {!searchScope && isLeaf && !isC7Leaf && <LeafPlaceholder />}
        {!searchScope && !deep && tab === 'messages' && <MessagesTab />}
        {!searchScope && !deep && tab === 'contacts' && <ContactsTab />}
        {!searchScope && !deep && tab === 'functions' && <FunctionsTab />}
        {!searchScope && !deep && tab === 'settings' && <SettingsTab />}
      </div>
      {!deep && (
        <MobileTabBar
          active={searchScope || tab}
          onChange={(_next, path) => navigate(path)}
        />
      )}
    </div>
  );
}
