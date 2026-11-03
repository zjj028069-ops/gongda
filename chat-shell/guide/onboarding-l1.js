/**
 * SEDRIC01 · L1 引导式基础资料录入（手册 02→03）
 * 状态：localStorage sedric_onboarding_l1
 * 写库：优先壳内白名单确认协议；无 API 时「草案已确认、待 MES 落库」+ navigateMes
 * v1.0.87 onboarding-l1-nlu-first：API 优先、归类不看步、综合确认卡、可乱序清单
 * 禁止：代点审核 / 入库过账 / 工资结算；与 Garment Agent 无关
 */
(function (global) {
  "use strict";

  var STORE_KEY = "sedric_onboarding_l1";
  var ACCENT = "#4184F4";

  var STEPS = [
    { id: "org", title: "部门 / 人员 / 车间", chapter: "手册 02 §5/7/11", menu: "系统管理→部门管理 / 用户管理；生产管理→生产设置→基础配置" },
    { id: "process", title: "工序", chapter: "手册 03 §6", menu: "生产管理→工序管理" },
    { id: "goods", title: "商品", chapter: "手册 03 §4", menu: "商品管理→商品列表" },
    { id: "bom", title: "BOM", chapter: "手册 03 §8", menu: "商品管理→BOM管理" },
  ];

  var MES_PATHS = {
    department: "/department/list",
    user: "/user/list",
    workshop: "/setting/produce/dictionary",
    process: "/public_craft/list",
    goods: "/goods/list",
    bom: "/bom/list",
  };

  var STATUS = {
    not_started: "未开始",
    in_progress: "进行中",
    skipped: "跳过",
    done: "完成",
  };

  var host = {
    pushAssistant: null,
    pushUser: null,
    navigateMes: null,
    showToast: null,
    getUser: null,
    selectAssistant: null,
    nowTime: function () {
      var d = new Date();
      return (
        String(d.getHours()).padStart(2, "0") +
        ":" +
        String(d.getMinutes()).padStart(2, "0")
      );
    },
  };

  var state = null; // bindHost/load 前也可能渲染；见 ensureState
  var pendingConfirm = null;
  var overlayEl = null;
  var pwdRevealOnce = Object.create(null);

  function defaultState() {
    return {
      version: 1,
      global: "not_started",
      stepStates: {
        org: "not_started",
        process: "not_started",
        goods: "not_started",
        bom: "not_started",
      },
      currentStep: "welcome",
      welcomeDismissed: false,
      welcomeAutoShown: false,
      data: { depts: [], users: [], workshops: [], processes: [], goods: [], boms: [] },
      drafts: [],
      audit: [],
      seatBlocked: false,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      return Object.assign(base, parsed, {
        stepStates: Object.assign(base.stepStates, (parsed && parsed.stepStates) || {}),
        data: Object.assign(base.data, (parsed && parsed.data) || {}),
      });
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(t) {
    if (typeof host.showToast === "function") host.showToast(t);
  }

  function navigateMes(path) {
    if (typeof host.navigateMes === "function") host.navigateMes(path);
    else if (global.SedricChat && typeof global.SedricChat.navigateMes === "function") {
      global.SedricChat.navigateMes(path);
    }
  }

  function pushAssistant(payload) {
    if (typeof host.pushAssistant === "function") host.pushAssistant(payload);
  }

  function isAdminUser(user) {
    if (!user) return false;
    var role = String(user.role || (user.user && user.user.role) || "").toLowerCase();
    if (role === "admin" || role === "系统管理员" || role.indexOf("admin") >= 0) return true;
    var roles = user.roles || (user.user && user.user.roles) || [];
    if (Array.isArray(roles)) {
      for (var i = 0; i < roles.length; i++) {
        var r = String(roles[i] && (roles[i].name || roles[i].code || roles[i]) || "").toLowerCase();
        if (r.indexOf("admin") >= 0 || r.indexOf("系统管理") >= 0) return true;
      }
    }
    return false;
  }

  function seatsRemaining(user) {
    if (!user) return null;
    var keys = ["seats_remaining", "seat_left", "seats_left", "remain_seats", "available_seats"];
    for (var i = 0; i < keys.length; i++) {
      if (typeof user[keys[i]] === "number") return user[keys[i]];
    }
    try {
      var forced = localStorage.getItem("sedric_l1_seat_left");
      if (forced != null && forced !== "") return Number(forced);
    } catch (e) {}
    return null;
  }

  function looksEmptyTenant(user) {
    /* 待确认默认：管理员 + 空库自动欢迎；无 API 时用本地未完成态近似 */
    try {
      if (sessionStorage.getItem("sedric_l1_force") === "1") return true;
    } catch (e) {}
    if (user && (user.goods_count === 0 || user.product_count === 0) && (user.craft_count === 0 || user.process_count === 0)) {
      return true;
    }
    if (state.global === "not_started" || state.global === "skipped") return true;
    var anyDone = Object.keys(state.stepStates).some(function (k) {
      return state.stepStates[k] === "done";
    });
    return !anyDone && !state.welcomeDismissed;
  }

  function ensureOverlay() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
    overlayEl = document.createElement("div");
    overlayEl.id = "l1-overlay";
    overlayEl.className = "l1-overlay";
    overlayEl.hidden = true;
    overlayEl.innerHTML =
      '<div class="l1-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="l1-modal-title">' +
      '<header class="l1-modal-hd">' +
      '<div><h2 id="l1-modal-title">确认录入</h2><div class="l1-modal-sub" id="l1-modal-sub"></div></div>' +
      '<button type="button" class="l1-btn-ghost l1-modal-x" id="l1-modal-close" aria-label="关闭">×</button>' +
      "</header>" +
      '<div class="l1-modal-bd" id="l1-modal-body"></div>' +
      '<footer class="l1-modal-ft">' +
      '<button type="button" class="l1-btn" id="l1-modal-cancel">取消</button>' +
      '<button type="button" class="l1-btn l1-btn-primary" id="l1-modal-confirm" data-testid="sedric-l1-confirm">确认录入</button>' +
      "</footer></div>";
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) closeModal();
    });
    overlayEl.querySelector("#l1-modal-close").addEventListener("click", closeModal);
    overlayEl.querySelector("#l1-modal-cancel").addEventListener("click", closeModal);
    overlayEl.querySelector("#l1-modal-confirm").addEventListener("click", applyConfirm);
    return overlayEl;
  }

  function openConfirm(title, sub, bodyHtml, payload) {
    ensureOverlay();
    overlayEl.querySelector("#l1-modal-title").textContent = title;
    overlayEl.querySelector("#l1-modal-sub").textContent = sub;
    overlayEl.querySelector("#l1-modal-body").innerHTML = bodyHtml;
    pendingConfirm = payload;
    overlayEl.hidden = false;
    bindPwdReveal();
  }

  function closeModal() {
    if (overlayEl) overlayEl.hidden = true;
    pendingConfirm = null;
  }

  function bindPwdReveal() {
    if (!overlayEl) return;
    overlayEl.querySelectorAll("[data-pwd-reveal]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-pwd-reveal");
        var input = overlayEl.querySelector('[data-pwd-id="' + id + '"]');
        if (!input) return;
        if (pwdRevealOnce[id]) {
          toast("已显示过一次，请到用户管理查看/重置");
          return;
        }
        input.type = "text";
        pwdRevealOnce[id] = true;
        btn.textContent = "已显示";
        btn.disabled = true;
      };
    });
  }

  function readModalRows() {
    return Array.prototype.map.call(overlayEl.querySelectorAll("#l1-modal-body .l1-row-card"), function (card) {
      var o = { kind: card.getAttribute("data-kind") || "" };
      card.querySelectorAll("[data-f]").forEach(function (el) {
        o[el.getAttribute("data-f")] = String(el.value || "").trim();
      });
      return o;
    });
  }

  function ensureState() {
    if (!state || !state.stepStates) {
      try {
        state = load();
      } catch (e) {
        state = null;
      }
    }
    if (!state || !state.stepStates) state = defaultState();
    return state;
  }

  function stepStripHtml(activeId) {
    ensureState();
    var future =
      '<div class="l1-step-row l1-future"><span class="l1-ico"></span><span>客户 / 仓库 / 加工单…</span><span class="l1-tag">后续示意</span></div>';
    return (
      '<div class="l1-checklist" data-testid="sedric-l1-checklist">' +
      '<div class="l1-checklist-h">开户清单 · 可乱序打勾</div>' +
      STEPS.map(function (s) {
        var st = state.stepStates[s.id];
        var isActive = s.id === activeId || st === "in_progress";
        var cls =
          st === "done" ? "done" : st === "skipped" ? "skipped" : isActive ? "active" : "";
        var mark = st === "done" ? "✓" : st === "skipped" ? "–" : isActive ? "●" : "○";
        return (
          '<div class="l1-step-row ' +
          cls +
          '" data-l1-step="' +
          s.id +
          '" title="点击可跳到此项（不强制顺序）"><span class="l1-ico">' +
          mark +
          "</span><span>" +
          esc(s.title) +
          '</span><span class="l1-tag">' +
          esc(STATUS[st] || st) +
          "</span></div>"
        );
      }).join("") +
      future +
      "</div>"
    );
  }

  function buildWelcomePayload() {
    return {
      role: "assistant",
      l1_welcome: true,
      time: host.nowTime(),
      text:
        "欢迎使用赛德瑞克 MES。首次登录建议完成「开户准备」基础资料（第 02→03 章）。组织/工序/商品/BOM 可乱序；我说人话你确认卡核对后再入库。",
    };
  }

  function renderWelcomeCard(root) {
    ensureState();
    var card = document.createElement("div");
    card.className = "guide-card l1-welcome-card";
    card.setAttribute("data-testid", "sedric-l1-welcome");
    card.innerHTML =
      '<div class="guide-card-label">开户引导 · L1</div>' +
      '<div class="guide-card-title">欢迎使用赛德瑞克 MES</div>' +
      '<p class="guide-summary">组织 / 工序 / 商品 / BOM <strong>可乱序</strong>完成；随便怎么说。' +
      "<strong>每次写入都会弹出确认卡</strong>，你核对后再入库。本层<strong>不会</strong>自动审核、入库或结算工资。</p>" +
      stepStripHtml(null) +
      '<ul class="l1-welcome-ul">' +
      "<li>部门 / 人员 / 生产车间</li>" +
      "<li>工序</li>" +
      "<li>商品（口语可说「产品」）</li>" +
      "<li>BOM（录入商品后引导打开 MES）</li>" +
      "</ul>" +
      '<div class="l1-chip-row">' +
      '<button type="button" class="l1-chip" data-l1-act="start">开始开户引导</button>' +
      '<button type="button" class="l1-chip l1-chip-ghost" data-l1-act="later">稍后再说</button>' +
      "</div>";
    bindCardActions(card);
    root.appendChild(card);
  }

  function renderGuideCard(root, msg) {
    ensureState();
    var card = document.createElement("div");
    card.className = "guide-card l1-guide-card";
    card.setAttribute("data-testid", "sedric-l1-guide");
    var html =
      '<div class="guide-card-label">开户引导 · ' +
      esc(msg.stepTitle || "") +
      "</div>" +
      '<div class="guide-card-title">' +
      esc(msg.title || "") +
      "</div>" +
      '<p class="guide-summary">' +
      (msg.html || esc(msg.text || "")) +
      "</p>" +
      stepStripHtml(msg.stepId || state.currentStep);
    if (msg.menuHint) {
      html +=
        '<p class="l1-menu-hint">引导点菜单：<strong>' +
        esc(msg.menuHint) +
        "</strong></p>";
    }
    if (msg.chips && msg.chips.length) {
      html +=
        '<div class="l1-chip-row">' +
        msg.chips
          .map(function (c) {
            return (
              '<button type="button" class="l1-chip' +
              (c.ghost ? " l1-chip-ghost" : "") +
              '" data-l1-act="' +
              esc(c.act) +
              '"' +
              (c.name ? ' data-name="' + esc(c.name) + '"' : "") +
              (c.path ? ' data-path="' + esc(c.path) + '"' : "") +
              ">" +
              esc(c.label) +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }
    card.innerHTML = html;
    bindCardActions(card);
    root.appendChild(card);
  }

  function bindCardActions(card) {
    card.querySelectorAll("[data-l1-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-l1-act");
        if (act === "start") startStep("org");
        else if (act === "later") dismissWelcome();
        else if (act === "skip") skipStep(state.currentStep);
        else if (act === "resume") resume();
        else if (act === "skip-bom") skipStep("bom");
        else if (act === "bom-for") openBomGuide(btn.getAttribute("data-name"));
        else if (act === "bom-mes") openBomInMes(btn.getAttribute("data-name") || "");
        else if (act === "open-mes") navigateMes(btn.getAttribute("data-path") || MES_PATHS.goods);
        else if (act === "finish") finishAll();
        else if (act === "example-org") handleUserText("车间精工，张三和李四在生产部", true);
        else if (act === "example-process") handleUserText("铸造机加热处理都计件，单价 8、12、10", true);
        else if (act === "example-goods") handleUserText("帮我建三个货：水泵壳、叶轮、端盖", true);
      });
    });
    card.querySelectorAll("[data-l1-step]").forEach(function (row) {
      row.addEventListener("click", function () {
        startStep(row.getAttribute("data-l1-step"));
      });
    });
  }

  function dismissWelcome() {
    state.welcomeDismissed = true;
    state.global = "skipped";
    save();
    pushAssistant({
      role: "assistant",
      text: "好的，稍后再说。需要时点「继续开户引导」，或直接说「继续开户」。",
      time: host.nowTime(),
    });
    toast("可随时继续开户引导");
  }

  function startStep(id) {
    STEPS.forEach(function (s) {
      if (state.stepStates[s.id] === "in_progress") state.stepStates[s.id] = "not_started";
    });
    state.stepStates[id] = "in_progress";
    state.currentStep = id;
    state.global = "in_progress";
    save();
    if (id === "org") promptOrg();
    else if (id === "process") promptProcess();
    else if (id === "goods") promptGoods();
    else if (id === "bom") promptBom();
  }

  function promptOrg() {
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: "org",
      stepTitle: "第 1 步",
      title: "部门 / 人员 / 车间",
      html:
        "随便怎么说就行，顺序不限——部门、人员、车间（也叫产线/班组）都能听。<br/>" +
        '<details class="l1-examples"><summary>不会说点这里</summary>' +
        "<p>例：「车间精工，张三李四在生产部」或「部门有生产部；人员有张三、李四；车间有精工车间」。</p></details>",
      menuHint: "系统管理→部门管理 / 用户管理；生产管理→生产设置→基础配置",
      chips: [
        { act: "example-org", label: "填入示例", ghost: true },
        { act: "skip", label: "跳过本步", ghost: true },
      ],
      time: host.nowTime(),
    });
  }

  function promptProcess() {
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: "process",
      stepTitle: "第 2 步",
      title: "工序",
      html:
        "随便怎么说工序名和计价即可；「都计件」只表示计价方式，不会当成工序名。<br/>" +
        '<details class="l1-examples"><summary>不会说点这里</summary>' +
        "<p>例：「铸造机加热处理都计件，单价 8、12、10」或「工序有铸造、机械加工、热处理，计件，单价 8、12、10」。</p></details>",
      menuHint: "生产管理→工序管理",
      chips: [
        { act: "example-process", label: "填入示例", ghost: true },
        { act: "skip", label: "跳过本步", ghost: true },
      ],
      time: host.nowTime(),
    });
  }

  function promptGoods() {
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: "goods",
      stepTitle: "第 3 步",
      title: "商品",
      html:
        "系统里叫「商品」，口语说产品/货也行。随便怎么说要建哪些货，确认弹窗里还能改名；编号空着将自动生成。<br/>" +
        '<details class="l1-examples"><summary>不会说点这里</summary>' +
        "<p>例：「帮我建三个货：水泵壳、叶轮、端盖」或「我们的产品有 A、B、C」。</p></details>",
      menuHint: "商品管理→商品列表",
      chips: [
        { act: "example-goods", label: "填入示例", ghost: true },
        { act: "skip", label: "跳过本步", ghost: true },
      ],
      time: host.nowTime(),
    });
  }

  function promptBom() {
    var goods = state.data.goods || [];
    var chips = goods.slice(0, 3).map(function (g) {
      return { act: "bom-for", label: "为「" + g.name + "」建 BOM", name: g.name };
    });
    chips.push({ act: "bom-mes", label: "打开 MES · BOM 管理", ghost: true });
    chips.push({ act: "skip-bom", label: "跳过 BOM", ghost: true });
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: "bom",
      stepTitle: "第 4 步",
      title: "建 BOM",
      html: goods.length
        ? "已确认商品草案：<strong>" +
          esc(goods.map(function (g) {
            return g.name;
          }).join("、")) +
          "</strong>。本层只预填并打开 MES「BOM管理→新增」，不在聊天里硬写复杂用料行。"
        : "请先完成商品录入，或跳过。完整 BOM 请在 MES 原生表单补全。",
      menuHint: "商品管理→BOM管理",
      chips: chips,
      time: host.nowTime(),
    });
  }

  function nextIncompleteStep(excludeId) {
    var order = ["org", "process", "goods", "bom"];
    return order.find(function (sid) {
      if (excludeId && sid === excludeId) return false;
      var st = state.stepStates[sid];
      return st !== "done" && st !== "skipped";
    });
  }

  function skipStep(id) {
    if (!id || id === "welcome") return;
    state.stepStates[id] = "skipped";
    save();
    var step = STEPS.find(function (s) {
      return s.id === id;
    });
    pushAssistant({
      role: "assistant",
      text: "已跳过「" + ((step && step.title) || id) + "」。稍后可点「继续开户引导」恢复。",
      time: host.nowTime(),
    });
    var next = nextIncompleteStep(id);
    if (next) startStep(next);
    else finishAll();
  }

  function markDone(id) {
    state.stepStates[id] = "done";
    save();
  }

  function finishAll() {
    state.global = "done";
    state.currentStep = "done";
    save();
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: null,
      stepTitle: "完成",
      title: "基础资料引导告一段落",
      html:
        "后续主链（客户、仓库、加工单等）见手册 04–07，可从工作台进入 MES。<br/><em>本层不会自动审核、入库或结算工资。</em>",
      chips: [{ act: "resume", label: "继续开户引导", ghost: true }],
      time: host.nowTime(),
    });
  }

  function resume() {
    if (typeof host.selectAssistant === "function") host.selectAssistant();
    var order = ["org", "process", "goods", "bom"];
    var next = order.find(function (id) {
      var st = state.stepStates[id];
      return st === "skipped" || st === "not_started" || st === "in_progress";
    });
    if (!next) {
      toast("全部已完成");
      finishAll();
      return;
    }
    var step = STEPS.find(function (s) {
      return s.id === next;
    });
    pushAssistant({
      role: "assistant",
      text: "从「" + ((step && step.title) || next) + "」继续…",
      time: host.nowTime(),
    });
    startStep(next);
  }

  function pinyinish(name) {
    var map = { 张三: "zhangsan", 李四: "lisi", 王五: "wangwu" };
    return map[name] || "user_" + Date.now().toString(36).slice(-4);
  }

  function genTempPassword() {
    return "Sd" + Math.random().toString(36).slice(2, 8) + "!";
  }

  function splitList(chunk) {
    return String(chunk || "")
      .split(/[、,，/\s]+/)
      .map(function (s) {
        return s.replace(/^(有|：|:|是)/, "").trim();
      })
      .filter(Boolean);
  }

  function isBadEntityName(name) {
    var n = String(name || "").trim();
    if (!n) return true;
    if (/^(建上|建好|先建|加上|挂上|建个|弄上|搞上|挂个)$/.test(n)) return true;
    if (/^(先把|把)/.test(n)) return true;
    return false;
  }

  function splitPersonNames(blob) {
    var s = String(blob || "")
      .replace(/^(上|了)/, "")
      .replace(/等$/, "")
      .trim();
    if (!s) return [];
    if (/[、,，和与]/.test(s)) {
      return splitList(s.replace(/[和与]/g, "、")).filter(function (n) {
        return n.length >= 2 && n.length <= 4 && !isBadEntityName(n);
      });
    }
    if (s.length >= 4 && s.length <= 12 && s.length % 2 === 0 && /^[\u4e00-\u9fff]+$/.test(s)) {
      var out = [];
      for (var i = 0; i < s.length; i += 2) out.push(s.slice(i, i + 2));
      return out.filter(function (n) { return !isBadEntityName(n); });
    }
    if (s.length >= 2 && s.length <= 4) return [s];
    return [];
  }

  function parseOrg(text) {
    var depts = [];
    var users = [];
    var workshops = [];

    var deptList = text.match(/部门[^；;]*?(?:有|：|:)\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
    if (deptList && deptList[1]) {
      splitList(deptList[1]).forEach(function (n) {
        n = n.replace(/有|：|:/g, "").trim();
        if (n && !isBadEntityName(n)) depts.push({ name: n, parent: "" });
      });
    } else {
      var atDept = text.match(/在([\u4e00-\u9fff]{2,4}部)/);
      if (atDept && atDept[1] && !/[在和与于]/.test(atDept[1].slice(0, -1))) {
        depts.push({ name: atDept[1], parent: "" });
      }
      var underDept = text.match(/([\u4e00-\u9fff]{2,4}部)(?:下面|之下|下边|下)/);
      if (underDept && underDept[1] && !/[在和与于]/.test(underDept[1].slice(0, -1))) {
        if (!depts.some(function (x) { return x.name === underDept[1]; })) {
          depts.push({ name: underDept[1], parent: "" });
        }
      }
      var all = text.match(/([\u4e00-\u9fff]{2,4}部)/g) || [];
      all.forEach(function (d) {
        if (/[在和与于、,，]/.test(d.slice(0, -1))) return;
        if (isBadEntityName(d)) return;
        if (!depts.some(function (x) { return x.name === d; })) depts.push({ name: d, parent: "" });
      });
    }

    var userList =
      text.match(/人员[^；;]*?(?:有|：|:)\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
      text.match(/(?:员工|同事)[^；;]*?(?:有|：|:)\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
    var personNames = [];
    if (userList && userList[1]) {
      personNames = splitList(userList[1]).filter(function (n) {
        return n.length <= 8 && !/部$|车间$/.test(n) && !isBadEntityName(n);
      });
    } else {
      var hang =
        text.match(/[\u4e00-\u9fff]{2,4}部(?:下面|之下|下边|下)?挂(?:上)?([^\s；;，,]*)/) ||
        text.match(/挂(?:上)([^\s；;]+)/);
      if (hang && hang[1]) personNames = splitPersonNames(hang[1]);
      if (!personNames.length) {
        var pair =
          text.match(/([\u4e00-\u9fff]{2,4})[和与]([\u4e00-\u9fff]{2,4})(?:在|于)/) ||
          text.match(/([\u4e00-\u9fff]{2,4})[、,，]([\u4e00-\u9fff]{2,4})(?:在|于)/) ||
          text.match(/挂(?:上)?([\u4e00-\u9fff]{2,4})[和与、,，]([\u4e00-\u9fff]{2,4})/);
        if (pair) {
          personNames = [pair[1], pair[2]].filter(function (name) {
            return name && !/部$|车间$/.test(name) && !isBadEntityName(name) && !/精工|组装/.test(name);
          });
        }
      }
    }
    personNames.forEach(function (name) {
      users.push({
        name: name,
        username: pinyinish(name),
        phone: "13800000000",
        role: "生产工",
        team: "默认团队",
        dept: (depts[0] && depts[0].name) || "",
        password: genTempPassword(),
      });
    });

    var wsBefore = text.match(
      /(?:先把|把)?([\u4e00-\u9fffA-Za-z0-9]{1,12})(车间|产线|班组)(?:建上|建好|先建|加上|挂上)?/
    );
    if (wsBefore && wsBefore[1] && !isBadEntityName(wsBefore[1])) {
      workshops.push({ name: wsBefore[1] + wsBefore[2] });
    } else {
      var wsList = text.match(/(?:车间|产线|班组)[^；;]*?(?:有|：|:)\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
      if (wsList && wsList[1]) {
        splitList(wsList[1]).forEach(function (n) {
          n = n.replace(/有|：|:|车间$/g, "").trim();
          if (n && n.length <= 20 && !/部$/.test(n) && !isBadEntityName(n)) workshops.push({ name: n });
        });
      } else {
        var wsShort = text.match(/(?:车间|产线|班组)\s*([\u4e00-\u9fffA-Za-z0-9]{1,8})/);
        if (wsShort && wsShort[1]) {
          var wn = (wsShort[1].split(/[和与在于，,、]/)[0] || wsShort[1]);
          if (wn && !/部$/.test(wn) && !isBadEntityName(wn)) workshops.push({ name: wn });
        }
      }
    }

    if (!depts.length && !users.length && !workshops.length) return null;
    return { depts: depts, users: users, workshops: workshops };
  }

  
  function parseGoods(text) {
    var compact = String(text || "").replace(/\s+/g, "");
    var names = [];
    var m =
      text.match(/(?:产品|商品|货品|货)[^有:：]*[有:：]\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/) ||
      text.match(/(?:建|新建|录入|添加|加上|帮我建)[^：:]*?(?:个)?(?:货|商品|产品)[：:]\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/);
    if (m) names = splitList(m[1].replace(/等$/, ""));
    if (!names.length) {
      var m2 = compact.match(
        /(?:帮我)?(?:建|新建|录入|添加)(?:三个|几件|几个|些)?(?:货|商品|产品)[：:]([\u4e00-\u9fffA-Za-z0-9、,，]+)/
      );
      if (m2) names = splitList(m2[1]);
    }
    if (!names.length) {
      var m3 = text.match(/([A-Za-z0-9\u4e00-\u9fff]+(?:[、,，][A-Za-z0-9\u4e00-\u9fff]+)+)/);
      if (m3 && /(产品|商品|货)/.test(compact)) names = splitList(m3[1]);
    }
    names = names.filter(function (n) {
      return n && !/^(产品|商品|货|个)$/.test(n) && n.length <= 40;
    });
    return names.map(function (name) {
      return { name: name, code: "", category: "成品", unit: "个", source: "自产" };
    });
  }

  var PROCESS_NAME_BAN = { 计件: 1, 计时: 1, 单价: 1, 都计件: 1, 都计时: 1 };
  var KNOWN_PROCESSES = [
    "机械加工", "热处理", "表面处理", "精加工", "粗加工", "机加工",
    "铸造", "机加", "抛光", "装配", "组装", "焊接", "喷涂", "喷漆",
    "电镀", "打磨", "冲压", "注塑", "钻孔", "车削", "铣削", "下料",
    "折弯", "包装", "检验", "质检", "打孔", "攻丝",
  ];

  function isBannedProcessName(name) {
    var n = String(name || "").trim();
    if (!n) return true;
    if (PROCESS_NAME_BAN[n]) return true;
    if (/^(计件|计时|单价)/.test(n) && n.length <= 4) return true;
    return false;
  }

  function greedySplitProcesses(blob) {
    var text = String(blob || "").replace(/\s+/g, "");
    if (!text) return [];
    var sorted = KNOWN_PROCESSES.slice().sort(function (a, b) { return b.length - a.length; });
    var out = [];
    var i = 0;
    while (i < text.length) {
      var hit = "";
      for (var k = 0; k < sorted.length; k++) {
        if (text.indexOf(sorted[k], i) === i) {
          hit = sorted[k];
          break;
        }
      }
      if (hit) {
        if (!isBannedProcessName(hit)) out.push(hit);
        i += hit.length;
        continue;
      }
      var j = i + 1;
      while (j < text.length) {
        var found = false;
        for (var k2 = 0; k2 < sorted.length; k2++) {
          if (text.indexOf(sorted[k2], j) === j) {
            found = true;
            break;
          }
        }
        if (found) break;
        j += 1;
      }
      var frag = text.slice(i, j);
      if (frag && !isBannedProcessName(frag) && frag.length >= 2 && frag.length <= 12) out.push(frag);
      i = j > i ? j : i + 1;
    }
    return out;
  }

  function isPlausibleProcessName(name) {
    var n = String(name || "").trim();
    if (!n || isBannedProcessName(n)) return false;
    if (/[；;]/.test(n)) return false;
    if (/(部门|人员|车间|商品|产品|货有|货品|生产部|部$)/.test(n)) return false;
    if (n.length > 12) return false;
    return true;
  }

  function parseProcess(text) {
    var segs = String(text || "").split(/[；;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var focus = text;
    if (segs.length > 1) {
      var hit = segs.find(function (s) { return /(工序|工艺|计件|计时|单价)/.test(s.replace(/\s+/g, "")); });
      if (hit) focus = hit;
    }
    var compact = String(focus || "").replace(/\s+/g, "");
    var names = [];
    var m = focus.match(/工序[^有]*有\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/) ||
      focus.match(/工艺[^有]*有\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
    if (m) {
      var chunk = m[1].replace(/(?:都)?(?:计件|计时).*$/, "").replace(/单价.*$/, "");
      names = splitList(chunk).filter(function (n) { return isPlausibleProcessName(n); });
    }
    if (!names.length) {
      var beforeMatch = compact.match(/^(.+?)(?:都)?(?:计件|计时)/) || compact.match(/^(.+?)单价/);
      var before = beforeMatch ? beforeMatch[1] : "";
      var cleaned = before.replace(/^(?:工序|工艺)(?:有|：|:)?/, "").replace(/有/g, "");
      if (/[、,，]/.test(cleaned)) {
        names = splitList(cleaned).filter(function (n) { return isPlausibleProcessName(n); });
      } else if (cleaned) {
        names = greedySplitProcesses(cleaned).filter(function (n) { return isPlausibleProcessName(n); });
      }
    }
    var prices = (text.match(/单价[^0-9]*([0-9]+(?:[、,，\s]+[0-9]+)*)/) || [])[1];
    var priceArr = prices ? prices.split(/[、,，\s]+/).map(Number) : [];
    if (priceArr.length >= 2 && names.length === 1 && names[0]) {
      var again = greedySplitProcesses(names[0]);
      if (again.length === priceArr.length) names = again;
    }
    names = names.filter(function (n) { return isPlausibleProcessName(n); });
    var piece = /都计时/.test(compact) || (/计时/.test(compact) && !/计件/.test(compact)) ? "计时" : "计件";
    var workshop = (state.data.workshops[0] && state.data.workshops[0].name) || "";
    return names.map(function (name, i) {
      return {
        name: name,
        pricing: piece,
        wage: priceArr[i] != null ? priceArr[i] : "",
        workshop: workshop,
        workers: [],
      };
    });
  }

  function rowHtmlGoods(r, idx) {
    return (
      '<div class="l1-row-card" data-kind="goods"><strong>商品 ' + (idx + 1) + "</strong>" +
      '<div class="l1-field"><label>商品名 <span class="req">*</span></label><input data-f="name" value="' + esc(r.name) + '" /></div>' +
      '<div class="l1-field"><label>商品编号（空=自动生成）</label><input data-f="code" value="' + esc(r.code || "") + '" placeholder="忽略将自动生成" /></div>' +
      '<div class="l1-field"><label>类别</label><select data-f="category">' +
      ["成品", "半成品", "原材料"].map(function (c) {
        return "<option" + (c === (r.category || "成品") ? " selected" : "") + ">" + c + "</option>";
      }).join("") +
      '</select></div>' +
      '<div class="l1-field"><label>单位</label><input data-f="unit" value="' + esc(r.unit || "个") + '" /></div>' +
      '<div class="l1-field"><label>商品来源</label><select data-f="source">' +
      ["自产", "外购", "外协加工"].map(function (c) {
        return "<option" + (c === (r.source || "自产") ? " selected" : "") + ">" + c + "</option>";
      }).join("") +
      '</select></div></div>'
    );
  }

  function rowHtmlProcess(r, idx) {
    var workerOpts = (state.data.users || []).map(function (u) { return u.name; });
    return (
      '<div class="l1-row-card" data-kind="process"><strong>工序 ' + (idx + 1) + "</strong>" +
      '<div class="l1-field"><label>工序名 <span class="req">*</span></label><input data-f="name" value="' + esc(r.name) + '" /></div>' +
      '<div class="l1-field"><label>计价方式 <span class="req">*</span></label><select data-f="pricing">' +
      '<option' + (r.pricing === "计件" ? " selected" : "") + '>计件</option>' +
      '<option' + (r.pricing === "计时" ? " selected" : "") + '>计时</option></select></div>' +
      '<div class="l1-field"><label>工资单价</label><input data-f="wage" value="' + esc(String(r.wage != null ? r.wage : "")) + '" /></div>' +
      '<div class="l1-field"><label>车间</label><input data-f="workshop" value="' + esc(r.workshop || "") + '" /></div>' +
      '<div class="l1-field"><label>生产人员（逗号分隔）</label><input data-f="workers" value="' +
      esc((r.workers || []).join("、") || workerOpts.join("、")) +
      '" placeholder="' + esc(workerOpts.join("、") || "暂无人员") + '" /></div></div>'
    );
  }

  /** 综合确认卡：整卡一次确认写入各 draft */
  function confirmMulti(parts) {
    var html = "";
    parts.forEach(function (p) {
      if (p.type === "org" && p.parsed) {
        html += '<div class="l1-section"><div class="l1-section-h">组织 / 车间</div>';
        (p.parsed.depts || []).forEach(function (d) {
          html +=
            '<div class="l1-row-card" data-kind="dept"><strong>部门</strong>' +
            '<div class="l1-field"><label>名称 <span class="req">*</span></label><input data-f="name" value="' + esc(d.name) + '" /></div>' +
            '<div class="l1-field"><label>上级部门</label><input data-f="parent" value="' + esc(d.parent || "") + '" /></div></div>';
        });
        (p.parsed.users || []).forEach(function (u, i) {
          var pwdId = "mpwd_" + i;
          html +=
            '<div class="l1-row-card" data-kind="user"><strong>人员</strong>' +
            '<div class="l1-field"><label>姓名 <span class="req">*</span></label><input data-f="name" value="' + esc(u.name) + '" /></div>' +
            '<div class="l1-field"><label>用户名 <span class="req">*</span></label><input data-f="username" value="' + esc(u.username || pinyinish(u.name)) + '" /></div>' +
            '<div class="l1-field"><label>手机号 <span class="req">*</span></label><input data-f="phone" value="' + esc(u.phone || "13800000000") + '" /></div>' +
            '<div class="l1-field"><label>角色</label><input data-f="role" value="' + esc(u.role || "生产工") + '" /></div>' +
            '<div class="l1-field"><label>团队</label><input data-f="team" value="' + esc(u.team || "默认团队") + '" /></div>' +
            '<div class="l1-field"><label>部门</label><input data-f="dept" value="' + esc(u.dept || "") + '" /></div>' +
            '<div class="l1-field"><label>初始密码</label><input type="password" data-f="password" data-pwd-id="' + pwdId + '" value="' + esc(u.password || genTempPassword()) + '" /></div></div>';
        });
        (p.parsed.workshops || []).forEach(function (w) {
          html +=
            '<div class="l1-row-card" data-kind="workshop"><strong>车间</strong>' +
            '<div class="l1-field"><label>车间名称 <span class="req">*</span></label><input data-f="name" value="' + esc(w.name) + '" /></div></div>';
        });
        html += "</div>";
      }
      if (p.type === "process" && p.rows && p.rows.length) {
        html += '<div class="l1-section"><div class="l1-section-h">工序</div>';
        p.rows.forEach(function (r, idx) { html += rowHtmlProcess(r, idx); });
        html += "</div>";
      }
      if (p.type === "goods" && p.rows && p.rows.length) {
        html += '<div class="l1-section"><div class="l1-section-h">商品</div>';
        p.rows.forEach(function (r, idx) { html += rowHtmlGoods(r, idx); });
        html += "</div>";
      }
    });
    openConfirm("确认录入 · 综合", "一句多意图 · 整卡确认后分区写入草案（待 MES 落库）", html, { type: "multi" });
  }

  function confirmOrg(parsed) {
    var user = typeof host.getUser === "function" ? host.getUser() : null;
    var left = seatsRemaining(user);
    if (parsed.users.length && left === 0) {
      state.seatBlocked = true;
      save();
      pushAssistant({
        role: "assistant",
        text: "所属席位剩余 0，无法新建人员。请联系加席位后再继续（不允许建虚拟用户绕过）。可先只录部门/车间，或跳过本步。",
        time: host.nowTime(),
      });
      toast("席位不足，已阻断人员录入");
      parsed = { depts: parsed.depts, users: [], workshops: parsed.workshops };
      if (!parsed.depts.length && !parsed.workshops.length) return;
    }
    var html = "";
    parsed.depts.forEach(function (d) {
      html +=
        '<div class="l1-row-card" data-kind="dept"><strong>部门</strong>' +
        '<div class="l1-field"><label>名称 <span class="req">*</span></label><input data-f="name" value="' +
        esc(d.name) +
        '" /></div>' +
        '<div class="l1-field"><label>上级部门</label><input data-f="parent" value="' +
        esc(d.parent || "") +
        '" /></div></div>';
    });
    parsed.users.forEach(function (u, i) {
      var pwdId = "pwd_" + i;
      html +=
        '<div class="l1-row-card" data-kind="user"><strong>人员</strong>' +
        '<div class="l1-field"><label>姓名 <span class="req">*</span></label><input data-f="name" value="' +
        esc(u.name) +
        '" /></div>' +
        '<div class="l1-field"><label>用户名 <span class="req">*</span></label><input data-f="username" value="' +
        esc(u.username) +
        '" /></div>' +
        '<div class="l1-field"><label>手机号 <span class="req">*</span></label><input data-f="phone" value="' +
        esc(u.phone) +
        '" /></div>' +
        '<div class="l1-field"><label>角色 <span class="req">*</span></label><select data-f="role">' +
        ["生产工", "生产主管", "质检员", "仓库管理员", "系统管理员"]
          .map(function (r) {
            return "<option" + (r === u.role ? " selected" : "") + ">" + r + "</option>";
          })
          .join("") +
        "</select></div>" +
        '<div class="l1-field"><label>团队 <span class="req">*</span></label><input data-f="team" value="' +
        esc(u.team) +
        '" /></div>' +
        '<div class="l1-field"><label>部门</label><input data-f="dept" value="' +
        esc(u.dept || "") +
        '" /></div>' +
        '<div class="l1-field"><label>初始密码 <span class="req">*</span></label>' +
        '<div class="l1-pwd-row"><input type="password" data-f="password" data-pwd-id="' +
        pwdId +
        '" value="' +
        esc(u.password) +
        '" /><button type="button" class="l1-btn l1-btn-mini" data-pwd-reveal="' +
        pwdId +
        '">显示一次</button></div>' +
        '<div class="l1-hint">默认遮罩；可点「显示一次」抄给本人（待确认策略）</div></div></div>';
    });
    parsed.workshops.forEach(function (w) {
      html +=
        '<div class="l1-row-card" data-kind="workshop"><strong>车间</strong>' +
        '<div class="l1-field"><label>车间名称 <span class="req">*</span></label><input data-f="name" value="' +
        esc(w.name) +
        '" /></div></div>';
    });
    openConfirm("确认录入 · 组织与车间", "白名单字段 · 手册 02 · 确认后写入（或待 MES 落库）", html, {
      type: "org",
    });
  }

  function confirmGoods(rows) {
    var html = rows
      .map(function (r, idx) {
        return (
          '<div class="l1-row-card" data-kind="goods"><strong>商品 ' +
          (idx + 1) +
          "</strong>" +
          '<div class="l1-field"><label>商品名 <span class="req">*</span></label><input data-f="name" value="' +
          esc(r.name) +
          '" /></div>' +
          '<div class="l1-field"><label>商品编号（空=自动生成）</label><input data-f="code" value="' +
          esc(r.code || "") +
          '" placeholder="忽略将自动生成" /></div>' +
          '<div class="l1-field"><label>类别</label><select data-f="category">' +
          ["成品", "半成品", "原材料"]
            .map(function (c) {
              return "<option" + (c === r.category ? " selected" : "") + ">" + c + "</option>";
            })
            .join("") +
          "</select></div>" +
          '<div class="l1-field"><label>单位</label><input data-f="unit" value="' +
          esc(r.unit || "个") +
          '" /></div>' +
          '<div class="l1-field"><label>商品来源</label><select data-f="source">' +
          ["自产", "外购", "外协加工"]
            .map(function (c) {
              return "<option" + (c === r.source ? " selected" : "") + ">" + c + "</option>";
            })
            .join("") +
          "</select></div></div>"
        );
      })
      .join("");
    openConfirm("确认录入 · 商品", "将写入商品列表。唯一必填：商品名。编号空=自动生成。", html, {
      type: "goods",
    });
  }

  function confirmProcess(rows) {
    var workerOpts = (state.data.users || []).map(function (u) {
      return u.name;
    });
    var html = rows
      .map(function (r, idx) {
        return (
          '<div class="l1-row-card" data-kind="process"><strong>工序 ' +
          (idx + 1) +
          "</strong>" +
          '<div class="l1-field"><label>工序名 <span class="req">*</span></label><input data-f="name" value="' +
          esc(r.name) +
          '" /></div>' +
          '<div class="l1-field"><label>计价方式 <span class="req">*</span></label><select data-f="pricing">' +
          '<option' +
          (r.pricing === "计件" ? " selected" : "") +
          ">计件</option>" +
          '<option' +
          (r.pricing === "计时" ? " selected" : "") +
          ">计时</option></select></div>" +
          '<div class="l1-field"><label>工资单价</label><input data-f="wage" value="' +
          esc(String(r.wage != null ? r.wage : "")) +
          '" /></div>' +
          '<div class="l1-field"><label>车间</label><input data-f="workshop" value="' +
          esc(r.workshop || "") +
          '" /></div>' +
          '<div class="l1-field"><label>生产人员（逗号分隔）</label><input data-f="workers" value="' +
          esc((r.workers || []).join("、") || workerOpts.join("、")) +
          '" placeholder="' +
          esc(workerOpts.join("、") || "暂无人员") +
          '" /></div></div>'
        );
      })
      .join("");
    openConfirm("确认录入 · 工序", "手册 03 §6 · 白名单字段可改后再确认", html, { type: "process" });
  }

  function openBomGuide(goodsName) {
    /* BOM 本层深度（待确认默认）：只预填并打开 MES，不做完整选料确认卡硬写 */
    openBomInMes(goodsName);
  }

  function openBomInMes(goodsName) {
    state.currentStep = "bom";
    state.stepStates.bom = "in_progress";
    save();
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: "bom",
      stepTitle: "BOM",
      title: "打开 MES 建 BOM",
      html:
        (goodsName ? "已为商品「<strong>" + esc(goodsName) + "</strong>」预填意图。" : "") +
        "请到 <strong>商品管理 → BOM管理 → 新增</strong> 补用料行。聊天壳不代写复杂 BOM，也不自动审核/入库。" +
        (goodsName
          ? '<br/><span class="l1-hint">预填提示：BOM名称建议「' +
            esc(goodsName) +
            "标准用料」；商品=" +
            esc(goodsName) +
            "；设为默认 BOM。</span>"
          : ""),
      menuHint: "商品管理→BOM管理",
      chips: [
        { act: "open-mes", label: "打开 BOM 管理", path: MES_PATHS.bom },
        { act: "skip-bom", label: "跳过 BOM", ghost: true },
        { act: "finish", label: "完成开户引导 L1", ghost: true },
      ],
      time: host.nowTime(),
    });
    /* 修正 chip data-path：上面 open-mes 需带 path */
    setTimeout(function () {
      navigateMes(MES_PATHS.bom);
      toast("已打开 MES · BOM管理（请在原生页补用料）");
      markDone("bom");
      if (goodsName) {
        state.data.boms.push({
          name: goodsName + "标准用料",
          goods: goodsName,
          status: "opened_mes",
        });
        save();
      }
    }, 200);
  }

  function audit(entry) {
    state.audit.push(
      Object.assign(
        {
          at: new Date().toISOString(),
          who: (typeof host.getUser === "function" && host.getUser() && (host.getUser().username || host.getUser().display_name)) || "local",
        },
        entry
      )
    );
    save();
  }

  function commitDraft(type, rows, mesPath) {
    var draft = {
      id: "l1_" + Date.now().toString(36),
      type: type,
      rows: rows,
      status: "confirmed_pending_mes",
      mesPath: mesPath,
      at: new Date().toISOString(),
    };
    state.drafts.push(draft);
    audit({ action: "confirm_draft", type: type, summary: rows.length + " 条", draft_id: draft.id });
    save();
    return draft;
  }

  function applyConfirm() {
    if (!pendingConfirm) return;
    var rows = readModalRows();
    var type = pendingConfirm.type;
    if (type === "org") {
      var depts = [];
      var users = [];
      var workshops = [];
      rows.forEach(function (r) {
        if (r.kind === "dept" && r.name) depts.push({ name: r.name, parent: r.parent || "" });
        if (r.kind === "user" && r.name) {
          var copy = Object.assign({}, r);
          delete copy.kind;
          users.push(copy);
        }
        if (r.kind === "workshop" && r.name) workshops.push({ name: r.name });
      });
      if (!depts.length && !users.length && !workshops.length) {
        toast("请至少填写一项");
        return;
      }
      depts.forEach(function (d) {
        state.data.depts.push(d);
      });
      users.forEach(function (u) {
        state.data.users.push(u);
      });
      workshops.forEach(function (w) {
        state.data.workshops.push(w);
      });
      markDone("org");
      var draft = commitDraft("org", rows, MES_PATHS.department);
      closeModal();
      pushAssistant({
        role: "assistant",
        l1_guide: true,
        stepId: "org",
        stepTitle: "已确认",
        title: "草案已确认、待 MES 落库",
        html:
          "部门 " +
          depts.length +
          "、人员 " +
          users.length +
          "、车间 " +
          workshops.length +
          "。草稿 id：" +
          esc(draft.id) +
          "。<br/>请到对应菜单核对并在 MES 原生表单落库（本壳未接通主数据写 API 时不会伪造入库）。",
        menuHint: "系统管理→部门管理 / 用户管理；生产管理→生产设置→基础配置",
        chips: [
          { act: "open-mes", label: "打开部门管理", path: MES_PATHS.department },
          { act: "open-mes", label: "打开用户管理", path: MES_PATHS.user },
          { act: "open-mes", label: "打开车间基础配置", path: MES_PATHS.workshop },
        ],
        time: host.nowTime(),
      });
      var nextOrg = nextIncompleteStep("org");
      if (nextOrg) startStep(nextOrg);
      return;
    }
    if (type === "goods") {
      var bad = rows.find(function (r) {
        return !r.name;
      });
      if (bad) {
        toast("商品名必填");
        return;
      }
      rows.forEach(function (r) {
        if (!r.code) {
          r.code =
            "SP" +
            new Date().toISOString().slice(0, 10).replace(/-/g, "") +
            String(Math.floor(Math.random() * 9000) + 1000);
        }
        state.data.goods.push({
          name: r.name,
          code: r.code,
          category: r.category || "成品",
          unit: r.unit || "个",
          source: r.source || "自产",
        });
      });
      markDone("goods");
      var gd = commitDraft("goods", rows, MES_PATHS.goods);
      closeModal();
      pushAssistant({
        role: "assistant",
        l1_guide: true,
        stepId: "goods",
        stepTitle: "已确认",
        title: "商品草案已确认、待 MES 落库",
        html:
          "共 <strong>" +
          rows.length +
          "</strong> 个商品：" +
          esc(
            rows
              .map(function (r) {
                return r.name;
              })
              .join("、")
          ) +
          "。草稿 " +
          esc(gd.id) +
          "。建议继续建 BOM，或打开「商品管理→商品列表」落库。",
        menuHint: "商品管理→商品列表",
        chips: [{ act: "open-mes", label: "打开商品列表", path: MES_PATHS.goods }],
        time: host.nowTime(),
      });
      var nextG = nextIncompleteStep("goods");
      if (nextG) startStep(nextG);
      return;
    }
    if (type === "process") {
      var badP = rows.find(function (r) {
        return !r.name;
      });
      if (badP) {
        toast("工序名必填");
        return;
      }
      rows.forEach(function (r) {
        r.workers = r.workers
          ? r.workers.split(/[、,，]/).map(function (s) {
              return s.trim();
            }).filter(Boolean)
          : [];
        state.data.processes.push(r);
      });
      markDone("process");
      var pd = commitDraft("process", rows, MES_PATHS.process);
      closeModal();
      pushAssistant({
        role: "assistant",
        l1_guide: true,
        stepId: "process",
        stepTitle: "已确认",
        title: "工序草案已确认、待 MES 落库",
        html: "共 " + rows.length + " 道工序。草稿 " + esc(pd.id) + "。可继续乱序录其它项。",
        menuHint: "生产管理→工序管理",
        chips: [{ act: "open-mes", label: "打开工序管理", path: MES_PATHS.process }],
        time: host.nowTime(),
      });
      var nextP = nextIncompleteStep("process");
      if (nextP) startStep(nextP);
      return;
    }
    if (type === "multi") {
      applyConfirmMulti(rows);
      return;
    }
  }

  function applyConfirmMulti(rows) {
    var orgRows = rows.filter(function (r) { return r.kind === "dept" || r.kind === "user" || r.kind === "workshop"; });
    var goodsRows = rows.filter(function (r) { return r.kind === "goods"; });
    var procRows = rows.filter(function (r) { return r.kind === "process"; });
    var summaries = [];
    if (orgRows.length) {
      orgRows.forEach(function (r) {
        if (r.kind === "dept" && r.name) state.data.depts.push({ name: r.name, parent: r.parent || "" });
        if (r.kind === "user" && r.name) {
          var copy = Object.assign({}, r); delete copy.kind; state.data.users.push(copy);
        }
        if (r.kind === "workshop" && r.name) state.data.workshops.push({ name: r.name });
      });
      markDone("org");
      commitDraft("org", orgRows, MES_PATHS.department);
      summaries.push("组织 " + orgRows.length + " 条");
    }
    if (procRows.length) {
      var badP = procRows.find(function (r) { return !r.name; });
      if (badP) { toast("工序名必填"); return; }
      procRows.forEach(function (r) {
        r.workers = r.workers
          ? String(r.workers).split(/[、,，]/).map(function (s) { return s.trim(); }).filter(Boolean)
          : [];
        state.data.processes.push(r);
      });
      markDone("process");
      commitDraft("process", procRows, MES_PATHS.process);
      summaries.push("工序 " + procRows.length + " 道");
    }
    if (goodsRows.length) {
      var bad = goodsRows.find(function (r) { return !r.name; });
      if (bad) { toast("商品名必填"); return; }
      goodsRows.forEach(function (r) {
        if (!r.code) {
          r.code = "SP" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + String(Math.floor(Math.random() * 9000) + 1000);
        }
        state.data.goods.push({
          name: r.name, code: r.code, category: r.category || "成品", unit: r.unit || "个", source: r.source || "自产",
        });
      });
      markDone("goods");
      commitDraft("goods", goodsRows, MES_PATHS.goods);
      summaries.push("商品 " + goodsRows.length + " 个");
    }
    if (!summaries.length) { toast("请至少填写一项"); return; }
    closeModal();
    pushAssistant({
      role: "assistant",
      l1_guide: true,
      stepId: state.currentStep,
      stepTitle: "已确认",
      title: "综合草案已确认、待 MES 落库",
      html: summaries.join("；") + "。本壳未接通主数据写 API 时不会伪造入库。",
      menuHint: "按分区打开对应 MES 菜单落库",
      chips: [
        { act: "open-mes", label: "部门", path: MES_PATHS.department },
        { act: "open-mes", label: "工序", path: MES_PATHS.process },
        { act: "open-mes", label: "商品", path: MES_PATHS.goods },
      ],
      time: host.nowTime(),
    });
    var nextM = nextIncompleteStep();
    if (nextM) startStep(nextM);
  }


  /** v1.0.88：硬特征（加字段/壳工具/查数）不当开户；删「in_progress 任意≥2字」黑洞；单独「商品」不够。 */
  function looksLikeL1Intent(text) {
    var t = String(text || "").replace(/\s+/g, "");
    if (!t) return false;
    var R = global.SedricShellIntentRouter;
    if (R) {
      if (R.looksLikeFieldExtHard(t) || R.looksLikeShellToolHard(t) || R.looksLikeFactoryHard(t)) return false;
      if (R.looksLikeAmbiguousFieldVsOnboard(t)) return false;
      return R.looksLikeSoftOnboarding(t, {
        l1InProgress: state.global === "in_progress",
        global: state.global,
      }) || R.looksLikeExplicitOnboarding(t);
    }
    // 无路由器时的收紧镜像（勿恢复任意≥2字吞话）
    if (/继续开户|恢复引导|开户引导|开始开户|以后再说|先跳过|跳过本步|稍后再说|下次再说/.test(t)) return true;
    if (/(紧急度|扩展字段|货源地|倒计时|番茄|这单进度|进度怎么样)/.test(t)) return false;
    if (/开户|建档/.test(t)) return true;
    if (/(部门|人员|员工|同事|车间|产线|班组|工序|工艺|BOM|物料清单)/.test(t)) return true;
    if (/(帮我建|新建|录入|加上|添加).{0,12}(货|商品|产品|工序|部门|人员|车间)/.test(t)) return true;
    if (/单价|计件|计时/.test(t) && /工序|铸造|机加|热处理|都计件/.test(t)) return true;
    if (/产品有|商品有|货有|工序有|部门有/.test(t)) return true;
    return false;
  }

  function confirmedSummaryText() {
    try {
      var parts = [];
      (state.data.depts || []).forEach(function (d) { parts.push("部门:" + d.name); });
      (state.data.users || []).forEach(function (u) { parts.push("人员:" + u.name); });
      (state.data.workshops || []).forEach(function (w) { parts.push("车间:" + w.name); });
      (state.data.processes || []).forEach(function (p) { parts.push("工序:" + p.name); });
      (state.data.goods || []).forEach(function (g) { parts.push("商品:" + g.name); });
      return parts.slice(0, 20).join("；");
    } catch (e) {
      return "";
    }
  }

  /** 本地规则镜像（API 失败 / ?l1demo 无会话兜底）。归类不看 currentStep。 */
  function parseOnboardingRulesLocal(raw) {
    var text = String(raw || "").trim();
    var compact = text.replace(/\s+/g, "");
    if (!text) return { intent: "not_l1", source: "rules", reason: "空输入" };
    if (/继续开户|恢复引导|开户引导|开始开户/.test(compact)) {
      return { intent: "resume_guide", source: "rules" };
    }
    if (/以后再说|先跳过|跳过(本步|工序|商品|部门|BOM)|稍后再说|下次再说/.test(compact)) {
      var hint;
      if (/工序/.test(compact)) hint = "process";
      else if (/商品|产品|货/.test(compact)) hint = "goods";
      else if (/部门|人员|车间|组织/.test(compact)) hint = "org";
      else if (/BOM|物料清单/i.test(compact)) hint = "bom";
      return { intent: "skip_step", source: "rules", step_hint: hint || state.currentStep };
    }
    var goods = parseGoods(text);
    var procs = parseProcess(text);
    var org = parseOrg(text);
    var bomHit = /BOM|物料清单|建BOM|做BOM/i.test(compact);
    var hits = [];
    if (goods.length && /(产品|商品|货)/.test(compact)) {
      hits.push({ intent: "goods_upsert", source: "rules", rows: goods, step_hint: "goods" });
    }
    if (procs.length && /(工序|工艺|计件|计时|单价)/.test(compact)) {
      hits.push({ intent: "process_upsert", source: "rules", rows: procs, step_hint: "process" });
    }
    if (org && /(部门|人员|车间|产线|班组|员工|同事|[\u4e00-\u9fff]{2,8}部)/.test(compact)) {
      hits.push({
        intent: "org_upsert",
        source: "rules",
        rows: []
          .concat((org.depts || []).map(function (d) { return Object.assign({ kind: "dept" }, d); }))
          .concat((org.users || []).map(function (u) { return Object.assign({ kind: "user" }, u); }))
          .concat((org.workshops || []).map(function (w) { return Object.assign({ kind: "workshop" }, w); })),
        step_hint: "org",
        _org: org,
      });
    }
    if (bomHit) {
      var nameM = compact.match(/(?:为|给)?[「『"]?([\u4e00-\u9fffA-Za-z0-9_-]{1,40})[」』"]?(?:建|做|录)?BOM/);
      hits.push({
        intent: "bom_guide",
        source: "rules",
        rows: nameM ? [{ name: nameM[1] }] : [],
        step_hint: "bom",
      });
    }
    if (hits.length >= 2) {
      return {
        intent: "multi_upsert",
        source: "rules",
        intents: hits,
        rows: hits.reduce(function (acc, h) { return acc.concat(h.rows || []); }, []),
        step_hint: hits[0].step_hint,
      };
    }
    if (hits.length === 1) return hits[0];
    if (goods.length) return { intent: "goods_upsert", source: "rules", rows: goods, step_hint: "goods" };
    if (procs.length) return { intent: "process_upsert", source: "rules", rows: procs, step_hint: "process" };
    if (org) {
      return {
        intent: "org_upsert",
        source: "rules",
        rows: []
          .concat((org.depts || []).map(function (d) { return Object.assign({ kind: "dept" }, d); }))
          .concat((org.users || []).map(function (u) { return Object.assign({ kind: "user" }, u); }))
          .concat((org.workshops || []).map(function (w) { return Object.assign({ kind: "workshop" }, w); })),
        step_hint: "org",
        _org: org,
      };
    }
    // v1.0.88：硬特征 / 不像开户 → not_l1 交还；禁止 in_progress 黑洞 clarify
    var R2 = global.SedricShellIntentRouter;
    if (R2 && (R2.looksLikeFieldExtHard(text) || R2.looksLikeShellToolHard(text) || R2.looksLikeFactoryHard(text))) {
      return { intent: "not_l1", source: "rules", reason: "硬特征非开户" };
    }
    if (looksLikeL1Intent(text)) {
      return {
        intent: "clarify",
        source: "rules",
        clarify: clarifyForStep(state.currentStep),
        step_hint: state.currentStep,
      };
    }
    return { intent: "not_l1", source: "rules", reason: "不像开户引导" };
  }

  function clarifyForStep(step) {
    if (step === "process") return "还差工序名或单价，补一句就行。";
    if (step === "goods") return "还差商品名，直接说要建哪些货即可。";
    if (step === "bom") return "要建哪个商品的 BOM？说商品名，或点芯片。";
    if (step === "org" || step === "welcome") return "还差部门、人员或车间名，缺啥补啥，顺序不限。";
    return "开户可乱序：说部门/人员/车间、工序、商品或 BOM，缺字段我再问。";
  }

  function fetchOnboardingParse(text) {
    return fetch("/api/ai/onboarding/parse", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: text,
        currentStep: state.currentStep,
        confirmedSummary: confirmedSummaryText(),
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error("parse http " + res.status);
      return res.json();
    });
  }

  function isL1DemoNoSession() {
    try {
      var qs = new URLSearchParams((typeof location !== "undefined" && location.search) || "");
      if (qs.get("l1demo") === "1") {
        var user = typeof host.getUser === "function" ? host.getUser() : null;
        if (!user || user.username === "l1demo") return true;
      }
    } catch (e) {}
    return false;
  }

  function resolveOnboardingUtteranceLocal(text, opts) {
    opts = opts || {};
    if (isL1DemoNoSession()) {
      return Promise.resolve(parseOnboardingRulesLocal(text));
    }
    return fetchOnboardingParse(text)
      .then(function (data) {
        // v1.0.88：API 明确 not_l1 → 交还下一轨；禁止再用本地规则强制 clarify（chip 除外）
        if (data && data.intent === "not_l1") {
          if (opts.fromChip) return parseOnboardingRulesLocal(text);
          return data;
        }
        if (!data || !data.intent) {
          return parseOnboardingRulesLocal(text);
        }
        return data;
      })
      .catch(function () {
        return parseOnboardingRulesLocal(text);
      });
  }

  function rowsToOrg(result) {
    if (result && result._org) return result._org;
    var depts = [];
    var users = [];
    var workshops = [];
    (result.rows || []).forEach(function (r) {
      var kind = r.kind || "";
      if (kind === "dept" || (!kind && r.parent !== undefined)) depts.push({ name: r.name, parent: r.parent || "" });
      else if (kind === "user" || r.role || r.username) {
        users.push({
          name: r.name,
          username: r.username || pinyinish(r.name),
          phone: r.phone || "13800000000",
          role: r.role || "生产工",
          team: r.team || "默认团队",
          dept: r.dept || (depts[0] && depts[0].name) || "",
          password: r.password || genTempPassword(),
        });
      } else if (kind === "workshop" || (!kind && !r.pricing && !r.category)) {
        workshops.push({ name: r.name });
      }
    });
    if (!depts.length && !users.length && !workshops.length) return null;
    return { depts: depts, users: users, workshops: workshops };
  }

  function jumpToStepHint(hint) {
    if (!hint || hint === "welcome" || hint === "done") return;
    if (["org", "process", "goods", "bom"].indexOf(hint) < 0) return;
    // 不训「请先完成组织」：允许 step_hint 与 currentStep 不同
    STEPS.forEach(function (s) {
      if (state.stepStates[s.id] === "in_progress" && s.id !== hint) {
        if (state.stepStates[s.id] !== "done" && state.stepStates[s.id] !== "skipped") {
          state.stepStates[s.id] = "not_started";
        }
      }
    });
    if (state.stepStates[hint] !== "done") state.stepStates[hint] = "in_progress";
    state.currentStep = hint;
    state.global = "in_progress";
    save();
  }

  function dispatchIntent(result, text, fromChip) {
    if (!result || result.intent === "not_l1") return false;

    if (result.intent === "resume_guide") {
      if (/开始开户/.test(text) && state.currentStep === "welcome") startStep("org");
      else resume();
      return true;
    }
    if (result.intent === "skip_step") {
      var sid = result.step_hint || state.currentStep;
      if (sid === "welcome") sid = "org";
      skipStep(sid);
      return true;
    }
    if (result.intent === "clarify") {
      pushAssistant({
        role: "assistant",
        text: result.clarify || clarifyForStep(result.step_hint || state.currentStep),
        time: host.nowTime(),
      });
      return true;
    }
    if (result.intent === "multi_upsert") {
      var parts = [];
      var list = result.intents || [];
      if (!list.length && result.rows && result.rows.length) {
        // 混合 kind rows → 拆分区
        var orgR = result.rows.filter(function (r) { return r.kind === "dept" || r.kind === "user" || r.kind === "workshop"; });
        var pr = result.rows.filter(function (r) { return r.kind === "process"; });
        var gr = result.rows.filter(function (r) { return r.kind === "goods"; });
        if (orgR.length) list.push({ intent: "org_upsert", rows: orgR });
        if (pr.length) list.push({ intent: "process_upsert", rows: pr });
        if (gr.length) list.push({ intent: "goods_upsert", rows: gr });
      }
      list.forEach(function (it) {
        if (it.intent === "org_upsert") {
          var parsed = rowsToOrg(it) || (it._org) || null;
          if (parsed) parts.push({ type: "org", parsed: parsed });
        } else if (it.intent === "process_upsert") {
          var procsM = (it.rows || []).filter(function (r) { return r.name && !isBannedProcessName(r.name); });
          if (procsM.length) parts.push({ type: "process", rows: procsM });
        } else if (it.intent === "goods_upsert") {
          var goodsM = (it.rows || []).filter(function (r) { return r.name; });
          if (goodsM.length) parts.push({ type: "goods", rows: goodsM });
        }
      });
      if (parts.length >= 2) {
        state.global = "in_progress";
        save();
        pushAssistant({
          role: "assistant",
          text: "识别到一句多意图，请在综合确认卡分区核对（整卡一次确认）。" + (result.source === "llm" ? "（AI 理解）" : ""),
          time: host.nowTime(),
        });
        confirmMulti(parts);
        return true;
      }
      if (parts.length === 1) {
        // 降级为单意图
        if (parts[0].type === "org") {
          jumpToStepHint("org");
          confirmOrg(parts[0].parsed);
          return true;
        }
        if (parts[0].type === "process") {
          jumpToStepHint("process");
          confirmProcess(parts[0].rows);
          return true;
        }
        if (parts[0].type === "goods") {
          jumpToStepHint("goods");
          confirmGoods(parts[0].rows);
          return true;
        }
      }
      pushAssistant({ role: "assistant", text: clarifyForStep(state.currentStep), time: host.nowTime() });
      return true;
    }
    if (result.intent === "goods_upsert") {
      var goods = (result.rows || []).map(function (r) {
        return {
          name: r.name,
          code: r.code || "",
          category: r.category || "成品",
          unit: r.unit || "个",
          source: r.source || "自产",
        };
      });
      if (!goods.length) goods = parseGoods(text);
      if (!goods.length) {
        pushAssistant({ role: "assistant", text: clarifyForStep("goods"), time: host.nowTime() });
        return true;
      }
      jumpToStepHint("goods");
      pushAssistant({
        role: "assistant",
        text:
          "识别到 " +
          goods.length +
          " 个商品草案：" +
          goods.map(function (g) { return g.name; }).join("、") +
          "。请在确认弹窗核对白名单字段。引导点菜单：商品管理→商品列表。" +
          (result.source === "llm" ? "（AI 理解）" : ""),
        time: host.nowTime(),
      });
      confirmGoods(goods);
      return true;
    }
    if (result.intent === "process_upsert") {
      var procs = (result.rows || [])
        .filter(function (r) { return r.name && !isBannedProcessName(r.name); })
        .map(function (r) {
          return {
            name: r.name,
            pricing: r.pricing || "计件",
            wage: r.wage != null ? r.wage : "",
            workshop: r.workshop || (state.data.workshops[0] && state.data.workshops[0].name) || "",
            workers: r.workers || [],
          };
        });
      if (!procs.length) procs = parseProcess(text);
      if (!procs.length) {
        pushAssistant({ role: "assistant", text: clarifyForStep("process"), time: host.nowTime() });
        return true;
      }
      jumpToStepHint("process");
      pushAssistant({
        role: "assistant",
        text: "识别到 " + procs.length + " 道工序，请确认。引导：生产管理→工序管理。",
        time: host.nowTime(),
      });
      confirmProcess(procs);
      return true;
    }
    if (result.intent === "org_upsert") {
      jumpToStepHint("org");
      var parsed = rowsToOrg(result) || parseOrg(text);
      if (parsed) {
        pushAssistant({
          role: "assistant",
          text: "已理解组织信息，请在确认弹窗中核对白名单字段后再确认。取消不写库。",
          time: host.nowTime(),
        });
        confirmOrg(parsed);
        return true;
      }
      pushAssistant({ role: "assistant", text: clarifyForStep("org"), time: host.nowTime() });
      return true;
    }
    if (result.intent === "bom_guide") {
      jumpToStepHint("bom");
      var gname = (result.rows && result.rows[0] && result.rows[0].name) || "";
      if (!gname) {
        var hit = (state.data.goods || []).find(function (x) {
          return text.indexOf(x.name) >= 0;
        });
        gname = hit ? hit.name : "";
      }
      if (gname) openBomGuide(gname);
      else promptBom();
      return true;
    }
    return false;
  }

  /**
   * v1.0.88：硬特征交还；NLU-first 仍先 API；not_l1 必须交还下一轨（禁止恒 clarify）。
   * 控制类（跳过/继续开户）仍可规则秒回。
   */
  function handleUserText(text, fromChip) {
    text = String(text || "").trim();
    if (!text) return false;

    var R = global.SedricShellIntentRouter;
    if (!fromChip && R) {
      if (R.looksLikeFieldExtHard(text) || R.looksLikeShellToolHard(text) || R.looksLikeFactoryHard(text)) {
        return false;
      }
      if (R.looksLikeAmbiguousFieldVsOnboard(text)) return false;
    }

    // 控制类：规则秒回
    if (/继续开户|恢复引导|开户引导|开始开户/.test(text)) {
      if (/开始开户/.test(text) && state.currentStep === "welcome") startStep("org");
      else resume();
      return true;
    }
    var compactCtrl = text.replace(/\s+/g, "");
    if (/以后再说|先跳过|跳过(本步|工序|商品|部门|BOM)|稍后再说|下次再说/.test(compactCtrl)) {
      return dispatchIntent(parseOnboardingRulesLocal(text), text, fromChip);
    }

    // 软门：显式/像开户 才进；in_progress 不再任意吞话
    if (!looksLikeL1Intent(text)) {
      return false;
    }

    function handoffNotL1() {
      if (typeof host.continueRouting === "function") {
        try {
          host.continueRouting(text);
        } catch (e) {}
        return;
      }
      // 无交还钩子时直接 false 语义：不 clarify 吞掉
    }

    // ?l1demo 无会话：只能规则（标明演示）；正式登录态走 API
    if (isL1DemoNoSession()) {
      var localDemo = parseOnboardingRulesLocal(text);
      if (localDemo.intent === "not_l1") {
        handoffNotL1();
        return false;
      }
      var okDemo = dispatchIntent(localDemo, text, fromChip);
      if (!okDemo) {
        handoffNotL1();
        return false;
      }
      return true;
    }

    // 正式路径：先「正在理解…」再打 API；not_l1 → 交还
    pushAssistant({ role: "assistant", text: "正在理解…", time: host.nowTime(), l1_thinking: true });
    resolveOnboardingUtteranceLocal(text, { fromChip: !!fromChip }).then(function (result) {
      if (!result || result.intent === "not_l1") {
        handoffNotL1();
        return;
      }
      var ok = dispatchIntent(result, text, fromChip);
      if (!ok) {
        if (result.intent === "clarify") {
          pushAssistant({
            role: "assistant",
            text: result.clarify || clarifyForStep(result.step_hint || state.currentStep),
            time: host.nowTime(),
          });
        } else {
          handoffNotL1();
        }
      }
    });
    return true;
  }

  function maybeAutoWelcome() {
    ensureState();
    var user = typeof host.getUser === "function" ? host.getUser() : null;
    var force = false;
    try { force = sessionStorage.getItem("sedric_l1_force") === "1"; } catch (e) {}
    /* 待确认默认：管理员 + 空库（或未完成开户）自动弹出；强制演示除外 */
    if (!force && !isAdminUser(user)) return false;
    if (!force && !looksEmptyTenant(user)) return false;
    if (state.global === "done") return false;
    if (state.welcomeAutoShown) return false;
    state.welcomeAutoShown = true;
    state.currentStep = "welcome";
    save();
    if (typeof host.selectAssistant === "function") host.selectAssistant();
    pushAssistant(buildWelcomePayload());
    return true;
  }

  function showWelcomeManual() {
    if (typeof host.selectAssistant === "function") host.selectAssistant();
    state.currentStep = "welcome";
    state.welcomeDismissed = false;
    if (state.global === "done") state.global = "in_progress";
    save();
    pushAssistant(buildWelcomePayload());
  }

  function bindHost(api) {
    host = Object.assign(host, api || {});
    state = load();
    ensureOverlay();
  }

  function getState() {
    return ensureState();
  }

  function resetForDemo() {
    localStorage.removeItem(STORE_KEY);
    state = defaultState();
    save();
    showWelcomeManual();
  }

  global.SedricOnboardingL1 = {
    STORE_KEY: STORE_KEY,
    MES_PATHS: MES_PATHS,
    STEPS: STEPS,
    bindHost: bindHost,
    getState: getState,
    maybeAutoWelcome: maybeAutoWelcome,
    showWelcomeManual: showWelcomeManual,
    resume: resume,
    handleUserText: handleUserText,
    looksLikeL1Intent: looksLikeL1Intent,
    resolveOnboardingUtteranceLocal: resolveOnboardingUtteranceLocal,
    parseOnboardingRulesLocal: parseOnboardingRulesLocal,
    parseProcess: parseProcess,
    parseGoods: parseGoods,
    parseOrg: parseOrg,
    renderWelcomeCard: renderWelcomeCard,
    renderGuideCard: renderGuideCard,
    resetForDemo: resetForDemo,
    isAdminUser: isAdminUser,
  };
})(typeof window !== "undefined" ? window : globalThis);
