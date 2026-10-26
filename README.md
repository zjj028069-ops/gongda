# 工单平台账号与企业运营系统

账号系统与其运行依赖的完整项目源码快照，版本0.5.0-dev.1（2026-10-26运营后台增补）。面向多家企业；平台运营身份和企业身份独立。

## 主要能力

- 平台运营账号固定且只能保留两个，默认名称为 platform.owner、platform.ops；两位都可以管理企业。
- 企业列表、搜索、分页、开通、启用和停用；停用后企业旧会话失效，业务数据保留。
- 原子创建企业及专属初始管理员、默认单位和资源配置；重复开通请求不产生重复企业。
- 企业管理员增补、启停、最后管理员保护、专属账号密码重置和会话回收。
- 历史共享账号禁止从某一家企业重置密码，避免影响其他企业。
- 独立平台Cookie、CSRF、来源校验、登录限流和平台操作记录。
- 两个固定数据库席位、唯一性、提交约束和禁止清空触发器，拒绝第三个平台账号及删除其中一个。
- 原项目的多企业RLS、企业成员权限及生产/库存等依赖模块一并保留，确保源码能完整构建。

企业管理员不占这两个运营名额。平台后台不提供新增或删除运营账号入口。

## 本地启动

需要 Node.js 24或以上及npm。在仓库根目录运行：

```sh
npm ci
npm run control:setup
npm run dev
```

- 平台后台：http://127.0.0.1:5173/platform-admin
- 企业登录：http://127.0.0.1:5173/
- API：http://127.0.0.1:3001

control:setup会初始化开发数据库并成对创建两个运营账号，随机密码只写入本机 .local/platform-admin-credentials.txt。再次执行只补缺失席位，不覆盖已有密码。此仓库没有原开发电脑的密码或数据库，首次启动会产生你自己的新密码。

登录平台后台后使用“开通企业”，创建企业标识、企业名称和企业专属管理员账号，再到企业入口登录。默认不复制任何企业业务数据。

可选：如需原项目的两家开发演示企业，可在停服务状态另运行 npm run dev:setup；演示企业账号密码写入 .local/dev-credentials.txt。该命令不是生产初始化流程。

## 验证

```sh
npm test
npm run typecheck
npm run build
```

打包前本机172项回归通过，其中9项运营专项，0失败和0跳过；类型检查、前后端构建及页面检查通过。全部17条迁移均随源码提供。记录详见 [双管理员验收](docs/平台运营后台与双管理员验收.md) 和 [公开验收摘要](docs/verification/account-system-summary.json)。

## 目录

- apps/api：Fastify API、17条SQL迁移和回归测试。
- apps/web：React/TypeScript前端，平台入口位于 /platform-admin。
- scripts：开发服务及可选合成演示资料脚本。
- docs：账号系统说明和无凭据验收摘要。
- SOURCE-MANIFEST.json：本次源码快照的文件摘要（清单本身不自校验）。

## 数据与部署边界

仓库只包含源码、依赖锁文件和文字说明；不包含实际账号密码、数据库、环境文件、私密验收凭据、第三方试用系统资料、截图、缓存或node_modules。测试源码中的固定密码仅为合成测试输入，不是本机实际凭据。

开发默认使用磁盘PGlite。企业生产运行必须使用独立PostgreSQL、HTTPS及受限数据库运行账号，不能直接把开发模式当成生产发布。

生产迁移通过独立 DATABASE_ADMIN_URL 执行 npm run db:migrate。平台双账号首次初始化需受控管理员数据库连接，并分别设置 CONTROL_ADMIN_USERNAME/PASSWORD 与 CONTROL_ADMIN_SECOND_USERNAME/PASSWORD；初始化完成后服务切换回受限 DATABASE_URL，禁止使用迁移管理员连接启动业务服务。

运行账号需具有gd_auth、gd_tenant、gd_platform、gd_control的受控切换授权；gd_directory仅用于受限成员视图，不授予应用账号。PUBLIC_ORIGIN、TRUST_PROXY_CIDRS等配置由部署环境注入，项目不会自动读取.env文件。

独立PostgreSQL部署、MFA、域名隔离、压力、监控、灾备和真实企业试点仍需后续验收。本次上传不是商业系统全部功能完成或正式上线承诺。
