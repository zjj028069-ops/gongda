# C6 设备维保 + 精益定版矩阵

- **Allen 已定版（4）**：设备档案版4；点检记录版3；维修工单版3；设备二维码版3
- **其余**：缺口组尚未逐项选版 → **临时皮**，PR 须写「待 Allen 重选皮」
  - 单据/任务/记录类列表 → **版4 明细行卡**
  - 设置 / 工作站图表 / 主档疏朗 → **版1**
- **维保设置**：选版问答曾跳过；本波仍做版1 疏朗，可后续重选

## 设备维保 11

| 叶子 | key | PC | 定版 | ＋ | 上游 |
|------|-----|-----|------|---|------|
| 维保计划 | maint-plan | /inspection_plan/list | 临时版4 | 新建计划｜从模板 | — |
| 维保任务 | maint-task | /inspection_task/list | 临时版4 | 派工｜认领 | 维保计划 |
| 维保记录 | maint-record | /inspection_record/list | 临时版4 | 补录｜导入 | 维保任务 |
| 维保明细 | maint-break | /inspection_breakdown/list | 临时版4 | （只读为主；有则新增明细｜拆分） | — |
| 维保内容 | maint-content | /inspection_content/list | 临时版1 | 新增内容｜从标准库 | — |
| 点检计划 | pi-plan | /point_inspection_plan/list | 临时版4 | 新建点检计划｜复制 | — |
| 点检记录 | pi-record | /point_inspection_record/list | **版3 状态Tabs** | 补录点检｜扫码点检 | 点检计划 |
| 维修工单 | repair-order | /device_order/list | **版3 状态Tabs** | 新建工单｜报修转工单 | 可关联设备档案 |
| 设备档案 | device-archive | /device/list | **版4 明细行卡** | 新增设备｜批量导入 | — |
| 设备二维码 | device-qr | /device_qr_code/list | **版3 状态Tabs** | 生成二维码｜批量打印 | — |
| 维保设置 | equip-base | /setting/inspection/setting | 临时版1 | — | — |

## 精益生产 6（均临时皮）

| 叶子 | key | PC | 定版 | ＋ | 上游 |
|------|-----|-----|------|---|------|
| 精益生产工作站 | lean-station | /LeanProductionReportChart/ReportChart | 临时版1 | —（图表） | — |
| 整改中心 | lean-rectify | /lean_production_todo/list | 临时版4 | 新增整改 | 可关联巡查 |
| 精益会议 | lean-meeting | /meeting/list | 临时版4 | 新增会议 | — |
| 会议待办 | lean-todo | /meetingTodo/list | 临时版4 | 新增待办 | 可关联会议 |
| 现场巡查 | lean-patrol | /onsite_inspection/list | 临时版4 | 新增巡查 | — |
| 精益生产设置 | lean-setting | /setting/lean_production | 临时版1 | — | — |

硬规则：＋贴加号下；上游完成(N)；#4184F4；≤768 `/ms/*`；≥769 PC 不动；功能树 17 叶子可达。
