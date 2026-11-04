# C3 供应/采购定版落地

基线：GitHub main = SEDRIC01 **v1.0.107**（维保+精益定版）。本分支 **v1.0.108 / mobile-c3-purchase-skin-final**。只改手机皮，不改后端 API，不合入、不上腾讯云。

主色 `#4184F4`。≤768 走 `/ms/leaf?key=…`。≥769 PC 侧栏不动。顶栏右上细线放大镜，无标题下长搜索条和查询按钮。＋气泡贴在加号下方。

| 叶子 | key | 路由 | 定版 |
|------|-----|------|------|
| 供应商管理 | supplier | /supplier/list | 版2 关键字段（对齐客户管理） |
| 采购计划 | purchase-plan | /produce_plan/list | 版4 明细行卡 |
| 采购单 | purchase-order | /purchase_order/list | 版4 明细行卡；加商品三入口必留 |
| 付款记录 | purchase-pay | /purchase_pay_record/list | 版2 金额优先 |
| 发票管理 | purchase-invoice | /purchase_pay_invoice/list | 版2 金额优先 |
| 采购检验单 | mt-list | /material_test/list | 版2 结果优先 |
| 采购检验明细 | mt-lines | /material_test_item_list/list | 版4 明细行卡 |
| 检验规范 | mt-spec | /material_test_content/list | 版5 极简 |
| 审核设置 | purchase-audit | /setting/supplier_purchase/audit_setting | 版5 极简开关行 |
| 采购设置 | purchase-base | /setting/purchase/setting | 版5 极简开关行 |
| 供应商设置 | supplier-setting | /setting/supplier/setting | 版5 极简开关行 |
| 采购价格追踪 | purchase-price | /setting/purchasePriceTrack | 版2 现价/变动优先 |

采购单加商品保留：选择采购商品、选择采购计划商品、选择合同商品。客户合同仍从报价单创建进入选择上游报价。
