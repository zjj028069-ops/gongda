# 流程对答如流交付说明 · SEDRIC01 v1.0.89

| 项 | 内容 |
| --- | --- |
| 产品 | 赛德瑞克 MES（SEDRIC01）· **非** Garment Agent |
| 版本 | **v1.0.89** / `process-fluent-qa` |
| 日期 | 2026-10-31 Asia/Shanghai |
| 基线 | v1.0.88 shell-intent-router（本轮**不回退** 88 路由） |
| 工作区 | box `/workspace/saideruike/_l1-nlu-186`；可写回 Mac `~/SEDRIC01-gongda-184` |
| 发布 | **本地通测 · 未上云**（不开云端 Cursor；不重建库；不改密码；不动 ≤768） |
| 方案卡 | Canvas `23682919-f832-4f0f-a6ca-daa6ec81434f`；md `docs/ai/流程对答如流-对标交付实施经理-方案卡-2026-10-31.md` |

## 改了哪些文件

### chat-shell / chat-shell-full
- `guide/process-fluent-qa.js` — **新增**流程对答上层（白名单索引、三问、单据序、三标签、会话章/单）
- `app.js` — D/E 轨接入 `runProcessFluent`；`buildFluentCard`；工厂卡可附 `next_doc_hint`；`FLUENT_SESSION`
- `index.html` — 加载 process-fluent-qa；cache-bust → 1.0.89
- `version.json` → 1.0.89

### API 夹具
- `apps/api/test/process-fluent-qa.test.mjs` — 方案卡样例 ≥5 + 书屏/灰按钮/续导/未命中

### 根
- `VERSION` / `SEDRIC_VERSION.json` / `PROCESS-FLUENT-QA-DELIVERY.md`

## 行为摘要
1. **白名单**：答案只来自说明书合并版 / 手册分章 / 功能地图切片索引；未命中 →「书上暂未写到」。
2. **三问 + 单据序**：progress / money / wage → 标准序（基础→合同/采购→加工单→开始→报工/质检→出入库→结算/收款）。
3. **三标签**：操作问题 / 配置(审核·开关) / 疑似缺陷。
4. **会话态**：记住 chapter / docId；「下一步」续导。
5. **与 88 协作**：只在 D/E（及 L1 交还后）启用；A/B/C/ambiguous 不抢。开户中途加字段仍靠 88→B。

## 夹具结果
```
node --test test/process-fluent-qa.test.mjs test/shell-intent-router.test.mjs
# 19/19 pass（fluent 10 + router 9）
```

样例覆盖：进度 / 工资未出 / 入库vs报工 / 开户中途加紧急度不串 / 合同后报工；另加书屏色差、灰按钮分流、会话续导、白名单未命中。

## 已知限制
- **未** 上腾讯云、**未** 开云端 Cursor、**未** 重建库、**未** 改密码
- P1 未做：分角色路径片、查数与流程深度合答（仅附 next_doc_hint）、跨专题导航条 UI
- 白名单为壳内切片索引，非整本说明书全文检索；未写到的细节走「书上暂未写到」
- in_progress 时部分带顿号/逗号的流程句仍可能被 88 软开户名单启发式进 A（不回退 88）；交还 E 后本能力可答
- 不动 ≤768 手机专轨
