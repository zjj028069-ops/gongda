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
  c9LeafByKey,
  c9LeafByPath,
  isC9IotKey,
  msLeafUrl as c9MsLeafUrl,
} from './iot/c9Registry';
import { IotLeaf } from './iot/IotLeaf';
import {
  c4LeafByKey,
  c4LeafByPath,
  isC4CustomerKey,
  msLeafUrl as c4MsLeafUrl,
  msUpstreamUrl,
} from './customer/c4Registry';
import { CustomerLeaf } from './customer/CustomerLeaf';
import { CustomerUpstreamPick } from './customer/UpstreamPick';
import {
  c6LeafByKey,
  c6LeafByPath,
  isC6DeviceLeanKey,
  msLeafUrl as c6MsLeafUrl,
} from './device-lean/c6Registry';
import { DeviceLeanLeaf } from './device-lean/DeviceLeanLeaf';
import { DeviceLeanUpstreamPick } from './device-lean/UpstreamPick';
import './mobile-shell.css';
import './iot/c9-iot.css';
import './customer/c4-customer.css';
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
  const tab = useMemo(() => tabFromPath(location.pathname) ?? 'messages', [location.pathname]);
  const leafParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const leafKey = leafParams.get('key') || '';
  const leafPath = leafParams.get('path') || '';
  const isPick = location.pathname.startsWith('/ms/pick');
  const isC9Leaf = isLeaf && (isC9IotKey(leafKey) || !!c9LeafByPath(leafPath));
  const c9Key = isC9IotKey(leafKey) ? leafKey : (c9LeafByPath(leafPath)?.key ?? '');
  const isCustomerLeaf = isLeaf && (isC4CustomerKey(leafKey) || !!c4LeafByPath(leafPath));
  const customerKey = isC4CustomerKey(leafKey) ? leafKey : (c4LeafByPath(leafPath)?.key ?? '');
  const isC4Pick = isPick && (leafParams.get('scope') === 'c4' || isC4CustomerKey(leafKey) || leafKey === 'contract');
  const isC6Leaf = isLeaf && (isC6DeviceLeanKey(leafKey) || !!c6LeafByPath(leafPath));
  const c6Key = isC6DeviceLeanKey(leafKey) ? leafKey : (c6LeafByPath(leafPath)?.key ?? '');
  const isC6Pick = isPick && (leafParams.get('scope') === 'c6' || isC6DeviceLeanKey(leafKey));

  /** PC 窄屏路径 → /ms 叶子；其它非 /ms 进消息栏 */
  useEffect(() => {
    if (location.pathname.startsWith('/ms')) return;
    const iot = c9LeafByPath(location.pathname);
    if (iot) {
      navigate(c9MsLeafUrl(iot), { replace: true });
      return;
    }
    const customer = c4LeafByPath(location.pathname);
    if (customer) {
      navigate(c4MsLeafUrl(customer), { replace: true });
      return;
    }
    const deviceLean = c6LeafByPath(location.pathname);
    if (deviceLean) {
      navigate(c6MsLeafUrl(deviceLean), { replace: true });
      return;
    }
    navigate(TAB_PATH.messages, { replace: true });
  }, [location.pathname, navigate]);

  if (!location.pathname.startsWith('/ms')) {
    const iot = c9LeafByPath(location.pathname);
    if (iot) return <Navigate to={c9MsLeafUrl(iot)} replace />;
    const customer = c4LeafByPath(location.pathname);
    if (customer) return <Navigate to={c4MsLeafUrl(customer)} replace />;
    const deviceLean = c6LeafByPath(location.pathname);
    if (deviceLean) return <Navigate to={c6MsLeafUrl(deviceLean)} replace />;
    return <Navigate to={TAB_PATH.messages} replace />;
  }

  if (isLeaf && leafKey === 'contract-from-quote') {
    const contract = c4LeafByKey('contract');
    if (contract?.upstream) return <Navigate to={msUpstreamUrl(contract, contract.upstream)} replace />;
  }

  function onPlusPick(item: PlusItem) {
    if (item.reserved === 'quote') {
      const quote = c4LeafByKey('quote');
      if (quote) {
        navigate(c4MsLeafUrl(quote, { action: 'blank' }));
        return;
      }
    }
    if (item.reserved === 'contract-from-quote') {
      const contract = c4LeafByKey('contract');
      if (contract?.upstream) {
        navigate(msUpstreamUrl(contract, contract.upstream));
        return;
      }
    }
    if (item.key === 'add-customer') {
      const customer = c4LeafByKey('customer-list');
      if (customer) {
        navigate(c4MsLeafUrl(customer, { action: 'blank' }));
        return;
      }
    }
    if (item.key === 'add-supplier') {
      navigate('/ms/leaf?key=supplier&title=' + encodeURIComponent('新增供应商') + '&path=' + encodeURIComponent('/supplier/list'));
      return;
    }
    const c9 = c9LeafByKey(item.key);
    if (c9) {
      navigate(c9MsLeafUrl(c9));
      return;
    }
    const customer = c4LeafByKey(item.key);
    if (customer) {
      navigate(c4MsLeafUrl(customer));
      return;
    }
    const deviceLean = c6LeafByKey(item.key);
    if (deviceLean) {
      navigate(c6MsLeafUrl(deviceLean));
      return;
    }
    navigate(`/ms/leaf?key=${encodeURIComponent(item.key)}&title=${encodeURIComponent(item.label)}`);
  }

  const deep = isLeaf || isPick;
  const showChrome = !deep;
  const title = isLeaf ? undefined : searchScope ? `${TAB_LABEL[searchScope]}搜索` : undefined;

  return (
    <div
      className="ms-shell"
      data-testid="ms-shell"
      data-active-tab={searchScope || tab}
      data-c9={isC9Leaf ? 'iot' : undefined}
      data-c4={isCustomerLeaf || isC4Pick ? 'customer' : undefined}
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
        {!searchScope && isPick && isC4Pick && <CustomerUpstreamPick />}
        {!searchScope && isPick && isC6Pick && <DeviceLeanUpstreamPick />}
        {!searchScope && isLeaf && isC9Leaf && <IotLeaf leafKey={c9Key} />}
        {!searchScope && isLeaf && isCustomerLeaf && <CustomerLeaf leafKey={customerKey} />}
        {!searchScope && isLeaf && isC6Leaf && <DeviceLeanLeaf leafKey={c6Key} />}
        {!searchScope && isLeaf && !isC9Leaf && !isCustomerLeaf && !isC6Leaf && <LeafPlaceholder />}
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
