# 基线核查 · mobile-4tab-shell-p0（2026-11-03）

> Allen 反馈：感觉未按最新现网代码。核查结论：**正确**。旧标号 **v1.0.75 作废**。

## 对比

| 位置 | 版本 | 说明 |
| --- | --- | --- |
| GitHub `gongda` `main` (`4f6cffb`) | v1.0.74 `plan-detail-left-card` | 仓库内最新已同步提交 |
| PR 初版 | ~~v1.0.75~~ | 在 1.0.74 上 +1，**作废** |
| 腾讯云 `http://129.204.53.109/chat/version.json` | **v1.0.90** `fluent-chitchat-guard` | 现网权威 chat-shell |
| 腾讯云 `/app/` MES dist | `index-BqFMGIGc.js` | 已非 1.0.74 的 `index-BxsRLap0.js` |
| Mac `~/SEDRIC01-gongda-184` | （本云端不可达） | 文档中的权威本地树 |
| VPS `/opt/sedric01` | （无 SSH 密钥） | 现网部署树 |

落后约 **16** 个小版本（74→90）。本环境无法完成 rebase，直至提供 Mac 源码快照或 VPS 只读拉源权限。

## 计划（基线到位后）

1. 以现网 **1.0.90** 为基线同步进 `gongda`
2. cherry-pick / 重放 `mobile-4tab-shell-p0` 壳改动
3. 版本 **1.0.91**，feature 仍 `mobile-4tab-shell-p0`
4. 复跑 `node scripts/mobile-4tab-shell-p0-accept.mjs`（目标仍 7/7）
5. 仍不 merge、不上腾讯云、不重建库、不改密码、不动 garment
