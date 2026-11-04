# mobile-c3-purchase-skin-final 验收

- 版本：SEDRIC01 v1.0.108 / mobile-c3-purchase-skin-final
- 基线：main = v1.0.107
- 通过 22 / 22（叶子 12/12）
- 未 merge、未上腾讯云、未重建库、未改密码

- 通过 C3F-L01 ≤768 供应商管理 · layout=v2-keyfields;plus=1
- 通过 C3F-L02 ≤768 采购计划 · layout=v4-detail-lines;plus=1
- 通过 C3F-L03 ≤768 采购单 · layout=v4-detail-lines;plus=1
- 通过 C3F-L04 ≤768 付款记录 · layout=v2-amount;plus=1
- 通过 C3F-L05 ≤768 发票管理 · layout=v2-amount;plus=1
- 通过 C3F-L06 ≤768 采购检验单 · layout=v2-result;plus=1
- 通过 C3F-L07 ≤768 采购检验明细 · layout=v4-detail-lines;plus=0
- 通过 C3F-L08 ≤768 检验规范 · layout=v5-minimal;plus=1
- 通过 C3F-L09 ≤768 审核设置 · layout=v5-switch;plus=1
- 通过 C3F-L10 ≤768 采购设置 · layout=v5-switch;plus=0
- 通过 C3F-L11 ≤768 供应商设置 · layout=v5-switch;plus=0
- 通过 C3F-L12 ≤768 采购价格追踪 · layout=v2-price;plus=0
- 通过 C3F-PLUS 采购单＋三入口贴在加号下方 · ＋新增|品选择采购商品|计选择采购计划商品|合选择合同商品
- 通过 C3F-UPSTREAM 选择采购计划商品 → 完成(N) · 完成(1) 已选上游 1 项
- 通过 C3F-GOODS 选择采购商品与选择合同商品可进入上游 · 选择采购商品|选择合同商品
- 通过 C3F-LINES-PLUS 检验明细无业务＋ · no-plus
- 通过 C3F-SWITCH 采购设置开关 toast · true->false 已关闭：启用采购申请审批
- 通过 C3F-CALL 供应商拨号与复制 · 正在拨打 138-0011-2233 / 已复制 GYS00001
- 通过 C3F-FN 功能树供应/采购 12 叶 · supply-12
- 通过 C3F-PC 窄屏 PC path → /ms/leaf · http://127.0.0.1:5173/ms/leaf?key=supplier&title=%E4%BE%9B%E5%BA%94%E5%95%86%E7%AE%A1%E7%90%86&path=%2Fsupplier%2Flist&l1=supply
- 通过 C3F-QUOTE 客户合同报价入口仍在 · 选择上游报价
- 通过 C3F-DESKTOP ≥769 不挂四栏壳 · shell=0;sidebar=1
