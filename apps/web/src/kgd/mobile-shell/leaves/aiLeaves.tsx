import { useMemo, useState } from 'react';
import { Glyph, LeafChrome, MsSwitch, matchQ, useSkinToast } from './shared';

/** 训练中心 · 版5 极简 */
export function AiTrainLeaf() {
  const toast = useSkinToast();
  const [bots, setBots] = useState([
    { id: 'inv', name: '库存助手', glyph: '库', color: '#4184F4', on: true },
    { id: 'rpt', name: '报工助手', glyph: '报', color: '#5B9BFF', on: true },
    { id: 'qc', name: '质检顾问', glyph: '质', color: '#A8B0BC', on: false },
    { id: 'pur', name: '采购参谋', glyph: '采', color: '#4184F4', on: true },
  ]);
  const enabled = bots.filter((b) => b.on).length;

  return (
    <LeafChrome
      title="训练中心"
      leafKey="ai-train"
      plusItems={[{ key: 'add', label: '新增数字员工' }]}
      onPlus={() => toast.show('已打开新增数字员工')}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索数字员工…"
    >
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>数字员工</strong>
          <span className="ms-muted">{bots.length} · 已启 {enabled}</span>
        </header>
        {bots.map((bot) => (
          <div key={bot.id} className="ms-c8-row">
            <Glyph text={bot.glyph} color={bot.color} />
            <span className="ms-c8-row-main">{bot.name}</span>
            <button type="button" className="ms-c8-link" onClick={() => toast.show(`已进入「${bot.name}」训练`)}>
              训练
            </button>
            <MsSwitch
              checked={bot.on}
              label={`${bot.name}启用`}
              onChange={(next) => setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, on: next } : b)))}
            />
          </div>
        ))}
      </section>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>知识总览</strong>
          <button type="button" className="ms-c8-link muted" onClick={() => toast.show('已打开知识管理')}>
            点进管理
          </button>
        </header>
        {[
          { label: '文档集', value: '6' },
          { label: '问答集', value: '27' },
          { label: '预览与调试', value: '' },
        ].map((row) => (
          <button key={row.label} type="button" className="ms-c8-navrow" onClick={() => toast.show(`已打开${row.label}`)}>
            <span>{row.label}</span>
            <span className="ms-c8-navrow-trail">
              {row.value && <em>{row.value}</em>}
              <i>›</i>
            </span>
          </button>
        ))}
      </section>
      {toast.node}
    </LeafChrome>
  );
}

const CENTER_QUICK = [
  { g: '助', label: '打开小助手' },
  { g: '厂', label: '工厂助理' },
  { g: 'BOM', label: '导入BOM' },
  { g: '速', label: '极速下单' },
  { g: '图', label: '图纸拆单' },
  { g: '词', label: '本厂词典' },
  { g: '扩', label: '一句话' },
];

const CENTER_CHATS = [
  { g: '助', title: '赛德瑞克小助手', sub: '你好，帮我分析一下这个文件的内容。', time: '10:42' },
  { g: '厂', title: '工厂助理 · 三本账', sub: '今天生产进度怎么样？在产 12 / 延期 2', time: '10:18' },
  { g: 'BOM', title: 'AI 导入 BOM', sub: '预览 48 行 · 待确认写入物料清单', time: '昨天' },
  { g: '速', title: '极速下单', sub: '已取消草案 · 未写库', time: '昨天' },
  { g: '图', title: '图纸拆单', sub: '工序草案 6 步 · 可仅建工艺路线', time: '周一' },
  { g: '词', title: '本厂词典', sub: '「大板」 → 物料 M-8821 已启用', time: '周日' },
  { g: '扩', title: '一句话扩展', sub: '加工单紧急度字段 · 可回退', time: '上周' },
];

