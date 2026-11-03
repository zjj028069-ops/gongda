# C8 AI智能体 + 信息管理 + 系统管理（20 叶）

Allen（2026-11-03）选定：C1c 先放着，开 C8。消息列表属 C0，本波不做。物联属 C9。

## AI智能体 8（均已定版）

| 叶子 | key | PC | 定版 | ＋ |
|------|-----|-----|------|----|
| 训练中心 | ai-train | /digitalEmployees/manager/setting | **版5 极简** | 新增数字员工 |
| 赛德瑞克小助手 | ai-center | /ai/center | **版4 对话行卡** | 新会话/扩展（可选） |
| 工厂助理 | ai-factory | /ai/factory | **版4 对话行卡** | 新问答（可选） |
| AI 导入 BOM | ai-bom | /ai/bom | **版1 现网疏朗** | 上传流程内 |
| 极速下单 | ai-quick-order | /ai/quick-order | **版2 上传优先** | 上传流程内 |
| 图纸拆单 | ai-drawing | /ai/drawing-split | **版2 上传优先** | 上传流程内 |
| 本厂词典 | ai-glossary | /ai/glossary | **版1 疏朗** | 新增词条｜一句话录入 |
| 扩展应用 | ai-ext-apps | /ai/ext-apps | **版1 疏朗卡片** | 一句话扩展｜从方案卡新建 |

## 信息管理 2

| 叶子 | key | PC | 定版 | ＋ |
|------|-----|-----|------|----|
| 知识库 | knowledge | /knowledge/list | **版1 疏朗**（信息管理定稿） | 新增文章｜扫码上传附件 |
| 通知公告 | notice | /notice/list | **版1 疏朗** | 发布公告｜草稿箱 |

## 系统管理 10（均已定版 · 双入口叶子须设置栏+功能树均可进）

| 叶子 | key | PC | 定版 | ＋ / 工具气泡 |
|------|-----|-----|------|---------------|
| 个人中心 | personal | /account | **版1 疏朗分组** | 编辑资料｜退出登录 |
| 用户管理 | users | /user/list | **版5 极简** | 新增用户｜扫码加人 |
| 角色管理 | roles | /role/list | **版4 明细行卡** | 新增角色｜从角色复制 |
| 团队管理 | teams | /systemTeam/list | **版3 地区Tabs** | 新增团队｜添加成员 |
| 部门管理 | departments | /department/list | **版4 明细行卡** | 新增部门｜新增下级 |
| 操作日志 | audit | /userLog | **版4 明细行卡** | 筛选｜清空条件（勿新增日志） |
| 通用设置 | basics | /setting/basics | **版1 现网疏朗分组** | 新增单位｜新增工作状态 |
| 企业信息设置 | company | /setting/enterprise/setting | **版5 极简** | 载入行业模板｜清空数据 |
| 短信设置 | sms | /setting/sms | **版2 余量英雄** | 购买套餐｜查看发送记录 |
| 自定义编号规则 | code-rules | /setting/customCodeRules | **版1 疏朗卡片** | 筛选｜列配置（勿新增规则） |

## 硬规矩

- 主色 `#4184F4`；≤768 四栏壳；路由 `/ms/leaf?key=…`（禁 `/m/*`）；≥769 PC 不动
- 顶栏细线放大镜；禁标题下长搜索+查询；有＋则微信气泡贴加号下
- **禁止**夹具/同源 API/硬约束/临时皮/PC path/（皮）上屏；PR 可写限制
- Playwright：20 叶可达 + 禁字 + 双入口抽检 + 截图 `docs/verification/mobile-c8-ai-info-system/`
- 基线 **main = v1.0.92**；**勿 rebase** PR#3～#12；不合入不上云不重建库不改密码
- 版本：**SEDRIC01 v1.0.103 / mobile-c8-ai-info-system**
- 模型/子任务 auto；截图只用 Playwright
