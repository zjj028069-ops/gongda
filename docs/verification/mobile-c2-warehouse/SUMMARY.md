# C2 仓库手机镜像验收

- 版本：SEDRIC01 v1.0.95 mobile-c2-warehouse
- Playwright：26/26
- 叶子列表：15/15

| # | 项 | 结果 | 说明 |
|---|----|------|------|
| C2-L01 | ≤768 列表 库存管理 | 通过 | layout=v4-alarm;plus=0 |
| C2-L02 | ≤768 列表 采购入库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L03 | ≤768 列表 成品入库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L04 | ≤768 列表 半成品入库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L05 | ≤768 列表 生产退料单 | 通过 | layout=v1-sparse;plus=1 |
| C2-L06 | ≤768 列表 销售退货单 | 通过 | layout=v4-detail;plus=1 |
| C2-L07 | ≤768 列表 其他入库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L08 | ≤768 列表 销售出库单 | 通过 | layout=v2-qty;plus=1 |
| C2-L09 | ≤768 列表 生产出库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L10 | ≤768 列表 采购退货单 | 通过 | layout=v4-detail;plus=1 |
| C2-L11 | ≤768 列表 其他出库单 | 通过 | layout=v4-detail;plus=1 |
| C2-L12 | ≤768 列表 调拨单 | 通过 | layout=v4-detail;plus=1 |
| C2-L13 | ≤768 列表 库存盘点 | 通过 | layout=v4-detail;plus=1 |
| C2-L14 | ≤768 列表 出入库流水 | 通过 | layout=v4-detail;plus=0 |
| C2-L15 | ≤768 列表 仓库档案 | 通过 | layout=v1-sparse;plus=1 |
| C2-PLUS-SEMI | 半成品入库＋下拉 | 通过 | 工从加工单入库/＋新增/扫扫码 |
| C2-PLUS-PURCHASE | 采购入库＋下拉 | 通过 | ＋空白新增/采从采购单入库/扫扫码 |
| C2-PLUS-SALE | 销售出库＋下拉（合同出库必留） | 通过 | 合合同出库/＋空白新增/扫扫码 |
| C2-UP-SEMI | 半成品上游选单 · 左勾顶已选右上完成(N) | 通过 | 已选 1 · JG20261028012 |
| C2-UP-PURCHASE | 采购入库上游选单 | 通过 | 完成(2) |
| C2-UP-SALE | 销售出库合同上游选单 | 通过 | 完成(1) |
| C2-FLOW-NO-PLUS | 流水无＋ | 通过 | no-plus |
| C2-TREE | 功能树可达仓库叶子 | 通过 | leaves=15 |
| C2-PC-REDIRECT | 窄屏 PC path 重定向 /ms | 通过 | http://127.0.0.1:5173/ms/leaf?key=stock&title=%E5%BA%93%E5%AD%98%E7%AE%A1%E7%90%86&path=%2Fgoods_stock%2Flist&l1=warehouse |
| C2-QUOTE-SAFE | 报价/合同入口未破坏 | 通过 | ok |
| C2-DESKTOP | ≥769 PC 侧栏未坏 | 通过 | sidebar-ok |

## 叶子→路由

| 叶子 | key | PC | /ms | 定版 | ＋ |
|------|-----|----|-----|------|---|
| 库存管理 | stock | /goods_stock/list | /ms/leaf?key=stock | v4-alarm | 无 |
| 采购入库单 | in-purchase | /purchase_stock_in_bill/list | /ms/leaf?key=in-purchase | v4-detail | 有 |
| 成品入库单 | in-fg | /produce_stock_in_bill/list | /ms/leaf?key=in-fg | v4-detail | 有 |
| 半成品入库单 | in-semi | /semi_finished_products_stock_in_bill/list | /ms/leaf?key=in-semi | v4-detail | 有 |
| 生产退料单 | in-return | /produce_return_materiel_bill/list | /ms/leaf?key=in-return | v1-sparse | 有 |
| 销售退货单 | in-sale-return | /salesReturnOrder/list | /ms/leaf?key=in-sale-return | v4-detail | 有 |
| 其他入库单 | in-other | /else_stock_in_bill/list | /ms/leaf?key=in-other | v4-detail | 有 |
| 销售出库单 | out-sale | /sale_stock_out_bill/list | /ms/leaf?key=out-sale | v2-qty | 有 |
| 生产出库单 | out-produce | /production_out_of_storage/list | /ms/leaf?key=out-produce | v4-detail | 有 |
| 采购退货单 | out-purchase | /purchase_return_bill/list | /ms/leaf?key=out-purchase | v4-detail | 有 |
| 其他出库单 | out-other | /else_stock_out_bill/list | /ms/leaf?key=out-other | v4-detail | 有 |
| 调拨单 | transfer | /stock_allocate_bill/list | /ms/leaf?key=transfer | v4-detail | 有 |
| 库存盘点 | check | /stock_taking_bill/list | /ms/leaf?key=check | v4-detail | 有 |
| 出入库流水 | flow | /stock_item/list | /ms/leaf?key=flow | v4-detail | 无 |
| 仓库档案 | warehouse-list | /ware/list | /ms/leaf?key=warehouse-list | v1-sparse | 有 |