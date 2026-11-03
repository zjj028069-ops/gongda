/**
 * SEDRIC01 v1.0.88 · shell-intent-router
 * 跨轨场景分轨：硬特征优先于开户 in_progress；歧义才二选一。
 * 轨：A 开户 / B 加字段 / C 壳工具 / D 工厂查数 / E 闲聊 / ambiguous
 * 与 Garment Agent 无关；纯函数，可供 Node 夹具 vm 加载。
 */
(function (global) {
  "use strict";

  function compact(text) {
    return String(text || "").replace(/\s+/g, "");
  }

  /** B：加字段 / 扩展字段硬特征（压过开户状态） */
  function looksLikeFieldExtHard(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (/(紧急度|加急标记|交期备注|交货备注|扩展字段|拓展字段|货源地)/.test(t)) return true;
    if (/(加|增加|新增|添加|要个|要一个|加个|做个|做一个|来个).{0,30}(字段|备注|标记|筛选|过滤)/.test(t)) return true;
    if (/(字段名称|加个字段|新增字段|添加字段|扩展.?字段)/.test(t)) return true;
    // 「给X列表/界面加个Y」且 Y 不像开户实体名
    if (
      /(给|为|在).{0,16}(列表|界面|页面|加工单|工单|合同|出库|客户|供应商|商品|产品|工序|采购|BOM).{0,12}(加|增加|新增|添加|要)/.test(t) &&
      /(字段|备注|标记|紧急度|货源地|交期|筛选|过滤|列)/.test(t)
    ) {
      return true;
    }
    if (
      /(加工单|工单|合同|出库|客户|供应商|商品列表|产品列表|列表|界面).{0,16}(加|增加|新增|添加).{0,12}(字段|备注|标记|紧急度|货源地|交期)/.test(t)
    ) {
      return true;
    }
    return false;
  }

  /** C：壳内 Spec / 小工具硬话题 */
  function looksLikeShellToolHard(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (looksLikeFieldExtHard(t)) return false;
    var SHELL_TOPIC =
      /(计算器|小算盘|算盘|工价.?算|用量.?算|正计时|倒计时|计时器|计时|秒表|节拍|时钟|番茄(?:钟|时钟|工作法)?|专注钟|专注|合并.?PDF|PDF.?合并|拆.?PDF|PDF.?拆|转图|抽文本|提取文本|识图|OCR|ocr|小工具|壳内工具|小应用|本地表|登记表|轻表)/;
    var SHELL_GEN =
      /(写|帮我写|帮.?写|帮我做|帮.?做|做|做个|做一个|弄|弄个|弄一个|搞|搞个|搞一个|生成|新建|创建|开发|来个|来一个|要个|要一个|给我|整一个|出一个|实现|搭一个|加个|加一个)/;
    if (SHELL_GEN.test(t) && SHELL_TOPIC.test(t)) return true;
    if (/(正计时|倒计时|计时器|秒表|番茄|专注).{0,12}(复位|暂停|带复位)/.test(t)) return true;
    if (/(带复位|可暂停).{0,8}(倒计时|正计时|计时器|番茄)/.test(t)) return true;
    if (/(做一个|做个|弄个|搞个|来个).{0,10}(倒计时|正计时|计时器|番茄钟|小算盘|计算器)/.test(t)) return true;
    if (/(PDF|pdf)/.test(t) && /(合并|拆|转图|抽文本|工具)/.test(t)) return true;
    return false;
  }

  /** D：工厂查数 / 进度钱工资 */
  function looksLikeFactoryHard(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (/(怎么|如何|教我)(报工|创建|开单|审核|结算)/.test(t)) return false;
    if (looksLikeFieldExtHard(t)) return false;
    if (/三本账|厂长看板|异常摘要|今天风险|风险一览|一屏三本/.test(t)) return true;
    if (/还欠|欠多少|欠款多少|客户欠|催款|超应收|未收风险/.test(t)) return true;
    if (/进度怎么样|生产怎么样|做到哪|产线怎么样|产线忙不忙|在产多少|有没有延期|延期几|这单进度|单进度怎么样/.test(t)) return true;
    if (/工资.*(有没有|有无|吗|没)|待审.*(有没有|吗)|报工待审|工资结了没|计件工资/.test(t)) return true;
    return (
      (/进度|在产|生产中|延期单|超期/.test(t) &&
        /(怎么样|怎样|如何|多少|几|吗|了吗|概况|这单|加工单|工单)/.test(t)) ||
      /(加工单|工单).*(进度|怎么样|多少|几|概况|在产|延期)/.test(t) ||
      /(多少|几).*(加工单|工单|在产)/.test(t) ||
      /应收|应付|未收|未付|回款|欠款|(钱|款).*(多少|还有)|(多少|还有).*(未收|应收|应付|钱|款)/.test(t) ||
      (/工资|计件/.test(t) && /(待审|本月|结了|有没有|多少)/.test(t))
    );
  }

  /**
   * 歧义：像「给商品加点东西」——有商品/列表语境 + 加/点，但无「字段」也无明确开户建档实体。
   */
  function looksLikeAmbiguousFieldVsOnboard(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (looksLikeFieldExtHard(t)) return false;
    if (looksLikeShellToolHard(t)) return false;
    if (looksLikeFactoryHard(t)) return false;
    if (looksLikeExplicitOnboarding(t)) return false;
    // 「给/为 商品|产品|列表 加/点 东西|点啥|一些」类模糊
    if (
      /(给|为|帮).{0,8}(商品|产品|货|列表).{0,8}(加|加点|加些|加一点|弄点|弄些)/.test(t) &&
      !/(字段|备注|标记|紧急度|货源地|建|新建|录入|三个|几个|工序|部门|人员|车间|BOM)/.test(t)
    ) {
      return true;
    }
    if (/加点东西|加些东西|加一点东西|弄点东西/.test(t) && /(商品|产品|货|列表)/.test(t)) {
      return true;
    }
    return false;
  }

  /**
   * 显式开户 / 像 org·process·goods·bom 的口语（不含「任意≥2字」黑洞；
   * 单独「商品」不够当开户）。
   */
  function looksLikeExplicitOnboarding(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (looksLikeFieldExtHard(t)) return false;
    if (looksLikeShellToolHard(t)) return false;
    if (looksLikeFactoryHard(t)) return false;

    if (/继续开户|恢复引导|开户引导|开始开户|以后再说|先跳过|跳过本步|稍后再说|下次再说/.test(t)) {
      return true;
    }
    if (/开户|建档/.test(t)) return true;

    // 组织：部门/人员/车间等实体词，或「X部」+人名模式
    if (/(部门|人员|员工|同事|车间|产线|班组)/.test(t)) return true;
    if (/[\u4e00-\u9fff]{2,8}部/.test(t) && /(和|与|、|,|，)/.test(t)) return true;

    // 工序：工序/工艺，或计件计时+单价/工序名语境
    if (/(工序|工艺)/.test(t)) return true;
    if (/单价|计件|计时/.test(t) && /(工序|铸造|机加|热处理|都计件)/.test(t)) return true;

    // 商品开户：必须有建/新建/录入/帮我建 等，或「货有/商品有」清单句；单独「商品」不够
    if (/(帮我建|新建|录入|加上|添加|建三个|建几个|建些).{0,12}(货|商品|产品)/.test(t)) return true;
    if (/(三个货|几件货|几个商品|几个产品)[：:]/.test(t)) return true;
    if (/产品有|商品有|货有|货品有/.test(t)) return true;
    if (/(BOM|物料清单|建BOM|做BOM)/i.test(t)) return true;

    // 「货：A、B、C」类
    if (/(?:货|商品|产品)[：:][\u4e00-\u9fffA-Za-z0-9]/.test(t)) return true;

    return false;
  }

  /**
   * 软开户：仅当无硬特征，且（显式开户 或 in_progress 且像开户内容）
   * 删掉「in_progress 且任意 ≥2 字 → L1」
   */
  function looksLikeSoftOnboarding(raw, flags) {
    var t = compact(raw);
    if (!t) return false;
    if (looksLikeFieldExtHard(t) || looksLikeShellToolHard(t) || looksLikeFactoryHard(t)) return false;
    if (looksLikeAmbiguousFieldVsOnboard(t)) return false;
    if (looksLikeExplicitOnboarding(t)) return true;
    var inProgress = !!(flags && (flags.l1InProgress || flags.in_progress || flags.global === "in_progress"));
    if (!inProgress) return false;
    // 进行中：只收「像开户」的短补全（部门名、工序名、货名清单），不收任意闲聊
    if (/(部门|人员|员工|同事|车间|产线|班组|工序|工艺|计件|计时|单价|BOM|物料清单|开户|建档)/.test(t)) {
      return true;
    }
    if (/(帮我建|新建|录入|加上|添加).{0,12}(货|商品|产品|工序|部门|人员|车间)/.test(t)) return true;
    if (/产品有|商品有|货有|工序有|部门有/.test(t)) return true;
    // 像名单：顿号/逗号分隔的 2～8 字中文词（补商品名），且不含明显非开户词
    if (
      /^[\u4e00-\u9fffA-Za-z0-9]{1,40}([、,，/][\u4e00-\u9fffA-Za-z0-9]{1,40}){1,12}$/.test(t) &&
      !/(怎么样|进度|字段|倒计时|番茄|工资|欠款)/.test(t)
    ) {
      return true;
    }
    return false;
  }

  /**
   * @param {string} text
   * @param {{ l1InProgress?: boolean, global?: string, fromChip?: boolean }} [flags]
   * @returns {{ track: 'A'|'B'|'C'|'D'|'E'|'ambiguous', reason: string }}
   */
  function shellIntentRouter(text, flags) {
    flags = flags || {};
    var t = compact(text);
    if (!t) return { track: "E", reason: "空输入" };

    // 开户 chip / 显式控制词：仍 A（即便句里碰巧有别的词）
    if (flags.fromChip) return { track: "A", reason: "fromChip" };
    if (/继续开户|恢复引导|开户引导|开始开户|以后再说|先跳过|跳过本步|稍后再说|下次再说/.test(t)) {
      return { track: "A", reason: "开户控制词" };
    }

    // 1) 硬特征优先于开户状态
    if (looksLikeFieldExtHard(t)) return { track: "B", reason: "硬特征·加字段" };
    if (looksLikeShellToolHard(t)) return { track: "C", reason: "硬特征·壳工具" };
    if (looksLikeFactoryHard(t)) return { track: "D", reason: "硬特征·工厂查数" };

    // 2) 歧义才问
    if (looksLikeAmbiguousFieldVsOnboard(t)) {
      return { track: "ambiguous", reason: "加字段 vs 开户建商品歧义" };
    }

    // 3) 开户软优先
    if (looksLikeSoftOnboarding(t, flags) || looksLikeExplicitOnboarding(t)) {
      return { track: "A", reason: "开户软/显式" };
    }

    return { track: "E", reason: "闲聊/FAQ" };
  }

  var api = {
    shellIntentRouter: shellIntentRouter,
    looksLikeFieldExtHard: looksLikeFieldExtHard,
    looksLikeShellToolHard: looksLikeShellToolHard,
    looksLikeFactoryHard: looksLikeFactoryHard,
    looksLikeAmbiguousFieldVsOnboard: looksLikeAmbiguousFieldVsOnboard,
    looksLikeExplicitOnboarding: looksLikeExplicitOnboarding,
    looksLikeSoftOnboarding: looksLikeSoftOnboarding,
    VERSION: "1.0.88",
    FEATURE: "shell-intent-router",
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.SedricShellIntentRouter = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
