# C4 客户管理定版矩阵（临时皮 · 缺口组 Allen 尚未逐项选版）

客户管理缺口 9 项五版已出但 **Allen 未点名定版**（合同列表「难受」亦未重说）。本波临时采用与 C2/C3 一致口径，PR 中标注「待 Allen 重选皮」：
- **单据/跟进类列表**（跟单/报价/合同/收支/发票/销售费用/价格追踪）→ **版4 明细行卡**
- **主档/公海/设置**（客户列表、联系人、公海、基础设置、审核设置）→ **版1 疏朗**

| 叶子 | key | PC path | 临时定版 | ＋下拉 | 上游/硬约束 |
|------|-----|---------|----------|--------|-------------|
| 客户管理 | customer-list | /customer/list | 版1 | 新增客户 | 联系人栏快捷仍保留功能树路径；详情可走既有胶囊 Tabs 皮 |
| 客户联系人 | linkman | /linkman/list | 版1 | 新增对接人｜关联客户 | 关联客户可选 |
| 客户跟单 | follow | /follow/list | 版4 | 新增跟单｜快速记录 | 可关联客户/对接人 |
| 合同报价单 | quote | /contract_quotation_bill/list | 版4 | 新增报价｜从合同复制 | **【硬约束】全操作必留**；行「生成合同」→合同订单；字段不删；禁止隐藏/不上/占位 |
| 合同订单 | contract | /customer_contract/list | 版4 | 直接创建｜**报价单创建** | **【硬约束】必须保留选上游报价**；＋下拉勾选已审/不需审且未建合同的报价→完成(N)；禁止只能空白新增 |
| 收支记录 | cash | /customer_financier/list | 版4 | 新增收支 | 可关联合同订单 |
| 发票管理 | invoice | /customer_invoice/list | 版4 | 新增发票｜从订单导入 | 可关联合同/客户 |
| 销售费用 | sales-fee | /selling_expenses/list | 版4 | 新增销售费用 | 可关联客户 |
| 客户公海 | customer-sea | /customer_sea/list | 版1 | 领取客户｜分配销售 | 领用为主，无空白新增客户；领用→客户档案 |
| 基础设置 | customer-base | /customer/setting/base_setting | 版1 | — | 设置项 |
| 审核设置 | customer-audit | /customer/setting/audit_setting | 版1 | 新增审核流程 | 对象含：合同报价单/合同订单/收支/销售费用 |
| 销售价格追踪 | sales-price | /customer/salesPriceTrack | 版4 | （查看为主；若现网有新增则对齐） | — |

硬规则：＋气泡贴加号下方；上游勾选左勾顶已选右上完成(N)；主色 #4184F4；≤768 四栏壳优先 `/ms/*`（`/m/*`=报工冲突）；≥769 PC 不动；功能树可达；**勿破坏报价/合同入口**。
