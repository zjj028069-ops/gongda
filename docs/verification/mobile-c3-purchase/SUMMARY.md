# C3 供应/采购手机镜像验收

- 版本：SEDRIC01 v1.0.96 mobile-c3-purchase
- Playwright：24/24
- 叶子列表：12/12

| # | 项 | 结果 | 说明 |
|---|----|------|------|
| C3-L01 | ≤768 列表 供应商管理 | 通过 | layout=v1-sparse;plus=1;ui-clean |
| C3-L02 | ≤768 列表 采购计划 | 通过 | layout=v4-detail;plus=1;ui-clean |
| C3-L03 | ≤768 列表 采购单 | 通过 | layout=v4-detail;plus=1;ui-clean |
| C3-L04 | ≤768 列表 付款记录 | 通过 | layout=v4-detail;plus=1;ui-clean |
| C3-L05 | ≤768 列表 发票管理 | 通过 | layout=v4-detail;plus=1;ui-clean |
| C3-L06 | ≤768 列表 采购检验单 | 通过 | layout=v4-detail;plus=1;ui-clean |
| C3-L07 | ≤768 列表 采购检验明细 | 通过 | layout=v4-detail;plus=0;ui-clean |
| C3-L08 | ≤768 列表 检验规范 | 通过 | layout=v1-sparse;plus=1;ui-clean |
| C3-L09 | ≤768 列表 审核设置 | 通过 | layout=v1-sparse;plus=1;ui-clean |
| C3-L10 | ≤768 列表 采购设置 | 通过 | layout=v1-settings;plus=0;ui-clean |
| C3-L11 | ≤768 列表 供应商设置 | 通过 | layout=v1-settings;plus=0;ui-clean |
| C3-L12 | ≤768 列表 采购价格追踪 | 通过 | layout=v4-track;plus=0;ui-clean |
| C3-PLUS-ORDER | 采购单＋下拉（加商品三选必留） | 通过 | ＋新增/品选择采购商品/计选择采购计划商品/合选择合同商品 |
| C3-PLUS-PLAN | 采购计划＋下拉 | 通过 | ＋新建计划/需从需求转入 |
| C3-PLUS-PAY | 付款＋下拉 | 通过 | ＋登记付款/采关联采购单 |
| C3-PLUS-INV | 发票＋下拉 | 通过 | ＋新增发票/采从采购单开票 |
| C3-PLUS-QC | 检验单＋下拉 | 通过 | 采新建检验/扫扫码报检 |
| C3-UP-ORDER-GOODS | 采购单加商品上游 · 选择采购计划商品 | 通过 | 已选 1 · JH-20240518001 · 深沟球轴承 |
| C3-UP-QC | 检验新建上游选采购单 · 左勾顶已选右上完成(N) | 通过 | 完成(2) |
| C3-LINES-NO-PLUS | 检验明细只读无＋ | 通过 | no-plus |
| C3-TREE | 功能树可达供应/采购叶子 | 通过 | leaves=12 |
| C3-PC-REDIRECT | 窄屏 PC path 重定向 /ms | 通过 | http://127.0.0.1:5173/ms/leaf?key=supplier&title=%E4%BE%9B%E5%BA%94%E5%95%86%E7%AE%A1%E7%90%86&path=%2Fsupplier%2Flist&l1=supply |
| C3-QUOTE-SAFE | 报价/合同入口未破坏 | 通过 | ok |
| C3-DESKTOP | ≥769 PC 侧栏未坏 | 通过 | sidebar-ok |

## 叶子→路由

| 叶子 | key | PC | /ms | 定版 | ＋ |
|------|-----|----|-----|------|---|
| 供应商管理 | supplier | /supplier/list | /ms/leaf?key=supplier | v1-sparse | 有 |
| 采购计划 | purchase-plan | /produce_plan/list | /ms/leaf?key=purchase-plan | v4-detail | 有 |
| 采购单 | purchase-order | /purchase_order/list | /ms/leaf?key=purchase-order | v4-detail | 有 |
| 付款记录 | purchase-pay | /purchase_pay_record/list | /ms/leaf?key=purchase-pay | v4-detail | 有 |
| 发票管理 | purchase-invoice | /purchase_pay_invoice/list | /ms/leaf?key=purchase-invoice | v4-detail | 有 |
| 采购检验单 | mt-list | /material_test/list | /ms/leaf?key=mt-list | v4-detail | 有 |
| 采购检验明细 | mt-lines | /material_test_item_list/list | /ms/leaf?key=mt-lines | v4-detail | 无 |
| 检验规范 | mt-spec | /material_test_content/list | /ms/leaf?key=mt-spec | v1-sparse | 有 |
| 审核设置 | purchase-audit | /setting/supplier_purchase/audit_setting | /ms/leaf?key=purchase-audit | v1-sparse | 有 |
| 采购设置 | purchase-base | /setting/purchase/setting | /ms/leaf?key=purchase-base | v1-settings | 无 |
| 供应商设置 | supplier-setting | /setting/supplier/setting | /ms/leaf?key=supplier-setting | v1-settings | 无 |
| 采购价格追踪 | purchase-price | /setting/purchasePriceTrack | /ms/leaf?key=purchase-price | v4-track | 无 |