/** 赛德瑞克小助手 · 版4 对话行卡 */
export function AiCenterLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const list = useMemo(
    () => CENTER_CHATS.filter((c) => matchQ(`${c.title} ${c.sub}`, q)),
    [q],
  );

  return (
    <LeafChrome
      title="赛德瑞克小助手"
      leafKey="ai-center"
      plusItems={[
        { key: 'new', label: '新会话' },
        { key: 'ext', label: '扩展' },
      ]}
      onPlus={(item) => toast.show(item.key === 'new' ? '已打开新会话' : '已打开扩展')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索会话 / 技能…"
    >
      <div className="ms-c8-hscroll" aria-label="快捷入口">
        {CENTER_QUICK.map((item) => (
          <button key={item.label} type="button" className="ms-c8-quick" onClick={() => toast.show(`已打开${item.label}`)}>
            <Glyph text={item.g} color="#4184F4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <section className="ms-c8-card flat">
        {list.map((row) => (
          <button key={row.title} type="button" className="ms-c8-chat" onClick={() => toast.show(`已打开「${row.title}」`)}>
            <Glyph text={row.g} color="#4184F4" />
            <span className="ms-c8-chat-main">
              <strong>{row.title}</strong>
              <em>{row.sub}</em>
            </span>
            <time>{row.time}</time>
          </button>
        ))}
        {!list.length && <div className="ms-c8-empty">暂无会话</div>}
      </section>
      {toast.node}
    </LeafChrome>
  );
}

const FACTORY_QUICK = [
  { g: '进', label: '问进度' },
  { g: '钱', label: '问应收' },
  { g: '薪', label: '问工资' },
  { g: '三', label: '三本账' },
  { g: '晨', label: '晨报' },
  { g: '异', label: '异常' },
  { g: '助', label: '小助手' },
];

const FACTORY_CHATS = [
  { g: '进', title: '今天生产进度怎么样', sub: '在产 12 / 延期 2 · 去处理加工单', time: '10:42' },
  { g: '钱', title: '应收还有多少未收', sub: '未收 86.2 万 · 逾期 3 笔', time: '10:18' },
  { g: '薪', title: '工资待审多少', sub: '待审 14 人 · 本月计件', time: '昨天' },
  { g: '三', title: '查一下三本账', sub: '生产 / 质量 / 交期摘要已生成', time: '昨天' },
  { g: '晨', title: '今日晨报', sub: '产量达标 · 缺料 2 项', time: '周一' },
  { g: '异', title: '异常摘要', sub: '机台停 1 · 质检返工 3', time: '周日' },
  { g: '助', title: '帮我创建加工单', sub: '只读助理 · 不会创建单据', time: '上周' },
];

/** 工厂助理 · 版4 对话行卡 */
export function AiFactoryLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const list = useMemo(
    () => FACTORY_CHATS.filter((c) => matchQ(`${c.title} ${c.sub}`, q)),
    [q],
  );

  return (
    <LeafChrome
      title="工厂助理"
      leafKey="ai-factory"
      plusItems={[{ key: 'ask', label: '新问答' }]}
      onPlus={() => toast.show('已打开新问答')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="搜索问答 / 意图…"
    >
      <header className="ms-c8-sec-hd">
        <strong>快捷意图</strong>
      </header>
      <div className="ms-c8-hscroll" aria-label="快捷意图">
        {FACTORY_QUICK.map((item) => (
          <button key={item.label} type="button" className="ms-c8-quick" onClick={() => toast.show(`已打开${item.label}`)}>
            <Glyph text={item.g} color="#4184F4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <header className="ms-c8-sec-hd">
        <strong>对话列表</strong>
      </header>
      <section className="ms-c8-card flat">
        {list.map((row) => (
          <button key={row.title} type="button" className="ms-c8-chat" onClick={() => toast.show(`已打开「${row.title}」`)}>
            <Glyph text={row.g} color="#4184F4" />
            <span className="ms-c8-chat-main">
              <strong>{row.title}</strong>
              <em>{row.sub}</em>
            </span>
            <time>{row.time}</time>
          </button>
        ))}
      </section>
      {toast.node}
    </LeafChrome>
  );
}

/** AI 导入 BOM · 版1 现网疏朗 · 上传流程内 */
export function AiBomLeaf() {
  const toast = useSkinToast();
  return (
    <LeafChrome title="AI 导入 BOM" leafKey="ai-bom" searchValue="" onSearchChange={() => undefined} searchPlaceholder="搜索方案…">
      <p className="ms-c8-hint">上传 Excel/CSV → AI 识别列映射 → 确认子件配比后写入</p>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>① 上传文件</strong>
          <span className="ms-muted">Excel / CSV · ≤5MB</span>
        </header>
        <button type="button" className="ms-c8-drop" onClick={() => toast.show('已选择文件')}>
          <span className="ms-c8-drop-ico">↑</span>
          <strong>点击或拖入 BOM 表</strong>
          <em>支持 .xlsx / .xls / .csv</em>
          <span className="ms-c8-btn">选择文件</span>
        </button>
        <div className="ms-c8-file">
          <Glyph text="X" color="#4184F4" />
          <span>
            <strong>液压泵站BOM_HP200.xlsx</strong>
            <em>86KB</em>
          </span>
        </div>
      </section>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>② 识别结果</strong>
          <span className="ms-muted">列映射可改</span>
        </header>
        <div className="ms-c8-ok">✓ 已识别 4 列 · 置信度 96%</div>
        {[
          ['品名', '子件名称'],
          ['料号', '子件编码'],
          ['用量', '配比用量'],
          ['单位', '计量单位'],
        ].map(([from, to]) => (
          <div key={from} className="ms-c8-map">
            <span>{from}</span>
            <i>→</i>
            <em>{to}</em>
          </div>
        ))}
      </section>
      <section className="ms-c8-card">
        <header className="ms-c8-card-hd">
          <strong>③ 确认配比</strong>
          <span className="ms-muted">母件 液压泵站 HP-200</span>
        </header>
        {[
          ['伺服电机 SM-01', '× 1 台'],
          ['轴承座 BZ-08', '× 2 件'],
          ['密封圈 MQ-12', '× 4 只'],
        ].map(([name, qty]) => (
          <div key={name} className="ms-c8-row compact">
            <span className="ms-c8-row-main">{name}</span>
            <span className="ms-c8-chip">{qty}</span>
          </div>
        ))}
        <div className="ms-c8-actions-row">
          <button type="button" className="ms-c8-btn ghost" onClick={() => toast.show('已取消')}>
            取消
          </button>
          <button type="button" className="ms-c8-btn solid" onClick={() => toast.show('已确认写入 BOM')}>
            确认写入 BOM
          </button>
        </div>
      </section>
      {toast.node}
    </LeafChrome>
  );
}

/** 极速下单 · 版2 上传优先 */
export function AiQuickOrderLeaf() {
  const toast = useSkinToast();
  const [target, setTarget] = useState<'wo' | 'so'>('wo');
  return (
    <LeafChrome title="极速下单" leafKey="ai-quick-order" searchValue="" onSearchChange={() => undefined} searchPlaceholder="搜索最近下单…">
      <button type="button" className="ms-c8-drop hero" onClick={() => toast.show('已选择文件上传')}>
        <Glyph text="速" color="#4184F4" />
        <strong>扔进订单，一键落单</strong>
        <em>支持 Excel / CSV / PDF / 图片</em>
        <span className="ms-c8-btn solid">选择文件上传</span>
        <div className="ms-c8-tags">
          <span>.xlsx</span>
          <span>.pdf</span>
          <span>.png</span>
          <span className="hi">今日剩 47/50</span>
        </div>
      </button>
      <div className="ms-c8-steps">
        <span className="is-on">1 上传</span>
        <span>2 预览可改</span>
        <span>3 确认生成</span>
      </div>
      <header className="ms-c8-sec-hd">
        <strong>生成目标</strong>
        <span className="ms-muted">上传后可选</span>
      </header>
      <div className="ms-c8-choice">
        <button type="button" className={target === 'wo' ? 'is-on' : ''} onClick={() => setTarget('wo')}>
          加工单
        </button>
        <button type="button" className={target === 'so' ? 'is-on' : ''} onClick={() => setTarget('so')}>
          销售单
        </button>
      </div>
      <header className="ms-c8-sec-hd">
        <strong>最近下单</strong>
        <span className="ms-muted">可再开预览</span>
      </header>
      <section className="ms-c8-card flat">
        <button type="button" className="ms-c8-chat" onClick={() => toast.show('已打开预览')}>
          <Glyph text="加" color="#4184F4" round />
          <span className="ms-c8-chat-main">
            <strong>液压泵站 HP-200 ×2</strong>
            <em>加工单 WO-261101-03 · 已确认写入</em>
          </span>
          <time>今天</time>
        </button>
        <button type="button" className="ms-c8-chat" onClick={() => toast.show('已打开预览')}>
          <Glyph text="销" color="#7AA7F7" round />
          <span className="ms-c8-chat-main">
            <strong>华东液压 · 3 行</strong>
            <em>已取消 · 未写库</em>
          </span>
          <time>昨天</time>
        </button>
      </section>
      {toast.node}
    </LeafChrome>
  );
}

/** 图纸拆单 · 版2 上传优先 */
export function AiDrawingLeaf() {
  const toast = useSkinToast();
  const [mode, setMode] = useState<'route' | 'wo'>('route');
  return (
    <LeafChrome title="图纸拆单" leafKey="ai-drawing" searchValue="" onSearchChange={() => undefined} searchPlaceholder="搜索最近拆单…">
      <button type="button" className="ms-c8-drop hero" onClick={() => toast.show('已选择图纸上传')}>
        <Glyph text="△" color="#4184F4" />
        <strong>扔进图纸，拆出工序</strong>
        <em>支持 PDF / PNG / JPG</em>
        <span className="ms-c8-btn solid">选择图纸上传</span>
        <div className="ms-c8-tags">
          <span>.pdf</span>
          <span>.png</span>
          <span>.jpg</span>
          <span className="hi">可仅建工艺路线</span>
        </div>
      </button>
      <div className="ms-c8-steps">
        <span className="is-on">1 上传</span>
        <span>2 工序草案</span>
        <span>3 确认写入</span>
      </div>
      <header className="ms-c8-sec-hd">
        <strong>默认写入</strong>
        <span className="ms-muted">上传后可改</span>
      </header>
      <div className="ms-c8-choice">
        <button type="button" className={mode === 'route' ? 'is-on' : ''} onClick={() => setMode('route')}>
          仅建工艺路线
        </button>
        <button type="button" className={mode === 'wo' ? 'is-on' : ''} onClick={() => setMode('wo')}>
          同步加工单
        </button>
      </div>
      <header className="ms-c8-sec-hd">
        <strong>最近拆单</strong>
        <span className="ms-muted">可再开预览</span>
      </header>
      <section className="ms-c8-card flat">
        <button type="button" className="ms-c8-chat" onClick={() => toast.show('已打开预览')}>
          <Glyph text="路" color="#4184F4" round />
          <span className="ms-c8-chat-main">
            <strong>液压泵站 HP-200 · 5 工序</strong>
            <em>工艺路线 AI-RT-261101 · 已确认写入</em>
          </span>
          <time>今天</time>
        </button>
        <button type="button" className="ms-c8-chat" onClick={() => toast.show('已打开预览')}>
          <Glyph text="图" color="#7AA7F7" />
          <span className="ms-c8-chat-main">
            <strong>轴承座 BZ-08 装配图</strong>
            <em>已取消 · 未写库</em>
          </span>
          <time>昨天</time>
        </button>
      </section>
      {toast.node}
    </LeafChrome>
  );
}

const GLOSSARY = [
  {
    id: '1',
    title: '「大板」',
    tags: [
      { t: '别名/叫法', c: 'blue' },
      { t: '物料', c: 'green' },
    ],
    fields: [
      ['指向', 'HP-200 液压泵站'],
      ['备注', '车间口头叫法 · 落单认型命中'],
    ],
    date: '2026-10-28',
  },
  {
    id: '2',
    title: '「张总的单」',
    tags: [{ t: '默认规则', c: 'gray' }],
    fields: [
      ['规则', '默认含税'],
      ['备注', '华东液压张总 · 合同预览套用'],
    ],
    date: '2026-10-29',
  },
  {
    id: '3',
    title: '「伺服电鸡」',
    tags: [{ t: '纠错记忆', c: 'gray' }],
    fields: [
      ['纠正为', '伺服电机 SM-01'],
      ['备注', '语音/OCR 常误，已沉淀'],
    ],
    date: '2026-10-30',
  },
];

/** 本厂词典 · 版1 疏朗 */
export function AiGlossaryLeaf() {
  const toast = useSkinToast();
  const [q, setQ] = useState('');
  const list = useMemo(
    () => GLOSSARY.filter((g) => matchQ(`${g.title} ${g.fields.map((f) => f.join(' ')).join(' ')}`, q)),
    [q],
  );
  return (
    <LeafChrome
      title="本厂词典"
      leafKey="ai-glossary"
      plusItems={[
        { key: 'add', label: '新增词条' },
        { key: 'one', label: '一句话录入' },
      ]}
      onPlus={(item) => toast.show(item.key === 'add' ? '已打开新增词条' : '已打开一句话录入')}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="叫法 / 指向编码 / 备注"
    >
      {list.map((item) => (
        <article key={item.id} className="ms-c8-card">
          <header className="ms-c8-card-hd">
            <strong>{item.title}</strong>
          </header>
          <div className="ms-c8-tags left">
            {item.tags.map((tag) => (
              <span key={tag.t} className={`tag-${tag.c}`}>
                {tag.t}
              </span>
            ))}
          </div>
          {item.fields.map(([k, v]) => (
            <div key={k} className="ms-c8-kv">
              <span>{k}</span>
              <em>{v}</em>
            </div>
          ))}
          <footer className="ms-c8-card-ft">
            <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开编辑')}>
              编辑
            </button>
            <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已删除词条')}>
              删除
            </button>
            <time>{item.date}</time>
          </footer>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}

const EXT_APPS = [
  {
    id: '1',
    g: '急',
    color: '#4184F4',
    title: '加工单紧急度',
    on: true,
    path: '加工单 · 扩展字段',
    desc: '普通 / 加急 / 特急 · 侧栏可见 · 新建加工单表单带出',
    tags: ['类型 字段', '对象 加工单', '菜单✓'],
    primary: '打开表单',
  },
  {
    id: '2',
    g: '快',
    color: '#34A853',
    title: '快递约件',
    on: true,
    path: '轻量应用',
    desc: '寄件人 ← 客户 · 货物 → 出库单 · 运单号回写',
    tags: ['类型 轻量', '关联 出库单', '侧栏✓'],
    primary: '打开约件',
  },
  {
    id: '3',
    g: '备',
    color: '#9E9E9E',
    title: '合同交期备注',
    on: false,
    path: '字段+列表筛',
    desc: '交期备注字段 · 列表可筛有/无备注 · 停用后隐藏',
    tags: ['类型 字段', '筛选项 隐藏中'],
    primary: '重新启用',
  },
];

/** 扩展应用 · 版1 疏朗卡片 */
export function AiExtAppsLeaf() {
  const toast = useSkinToast();
  const [apps, setApps] = useState(EXT_APPS);
  const enabled = apps.filter((a) => a.on).length;
  return (
    <LeafChrome
      title="扩展应用"
      leafKey="ai-ext-apps"
      plusItems={[
        { key: 'one', label: '一句话扩展' },
        { key: 'card', label: '从方案卡新建' },
      ]}
      onPlus={(item) => toast.show(item.key === 'one' ? '已打开一句话扩展' : '已打开从方案卡新建')}
      searchValue=""
      onSearchChange={() => undefined}
      searchPlaceholder="搜索扩展…"
    >
      <div className="ms-c8-stats">
        <div>
          <strong>{apps.length}</strong>
          <span>扩展总数</span>
        </div>
        <div>
          <strong>{enabled}</strong>
          <span>已启用</span>
        </div>
        <div>
          <strong>{apps.length - enabled}</strong>
          <span>已停用</span>
        </div>
        <div>
          <strong>0</strong>
          <span>已回退</span>
        </div>
      </div>
      {apps.map((app) => (
        <article key={app.id} className="ms-c8-card">
          <header className="ms-c8-row">
            <Glyph text={app.g} color={app.color} round />
            <span className="ms-c8-row-main">
              <strong>{app.title}</strong>
              <em className="ms-muted">{app.path}</em>
            </span>
            <span className={`ms-c8-badge ${app.on ? 'ok' : 'off'}`}>{app.on ? '已启用' : '已停用'}</span>
            <MsSwitch
              checked={app.on}
              label={`${app.title}启用`}
              onChange={(next) => setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, on: next } : a)))}
            />
          </header>
          <p className="ms-c8-desc">{app.desc}</p>
          <div className="ms-c8-tags left">
            {app.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="ms-c8-actions-row">
            <button type="button" className={`ms-c8-btn ${app.on ? 'solid' : 'ghost'} grow`} onClick={() => toast.show(`已${app.primary}`)}>
              {app.primary}
            </button>
            <button type="button" className="ms-c8-link" onClick={() => toast.show('已打开方案')}>
              方案
            </button>
            <button type="button" className="ms-c8-link danger" onClick={() => toast.show('已回退扩展')}>
              回退
            </button>
          </div>
        </article>
      ))}
      {toast.node}
    </LeafChrome>
  );
}
