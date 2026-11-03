# mobile-c9-iot-skin-final 验收

- 版本：SEDRIC01 v1.0.105 / mobile-c9-iot-skin-final
- 基线：main = v1.0.104
- 相对 v1.0.104 改皮：iot-sensor: v4→v3；iot-base: v1→v5
- 通过 13 / 13（叶子 4/4）
- 未 merge、未上腾讯云、未 rebase PR#3～#13；基线 main=v1.0.104

- 通过 C9F-L01 ≤768 列表 物联场景 · layout=v4-detail-lines;plus=1;ui-clean
- 通过 C9F-L02 ≤768 列表 传感器 · layout=v3-status-tabs;plus=1;ui-clean
- 通过 C9F-L03 ≤768 列表 报警记录 · layout=v3-status-tabs;plus=1;ui-clean
- 通过 C9F-L04 ≤768 列表 基础设置 · layout=v5-switch-rows;plus=0;ui-clean
- 通过 C9F-PLUS-SCENE 物联场景＋下拉（新建场景｜导入模板） · ＋新建场景|导导入模板
- 通过 C9F-PLUS-SENSOR 传感器＋下拉（新增测点｜批量导入） · ＋新增测点|导批量导入
- 通过 C9F-PLUS-ALARM 报警记录＋下拉（手动录入｜导出） · ＋手动录入|出导出
- 通过 C9F-SENSOR-TABS 传感器状态 Tabs 切换过滤 · online=4;offline=1;alarm=1
- 通过 C9F-ALARM-TABS 报警状态 Tabs 切换过滤 · open=3;closed=2
- 通过 C9F-BASE-SWITCH 基础设置版5 开关写回 toast · before=true;after=false;toast=已关闭：设备联网
- 通过 C9F-FN-IOT 功能树 · 智能设备入口抽检 · functions-iot-ok
- 通过 C9F-PC-REDIRECT 窄屏 PC path → /ms/leaf · http://127.0.0.1:5173/ms/leaf?key=iot-scene&title=%E7%89%A9%E8%81%94%E5%9C%BA%E6%99%AF&path=%2Fdevice_iot%2Flist&l1=iot
- 通过 C9F-DESKTOP ≥769 不挂四栏壳 · desktop-ok
