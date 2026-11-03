# 基线核查 · mobile-4tab-shell-p0（2026-11-03）

## 结论（已对齐）
- 基线分支：`chore/sedric-v1.0.91-baseline` tip **`ca009a2`** = SEDRIC01 **v1.0.91** `list-header-filter-unify`
- 功能分支：`cursor/mobile-4tab-shell-p0-d31a` = **v1.0.92** `mobile-4tab-shell-p0`
- 旧标号 **v1.0.75 作废**（曾误建在 GitHub main = v1.0.74 树上）

## 导入链
`4f6cffb` (v1.0.74) → `7011ea1` (v1.0.84) → `d083f17` (v1.0.85) → `ca009a2` (v1.0.91) → 本功能 rebase

## 冲突处理
- `VERSION` / `SEDRIC_VERSION.json` / `version.json` / `apps/web/VERSION*`：rebase 时保留基线，再统一 bump 到 **1.0.92**
- `Shell.tsx`：保留基线 ≥769 PC 侧栏/抽屉逻辑；≤768 早返回 `MobileFourTabShell`

## 纪律
不 merge、不上腾讯云、不重建库、不改开发账号密码、不动 garment；等 Allen 点头。
