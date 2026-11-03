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
import {
  c6LeafByKey,
  c6LeafByPath,
  isC6DeviceLeanKey,
  msLeafUrl,
} from './device-lean/c6Registry';
import { DeviceLeanLeaf } from './device-lean/DeviceLeanLeaf';
import { DeviceLeanUpstreamPick } from './device-lean/UpstreamPick';
import './mobile-shell.css';
import './device-lean/c6-device-lean.css';

function parseSearchScope(pathname: string): ShellTab | null {
  const m = pathname.match(/^\/ms\/search\/(messages|contacts|functions|settings)/);
  return (m?.[1] as ShellTab | undefined) ?? null;
}

export function MobileFourTabShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchScope = parseSearchScope(location.pathname);
  const isLeaf = location.pathname.startsWith('/ms/leaf');
  const isPick = location.pathname.startsWith('/ms/pick');
  const tab = useMemo(() => tabFromPath(location.pathname) ?? 'messages', [location.pathname]);
  const leafParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const leafKey = leafParams.get('key') || '';
  const leafPath = leafParams.get('path') || '';
  const isC6Leaf = isLeaf && (isC6DeviceLeanKey(leafKey) || !!c6LeafByPath(leafPath));
  const c6Key = isC6DeviceLeanKey(leafKey) ? leafKey : (c6LeafByPath(leafPath)?.key ?? '');
  const isC6Pick = isPick && (leafParams.get('scope') === 'c6' || isC6DeviceLeanKey(leafKey));

  /** PC 窄屏路径 → /ms 叶子；其它非 /ms 进消息栏 */
  useEffect(() => {
    if (location.pathname.startsWith('/ms')) return;
    const leaf = c6LeafByPath(location.pathname);
    if (leaf) {
      navigate(msLeafUrl(leaf), { replace: true });
      return;
    }
    navigate(TAB_PATH.messages, { replace: true });
  }, [location.pathname, navigate]);

  if (!location.pathname.startsWith('/ms')) {
    const leaf = c6LeafByPath(location.pathname);
    if (leaf) return <Navigate to={msLeafUrl(leaf)} replace />;
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
    const c6 = c6LeafByKey(item.key);
    if (c6) {
      navigate(msLeafUrl(c6));
      return;
    }
    navigate(`/ms/leaf?key=${encodeURIComponent(item.key)}&title=${encodeURIComponent(item.label)}`);
  }

  const deep = isLeaf || isPick;
  const showChrome = !deep;
  const title = deep ? undefined : searchScope ? `${TAB_LABEL[searchScope]}搜索` : undefined;

  return (
    <div
      className="ms-shell"
      data-testid="ms-shell"
      data-active-tab={searchScope || tab}
      data-c6={isC6Leaf || isC6Pick ? 'device-lean' : undefined}
    >
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
        {!searchScope && isPick && isC6Pick && <DeviceLeanUpstreamPick />}
        {!searchScope && isPick && !isC6Pick && <LeafPlaceholder />}
        {!searchScope && isLeaf && isC6Leaf && <DeviceLeanLeaf leafKey={c6Key} />}
        {!searchScope && isLeaf && !isC6Leaf && <LeafPlaceholder />}
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
