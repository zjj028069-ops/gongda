# mobile-c4-customer-skin-final 验收

- 版本：SEDRIC01 v1.0.106 / mobile-c4-customer-skin-final
- 基线：main = v1.0.105
- 通过 19 / 19（叶子 12/12）
- 未 merge、未上腾讯云、未重建库、未改密码

- 通过 C4F-L01 ≤768 客户管理 · layout=v2-keyfields;plus=1
- 通过 C4F-L02 ≤768 客户联系人 · layout=wx-row;plus=1
- 通过 C4F-L03 ≤768 客户跟单 · layout=wx-row;plus=1
- 通过 C4F-L04 ≤768 合同报价单 · layout=v2-amount;plus=1
- 通过 C4F-L05 ≤768 合同订单 · layout=v2-amount;plus=1
- 通过 C4F-L06 ≤768 收支记录 · layout=v2-amount;plus=1
- 通过 C4F-L07 ≤768 发票管理 · layout=v2-overview;plus=1
- 通过 C4F-L08 ≤768 销售费用 · layout=v2-amount;plus=1
- 通过 C4F-L09 ≤768 客户公海 · layout=v2-idle;plus=1
- 通过 C4F-L10 ≤768 基础设置 · layout=v5-switch;plus=0
- 通过 C4F-L11 ≤768 审核设置 · layout=v5-audit;plus=1
- 通过 C4F-L12 ≤768 销售价格追踪 · layout=v2-price;plus=0
- 通过 C4F-UPSTREAM 合同订单＋报价单创建 → 选择上游报价 → 完成(N) · ＋直接创建|报报价单创建 → 选择上游报价 完成(1) 已选 1 项
- 通过 C4F-GEN 报价行生成合同进入合同订单 · 生成合同→合同订单
- 通过 C4F-BASE 基础设置开关 toast · true->false 已关闭：生产订单自动编号
- 通过 C4F-WX 联系人栏加朋友/建群仍在；联系人叶子为纵向一行 · 加朋友/创建群聊 + wx-row
- 通过 C4F-FN 功能树客户 12 叶可达 · functions-12
- 通过 C4F-PC 窄屏 PC path → /ms/leaf · http://127.0.0.1:5173/ms/leaf?key=customer-list&title=%E5%AE%A2%E6%88%B7%E7%AE%A1%E7%90%86&path=%2Fcustomer%2Flist&l1=customer
- 通过 C4F-DESKTOP ≥769 不挂四栏壳 · desktop-ok
