import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { MobileTopBar } from './MobileTopBar';
import { LeafPlaceholder } from './LeafPlaceholder';
import { ProduceHost } from './produce/ProduceHost';
import { matchProduce, produceBack, producePlusHref, shellRedirect } from './produce/paths';
import { SearchPage } from './SearchPage';
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

export function MobileFourTabShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchScope = parseSearchScope(location.pathname);
  const isLeaf = location.pathname.startsWith('/ms/leaf');
  const produce = matchProduce(location.pathname);
  const tab = useMemo(() => tabFromPath(location.pathname) ?? (produce ? 'functions' : 'messages'), [location.pathname, produce]);
  const jump = shellRedirect(location.pathname, location.search, TAB_PATH.messages);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  if (jump && jump !== `${location.pathname}${location.search}`) {
    return <Navigate to={jump} replace />;
  }

  function onPlusPick(item: PlusItem) {
    if (produce) {
      const href = producePlusHref(item.key);
      if (href) navigate(href);
      return;
    }
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
  const title = produce ? produce.title : isLeaf ? undefined : searchScope ? `${TAB_LABEL[searchScope]}搜索` : undefined;
  const hideTab = isLeaf || !!produce?.focus;

  return (
    <div className="ms-shell" data-testid="ms-shell" data-active-tab={searchScope || tab}>
      {showChrome && (
        <MobileTopBar
          tab={searchScope || tab}
          title={title}
          items={produce ? produce.plus : undefined}
          searchLabel={produce ? `${produce.title}搜索` : undefined}
          hideActions={!!produce?.hideActions}
          onBack={produce ? () => navigate(produceBack(location.pathname)) : undefined}
          onSearch={() => {
            if (produce) setSearchOpen((open) => !open);
            else navigate(`/ms/search/${searchScope || tab}`);
          }}
          onPlusPick={onPlusPick}
        />
      )}
      {produce && searchOpen && (
        <form className="mp-search-pop" data-testid="mp-search-pop" onSubmit={(event) => { event.preventDefault(); setSearchOpen(false); }}>
          <input autoFocus value={keyword} placeholder={`搜索${produce.title}`} aria-label={`${produce.title}关键字`} onChange={(event) => setKeyword(event.target.value)} />
          <button type="submit">查询</button>
        </form>
      )}
      <div className={`ms-body ${hideTab ? 'is-leaf' : ''}`}>
        {searchScope && <SearchPage scope={searchScope} />}
        {!searchScope && isLeaf && <LeafPlaceholder />}
        {!searchScope && !isLeaf && produce && <ProduceHost keyword={keyword} onClearKeyword={() => setKeyword('')} />}
        {!searchScope && !isLeaf && !produce && tab === 'messages' && <MessagesTab />}
        {!searchScope && !isLeaf && !produce && tab === 'contacts' && <ContactsTab />}
        {!searchScope && !isLeaf && !produce && tab === 'functions' && <FunctionsTab />}
        {!searchScope && !isLeaf && !produce && tab === 'settings' && <SettingsTab />}
      </div>
      {!hideTab && (
        <MobileTabBar
          active={searchScope || tab}
          onChange={(_next, path) => navigate(path)}
        />
      )}
    </div>
  );
}
