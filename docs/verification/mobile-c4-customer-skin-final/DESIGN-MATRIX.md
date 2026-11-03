# C4 客户组定版（10 叶改皮）

基线 GitHub main = SEDRIC01 v1.0.105（物联定版）。本分支只改手机皮，不改后端 API、不重建库、不改密码、不合入、不上腾讯云。

| 叶子 | key | 路由 | 定版 | ＋ |
|------|-----|------|------|----|
| 客户管理 | customer-list | /customer/list | 版2 关键字段 | 新增客户 |
| 客户联系人 | linkman | /linkman/list | 微信纵向一行（不改版） | 新增对接人｜关联客户 |
| 客户跟单 | follow | /follow/list | 微信纵向一行（不改版） | 新增跟单｜快速记录 |
| 合同报价单 | quote | /contract_quotation_bill/list | 版2 金额优先 | 新增报价｜从合同复制；行内生成合同/改审/更多 |
| 合同订单 | contract | /customer_contract/list | 版2 金额优先 | 直接创建｜报价单创建 → 选择上游报价 → 完成(N) |
| 收支记录 | cash | /customer_financier/list | 版2 金额优先 | 新增收支｜关联合同订单 |
| 发票管理 | invoice | /customer_invoice/list | 版2 金额/总览优先 | 新增发票｜从订单导入 |
| 销售费用 | sales-fee | /selling_expenses/list | 版2 金额优先 | 新增销售费用｜关联客户 |
| 客户公海 | customer-sea | /customer_sea/list | 版2 未跟进天数优先 | 领取客户｜分配销售 |
| 基础设置 | customer-base | /customer/setting/base_setting | 版5 极简开关行 | 无业务＋ |
| 审核设置 | customer-audit | /customer/setting/audit_setting | 版5 极简 | 新增审核流程；对象含报价/合同/收支/费用 |
| 销售价格追踪 | sales-price | /customer/salesPriceTrack | 版2 现价/变动优先 | 无业务＋ |

主色 `#4184F4`。≤768 走 `/ms/*` 四栏壳。≥769 PC 侧栏不动。顶栏为细线放大镜，＋气泡贴在加号下方。
