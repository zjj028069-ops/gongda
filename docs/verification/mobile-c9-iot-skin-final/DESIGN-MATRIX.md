# C9 物联定版落地（4 叶改皮）

Allen（2026-11-03）已逐项定版；基于 **GitHub main（已含 PR#14 / v1.0.104）** 开分支改皮。

## 定版（最终）

| 叶子 | key | PC path | 定版 | ＋ | 相对 v1.0.104 |
|------|-----|---------|------|----|---------------|
| 物联场景 | iot-scene | /device_iot/list | **版4 明细行卡** | 新建场景｜导入模板 | 已是版4，核对对齐 |
| 传感器 | iot-sensor | /device_sensor/list | **版3 状态Tabs** | 新增测点｜批量导入 | 从临时版4 → 版3 |
| 报警记录 | iot-alarm | /alarm_record/list | **版3 状态Tabs** | 手动录入｜导出 | 已是版3，核对对齐 |
| 基础设置 | iot-base | /setting/smart_device/setting | **版5 极简开关行** | 无＋ | 从临时版1 → 版5 |

参考图（`uploads/design-refs.tar.gz`）：
- iot-scene-v4.jpg / iot-sensor-v3.jpg / iot-alarm-v3.jpg / iot-setting-v5.jpg

## 硬规矩
- 主色 `#4184F4`；≤768 四栏壳；`/ms/leaf?key=…`；≥769 PC 不动
- 顶栏细线放大镜；禁标题下长搜+查询；＋微信气泡贴加号下
- **禁止**夹具/同源 API/硬约束/临时皮/PC path/（皮）上屏
- Playwright：4 叶可达 + 禁字 + 版型特征抽检 + 截图 `docs/verification/mobile-c9-iot-skin-final/`
- 基线 **main = v1.0.104**（PR#14 已合）；**勿 rebase** PR#3～#13；**不合入、不上腾讯云、不重建库、不改密码**
- 模型/子任务 auto；截图只用 Playwright
- 版本：**SEDRIC01 v1.0.105 / mobile-c9-iot-skin-final**
