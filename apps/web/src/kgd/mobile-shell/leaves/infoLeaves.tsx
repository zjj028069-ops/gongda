import { useMemo, useState } from 'react';
import { LeafChrome, PillTabs, matchQ, useSkinToast } from './shared';

const ARTICLES = [
  { id: '1', title: '液压泵站装配要点', cat: '工艺', tag: '装配', open: true, n: 3, who: '张工 · 10-28' },
  { id: '2', title: '数控机台日点检清单', cat: '设备', tag: '点检', open: true, n: 2, who: '李工 · 10-26' },
  { id: '3', title: '进料 IQC 抽样规则', cat: '质检', tag: 'IQC', open: false, n: 1, who: '王质检 · 10-22' },
  { id: '4', title: '仓库先进先出说明', cat: '默认分类', tag: '仓储', open: true, n: 0, who: '陈仓 · 10-18' },
];

/** 知识库 · 版1 疏朗 */
export function KnowledgeLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const list = useMemo(
    () =>
      ARTICLES.filter((a) => (cat === 'all' || a.cat === cat) && matchQ(`${a.title} ${a.cat} ${a.tag} ${a.who}`, q)),
    [cat, q],
  );

  return (
    <LeafChrome
      title="知识库"
      leafKey="knowledge"
      plusItems={[
        { key: 'add', label: '新增文章' },
        { key: 'scan', label: '扫码上传附件' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增文章' : '已打开扫码上传附件')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="标题 / 标签 / 创建人"
    >
      <PillTabs
        value={cat}
        onChange={setCat}
        items={[
          { key: 'all', label: '全部' },
          { key: '默认分类', label: '默认分类' },
          { key: '工艺', label: '工艺' },
          { key: '质检', label: '质检' },
          { key: '设备', label: '设备' },
        ]}
      />
      {list.map((a) => (
        <article key={a.id} className="ms-c8-card" onClick={() => toast.show(`已打开「${a.title}」`)}>
          <strong className="ms-c8-card-title">{a.title}</strong>
          <div className="ms-c8-tags left">
            <span className="tag-blue">{a.cat}</span>
            <span>{a.tag}</span>
            <span className={a.open ? 'tag-green' : 'tag-gray'}>{a.open ? '公开' : '不公开'}</span>
          </div>
          <footer className="ms-c8-card-ft">
            <span className="ms-c8-attach">📎 {a.n}</span>
            <time>{a.who}</time>
          </footer>
        </article>
      ))}
      {!list.length && <div className="ms-c8-empty">暂无文章</div>}
      {toast.node}
    </LeafChrome>
  );
}

const NOTICES = [
  { id: '1', title: '今晚 22:00 系统维护', meta: '张总 · 10-28 18:00', status: '未读', reads: 12 },
  { id: '2', title: '国庆放假安排', meta: '行政 · 09-28', status: '已读', reads: 48 },
  { id: '3', title: '液压线安全培训', meta: '安全员 · 10-27', status: '未读', reads: 5 },
  { id: '4', title: '质量月活动通知', meta: '质检 · 10-01', status: '全员', reads: 36 },
];

/** 通知公告 · 版1 疏朗 */
export function NoticeLeaf() {
  const toast = useSkinToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const unread = NOTICES.filter((n) => n.status === '未读').length;
  const read = NOTICES.filter((n) => n.status === '已读').length;
  const list = useMemo(() => {
    return NOTICES.filter((n) => {
      if (tab === 'unread' && n.status !== '未读') return false;
      if (tab === 'read' && n.status !== '已读') return false;
      return matchQ(`${n.title} ${n.meta}`, q);
    });
  }, [tab, q]);

  return (
    <LeafChrome
      title="通知公告"
      leafKey="notice"
      plusItems={[
        { key: 'pub', label: '发布公告' },
        { key: 'draft', label: '草稿箱' },
      ]}
      onPlus={(item) => toast.show(item.key === 'pub' ? '已打开发布公告' : '已打开草稿箱')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="标题 / 发布人"
    >
      <p className="ms-c8-banner">可见部门为空=全员可见；打开即记已读</p>
      <PillTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'unread', label: `未读 ${unread}` },
          { key: 'read', label: `已读 ${read}` },
          { key: 'all', label: `全部 ${NOTICES.length}` },
        ]}
      />
      {list.map((n) => (
        <article key={n.id} className="ms-c8-card notice" onClick={() => toast.show(`已打开「${n.title}」`)}>
          <div className="ms-c8-notice-hd">
            <i className="ms-c8-dot-blue" />
            <strong>{n.title}</strong>
            <span className={`ms-c8-badge ${n.status === '未读' ? 'warn' : n.status === '已读' ? 'off' : 'ok'}`}>{n.status}</span>
          </div>
          <div className="ms-muted ms-c8-notice-meta">{n.meta}</div>
          <footer className="ms-c8-card-ft">
            <span>已读 {n.reads} 人</span>
          </footer>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}
