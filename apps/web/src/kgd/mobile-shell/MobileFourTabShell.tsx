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
import { c4LeafByKey, c4LeafByPath, isC4CustomerKey, msLeafUrl, msUpstreamUrl } from './customer/c4Registry';
import { CustomerLeaf } from './customer/CustomerLeaf';
import { CustomerUpstreamPick } from './customer/UpstreamPick';
import './mobile-shell.css';
import './customer/c4-customer.css';

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
  const isCustomerLeaf = isLeaf && (isC4CustomerKey(leafKey) || !!c4LeafByPath(leafPath));
  const customerKey = isC4CustomerKey(leafKey) ? leafKey : (c4LeafByPath(leafPath)?.key ?? '');
  const isC4Pick = isPick && (leafParams.get('scope') === 'c4' || isC4CustomerKey(leafKey));

  /** PC 窄屏路径 → /ms 叶子；其它非 /ms 进消息栏 */
  useEffect(() => {
    if (location.pathname.startsWith('/ms')) return;
    const leaf = c4LeafByPath(location.pathname);
    if (leaf) {
      navigate(msLeafUrl(leaf), { replace: true });
      return;
    }
    navigate(TAB_PATH.messages, { replace: true });
  }, [location.pathname, navigate]);

  if (!location.pathname.startsWith('/ms')) {
    const leaf = c4LeafByPath(location.pathname);
    if (leaf) return <Navigate to={msLeafUrl(leaf)} replace />;
    return <Navigate to={TAB_PATH.messages} replace />;
  }

  function onPlusPick(item: PlusItem) {
    if (item.reserved === 'quote') {
      const quote = c4LeafByKey('quote');
      if (quote) {
        navigate(msLeafUrl(quote, { action: 'blank', toast: '新增报价入口已打开（皮）' }));
        return;
      }
    }
    if (item.reserved === 'contract-from-quote') {
      const contract = c4LeafByKey('contract');
      if (contract) {
        navigate(msUpstreamUrl(contract, {
          kind: 'quotation',
          title: '选择上游报价',
          completeMode: 'from-quote',
        }));
        return;
      }
    }
    if (item.key === 'add-customer') {
      const customer = c4LeafByKey('customer-list');
      if (customer) {
        navigate(msLeafUrl(customer, { action: 'blank', toast: '新增客户入口已打开（皮）' }));
        return;
      }
      navigate('/ms/leaf?key=customer-list&title=' + encodeURIComponent('新增客户') + '&path=' + encodeURIComponent('/customer/list') + '&l1=customer');
      return;
    }
    if (item.key === 'add-supplier') {
      navigate('/ms/leaf?key=supplier&title=' + encodeURIComponent('新增供应商') + '&path=' + encodeURIComponent('/supplier/list'));
      return;
    }
    const customer = c4LeafByKey(item.key);
    if (customer) {
      navigate(msLeafUrl(customer));
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
      data-c4={isCustomerLeaf || isC4Pick ? 'customer' : undefined}
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
        {!searchScope && isPick && isC4Pick && <CustomerUpstreamPick />}
        {!searchScope && isPick && !isC4Pick && <CustomerUpstreamPick />}
        {!searchScope && isLeaf && isCustomerLeaf && <CustomerLeaf leafKey={customerKey} />}
        {!searchScope && isLeaf && !isCustomerLeaf && <LeafPlaceholder />}
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
