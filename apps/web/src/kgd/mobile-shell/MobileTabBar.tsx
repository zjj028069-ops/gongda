import { IconTabContacts, IconTabFunctions, IconTabMessage, IconTabSettings } from './icons';
import type { ShellTab } from './types';
import { TAB_LABEL, TAB_PATH } from './types';

const TABS: { id: ShellTab; Icon: typeof IconTabMessage }[] = [
  { id: 'messages', Icon: IconTabMessage },
  { id: 'contacts', Icon: IconTabContacts },
  { id: 'functions', Icon: IconTabFunctions },
  { id: 'settings', Icon: IconTabSettings },
];

type Props = {
  active: ShellTab;
  onChange: (tab: ShellTab, path: string) => void;
};

export function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav className="ms-tabbar" aria-label="手机壳底栏">
      {TABS.map(({ id, Icon }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`ms-tab ${on ? 'is-on' : ''}`}
            aria-current={on ? 'page' : undefined}
            data-tab={id}
            onClick={() => onChange(id, TAB_PATH[id])}
          >
            <Icon />
            <span>{TAB_LABEL[id]}</span>
          </button>
        );
      })}
    </nav>
  );
}
