import { useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { MobileTopBar } from './MobileTopBar';
import { LeafPlaceholder } from './LeafPlaceholder';
import { SearchPage } from './SearchPage';
import { MobileDeepLinkPage } from './pages/MobileDeepLinkPage';
import { MobileMessageListPage } from './pages/MobileMessageListPage';
import { MobileWorkbenchPage } from './pages/MobileWorkbenchPage';
import { ContactsTab } from './tabs/ContactsTab';
import { FunctionsTab } from './tabs/FunctionsTab';
import { MessagesTab } from './tabs/MessagesTab';
import { SettingsTab } from './tabs/SettingsTab';
import type { PlusItem, ShellTab } from './types';
import { TAB_LABEL, TAB_PATH, tabFromPath } from './types';
import './mobile-shell.css';

function parseSearchScope(pathname: string): ShellTab | null {
  const m = pathname.match(/^\/ms\/search\/(messages|contacts|functions|settings)/);
  return (m?.[1] as ShellTab | undefined) ?? null;
}

function isMirrorLeaf(pathname: string) {
  return (
    pathname.startsWith('/ms/leaf')
    || pathname.startsWith('/ms/staging/area')
    || pathname.startsWith('/ms/message/list')
    || pathname.startsWith('/ms/deeplink')
  );
}

export function MobileFourTabShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchScope = parseSearchScope(location.pathname);
  const isLeaf = isMirrorLeaf(location.pathname);
  const tab = useMemo(() => tabFromPath(location.pathname) ?? 'messages', [location.pathname]);

  useEffect(() => {
    if (!location.pathname.startsWith('/ms')) {
      navigate(TAB_PATH.messages, { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!location.pathname.startsWith('/ms')) {
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
    navigate(`/ms/leaf?key=${encodeURIComponent(item.key)}&title=${encodeURIComponent(item.label)}`);
  }

  const showChrome = !isLeaf;
  const title = isLeaf ? undefined : searchScope ? `${TAB_LABEL[searchScope]}搜索` : undefined;
  const isWorkbench = location.pathname.startsWith('/ms/staging/area');
  const isMessageList = location.pathname.startsWith('/ms/message/list');
  const isDeepLink = location.pathname.startsWith('/ms/deeplink');
  const isGenericLeaf = location.pathname.startsWith('/ms/leaf');

  return (
    <div className="ms-shell" data-testid="ms-shell" data-active-tab={searchScope || tab}>
      {showChrome && (
        <MobileTopBar
          tab={searchScope || tab}
          title={title}
          onSearch={() => navigate(`/ms/search/${searchScope || tab}`)}
          onPlusPick={onPlusPick}
          hideActions={false}
        />
      )}
      <div className={`ms-body ${isLeaf ? 'is-leaf' : ''}`}>
        {searchScope && <SearchPage scope={searchScope} />}
        {!searchScope && isWorkbench && <MobileWorkbenchPage />}
        {!searchScope && isMessageList && <MobileMessageListPage />}
        {!searchScope && isDeepLink && <MobileDeepLinkPage />}
        {!searchScope && isGenericLeaf && <LeafPlaceholder />}
        {!searchScope && !isLeaf && tab === 'messages' && <MessagesTab />}
        {!searchScope && !isLeaf && tab === 'contacts' && <ContactsTab />}
        {!searchScope && !isLeaf && tab === 'functions' && <FunctionsTab />}
        {!searchScope && !isLeaf && tab === 'settings' && <SettingsTab />}
      </div>
      {!isLeaf && (
        <MobileTabBar
          active={searchScope || tab}
          onChange={(_next, path) => navigate(path)}
        />
      )}
    </div>
  );
}
