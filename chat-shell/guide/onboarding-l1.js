/**
 * SEDRIC01 · L1 引导式基础资料录入（手册 02→03）
 * 状态：localStorage sedric_onboarding_l1
 * 写库：优先壳内白名单确认协议；无 API 时「草案已确认、待 MES 落库」+ navigateMes
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

  var state = null;
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

  function stepStripHtml(activeId) {
    var future =
      '<div class="l1-step-row l1-future"><span class="l1-ico"></span><span>客户 / 仓库 / 加工单…</span><span class="l1-tag">后续示意</span></div>';
    return (
      '<div class="l1-checklist" data-testid="sedric-l1-checklist">' +
      '<div class="l1-checklist-h">开户清单 · 02→03</div>' +
      STEPS.map(function (s) {
        var st = state.stepStates[s.id];
        var cls =
          st === "done" ? "done" : st === "in_progress" || s.id === activeId ? "active" : st === "skipped" ? "skipped" : "";
        var mark = st === "done" ? "✓" : st === "skipped" ? "–" : st === "in_progress" || s.id === activeId ? "●" : "";
        return (
          '<div class="l1-step-row ' +
          cls +
          '" data-l1-step="' +
          s.id +
          '"><span class="l1-ico">' +
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
        "欢迎使用赛德瑞克 MES。首次登录建议按手册完成「开户准备」基础资料（第 02 章 → 第 03 章）。我来对话引导；每次写入都会弹出确认卡，你核对后再入库。",
    };
  }

  function renderWelcomeCard(root) {
    var card = document.createElement("div");
    card.className = "guide-card l1-welcome-card";
    card.setAttribute("data-testid", "sedric-l1-welcome");
    card.innerHTML =
      '<div class="guide-card-label">开户引导 · L1</div>' +
      '<div class="guide-card-title">欢迎使用赛德瑞克 MES</div>' +
      '<p class="guide-summary">首次登录建议按手册完成「开户准备」基础资料（第 02 章 → 第 03 章）。我来对话引导；' +
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
        else if (act === "example-org") handleUserText("部门有生产部；人员有张三、李四；车间有精工车间", true);
        else if (act === "example-process") handleUserText("工序有铸造、机械加工、热处理，计件，单价 8、12、10", true);
        else if (act === "example-goods") handleUserText("我们的产品有 A、B、C", true);
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
        "请用一句话说一下，例如：<br/>「部门有生产部、质检部；人员有张三、李四；车间有精工车间、组装车间」<br/>或点下方示例。",
      menuHint: "系统管理→部门管理 / 用户管理；生产管理→生产设置→基础配置",
      chips: [
        { act: "example-org", label: "示例：生产部+张三李四+精工车间" },
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
        "例：「工序有铸造、机械加工、热处理，都计件，单价分别 8、12、10」。<br/>建工序前最好已有人员（可在确认卡里勾选生产人员）。",
      menuHint: "生产管理→工序管理",
      chips: [
        { act: "example-process", label: "示例：铸造/机加/热处理" },
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
        "系统里叫「商品」。你可以说：「我们的产品有 A、B、C」。<br/>我会弹出<strong>确认弹窗</strong>，商品名可改；编号空着将自动生成。",
      menuHint: "商品管理→商品列表",
      chips: [
        { act: "example-goods", label: "示例：产品有 A、B、C" },
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
    var order = ["org", "process", "goods", "bom"];
    var next = order[order.indexOf(id) + 1];
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

  function parseOrg(text) {
    var depts = [];
    var users = [];
    var workshops = [];
    var deptM = text.match(/部门[^；;]*?([^\s，,；;]+(?:[、,，][^\s，,；;]+)*)/);
    if (deptM) {
      deptM[1].split(/[、,，]/).forEach(function (n) {
        n = n.replace(/有|：|:/g, "").trim();
        if (n) depts.push({ name: n, parent: "" });
      });
    }
    var userM = text.match(/人员[^；;]*?([^\s，,；;]+(?:[、,，][^\s，,；;]+)*)/);
    if (userM) {
      userM[1].split(/[、,，]/).forEach(function (n) {
        n = n.replace(/有|：|:/g, "").trim();
        if (n) {
          users.push({
            name: n,
            username: pinyinish(n),
            phone: "13800000000",
            role: "生产工",
            team: "默认团队",
            dept: (depts[0] && depts[0].name) || "",
            password: genTempPassword(),
          });
        }
      });
    }
    var wsM = text.match(/车间[^；;]*?([^\s，,；;]+(?:[、,，][^\s，,；;]+)*)/);
    if (wsM) {
      wsM[1].split(/[、,，]/).forEach(function (n) {
        n = n.replace(/有|：|:/g, "").trim();
        if (n) workshops.push({ name: n });
      });
    }
    if (!depts.length && !users.length && !workshops.length) return null;
    return { depts: depts, users: users, workshops: workshops };
  }

  function parseGoods(text) {
    var m =
      text.match(/产品[^有]*有\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/) ||
      text.match(/商品[^有]*有\s*([A-Za-z0-9\u4e00-\u9fff、,，\s]+)/);
    var names = [];
    if (m) names = m[1].split(/[、,，\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!names.length) {
      var m2 = text.match(/([A-Za-z0-9\u4e00-\u9fff]+(?:[、,，][A-Za-z0-9\u4e00-\u9fff]+)+)/);
      if (m2) names = m2[1].split(/[、,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return names.map(function (name) {
      return { name: name, code: "", category: "成品", unit: "个", source: "自产" };
    });
  }

  function parseProcess(text) {
    var names = [];
    var m = text.match(/工序[^有]*有\s*([^\s；;]+(?:[、,，][^\s；;]+)*)/);
    if (m) names = m[1].split(/[、,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var prices = (text.match(/单价[^0-9]*([0-9]+(?:[、,，\s]+[0-9]+)*)/) || [])[1];
    var priceArr = prices ? prices.split(/[、,，\s]+/).map(Number) : [];
    var piece = /计时/.test(text) ? "计时" : "计件";
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
      /* attach paths on chips via re-bind workaround: navigate on click using data-path set below */
      startStep("process");
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
      startStep("bom");
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
        html: "共 " + rows.length + " 道工序。草稿 " + esc(pd.id) + "。下一步：录商品。",
        menuHint: "生产管理→工序管理",
        chips: [{ act: "open-mes", label: "打开工序管理", path: MES_PATHS.process }],
        time: host.nowTime(),
      });
      startStep("goods");
      return;
    }
  }


  function looksLikeL1Intent(text) {
    var t = String(text || "").replace(/\s+/g, "");
    if (!t) return false;
    if (/继续开户|恢复引导|开户引导|开始开户/.test(t)) return true;
    if (state.global === "in_progress" || state.currentStep === "org" || state.currentStep === "process" || state.currentStep === "goods" || state.currentStep === "bom") {
      if (/部门|人员|车间|工序|产品|商品|BOM|bom/.test(t)) return true;
    }
    if (/产品有|商品有|工序有|部门有/.test(t)) return true;
    return false;
  }

  function handleUserText(text, fromChip) {
    text = String(text || "").trim();
    if (!text) return false;

    if (/继续开户|恢复引导|开户引导|开始开户/.test(text)) {
      if (/开始开户/.test(text) && state.currentStep === "welcome") {
        startStep("org");
      } else {
        resume();
      }
      return true;
    }

    if (!looksLikeL1Intent(text) && state.global !== "in_progress") {
      return false;
    }

    var step = state.currentStep;

    /* 允许从任意处用「产品有 A、B、C」跳入商品步 */
    if (/产品有|商品有/.test(text) || (step === "goods" && parseGoods(text).length)) {
      var goods = parseGoods(text);
      if (goods.length) {
        state.currentStep = "goods";
        state.stepStates.goods = "in_progress";
        state.global = "in_progress";
        save();
        pushAssistant({
          role: "assistant",
          text:
            "识别到 " +
            goods.length +
            " 个商品草案：" +
            goods
              .map(function (g) {
                return g.name;
              })
              .join("、") +
            "。请在确认弹窗核对白名单字段。引导点菜单：商品管理→商品列表。",
          time: host.nowTime(),
        });
        confirmGoods(goods);
        return true;
      }
    }

    if (step === "welcome" || step === "org" || (state.global === "in_progress" && step === "org")) {
      if (step === "welcome") {
        state.stepStates.org = "in_progress";
        state.currentStep = "org";
        state.global = "in_progress";
        save();
      }
      var parsed = parseOrg(text);
      if (parsed) {
        pushAssistant({
          role: "assistant",
          text: "已理解组织信息，请在确认弹窗中核对白名单字段后再确认。取消不写库。",
          time: host.nowTime(),
        });
        confirmOrg(parsed);
        return true;
      }
      if (!fromChip) {
        pushAssistant({
          role: "assistant",
          text: "可以这样说：「部门有…；人员有…；车间有…」，或「产品有 A、B、C」。",
          time: host.nowTime(),
        });
        return true;
      }
      return true;
    }

    if (step === "process") {
      var procs = parseProcess(text);
      if (procs.length) {
        pushAssistant({
          role: "assistant",
          text: "识别到 " + procs.length + " 道工序，请确认。引导：生产管理→工序管理。",
          time: host.nowTime(),
        });
        confirmProcess(procs);
      } else {
        pushAssistant({
          role: "assistant",
          text: "请包含工序名，例如「工序有铸造、机械加工」。",
          time: host.nowTime(),
        });
      }
      return true;
    }

    if (step === "goods") {
      pushAssistant({
        role: "assistant",
        text: "请说「产品有 A、B、C」这类句式。",
        time: host.nowTime(),
      });
      return true;
    }

    if (step === "bom") {
      var g = (state.data.goods || []).find(function (x) {
        return text.indexOf(x.name) >= 0;
      });
      if (g) openBomGuide(g.name);
      else {
        pushAssistant({
          role: "assistant",
          text: "请点芯片选择要建 BOM 的商品，或说商品名。",
          time: host.nowTime(),
        });
      }
      return true;
    }

    return false;
  }

  function maybeAutoWelcome() {
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
    return state;
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
    renderWelcomeCard: renderWelcomeCard,
    renderGuideCard: renderGuideCard,
    resetForDemo: resetForDemo,
    isAdminUser: isAdminUser,
  };
})(typeof window !== "undefined" ? window : globalThis);
