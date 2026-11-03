# C3 供应/采购定版矩阵（临时皮 · 缺口组 Allen 尚未逐项选版）

采购缺口 10 项五版已出但 **Allen 未点名定版**。本波临时采用与 C2 一致口径，PR 中标注「待 Allen 重选皮」：
- **单据列表**（计划/采购单/付款/发票/检验单/检验明细）→ **版4 明细行卡**
- **供应商列表、检验规范、各类设置** → **版1 疏朗**
- 采购价格追踪 → **版4**（表感）

| 叶子 | PC path | 临时定版 | ＋下拉 |
|------|---------|----------|--------|
| 供应商管理 | /supplier/list | 版1 | 新增供应商 |
| 采购计划 | /produce_plan/list | 版4 | 新建计划｜从需求转入 |
| 采购单 | /purchase_order/list | 版4 | 新增；加商品须保留：选择采购商品｜选择采购计划商品｜选择合同商品 |
| 付款记录 | /purchase_pay_record/list | 版4 | 登记付款｜关联采购单（主路径也可从采购单发起） |
| 发票管理 | /purchase_pay_invoice/list | 版4 | 新增发票｜从采购单开票 |
| 采购检验单 | /material_test/list | 版4 | 新建检验｜扫码报检；上游点选采购单 |
| 采购检验明细 | /material_test_item_list/list | 版4 | 无业务新增（只读明细为主） |
| 检验规范 | /material_test_content/list | 版1 | 新增检验规范 |
| 审核设置 | /setting/supplier_purchase/audit_setting | 版1 | 新增审核流程 |
| 采购设置 | /setting/purchase/setting | 版1 | — |
| 供应商设置 | /setting/supplier/setting | 版1 | — |
| 采购价格追踪 | /setting/purchasePriceTrack | 版4 | 按现网 |

硬规则：＋气泡贴加号下方；上游勾选左勾顶已选右上完成(N)；主色 #4184F4；≤768 四栏壳优先 `/ms/*`；≥769 PC 不动。与入库上游贯通：采购单行「入库」能力入口勿丢（可深链到 PC/后续 C2 皮，不要求本波实现仓写入）。
