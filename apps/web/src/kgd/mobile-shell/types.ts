export type ShellTab = 'messages' | 'contacts' | 'functions' | 'settings';

export const TAB_LABEL: Record<ShellTab, string> = {
  messages: '消息',
  contacts: '联系人',
  functions: '功能',
  settings: '设置',
};

export const TAB_PATH: Record<ShellTab, string> = {
  messages: '/ms/messages',
  contacts: '/ms/contacts',
  functions: '/ms/functions',
  settings: '/ms/settings',
};

export function tabFromPath(pathname: string): ShellTab | null {
  if (pathname.startsWith('/ms/messages')) return 'messages';
  if (pathname.startsWith('/ms/contacts')) return 'contacts';
  if (pathname.startsWith('/ms/functions')) return 'functions';
  if (pathname.startsWith('/ms/settings')) return 'settings';
  if (pathname.startsWith('/ms/search/messages')) return 'messages';
  if (pathname.startsWith('/ms/search/contacts')) return 'contacts';
  if (pathname.startsWith('/ms/search/functions')) return 'functions';
  if (pathname.startsWith('/ms/search/settings')) return 'settings';
  return null;
}

export type PlusItem = {
  key: string;
  label: string;
  /** 占位说明或后续路由 */
  hint?: string;
  /** 硬约束：报价/合同上游入口 */
  reserved?: 'quote' | 'contract-from-quote';
};

/** 联系人栏＋下拉（v5.2：加朋友/建群从此进入） */
export const CONTACTS_PLUS: PlusItem[] = [
  { key: 'add-friend', label: '加朋友 / 新的朋友', hint: '后续接入统一联系人' },
  { key: 'create-group', label: '创建群聊 / 班组', hint: '后续接入项目群' },
  { key: 'add-customer', label: '新增客户', hint: '入口保留 → /customer/list' },
  { key: 'add-supplier', label: '新增供应商', hint: '入口保留 → /supplier/list' },
  { key: 'scan', label: '扫一扫加人', hint: '占位' },
];

/** 其它栏壳级＋面板（可先占位；单据链「勾选上游→完成(N)」后续） */
export function plusItemsFor(tab: ShellTab): PlusItem[] {
  if (tab === 'contacts') return CONTACTS_PLUS;
  if (tab === 'messages') {
    return [
      { key: 'new-chat', label: '发起会话', hint: '占位' },
      { key: 'new-group', label: '创建群聊', hint: '占位' },
    ];
  }
  if (tab === 'functions') {
    return [
      { key: 'add-quote', label: '新增报价合同', hint: '硬约束入口保留', reserved: 'quote' },
      { key: 'contract-from-quote', label: '报价单创建合同', hint: '＋下拉→勾选上游报价→完成', reserved: 'contract-from-quote' },
      { key: 'add-generic', label: '新增单据（占位）', hint: '列表类后续统一＋皮' },
    ];
  }
  return [
    { key: 'switch-tenant', label: '切换帐套', hint: '占位' },
  ];
}

export const L1_ICON_COLORS: Record<string, string> = {
  workplace: '#4184F4',
  screen: '#2F5BB8',
  report: '#5B9CF5',
  customer: '#34A853',
  lean: '#F5A623',
  produce: '#E85D4C',
  device: '#8B6BC9',
  supply: '#E85A9B',
  warehouse: '#2AA8A0',
  iot: '#5C6BC0',
  goods: '#C49A3C',
  ai: '#4184F4',
  message: '#F5A623',
  info: '#5B9CF5',
  system: '#607D8B',
};

export function glyphOf(label: string) {
  return Array.from(label.replace(/\//g, ''))[0] || '·';
}
