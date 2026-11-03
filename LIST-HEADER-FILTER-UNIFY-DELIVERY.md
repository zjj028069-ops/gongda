# SEDRIC01 v1.0.91 list-header-filter-unify

时间：2026-10-31（Asia/Shanghai）

## 需求
Allen：商品列表表头「标题+蓝漏斗」非常完美；整个系统表体标题统一为同款。平时普通标题+蓝漏斗；仅筛中列抬起成胶囊并显示已选值（方案B / natural-v3）。

## 摸底
- 实现位置：`apps/web/src/kgd/HeaderFilter.tsx`（`HeaderFilterTitle` + `FilterOutlined`）、`ListFrame.tsx` 列 title 注入、`kgd.css`（`.kgd-hf-*`）
- 改前仅 `pages/goods/list.tsx` 显式写了 `headerFilter`；其余约 48 个 ListFrame 列表无漏斗
- 现网公网 `/app/` 走 **Vite 静态 dist**（nginx alias），非仅 Vite preview；故必须 rebuild dist

## 改动
- `ListFrame.tsx`：默认对非 `actions` 列启用表头筛（`headerFilter ?? true`）；`headerFilter: false` 可关；显式对象保留 options/valueOf
- `HeaderFilter.tsx` / `kgd.css`：注释对齐；视觉逻辑不变
- VERSION → **1.0.91** / feature `list-header-filter-unify`
- dist：`index-BqFMGIGc.js` + `index-Cw_vdb1_.css`

## 部署
- Mac：`~/SEDRIC01-gongda-184`
- VPS：`/opt/sedric01`；备份 `.bak-*-list-header-filter-v191`（含 dist.bak）
- creds md5 未变：`ed017133e6253947794123a9eeeb6c9e`
- garment-* 未动；未重建库、未改密码、未开云端 Cursor

## 冒烟（Playwright，Asia/Shanghai）
- 商品 `/app/goods/list`：漏斗 OK（funnel=104）
- 客户 `/app/customer/list`：漏斗 OK（funnel=48）
- 加工单 `/app/inside_produce_bill/list`：漏斗 OK（funnel=144）

## 已知遗漏
未走 ListFrame、直接用 ant `Table` 的页（设备维保设置/明细、部分看板/设置、详情内嵌表等）未统一；主业务列表壳已覆盖。
