# SEDRIC01 · L1 引导式基础资料录入 · 交付说明

| 项 | 内容 |
| --- | --- |
| 产品 | 赛德瑞克 MES（SEDRIC01）· **非 Garment Agent** |
| 版本 | **1.0.85** / feature·tag **`onboarding-l1-guide`** |
| 基线 | 1.0.84 `mobile-bill-flat-p41` |
| 日期 | 2026-10-30（Asia/Shanghai） |
| 范围 | **仅 chat-shell**（+ 本交付说明与版本片段）；未改 apps/web 手机断点；未部署腾讯云；未重建库；未改密码 |
| 主色 | `#4184F4` · 贴毛玻璃壳皮 |

## 1. 改了哪些文件

| 文件 | 变更 |
| --- | --- |
| `chat-shell/guide/onboarding-l1.js` | **新增** L1 模块：欢迎卡、状态机、口语→草案、确认弹窗、席位阻断、密码显示一次、BOM 深链 |
| `chat-shell/app.js` | 增量挂接：buildMessage / sendMessage / showApp / plus 菜单 / `?l1demo=1` / SedricChat.startOnboardingL1 |
| `chat-shell/index.html` | 修正本地静态资源引用；「继续开户引导」入口；恢复横幅；加载 onboarding-l1.js；版本文案 1.0.85 |
| `chat-shell/styles.css` | 追加 L1 欢迎卡 / 步骤条 / 确认弹窗样式 |
| `chat-shell/version.json` | → 1.0.85 `onboarding-l1-guide` |
| `SEDRIC_VERSION.json` / `VERSION` | → 1.0.85（prev=1.0.84） |
| `L1-DELIVERY.md` | 本文件 |

## 2. 实现对照（任务书）

1. **欢迎卡**：管理员 + 空库/未完成开户（`localStorage` 态或 `goods_count`/`craft_count`）自动出现；步骤条 组织/车间→工序→商品→BOM，后续主链灰色示意；「开始」「稍后再说」；入口「继续开户引导」（+ 菜单 / 横幅 / 口语「继续开户」）。
2. **状态机**：未开始 / 进行中 / 跳过 / 完成；key=`sedric_onboarding_l1`；可跳过、可继续。
3. **口语→草案**：如「产品有 A、B、C」→ 商品草案；引导点菜单文案（商品管理→商品列表等）。
4. **确认弹窗**：白名单字段可改；【确认录入】【取消】；取消不写。
5. **写库**：现网无主数据白名单写 API 时，确认后状态为 **「草案已确认、待 MES 落库」** + `navigateMes` 深链；**禁止**伪造审核/入库/结算。人员密码默认遮罩，可「显示一次」；席位剩余 0 阻断人员录入。BOM：只预填意图并打开 MES BOM，不在聊天硬写复杂用料。确认卡标题用「商品」。
6. **UI**：主色 `#4184F4`，毛玻璃壳；对齐 `l1-proto.html` / 设计 JPG。

## 3. 本地验证

```bash
cd /workspace/saideruike/_l1-impl/chat-shell
node server.mjs
# 浏览器打开（无需 MES API）：
#   http://127.0.0.1:5180/?l1demo=1
```

建议路径：

1. 打开欢迎卡 → 点「开始开户引导」。
2. 发「部门有生产部；人员有张三、李四；车间有精工车间」→ 确认弹窗可改 → 确认 / 取消。
3. 发「工序有铸造、机械加工，计件，单价 8、12」→ 确认。
4. 发「我们的产品有 A、B、C」→ 确认弹窗标题为「商品」→ 确认后见「待 MES 落库」+ 深链。
5. BOM：点芯片打开 MES BOM（演示态若无 MES 源站会代理失败，属预期）。
6. 「稍后再说」后，点「+ → 继续开户引导」或顶栏横幅恢复。
7. 席位不足：`localStorage.setItem('sedric_l1_seat_left','0')` 后重建人员草案，应阻断。
8. 重置：`localStorage.removeItem('sedric_onboarding_l1')` 后刷新。

对照原型（可选）：`docs/ai/onboarding-l1-designs/src/l1-proto.html`。

## 4. 版本号

- `chat-shell/version.json`：**1.0.85** / `onboarding-l1-guide`
- `SEDRIC_VERSION.json`：**1.0.85**，`prev`: `1.0.84 mobile-bill-flat-p41`
- `VERSION`：已写 1.0.85

## 5. 补丁包

路径：`/workspace/saideruike/_l1-impl/l1-patch.tgz`

内容：改过的 chat-shell 文件 + `SEDRIC_VERSION.json` + `VERSION` + `L1-DELIVERY.md`。

## 6. 已知限制

- **主数据写 API 未接通**：确认后只落本地草案（`confirmed_pending_mes`）+ 审计摘要 + MES 菜单深链，不声称已入库。
- **空库探测**：优先读用户对象上的 `goods_count`/`craft_count`；否则用本地 onboarding 未完成态近似；可用 `?l1demo=1` / `sessionStorage.sedric_l1_force=1` 强制演示。
- **席位**：读 `seats_remaining` 等字段；可用 `localStorage.sedric_l1_seat_left` 模拟。
- **BOM**：不在聊天硬写用料行；打开 `/bom/list`。
- **手机 ≤768**：本轮不改不验收。
- **未部署**腾讯云；未重建库；未改 `.env`/密码；与服装 ERP / Garment Agent **无关**。
- 开放问题（构想 §6）仍标「待确认」：密码显示一次 / 席位阻断 / BOM 只开 MES / 标题「商品」/ 管理员空库自动欢迎 —— 实现按暂定默认。

## 7. MES 深链（navigateMes）

| 实体 | path |
| --- | --- |
| 部门 | `/department/list` |
| 用户 | `/user/list` |
| 车间基础配置 | `/setting/produce/dictionary` |
| 工序 | `/public_craft/list` |
| 商品 | `/goods/list` |
| BOM | `/bom/list` |
