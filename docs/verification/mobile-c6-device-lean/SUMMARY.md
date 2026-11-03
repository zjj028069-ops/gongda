# C6 设备维保 + 精益生产验收

- 版本：SEDRIC01 v1.0.99 / mobile-c6-device-lean
- Playwright：27/27（叶子 17/17）
- 未 merge、未上腾讯云
- Allen 硬规矩自检：叶子页无「同源 API / 夹具 / 硬约束 / 不改业务语义 / 临时皮」文案；顶栏仅细线放大镜，无标题下长搜索条＋查询
- 临时皮范围（仅 PR 说明，不进 UI）：维保计划/任务/记录/明细、点检计划、整改/会议/待办/巡查、维保内容/维保设置/精益工作站/精益设置（待 Allen 重选皮）

| 编号 | 项 | 结果 | 备注 |
|------|----|------|------|
| C6-L01 | ≤768 列表 维保计划 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L02 | ≤768 列表 维保任务 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L03 | ≤768 列表 维保记录 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L04 | ≤768 列表 维保明细 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L05 | ≤768 列表 维保内容 | 通过 | layout=v1-sparse;plus=1;ui-clean |
| C6-L06 | ≤768 列表 点检计划 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L07 | ≤768 列表 点检记录 | 通过 | layout=v3-status-tabs;plus=1;ui-clean |
| C6-L08 | ≤768 列表 维修工单 | 通过 | layout=v3-status-tabs;plus=1;ui-clean |
| C6-L09 | ≤768 列表 设备档案 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L10 | ≤768 列表 设备二维码 | 通过 | layout=v3-status-tabs;plus=1;ui-clean |
| C6-L11 | ≤768 列表 维保设置 | 通过 | layout=v1-settings;plus=0;ui-clean |
| C6-L12 | ≤768 列表 精益生产工作站 | 通过 | layout=v1-station;plus=0;ui-clean |
| C6-L13 | ≤768 列表 整改中心 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L14 | ≤768 列表 精益会议 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L15 | ≤768 列表 会议待办 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L16 | ≤768 列表 现场巡查 | 通过 | layout=v4-detail-lines;plus=1;ui-clean |
| C6-L17 | ≤768 列表 精益生产设置 | 通过 | layout=v1-settings;plus=0;ui-clean |
| C6-PLUS-ARCHIVE | 设备档案＋下拉（新增设备｜批量导入） | 通过 | ＋新增设备/导批量导入 |
| C6-PLUS-PI | 点检记录＋下拉（补录点检｜扫码点检） | 通过 | ＋补录点检/扫扫码点检 |
| C6-PLUS-REPAIR | 维修工单＋下拉（新建工单｜报修转工单） | 通过 | ＋新建工单/报报修转工单 |
| C6-UP-TASK-PLAN | 维保任务←计划 · 上游勾选完成(N) | 通过 | 已选 1 · 注塑机周检计划 |
| C6-UP-REC-TASK | 维保记录←任务 · 上游勾选完成(N) | 通过 | ok |
| C6-UP-PI | 点检记录←计划 · 上游勾选完成(N) | 通过 | ok |
| C6-UP-REPAIR | 维修工单←设备档案 · 上游勾选完成(N) | 通过 | ok |
| C6-FN-TREE | 功能树可达设备维保 11 + 精益 6 叶子 | 通过 | device+lean C6 keys visible |
| C6-PC-REDIRECT | 窄屏 PC 路径重定向 /ms 叶子 | 通过 | http://127.0.0.1:5173/ms/leaf?key=device-archive&title=%E8%AE%BE%E5%A4%87%E6%A1%A3%E6%A1%88&path=%2Fdevice%2Flist&l1=device |
| C6-DESKTOP | ≥769 PC 侧栏未坏（无 ms-shell） | 通过 | shell=0;sidebarCandidates=1 |
