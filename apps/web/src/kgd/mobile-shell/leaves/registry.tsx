import type { ComponentType } from 'react';
import { AutoStockLeaf } from './AutoStockLeaf';
import { PerfPayLeaf } from './PerfPayLeaf';
import { ProduceDictLeaf } from './ProduceDictLeaf';
import { StationLeaf } from './StationLeaf';
import { StockAuditLeaf } from './StockAuditLeaf';
import { StockSettingLeaf } from './StockSettingLeaf';

/** C1c 设置补全 6 叶 · key → 手机皮组件 */
export const C1C_LEAF_REGISTRY: Record<string, ComponentType> = {
  'produce-dict-menu': ProduceDictLeaf,
  'perf-pay': PerfPayLeaf,
  'auto-stock': AutoStockLeaf,
  station: StationLeaf,
  'stock-setting': StockSettingLeaf,
  'stock-audit': StockAuditLeaf,
};

export const C1C_LEAF_KEYS = Object.keys(C1C_LEAF_REGISTRY);
