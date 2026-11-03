import { useMemo, useState } from 'react';
import { primaryMenus } from '../menu';
import type { ShellTab } from './types';
import { TAB_LABEL } from './types';

const SCOPE_HINT: Record<ShellTab, string> = {
  messages: '只搜本栏会话（审批/系统/报工等会话行）',
  contacts: '只搜联系人（用户 / 客户 / 供应商 / 公海）',
  functions: '只搜功能菜单（不出消息会话）',
  settings: '只搜设置项',
};

const SETTINGS_ITEMS = ['企业信息', '通用', '短信', '编号规则', '个人 / 帐套', '通知', '安全', '关于赛德瑞克 MES', '退出登录'];

type Props = { scope: ShellTab };

export function SearchPage({ scope }: Props) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [] as { title: string; sub?: string }[];
    if (scope === 'messages') {
      return ['审批助手', '系统通知', '报工助手', '文员小李', '一车间生产群']
        .filter((name) => name.toLowerCase().includes(needle) || name.includes(q.trim()))
        .map((title) => ({ title, sub: '会话' }));
    }
    if (scope === 'contacts') {
      return ['张工', '文员小李', '王班长', '采购小陈', '华东精密', '宏达钢材']
        .filter((name) => name.includes(q.trim()))
        .map((title) => ({ title, sub: '联系人' }));
    }
    if (scope === 'functions') {
      const hits: { title: string; sub?: string }[] = [];
      for (const menu of primaryMenus) {
        if (menu.label.includes(q.trim())) hits.push({ title: menu.label, sub: '一级菜单' });
        const walk = (nodes: { label: string; children?: unknown[] }[], parents: string) => {
          for (const node of nodes) {
            if (node.label.includes(q.trim())) hits.push({ title: node.label, sub: parents || menu.label });
            if (node.children) walk(node.children as { label: string; children?: unknown[] }[], `${parents || menu.label}`);
          }
        };
        walk((menu.children ?? []) as { label: string; children?: unknown[] }[], menu.label);
      }
      return hits.slice(0, 40);
    }
    return SETTINGS_ITEMS.filter((item) => item.includes(q.trim())).map((title) => ({ title, sub: '设置' }));
  }, [q, scope]);

  return (
    <div className="ms-search-page" data-testid="ms-search" data-scope={scope}>
      <label className="ms-search-field">
        <span className="sr-only">{TAB_LABEL[scope]}搜索</span>
        <input
          autoFocus
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={`搜索${TAB_LABEL[scope]}…`}
          aria-label={`${TAB_LABEL[scope]}搜索框`}
        />
      </label>
      <p className="ms-search-hint">{SCOPE_HINT[scope]} · 分栏不串台</p>
      <div className="ms-search-results">
        {!q.trim() && <div className="ms-empty">输入关键词开始搜索</div>}
        {!!q.trim() && !results.length && <div className="ms-empty">无结果（不会串到其它栏）</div>}
        {results.map((item) => (
          <div key={`${item.title}-${item.sub}`} className="ms-search-hit">
            <strong>{item.title}</strong>
            {item.sub && <span>{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
