# L1 意图优先 NLU 交付说明 · SEDRIC01 v1.0.86

| 项 | 内容 |
| --- | --- |
| 产品 | 赛德瑞克 MES（SEDRIC01）· **非** Garment Agent |
| 版本 | **v1.0.86** / `onboarding-l1-nlu` |
| 日期 | 2026-10-30 Asia/Shanghai |
| 发布 | **本地通测 · 未上云**（不开云端 Cursor；不重建库；不改密码；不动 ≤768 手机） |

## 改了什么

### API
- 新增 `apps/api/src/ai/onboarding-nlu.ts`
  - `looksLikeOnboardingIntent` / `parseOnboardingRules` / `parseOnboardingWithLlm` / `resolveOnboardingUtterance`
  - 意图：`org_upsert | process_upsert | goods_upsert | bom_guide | skip_step | resume_guide | clarify | not_l1`
  - 无 `AI_API_KEY` → 规则兜底 + clarify 一句追问
- `apps/api/src/ai/register.ts` 挂载 `POST /api/ai/onboarding/parse`（`member` 鉴权；**只返草案 JSON，不写业务表**）
- 单测 `apps/api/test/ai-onboarding-nlu.test.ts`

### chat-shell
- `guide/onboarding-l1.js`：意图优先；`handleUserText` async 友好；本地规则镜像（`?l1demo=1` 无 API 可跑）
- 修 `parseProcess`：过滤工序名 ∈ {计件,计时,单价}；「都计件」只设 pricing；无分隔符时按常见工序词典贪心切分并对齐单价
- UI：步骤提示「随便怎么说」；示例收进 `<details>不会说点这里</details>`；去掉「请说产品有 A、B、C 这类句式」硬提示
- `app.js`：兼容 Promise/boolean 返回；版本注释 → v1.0.86
- `styles.css`：`.l1-examples` 折叠样式
- `index.html`：脚本/样式 `?v=1.0.86-onboarding-l1-nlu`
- 版本：`chat-shell/version.json`、根 `VERSION`、`SEDRIC_VERSION.json`（prev=`1.0.85 onboarding-l1-guide`）

## 本地怎么验

### 1) 规则夹具（可不启 API）
```bash
cd chat-shell
node --input-type=module -e '
import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import vm from "vm";
const code = readFileSync("guide/onboarding-l1.js","utf8");
const sandbox = { console, localStorage: { getItem(){return null}, setItem(){} }, sessionStorage: { getItem(){return null}, setItem(){} }, document: { createElement(){return {style:{},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},appendChild(){}}}, body:{contains(){return false},appendChild(){}} }, window: {} };
sandbox.globalThis = sandbox; sandbox.window = sandbox;
vm.runInNewContext(code, sandbox);
const L1 = sandbox.SedricOnboardingL1;
L1.bindHost({ pushAssistant(){}, showToast(){}, getUser(){return {role:"admin"}}, nowTime(){return "00:00"} });
const st = L1.getState(); st.global="in_progress"; st.currentStep="process";
const r1 = L1.parseOnboardingRulesLocal("铸造机加热处理都计件，单价 8、12、10");
console.log("process", r1.intent, (r1.rows||[]).map(x=>x.name+":"+x.wage));
const r2 = L1.parseOnboardingRulesLocal("帮我建三个货：水泵壳、叶轮、端盖");
console.log("goods", r2.intent, (r2.rows||[]).map(x=>x.name));
const r3 = L1.parseOnboardingRulesLocal("工序以后再说");
console.log("skip", r3.intent, r3.step_hint);
'
```

### 2) API 单测
```bash
cd apps/api
npx tsx --test test/ai-onboarding-nlu.test.ts
```

### 3) 浏览器 demo
```bash
cd chat-shell && node server.mjs
# 打开 http://127.0.0.1:5180/?l1demo=1
# 走：乱序组织一句 → 工序「铸造机加热处理都计件，单价 8、12、10」确认卡 3 行 → 「帮我建三个货：水泵壳、叶轮、端盖」
```

### 4) curl parse（需已登录 member；无 Key 仍返 rules）
```bash
curl -sS -X POST http://127.0.0.1:3001/api/ai/onboarding/parse \
  -H 'content-type: application/json' -H 'cookie: …' \
  -d '{"text":"铸造机加热处理都计件，单价 8、12、10","currentStep":"process"}'
```

## 已知限制
- 本轮 **不通** 主数据写 API；确认后仍「草案已确认、待 MES 落库」+ 深链
- 无 `AI_API_KEY` 时不走 LLM，仅规则；生僻工序名无分隔符时切分可能偏弱
- `?l1demo=1` 不依赖登录；正式 `/api/ai/onboarding/parse` 需 member 会话
- **未部署腾讯云 / 未开云端 Cursor**

## 方案默认（已批准）
1. 无 Key：规则 + 一句追问  
2. 示例 chip →「不会说点这里」  
3. 写库待 MES 落库 + 深链  
4. 本地通了再报 Allen，不上云

## 补丁（仍 v1.0.86 · 未上云）

### Bug A · 组织乱序
- 句：「先把精工车间建上，生产部下面挂张三李四」
- 修：`…车间建上` 取车间前名称；过滤建上/建好/先建/加上/挂上；`部下面挂张三李四` → 部门+人员
- 覆盖：API 单测 + chat-shell vm 夹具

### Bug B · l1demo 空态
- `?l1demo=1` 且 `/api/auth/me` 502 时，欢迎卡可能在 `bindHost` 前渲染 → `stepStates` null
- 修：`ensureState()`（`stepStripHtml` / 欢迎卡 / getState / maybeAutoWelcome）；`showApp` 先 `bindOnboardingL1Host` 再渲染

