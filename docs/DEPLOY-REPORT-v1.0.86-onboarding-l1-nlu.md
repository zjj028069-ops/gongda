# DEPLOY REPORT — SEDRIC01 v1.0.86 onboarding-l1-nlu

- **时间（Asia/Shanghai）**: 2026-10-30 11:50–11:52
- **目标**: root@129.204.53.109:/opt/sedric01
- **方式**: overlay 热修（无 rsync --delete、无 db:migrate、不碰 garment）

## 备份
`/opt/sedric01/.bak-20261030-115020-onboarding-l1-nlu-v186`

含：chat-shell 5 文件、apps/api/src/ai/register.ts、根 VERSION / SEDRIC_VERSION.json / version.json、`_deploy_meta.txt`

## 上传范围
- chat-shell: app.js, index.html, styles.css, version.json, guide/onboarding-l1.js
- API: apps/api/src/ai/onboarding-nlu.ts（新建）、register.ts（整文件）
- 根: VERSION, SEDRIC_VERSION.json, version.json
- 可选: docs/L1-NLU-DELIVERY.md

## 冒烟结果
| 检查 | 结果 |
|------|------|
| 公网 `/chat/version.json` | **1.0.86** / feature=`onboarding-l1-nlu` |
| guide `建上` 规则 | 有（L580 / L673） |
| POST `/api/ai/onboarding/parse` 未登录 | **HTTP 401**（非 404） |
| `onboarding-nlu.ts` 现网 | 存在 |
| creds md5 `.local/dev-credentials.txt` | **ed017133e6253947794123a9eeeb6c9e**（不变） |
| `.local/database` dir mtime | 部署前 `2026-10-29 14:15:56 +0800` → 部署后 `2026-10-30 11:50:53 +0800`（**目录 mtime 因 API 重启触发嵌入式 PG 写 postmaster.pid / WAL/控制文件而变；未跑 migrate、未重建库、未改 schema 意图**） |
| pm2 sedric-api | online（restart +1） |
| pm2 sedric-web | online 未重启（约 17h） |
| pm2 garment-* | online，uptime 仍约 **7D**，restarts 未增 |

## 回滚
```bash
BAK=/opt/sedric01/.bak-20261030-115020-onboarding-l1-nlu-v186
cp -a $BAK/chat-shell/app.js $BAK/chat-shell/index.html $BAK/chat-shell/styles.css $BAK/chat-shell/version.json /opt/sedric01/chat-shell/
cp -a $BAK/chat-shell/guide/onboarding-l1.js /opt/sedric01/chat-shell/guide/
cp -a $BAK/apps/api/src/ai/register.ts /opt/sedric01/apps/api/src/ai/
rm -f /opt/sedric01/apps/api/src/ai/onboarding-nlu.ts
cp -a $BAK/root/VERSION $BAK/root/SEDRIC_VERSION.json $BAK/root/version.json /opt/sedric01/
pm2 restart sedric-api
```

## 备注
- 上传 register.ts 时 `tsx watch` 已先热重启一次，随后又执行了 `pm2 restart sedric-api`
- 现网 `SEDRIC_VERSION.json` note 已改为「已热修上腾讯云」
