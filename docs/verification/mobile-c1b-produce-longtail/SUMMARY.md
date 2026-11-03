# C1b 生产长尾手机镜像验收

- 版本：SEDRIC01 v1.0.101 / mobile-c1b-produce-longtail
- 基线：main = v1.0.92
- 叶子：12/12
- 合计：17/17
- 未 merge、未上腾讯云
- 待 Allen 重选临时皮：见 SUMMARY.json pendingSkinReselect

- 通过 C1B-L01 ≤768 列表 项目管理 · layout=v4-detail-lines;plus=1;clean=1
- 通过 C1B-L02 ≤768 列表 物料分析 · layout=v1-sparse;plus=1;clean=1
- 通过 C1B-L03 ≤768 列表 全检 · layout=v2-result;plus=1;clean=1
- 通过 C1B-L04 ≤768 列表 抽检 · layout=v3-status-tabs;plus=1;clean=1
- 通过 C1B-L05 ≤768 列表 抽检明细 · layout=v4-detail-lines;plus=1;clean=1
- 通过 C1B-L06 ≤768 列表 外协工单 · layout=v4-detail-lines;plus=1;clean=1
- 通过 C1B-L07 ≤768 列表 外协验收 · layout=v2-result;plus=1;clean=1
- 通过 C1B-L08 ≤768 列表 外协结算 · layout=v2-amt;plus=1;clean=1
- 通过 C1B-L09 ≤768 列表 验收内容 · layout=v1-sparse;plus=1;clean=1
- 通过 C1B-L10 ≤768 列表 成本分摊 · layout=v4-detail-lines;plus=1;clean=1
- 通过 C1B-L11 ≤768 列表 不良品项 · layout=v1-sparse;plus=1;clean=1
- 通过 C1B-L12 ≤768 列表 溯源码管理 · layout=v1-expand;plus=1;clean=1
- 通过 C1B-NO-DEV-COPY 全叶子无夹具/硬约束/同源API/临时皮等禁字 · project,material-analysis,qc-full,qc-spot,qc-spot-line,os-order,os-receipt,os-settle,os-content,cost,defect,trace
- 通过 C1B-PLUS-UPSTREAM 外协工单＋→从加工单→完成(N) · 已选 1 项，进入外协工单
- 通过 C1B-FUNCTIONS 功能树生产管理可点进 12 叶 · reachable=12
- 通过 C1B-PC-REDIRECT 窄屏 PC path 重定向到 /ms/leaf · http://127.0.0.1:5173/ms/leaf?key=os-order&title=%E5%A4%96%E5%8D%8F%E5%B7%A5%E5%8D%95&path=%2FOutWorkOrder%2Flist&l1=produce
- 通过 C1B-DESKTOP ≥769 PC 侧栏不动、无四栏壳 · no-ms-shell
