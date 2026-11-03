# C9 智能设备 · 物联（4 叶）

Allen（2026-11-03）选定：C8 先放着，开 C9 物联。缺口组物联尚未逐项选版 → **临时皮**，PR 须写「待 Allen 重选皮」。

临时皮规则（对齐 C6）：单据/测点/场景列表 → 版4；报警带状态 → 版3 状态Tabs；设置 → 版1。

## 范围（本波 4 叶）

| 叶子 | key | PC path | 定版 | ＋下拉 |
|------|-----|---------|------|--------|
| 物联场景 | iot-scene | /device_iot/list | 临时版4 明细行卡（待重选） | 新建场景｜导入模板 |
| 传感器 | iot-sensor | /device_sensor/list | 临时版4 明细行卡（待重选） | 新增测点｜批量导入 |
| 报警记录 | iot-alarm | /alarm_record/list | 临时版3 状态Tabs：全部｜未处理｜处理中｜已关闭（待重选） | 手动录入｜导出 |
| 基础设置 | iot-base | /setting/smart_device/setting | 临时版1 疏朗入口卡（待重选） | 无＋（设置页） |

设计参考（`uploads/design-refs.tar.gz` 内 jpg 文件名即所用版；勿把 README/卖点/「临时皮」「定版」画进 UI）：
- `iot-scene-v4.jpg` ← mobile-ui-designs-5/iot-scene/v4.jpg
- `iot-sensor-v4.jpg` ← mobile-ui-designs-5/iot-sensor/v4.jpg
- `iot-alarm-v3.jpg` ← mobile-ui-designs-5/iot-alarm/v3.jpg
- `iot-setting-v1.jpg` ← mobile-ui-designs-5/iot-setting/v1.jpg（叶子 key=`iot-base`）

样例域：工业物联（产线场景/温度压力振动液位/反应釜温压报警等），禁食物图与食品文案。

## 硬规矩（与 C0～C8 同）

- 主色 `#4184F4`；≤768 挂四栏壳 `MobileFourTabShell`；路由 **`/ms/leaf?key=…`**（禁止 `/m/*`）；≥769 PC 侧栏不动
- 顶栏：**细线放大镜**搜；有新增则右上 **＋** 紧贴下拉（微信气泡），禁止标题下长搜索条+查询
- **禁止**夹具/同源 API/硬约束/临时皮/PC path/（皮）/开发说明 **上屏**；夹具数据可空库兜底；PR 描述可写「待 Allen 重选皮」
- Playwright：4 叶可达 + 禁字断言 + 功能树入口抽检 + 截图 `docs/verification/mobile-c9-iot/`；写回多为皮 toast 可接受
- 基线 **GitHub main = SEDRIC01 v1.0.92**（PR#2 已合）；**勿 rebase** PR#3～#13；**不合入、不上腾讯云、不重建库、不改开发账号密码**
- 模型用 Cursor 默认 auto；子任务也须 auto；截图只用 Playwright 脚本
- 版本标：**SEDRIC01 v1.0.104 / mobile-c9-iot**
