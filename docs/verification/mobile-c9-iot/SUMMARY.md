# mobile-c9-iot 验收

- 版本：SEDRIC01 v1.0.104 / mobile-c9-iot
- 基线：main = v1.0.92
- 通过 11 / 11（叶子 4/4）
- 待 Allen 重选皮；未 merge、未上腾讯云、未 rebase C0～C8

- 通过 C9-L01 ≤768 列表 物联场景 · layout=v4-detail-lines;plus=1;ui-clean
- 通过 C9-L02 ≤768 列表 传感器 · layout=v4-detail-lines;plus=1;ui-clean
- 通过 C9-L03 ≤768 列表 报警记录 · layout=v3-status-tabs;plus=1;ui-clean
- 通过 C9-L04 ≤768 列表 基础设置 · layout=v1-settings;plus=0;ui-clean
- 通过 C9-PLUS-SCENE 物联场景＋下拉（新建场景｜导入模板） · ＋新建场景|导导入模板
- 通过 C9-PLUS-SENSOR 传感器＋下拉（新增测点｜批量导入） · ＋新增测点|导批量导入
- 通过 C9-PLUS-ALARM 报警记录＋下拉（手动录入｜导出） · ＋手动录入|出导出
- 通过 C9-ALARM-TABS 报警状态 Tabs 切换过滤 · open=3;closed=2
- 通过 C9-FN-IOT 功能树 · 智能设备入口抽检 · functions-iot-ok
- 通过 C9-PC-REDIRECT 窄屏 PC path → /ms/leaf · http://127.0.0.1:5173/ms/leaf?key=iot-scene&title=%E7%89%A9%E8%81%94%E5%9C%BA%E6%99%AF&path=%2Fdevice_iot%2Flist&l1=iot
- 通过 C9-DESKTOP ≥769 不挂四栏壳 · desktop-ok
