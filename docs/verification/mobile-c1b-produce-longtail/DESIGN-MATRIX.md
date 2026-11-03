# C1b 生产长尾皮版矩阵（PR 内说明，不上屏）

基线：main = v1.0.92。本波未 rebase PR#3～#9 / C7。

| key | PC path | 皮 | 待 Allen 重选 |
| --- | --- | --- | --- |
| project | /production_project/list | 临时版4 明细行卡 | 是 |
| material-analysis | /MaterialAnalysis/list | 临时版1 疏朗 | 是 |
| qc-full | /work_quality_testing/list | 版2 结果优先 | 否（定版） |
| qc-spot | /spot_check/list | 临时版3 状态Tabs | 是 |
| qc-spot-line | /spot_check_item/list | 临时版4 明细行卡 | 是 |
| os-order | /OutWorkOrder/list | 版4 明细行卡 | 否（定版） |
| os-receipt | /outsourcing_receipt/list | 版2 结果优先 | 否（定版） |
| os-settle | /Outsourcing_settlement/list | 版2 金额优先 | 否（定版） |
| os-content | /outsourcing_content/list | 临时版1 疏朗 | 是 |
| cost | /apportioned_cost/list | 临时版4 明细行卡 | 是 |
| defect | /waste_item/list | 临时版1 疏朗 | 是 |
| trace | /product_traceability/list | 版1 疏朗+展开＋ | 否（定版） |

未做：生产设置4（produce-dict/perf-pay/auto-stock/station）、仓设置2。
