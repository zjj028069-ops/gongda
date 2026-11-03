# C4 客户管理手机镜像验收

- 版本：SEDRIC01 v1.0.97 mobile-c4-customer
- Playwright：22/22
- 叶子列表：12/12

| # | 项 | 结果 | 说明 |
|---|----|------|------|
| C4-L01 | ≤768 列表 客户管理 | 通过 | layout=v1-sparse;plus=1 |
| C4-L02 | ≤768 列表 客户联系人 | 通过 | layout=v1-sparse;plus=1 |
| C4-L03 | ≤768 列表 客户跟单 | 通过 | layout=v4-detail;plus=1 |
| C4-L04 | ≤768 列表 合同报价单 | 通过 | layout=v4-detail;plus=1 |
| C4-L05 | ≤768 列表 合同订单 | 通过 | layout=v4-detail;plus=1 |
| C4-L06 | ≤768 列表 收支记录 | 通过 | layout=v4-detail;plus=1 |
| C4-L07 | ≤768 列表 发票管理 | 通过 | layout=v4-detail;plus=1 |
| C4-L08 | ≤768 列表 销售费用 | 通过 | layout=v4-detail;plus=1 |
| C4-L09 | ≤768 列表 客户公海 | 通过 | layout=v1-sparse;plus=1 |
| C4-L10 | ≤768 列表 基础设置 | 通过 | layout=v1-settings;plus=0 |
| C4-L11 | ≤768 列表 审核设置 | 通过 | layout=v1-sparse;plus=1 |
| C4-L12 | ≤768 列表 销售价格追踪 | 通过 | layout=v4-track;plus=0 |
| C4-PLUS-QUOTE | 报价＋下拉（新增报价｜从合同复制） | 通过 | ＋新增报价/合从合同复制 |
| C4-PLUS-CONTRACT | 合同＋下拉（直接创建｜报价单创建） | 通过 | ＋直接创建/报报价单创建 |
| C4-PLUS-SEA | 公海＋下拉（领取客户｜分配销售） | 通过 | 领领取客户/分分配销售 |
| C4-UP-QUOTE-COPY | 报价从合同复制 · 上游勾选完成(N) | 通过 | 已选 1 · HT20261026008 |
| C4-UP-CONTRACT-QUOTE | 合同报价单创建上游 · 左勾顶已选右上完成(N) | 通过 | 完成(2) |
| C4-SEA-CLAIM | 公海领取入口 | 通过 | 完成(1) |
| C4-TREE | 功能树可达客户管理 12 叶子（含报价/合同） | 通过 | leaves=12 |
| C4-PC-REDIRECT | 窄屏 PC path 重定向 /ms | 通过 | http://127.0.0.1:5173/ms/leaf?key=customer-list&title=%E5%AE%A2%E6%88%B7%E7%AE%A1%E7%90%86&path=%2Fcustomer%2Flist&l1=customer |
| C4-QUOTE-CONTRACT-SAFE | 报价/合同入口与上游链路未丢 | 通过 | ok |
| C4-DESKTOP | ≥769 PC 侧栏未坏 | 通过 | sidebar-ok |

## 叶子→路由

| 叶子 | key | PC | /ms | 定版 | ＋ |
|------|-----|----|-----|------|---|
| 客户管理 | customer-list | /customer/list | /ms/leaf?key=customer-list | v1-sparse | 有 |
| 客户联系人 | linkman | /linkman/list | /ms/leaf?key=linkman | v1-sparse | 有 |
| 客户跟单 | follow | /follow/list | /ms/leaf?key=follow | v4-detail | 有 |
| 合同报价单 | quote | /contract_quotation_bill/list | /ms/leaf?key=quote | v4-detail | 有 |
| 合同订单 | contract | /customer_contract/list | /ms/leaf?key=contract | v4-detail | 有 |
| 收支记录 | cash | /customer_financier/list | /ms/leaf?key=cash | v4-detail | 有 |
| 发票管理 | invoice | /customer_invoice/list | /ms/leaf?key=invoice | v4-detail | 有 |
| 销售费用 | sales-fee | /selling_expenses/list | /ms/leaf?key=sales-fee | v4-detail | 有 |
| 客户公海 | customer-sea | /customer_sea/list | /ms/leaf?key=customer-sea | v1-sparse | 有 |
| 基础设置 | customer-base | /customer/setting/base_setting | /ms/leaf?key=customer-base | v1-settings | 无 |
| 审核设置 | customer-audit | /customer/setting/audit_setting | /ms/leaf?key=customer-audit | v1-sparse | 有 |
| 销售价格追踪 | sales-price | /customer/salesPriceTrack | /ms/leaf?key=sales-price | v4-track | 无 |

## 已知限制

- 基线 main v1.0.92；未 rebase/merge PR#3/#4/#5/#6
- 只改排版/交互皮，不改业务语义/权限/审核流/价格计算
- 新增/上游完成 → toast 皮提示，不落库（对齐 C2/C3）
- 空库用夹具；有 API 数据时优先现网
- 临时定版皮待 Allen 重选
- 未 merge、未上腾讯云、不重建库、不改密码、不动 garment