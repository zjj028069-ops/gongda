/**
 * SEDRIC01 v1.0.90 · process-fluent-qa + fluent-chitchat-guard
 * 流程对答上层：对标交付实施经理。
 * 答案只准出自说明书合并版 / 手册分章 / 功能地图白名单；
 * 先判三问（进度/钱/工资）→ 标准单据序 → 侧栏路径 → 一步一动作；
 * 三标签：操作问题 / 配置(审核·开关) / 疑似缺陷；
 * 会话态记住测到哪章 / 哪张单。
 * v1.0.90：闲聊/身份句交还壳，绝不「书上暂未写到」；该书仅当句面像流程/操作问法却未命中时出。
 * 只在 D/E 轨（及 88 交还后）启用；不抢 A/B/C。
 * 与 Garment Agent 无关；纯函数，可供 Node 夹具加载。
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.90";
  var FEATURE = "fluent-chitchat-guard";

  var TAG = {
    OP: "操作问题",
    CFG: "配置(审核·开关)",
    BUG: "疑似缺陷",
  };

  /** 白名单来源（只索引；答不出说书上暂未写到） */
  var SOURCES = {
    handbook_merge: "赛德瑞克完整操作说明书-合并版.md",
    map: "功能地图.md",
    ch00: "手册/00-前言与登录.md",
    ch06: "手册/06-仓库出入库退货与库存.md",
    ch07: "手册/07-加工单派工报工质检.md",
    ch08: "手册/08-问工资.md",
    ch09: "手册/09-问钱.md",
    ch10: "手册/10-问进度.md",
    ch11: "手册/11-分角色每天做什么.md",
    ch12: "手册/12-常见问题FAQ.md",
  };

  /**
   * 标准单据序（功能地图 3.1 + 手册依赖）
   * id 用于会话章/单进度
   */
  var DOC_SEQ = [
    {
      id: "base",
      chapter: "02/03",
      title: "基础数据",
      menu: "系统管理 / 商品管理 / 工序管理",
      hint: "先录部门人员、商品、工序（含计价与单价）、仓库",
      sources: [SOURCES.ch00, SOURCES.map],
    },
    {
      id: "contract_or_purchase",
      chapter: "04/05",
      title: "客户合同或采购",
      menu: "客户管理 → 合同订单；或 供应/采购 → 采购单",
      hint: "有销售订单走合同；要买料走开采购",
      sources: [SOURCES.handbook_merge, SOURCES.map],
    },
    {
      id: "work_order",
      chapter: "07",
      title: "开加工单",
      menu: "生产管理 → 加工单 →「+ 新增」或「合同创建」",
      hint: "合同签完后开加工单；可从合同商品带出",
      sources: [SOURCES.ch07, SOURCES.map],
    },
    {
      id: "start_task",
      chapter: "07",
      title: "开始工序 / 派工",
      menu: "生产管理 → 加工单（开始）；生产管理 → 生产任务",
      hint: "开始工序后工人才能在生产任务上报工",
      sources: [SOURCES.ch07],
    },
    {
      id: "report_work",
      chapter: "07",
      title: "报工 / 质检",
      menu: "生产管理 → 生产任务（报工）；质检中心（需检时）",
      hint: "报良品/不良/工时；需要检验的工序再去做质检",
      sources: [SOURCES.ch07, SOURCES.map],
    },
    {
      id: "warehouse",
      chapter: "06",
      title: "出入库",
      menu: "仓库管理 → 入库单 ▾ → 成品入库单（「加工单入库」）",
      hint: "工序报工/质检达标后再成品入库；领料走生产出库单",
      sources: [SOURCES.ch06, SOURCES.map],
    },
    {
      id: "wage_settle",
      chapter: "08",
      title: "结算工资",
      menu: "生产管理 → 报工记录（结算）；报表中心 → 人力薪酬 → 生产工资报表",
      hint: "有报工才有工资；核对后点结算，再看生产工资报表",
      sources: [SOURCES.ch08],
    },
    {
      id: "money",
      chapter: "09",
      title: "收款 / 对账",
      menu: "客户管理 → 合同订单（欠款/收款）；收支记录；销售对账单",
      hint: "客户欠款看合同【欠款】；收款记在合同或收支记录",
      sources: [SOURCES.ch09],
    },
  ];

  var THREE_Q = {
    progress: {
      id: "progress",
      label: "问进度",
      chapter: "10",
      menus: [
        "生产管理 → 加工单（工序进度详情）",
        "生产管理 → 生产任务",
        "生产管理 → 生产排产",
        "报表中心 → 生产管理",
        "数据大屏",
      ],
      needDocs: ["work_order", "start_task", "report_work"],
      sources: [SOURCES.ch10, SOURCES.ch00, SOURCES.map],
    },
    money: {
      id: "money",
      label: "问钱",
      chapter: "09",
      menus: [
        "客户管理 → 合同订单（上方【欠款】）",
        "客户管理 → 收支记录",
        "供应/采购 → 采购单（【欠款】）",
        "报表中心 → 经营报表 → 销售对账单 / 采购对账单",
      ],
      needDocs: ["contract_or_purchase", "money"],
      sources: [SOURCES.ch09, SOURCES.ch00, SOURCES.map],
    },
    wage: {
      id: "wage",
      label: "问工资",
      chapter: "08",
      menus: [
        "生产管理 → 报工记录",
        "报表中心 → 人力薪酬 → 生产工资报表",
        "生产管理 → 生产设置 → 绩效工资设置（如需）",
      ],
      needDocs: ["report_work", "wage_settle"],
      sources: [SOURCES.ch08, SOURCES.ch00, SOURCES.map],
    },
  };

  function compact(text) {
    return String(text || "").replace(/\s+/g, "");
  }

  function cloneSession(s) {
    s = s || {};
    return {
      chapter: s.chapter || null,
      docId: s.docId || null,
      threeQ: s.threeQ || null,
      role: s.role || null,
      lastTag: s.lastTag || null,
      history: Array.isArray(s.history) ? s.history.slice(-20) : [],
    };
  }

  /** 硬特征：加字段 / 壳工具 / 开户 — 上层不抢（交给 88） */
  function looksLikeNonProcessTrack(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (/(紧急度|加急标记|交期备注|交货备注|扩展字段|拓展字段|货源地)/.test(t)) return true;
    if (/(加|增加|新增|添加|要个|要一个|加个|做个|做一个|来个).{0,30}(字段|备注|标记|筛选|过滤)/.test(t)) return true;
    if (/(字段名称|加个字段|新增字段|添加字段|扩展.?字段)/.test(t)) return true;
    if (
      /(给|为|在).{0,16}(列表|界面|页面|加工单|工单|合同|出库|客户|供应商|商品|产品|工序|采购|BOM).{0,12}(加|增加|新增|添加|要)/.test(t) &&
      /(字段|备注|标记|紧急度|货源地|交期|筛选|过滤|列)/.test(t)
    ) {
      return true;
    }
    if (/(正计时|倒计时|计时器|秒表|番茄|计算器|小算盘|合并.?PDF|壳内工具|小工具)/.test(t) && /(做|弄|搞|来个|生成|写)/.test(t)) {
      return true;
    }
    if (/继续开户|恢复引导|开户引导|开始开户/.test(t)) return true;
    return false;
  }

  /**
   * 闲聊 / 身份 / 寒暄：交还壳短答，绝不「书上暂未写到」。
   * 含：你是谁 / 你叫什么 / 你好 / 在吗 / 谢谢 / 干什么的 / 介绍一下你自己 等。
   */
  function looksLikeChitchatOrIdentity(raw) {
    var t = compact(raw);
    if (!t) return false;
    // 极短寒暄/礼貌
    if (/^(你好|您好|嗨|哈喽|hello|hi|在吗|在不在|在么|早上好|下午好|晚上好|谢谢|多谢|感谢|拜拜|再见|嗯|好的|哦|喔|哈)$/i.test(t)) {
      return true;
    }
    // 身份 / 自我介绍
    if (
      /^(你是谁|你是哪位|你叫什么|你叫啥|你的名字|你是什么|你是啥|你谁啊|你谁呀)([?？!！。.]*)?$/i.test(t) ||
      /你是谁|你叫什么名字|你叫啥名|介绍一下你自己|介绍下你自己|自我介绍|你是什么助手|你是哪个助手/.test(t)
    ) {
      return true;
    }
    // 「干什么的 / 做什么的」且无流程词 → 身份
    if (
      /^(你)?(是)?(干|做)(什么|啥|嘛)的([?？!！。.]*)?$/.test(t) ||
      /^(能做什么|你会什么|有什么功能|你能干什么)([?？!！。.]*)?$/.test(t)
    ) {
      return true;
    }
    return false;
  }

  /**
   * 句面像流程/操作问法（才允许「书上暂未写到」兜底）。
   * 进度/工资/入库/报工/菜单/按钮/怎么/如何 等。
   */
  function looksLikeProcessQuestion(raw) {
    var t = compact(raw);
    if (!t) return false;
    if (looksLikeChitchatOrIdentity(t)) return false;
    if (
      /(怎么|如何|怎样|教我|为何|为什么|咋|怎么样|如何办)/.test(t) ||
      /(进度|工资|入库|出库|报工|开单|加工单|合同|菜单|按钮|侧栏|审核|结算|质检|排产|派工|领料|对账|收款|欠款)/.test(t) ||
      /(点不了|灰的|灰色|找不到|打不开|进不去|下一步|接着导)/.test(t) ||
      /(书上|说明书|手册|功能地图)/.test(t)
    ) {
      return true;
    }
    return false;
  }

  function detectThreeQ(raw) {
    var t = compact(raw);
    if (!t) return null;
    // 工资优先于泛「怎么」
    if (/工资|计件|结算工资|还没发|工资报表|报工.*工资|工资.*报工/.test(t) && !/字段/.test(t)) {
      return "wage";
    }
    if (/欠款|应收|应付|回款|收款|还欠|催款|对账|开票|未收|未付|(问)?钱/.test(t) && !/工资/.test(t)) {
      return "money";
    }
    if (/进度|做到哪|在产|延期|超期|产线|生产怎么样|这单|单子.*怎么/.test(t)) {
      return "progress";
    }
    return null;
  }

  function detectTag(raw) {
    var t = compact(raw);
    if (!t) return TAG.OP;
    // 书与屏不一致 / 颜色文案
    if (/书上|说明书|手册/.test(t) && /(屏幕|界面|实际|蓝色|绿色|灰色|灰的|找不到|对不上)/.test(t)) {
      return TAG.OP; // 以屏为准 → 操作问题（或文案过期）
    }
    if (/(灰色|灰的|点不了|不能点|禁用|disabled)/.test(t) && /(批量|按钮|审核|结算|入库|报工)/.test(t)) {
      // 先引导：未勾选→操作问题；权限/审核→配置；仍异常→疑似缺陷（默认先配置分流）
      if (/没勾|未勾|没选|先勾/.test(t)) return TAG.OP;
      if (/权限|审核|开关|自动出入库|角色/.test(t)) return TAG.CFG;
      return TAG.CFG; // 灰按钮优先怀疑配置/权限
    }
    if (/是不是坏了|bug|缺陷|报错|异常|崩溃|白屏/.test(t)) return TAG.BUG;
    if (/权限|审核流|审核|开关|自动出入库|绩效工资设置/.test(t)) return TAG.CFG;
    return TAG.OP;
  }

  /**
   * 识别跨专题先后 / 串联意图
   */
  function detectScenario(raw) {
    var t = compact(raw);
    if (!t) return null;

    if (/先.*(入库|报工)|入库.*还是.*报工|报工.*还是.*入库|要入库|能不能先入库/.test(t)) {
      return "inbound_vs_report";
    }
    if (/合同.*(签完|好了|完了|之后|接下来)|签完.*合同|合同后.*报工|接下来怎么报工|怎么报工/.test(t) && /合同|报工|加工/.test(t)) {
      return "contract_then_report";
    }
    if (/合同.*(签完|好了|完了|之后|接下来)|接下来.*(加工|开单|报工)/.test(t)) {
      return "contract_then_report";
    }
    if (/工资.*(还没|没有|出不来|怎么)|怎么.*工资|工资怎么/.test(t)) {
      return "wage_missing";
    }
    if (/进度怎么样|这单进度|单进度|做到哪/.test(t)) {
      return "progress_ask";
    }
    if (/书上.*绿|屏幕.*蓝|绿色新增|蓝色新增|书上说.*屏/.test(t)) {
      return "ui_mismatch";
    }
    if (/批量.*(灰|点不了)|灰的.*坏|是不是坏了/.test(t)) {
      return "gray_button";
    }
    return null;
  }

  function docById(id) {
    for (var i = 0; i < DOC_SEQ.length; i++) {
      if (DOC_SEQ[i].id === id) return DOC_SEQ[i];
    }
    return null;
  }

  function formatSteps(docs, startIdx) {
    var lines = [];
    var from = typeof startIdx === "number" ? startIdx : 0;
    for (var i = from; i < docs.length; i++) {
      var d = typeof docs[i] === "string" ? docById(docs[i]) : docs[i];
      if (!d) continue;
      lines.push({
        n: lines.length + 1,
        docId: d.id,
        chapter: d.chapter,
        title: d.title,
        menu: d.menu,
        action: d.hint,
        text: "点「" + d.menu + "」→ " + d.hint,
      });
    }
    return lines;
  }

  function buildAnswer(opts) {
    opts = opts || {};
    var session = cloneSession(opts.session);
    var tag = opts.tag || TAG.OP;
    var threeQ = opts.threeQ || null;
    var scenario = opts.scenario || null;
    var headline = opts.headline || "";
    var judgment = opts.judgment || "";
    var steps = opts.steps || [];
    var menus = opts.menus || [];
    var sources = opts.sources || [];
    var unknown = !!opts.unknown;
    var attachGuideId = opts.attachGuideId || null;

    if (opts.docId) session.docId = opts.docId;
    if (opts.chapter) session.chapter = opts.chapter;
    if (threeQ) session.threeQ = threeQ;
    session.lastTag = tag;
    session.history.push({
      at: Date.now(),
      scenario: scenario,
      threeQ: threeQ,
      docId: session.docId,
      chapter: session.chapter,
    });

    var bodyLines = [];
    if (judgment) bodyLines.push(judgment);
    if (steps.length) {
      bodyLines.push("【标准单据序 · 一步一动作】");
      steps.forEach(function (s) {
        bodyLines.push(s.n + ". " + s.text);
      });
    }
    if (menus.length) {
      bodyLines.push("【侧栏路径】");
      menus.forEach(function (m) {
        bodyLines.push("· " + m);
      });
    }
    if (unknown) {
      bodyLines.push("书上暂未写到此处细节，请对照屏幕实际按钮，并记为「" + tag + "」。");
    } else {
      bodyLines.push("界面与书不一致时以屏幕为准，并标「" + tag + "」。");
    }
    if (session.chapter || session.docId) {
      bodyLines.push(
        "（会话进度：章 " +
          (session.chapter || "—") +
          " / 单 " +
          (session.docId || "—") +
          "；下一句可直接问「下一步」接着导。）"
      );
    }

    return {
      ok: true,
      version: VERSION,
      feature: FEATURE,
      tag: tag,
      threeQ: threeQ,
      scenario: scenario,
      headline: headline,
      judgment: judgment,
      steps: steps,
      menus: menus,
      sources: sources,
      unknown: unknown,
      attachGuideId: attachGuideId,
      session: session,
      text: (headline ? headline + "\n\n" : "") + bodyLines.join("\n"),
      // 壳渲染用
      fluent: true,
    };
  }

  function answerProgress(raw, session) {
    var tq = THREE_Q.progress;
    var steps = formatSteps(["work_order", "start_task", "report_work"]);
    return buildAnswer({
      session: session,
      tag: TAG.OP,
      threeQ: "progress",
      scenario: "progress_ask",
      headline: "先判：这是「问进度」。",
      judgment:
        "要看这单做到哪：有加工单与报工才有可信进度。缺报工就先去生产任务报工；已有报工可看加工单「工序进度详情」、生产任务、生产排产或报表/大屏。",
      steps: steps,
      menus: tq.menus,
      sources: tq.sources,
      chapter: "10",
      docId: "report_work",
      attachGuideId: "progress",
    });
  }

  function answerWageMissing(raw, session) {
    var tq = THREE_Q.wage;
    var steps = formatSteps(["report_work", "wage_settle"]);
    return buildAnswer({
      session: session,
      tag: TAG.OP,
      threeQ: "wage",
      scenario: "wage_missing",
      headline: "先判：这是「问工资」。",
      judgment:
        "单据序：① 报工记录里有没有这条（工人报工后才自动算工资，状态常为「未结算」）→ ② 核对单价/绩效匹配 → ③ 在报工记录点「结算」→ ④ 报表中心 → 生产工资报表按人汇总。缺报工就先报工，不要先怪报表。",
      steps: steps,
      menus: tq.menus,
      sources: tq.sources,
      chapter: "08",
      docId: "wage_settle",
      attachGuideId: "wage",
    });
  }

  function answerInboundVsReport(raw, session) {
    return buildAnswer({
      session: session,
      tag: TAG.OP,
      threeQ: detectThreeQ(raw) || "progress",
      scenario: "inbound_vs_report",
      headline: "标准序：先报工/质检，再成品入库。",
      judgment:
        "功能地图主路径是：开加工单 → 开始工序 → 报工（→ 质检）→ 再成品/半成品入库。不要先入库再补报工。验证：生产任务里已有良品报工（需检工序质检通过）后，再走仓库入库。",
      steps: [
        {
          n: 1,
          docId: "report_work",
          chapter: "07",
          title: "报工/质检",
          menu: "生产管理 → 生产任务",
          action: "对该工序报良品；需检则质检中心判定",
          text: "点「生产管理 → 生产任务」→ 报良品/不良（需检再质检）",
        },
        {
          n: 2,
          docId: "warehouse",
          chapter: "06",
          title: "成品入库",
          menu: "仓库管理 → 入库单 ▾ → 成品入库单 →「新增 ▾」→「加工单入库」",
          action: "选加工单与入库仓库，填入库数量后确定",
          text: "点「仓库管理 → 入库单 ▾ → 成品入库单」→「新增 ▾」→「加工单入库」→ 选单填数量 → 确定",
        },
      ],
      menus: [
        "生产管理 → 生产任务 / 报工记录",
        "仓库管理 → 入库单 ▾ → 成品入库单",
      ],
      sources: [SOURCES.ch07, SOURCES.ch06, SOURCES.map],
      chapter: "06",
      docId: "warehouse",
      attachGuideId: "warehouse",
    });
  }

  function answerContractThenReport(raw, session) {
    var steps = formatSteps(["contract_or_purchase", "work_order", "start_task", "report_work"]);
    // 合同已签完 → 从开加工单起讲，仍列出合同以示先后
    return buildAnswer({
      session: session,
      tag: TAG.OP,
      threeQ: detectThreeQ(raw) || "progress",
      scenario: "contract_then_report",
      headline: "合同签完了：接下来按单据序走到报工。",
      judgment:
        "串联：合同（商品/工序齐）→ 开加工单（合同创建）→ 开始工序 → 工人在生产任务报工。不要跳过加工单直接报工。",
      steps: steps,
      menus: [
        "客户管理 → 合同订单（确认商品）",
        "生产管理 → 加工单 →「+ 新增 → 合同创建」",
        "生产管理 → 生产任务（报工）",
      ],
      sources: [SOURCES.ch07, SOURCES.handbook_merge, SOURCES.map],
      chapter: "07",
      docId: "report_work",
      attachGuideId: "report-work",
    });
  }

  function answerUiMismatch(raw, session) {
    return buildAnswer({
      session: session,
      tag: TAG.OP,
      threeQ: null,
      scenario: "ui_mismatch",
      headline: "以屏幕为准，不编造按钮颜色。",
      judgment:
        "以屏幕为准：说明书配图可能过期。屏幕上是蓝色「新增」就点蓝色的；把差异记为「操作问题」（文案/配图过期），不要按书上的颜色找按钮。",
      steps: [
        {
          n: 1,
          text: "对照当前侧栏与顶栏实际按钮文案操作",
          docId: session && session.docId,
          chapter: session && session.chapter,
        },
        {
          n: 2,
          text: "若功能找不到：先查角色权限 / 模块是否开通（可能是配置问题）",
        },
      ],
      menus: [],
      sources: [SOURCES.ch00, SOURCES.ch12],
      chapter: (session && session.chapter) || "00",
      docId: (session && session.docId) || null,
    });
  }

  function answerGrayButton(raw, session) {
    return buildAnswer({
      session: session,
      tag: TAG.CFG,
      threeQ: null,
      scenario: "gray_button",
      headline: "先分流：操作问题 → 配置(审核·开关) → 仍异常才疑似缺陷。",
      judgment:
        "批量按钮是灰的：① 是否先勾选了列表行？（没勾选 → 操作问题）② 是否缺权限、或单据在审核流中、或开关未开？（→ 配置(审核·开关)）③ 勾选且权限都对仍灰 → 标「疑似缺陷」并记下菜单与角色。",
      steps: [
        { n: 1, text: "在列表勾选至少一行后再看批量按钮是否可点" },
        { n: 2, text: "系统管理 → 角色管理：核对当前角色是否有该批量操作权限" },
        { n: 3, text: "若单据需审核：看审核设置 / 当前审核状态是否卡住" },
      ],
      menus: ["系统管理 → 角色管理", "对应模块的「设置 / 审核设置」"],
      sources: [SOURCES.ch12, SOURCES.map],
      chapter: "12",
      docId: (session && session.docId) || null,
    });
  }

  function answerByThreeQ(threeQ, session) {
    if (threeQ === "wage") return answerWageMissing("", session);
    if (threeQ === "money") {
      var tq = THREE_Q.money;
      return buildAnswer({
        session: session,
        tag: TAG.OP,
        threeQ: "money",
        scenario: "money_ask",
        headline: "先判：这是「问钱」。",
        judgment:
          "客户欠款看合同订单上方【欠款】；给合同收款；供应商侧看采购单【欠款】。对账走销售/采购对账单。",
        steps: formatSteps(["contract_or_purchase", "money"]),
        menus: tq.menus,
        sources: tq.sources,
        chapter: "09",
        docId: "money",
        attachGuideId: "money",
      });
    }
    if (threeQ === "progress") return answerProgress("", session);
    return null;
  }

  function answerContinue(session) {
    session = cloneSession(session);
    var idx = 0;
    if (session.docId) {
      for (var i = 0; i < DOC_SEQ.length; i++) {
        if (DOC_SEQ[i].id === session.docId) {
          idx = Math.min(i + 1, DOC_SEQ.length - 1);
          break;
        }
      }
    }
    var next = DOC_SEQ[idx];
    var steps = formatSteps(DOC_SEQ.slice(idx, idx + 2));
    return buildAnswer({
      session: session,
      tag: session.lastTag || TAG.OP,
      threeQ: session.threeQ,
      scenario: "continue",
      headline: "接着上次：下一步是「" + next.title + "」。",
      judgment: "会话记着章 " + (session.chapter || "—") + " / 单 " + (session.docId || "—") + "，不重开百科。",
      steps: steps,
      menus: [next.menu],
      sources: next.sources || [SOURCES.map],
      chapter: next.chapter,
      docId: next.id,
    });
  }

  /**
   * @param {string} text
   * @param {{ session?: object, track?: string }} [ctx]
   * @returns {{ handled: boolean, deferToRouter?: boolean, answer?: object, reason?: string }}
   */
  function processFluentAnswer(text, ctx) {
    ctx = ctx || {};
    var track = ctx.track || "E";
    var session = cloneSession(ctx.session);

    // 只在 D/E（及交还后）用；A/B/C 不抢
    if (track === "A" || track === "B" || track === "C" || track === "ambiguous") {
      return {
        handled: false,
        deferToRouter: true,
        reason: "非 D/E 轨，交还 88 路由",
        tip:
          track === "B"
            ? "加完字段后再回开户/流程指引。"
            : track === "A"
              ? "开户进行中；流程对答不抢话。"
              : null,
      };
    }

    var raw = String(text || "");
    var t = compact(raw);
    if (!t) {
      return { handled: false, reason: "空输入" };
    }

    // 双保险：硬特征像加字段等 → 不串
    if (looksLikeNonProcessTrack(t)) {
      return {
        handled: false,
        deferToRouter: true,
        reason: "硬特征像加字段/壳工具/开户，上层不抢",
        tip: "加完字段再续开户或回流程指引。",
      };
    }

    // 闲聊/身份优先交还（勿落入白名单未命中）
    if (looksLikeChitchatOrIdentity(t)) {
      return {
        handled: false,
        deferToRouter: true,
        reason: "闲聊/身份，交还壳短答",
        tip: "chitchat",
      };
    }

    if (/^(下一步|接着|继续导|然后呢|再下一步)$/.test(t) && (session.docId || session.chapter)) {
      return { handled: true, answer: answerContinue(session), reason: "会话续导" };
    }

    var scenario = detectScenario(t);
    var threeQ = detectThreeQ(t);

    if (scenario === "inbound_vs_report") {
      return { handled: true, answer: answerInboundVsReport(raw, session), reason: "入库vs报工" };
    }
    if (scenario === "contract_then_report") {
      return { handled: true, answer: answerContractThenReport(raw, session), reason: "合同后报工" };
    }
    if (scenario === "wage_missing" || (threeQ === "wage" && /怎么|还没|没有|出不来|为何|为什么/.test(t))) {
      return { handled: true, answer: answerWageMissing(raw, session), reason: "工资未出" };
    }
    if (scenario === "progress_ask" || (threeQ === "progress" && track === "D")) {
      return { handled: true, answer: answerProgress(raw, session), reason: "问进度" };
    }
    if (scenario === "ui_mismatch") {
      return { handled: true, answer: answerUiMismatch(raw, session), reason: "书屏不一致" };
    }
    if (scenario === "gray_button") {
      return { handled: true, answer: answerGrayButton(raw, session), reason: "灰按钮分流" };
    }

    if (threeQ) {
      var byQ = answerByThreeQ(threeQ, session);
      if (byQ) return { handled: true, answer: byQ, reason: "三问主链·" + threeQ };
    }

    // 教法句：怎么报工/开单等 → 落到单据序片段
    if (/(怎么|如何|教我|怎样).{0,8}(报工|开加工单|开单|入库|出库|结算)/.test(t)) {
      if (/报工/.test(t)) {
        return {
          handled: true,
          answer: buildAnswer({
            session: session,
            tag: detectTag(t),
            threeQ: threeQ || "progress",
            scenario: "how_report",
            headline: "报工：在生产任务上一步一动作。",
            judgment: "前置：已有加工单且工序已开始。路径见手册第 07 章。",
            steps: formatSteps(["work_order", "start_task", "report_work"]),
            menus: ["生产管理 → 加工单", "生产管理 → 生产任务"],
            sources: [SOURCES.ch07, SOURCES.map],
            chapter: "07",
            docId: "report_work",
            attachGuideId: "report-work",
          }),
          reason: "教法·报工",
        };
      }
      if (/入库/.test(t)) {
        return { handled: true, answer: answerInboundVsReport(raw, session), reason: "教法·入库序" };
      }
    }

    // 白名单未命中：仅当句面像流程/操作问法时才出「书上暂未写到」
    if (track === "E") {
      if (!looksLikeProcessQuestion(t)) {
        return {
          handled: false,
          deferToRouter: true,
          reason: "非流程问法未命中，交还壳",
          tip: "not-process",
        };
      }
      return {
        handled: true,
        answer: buildAnswer({
          session: session,
          tag: detectTag(t),
          threeQ: threeQ,
          scenario: "unknown",
          headline: "书上暂未写到。",
          judgment:
            "这句话在说明书合并版 / 手册分章 / 功能地图里还没有对应逐步说明。请对照屏幕实际菜单操作，并记「" +
            detectTag(t) +
            "」。可改问：进度怎么样、工资怎么还没出来、先入库还是先报工、合同后怎么报工。",
          steps: [],
          menus: [],
          sources: [SOURCES.handbook_merge, SOURCES.map],
          unknown: true,
          chapter: session.chapter,
          docId: session.docId,
        }),
        reason: "白名单未命中",
      };
    }

    // D 轨未识别为流程句：不拦截工厂查数
    return { handled: false, reason: "D 轨无流程编排命中，交工厂查数" };
  }

  /** 供 D 轨：查数后附「下一单据」短提示 */
  function nextDocHint(threeQ, session) {
    var q = threeQ || (session && session.threeQ) || "progress";
    if (q === "wage") {
      return "若要推进工资：先确认报工记录有无 → 再结算 → 看生产工资报表。";
    }
    if (q === "money") {
      return "若要推进回款：合同订单行上「收款」，或收支记录补录。";
    }
    return "若要推进进度：缺报工先生产任务报工；再看加工单工序进度。";
  }

  var api = {
    VERSION: VERSION,
    FEATURE: FEATURE,
    TAG: TAG,
    SOURCES: SOURCES,
    DOC_SEQ: DOC_SEQ,
    THREE_Q: THREE_Q,
    processFluentAnswer: processFluentAnswer,
    detectThreeQ: detectThreeQ,
    detectTag: detectTag,
    detectScenario: detectScenario,
    looksLikeNonProcessTrack: looksLikeNonProcessTrack,
    looksLikeChitchatOrIdentity: looksLikeChitchatOrIdentity,
    looksLikeProcessQuestion: looksLikeProcessQuestion,
    nextDocHint: nextDocHint,
    cloneSession: cloneSession,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.SedricProcessFluentQa = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
