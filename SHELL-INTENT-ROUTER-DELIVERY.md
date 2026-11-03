# 壳意图路由交付说明 · SEDRIC01 v1.0.88

| 项 | 内容 |
| --- | --- |
| 产品 | 赛德瑞克 MES（SEDRIC01）· **非** Garment Agent |
| 版本 | **v1.0.88** / `shell-intent-router` |
| 日期 | 2026-10-31 Asia/Shanghai |
| 基线 | v1.0.87 onboarding-l1-nlu-first |
| 工作区 | box `/workspace/saideruike/_l1-nlu-186`；已写回 Mac `~/SEDRIC01-gongda-184` |
| 发布 | **本地通测 · 未上云**（不开云端 Cursor；不重建库；不改密码；不动 ≤768；现网仍以点头后为准） |

## 改了哪些文件

### chat-shell / chat-shell-full
- `guide/shell-intent-router.js` — **新增**统一分轨（A/B/C/D/E/ambiguous）
- `guide/onboarding-l1.js` — 收紧 `looksLikeL1Intent`；`not_l1` 交还；删任意≥2字黑洞
- `app.js` — `sendMessage` 先 `routeShellIntent`；歧义二选一卡；`continueRouting` 钩子
- `index.html` — 加载 router；cache-bust → 1.0.88
- `version.json` → 1.0.88

### API
- `src/ai/onboarding-nlu.ts` — `looksLikeOnboardingIntent` 收紧；硬特征 → `not_l1`
- `test/ai-onboarding-nlu.test.ts` — 加字段/闲聊交还样例
- `test/shell-intent-router.test.mjs` — 冲突口语夹具

### 根
- `VERSION` / `SEDRIC_VERSION.json`

## 夹具结果
```
node --test test/shell-intent-router.test.mjs   # 9/9 pass
npx tsx --test test/ai-onboarding-nlu.test.ts   # 12/12 pass
```
冲突样例：紧急度/货源地→B；建三个货→A；倒计时→C；进度→D；加点东西→ambiguous；单独「商品」≠开户。

## 已知限制
- 已写回 Mac `~/SEDRIC01-gongda-184`；**未** 上腾讯云、**未** 开云端 Cursor、**未** 重建库、**未** 改密码
- API `/api/ai/intent/route` 仍属 P2，P0 仅壳侧路由器
- L1 异步 not_l1 交还时可能残留「正在理解…」气泡
- 不做 v1.0.89（本轮只做 88）
