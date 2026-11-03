# C5 生产资料验收

- 版本：SEDRIC01 v1.0.98 / mobile-c5-goods-master
- Playwright：18/18（叶子 8/8）
- 自检：无夹具/硬约束/同源 API 文案；无标题下长搜索条；商品＋仅两项
- 未 merge、未上腾讯云

| 编号 | 项 | 结果 | 备注 |
|------|----|------|------|
| C5-L01 | ≤768 列表 商品列表 | 通过 | layout=v3-category-tabs;plus=1;clean=1 |
| C5-L02 | ≤768 列表 BOM管理 | 通过 | layout=v4-detail-lines;plus=1;clean=1 |
| C5-L03 | ≤768 列表 商品设置 | 通过 | layout=v1-settings;plus=0;clean=1 |
| C5-L04 | ≤768 列表 机台管理 | 通过 | layout=v1-sparse;plus=1;clean=1 |
| C5-L05 | ≤768 列表 工序管理 | 通过 | layout=v5-minimal;plus=1;clean=1 |
| C5-L06 | ≤768 列表 岗位安排 | 通过 | layout=v3-status-tabs;plus=1;clean=1 |
| C5-L07 | ≤768 列表 工艺路线 | 通过 | layout=v4-step-chain;plus=1;clean=1 |
| C5-L08 | ≤768 列表 工序附加组件 | 通过 | layout=v3-status-tabs;plus=1;clean=1 |
| C5-NO-DEV-COPY | 全叶子无夹具/硬约束/同源API 文案且无长搜索条 | 通过 | goods-list,bom,goods-base,machine,process,post,route,extra |
| C5-PLUS-GOODS | 商品＋下拉仅「新增商品｜扫码新增」无模板 | 通过 | ＋新增商品/扫扫码新增 |
| C5-GOODS-SEARCH-ICON | 商品列表点顶栏放大镜进入搜索态（无标题下长条） | 通过 | top-magnifier-ok |
| C5-GOODS-CREATE | 商品新增直进详情表单（无模板） | 通过 | 空白新建商品，直接填写基础信息与库存预警 |
| C5-PLUS-BOM | BOM＋下拉（新增BOM｜扫码） | 通过 | ＋新增BOM/扫扫码 |
| C5-BOM-UPSTREAM | BOM 新增关联商品 · 上游勾选完成(N) | 通过 | 已选 1 · 液压电磁换向阀组件 |
| C5-ROUTE-CHAIN | 工艺路线每卡迷你步骤链可见连线 | 通过 | cards=2 |
| C5-FN-TREE | 功能树可达商品/工艺路线等 C5 叶子 | 通过 | goods+produce C5 keys visible |
| C5-PC-REDIRECT | 窄屏 PC 路径重定向 /ms 叶子 | 通过 | http://127.0.0.1:5173/ms/leaf?key=goods-list&title=%E5%95%86%E5%93%81%E5%88%97%E8%A1%A8&path=%2Fgoods%2Flist&l1=goods |
| C5-DESKTOP | ≥769 PC 侧栏未坏（无 ms-shell） | 通过 | shell=0;sidebarCandidates=1 |
