import type { C9LeafDef } from './c9Registry';
import type { FixtureRow } from './fixtures';

function str(v: unknown, fallback = '') {
  if (v == null) return fallback;
  return String(v);
}

function mapSceneStatus(raw: string): Pick<FixtureRow, 'status' | 'statusText' | 'statusTone'> {
  if (raw.includes('报警') || raw.includes('告警')) return { status: 'warn', statusText: raw || '警告', statusTone: 'warn' };
  if (raw.includes('离线')) return { status: 'offline', statusText: '离线', statusTone: 'mute' };
  if (raw.includes('警告') || raw.includes('异常')) return { status: 'warn', statusText: raw || '警告', statusTone: 'warn' };
  if (raw.includes('正常') || !raw) return { status: 'ok', statusText: raw || '正常', statusTone: 'ok' };
  return { status: raw || 'ok', statusText: raw || '正常', statusTone: 'info' };
}

function mapAlarmResult(raw: string): Pick<FixtureRow, 'status' | 'statusText' | 'statusTone'> {
  if (raw.includes('关闭') || raw.includes('已消') || raw.includes('完成')) {
    return { status: 'closed', statusText: '已关闭', statusTone: 'ok' };
  }
  if (raw.includes('处理中') || raw.includes('进行')) {
    return { status: 'doing', statusText: '处理中', statusTone: 'warn' };
  }
  if (raw.includes('未处理') || raw.includes('待') || !raw) {
    return { status: 'open', statusText: '未处理', statusTone: 'bad' };
  }
  return { status: 'open', statusText: raw || '未处理', statusTone: 'pending' };
}

function mapLevel(raw: string): FixtureRow['levelTone'] {
  if (raw.includes('紧急') || raw.includes('严重')) return 'critical';
  if (raw.includes('高')) return 'high';
  if (raw.includes('中') || raw.includes('一般')) return 'mid';
  return 'low';
}

/** API → 展示行；字段缺失时由夹具兜底 */
export function mapApiItems(leaf: C9LeafDef, items: Record<string, unknown>[]): FixtureRow[] {
  return items.map((item, idx) => {
    const id = str(item.id, `${leaf.key}-${idx}`);
    if (leaf.key === 'iot-scene') {
      const st = mapSceneStatus(str(item.status));
      return {
        id,
        code: str(item.code, `SC-${String(idx + 1).padStart(3, '0')}`),
        name: str(item.name, '物联场景'),
        ...st,
        gateway: str(item.gateway || item.device_name, '—'),
        deviceCount: typeof item.device_count === 'number' ? item.device_count : undefined,
        onlineRate: str(item.online_rate),
        workshop: str(item.shop_name),
        line: str(item.line_name),
        device: str(item.device_name),
        iconGlyph: '景',
      };
    }
    if (leaf.key === 'iot-sensor') {
      const rawStatus = str(item.status || item.bind_status || item.online_status);
      let status = 'online';
      let statusText = '在线';
      let statusTone: FixtureRow['statusTone'] = 'ok';
      if (rawStatus.includes('离线') || rawStatus.toLowerCase() === 'offline') {
        status = 'offline';
        statusText = '离线';
        statusTone = 'mute';
      } else if (rawStatus.includes('告警') || rawStatus.includes('报警') || rawStatus.toLowerCase() === 'alarm') {
        status = 'alarm';
        statusText = '告警';
        statusTone = 'bad';
      } else if (rawStatus.includes('未')) {
        status = 'offline';
        statusText = '离线';
        statusTone = 'mute';
      }
      const kind = str(item.kind || item.point_name || item.name, '测点');
      const code = str(item.code, `S${String(idx + 1).padStart(3, '0')}`);
      return {
        id,
        code,
        name: kind.includes(code) ? kind : `${kind} ${code}`,
        status,
        statusText,
        statusTone,
        kind,
        unit: str(item.unit),
        value: str(item.value || item.sensor_value),
        threshold: str(item.threshold),
        scene: str(item.scene_name),
        point: str(item.point_name),
        workshop: str(item.shop_name || item.workshop),
        line: str(item.line_name || item.line),
        gateway: str(item.gateway),
        interval: str(item.interval_text),
        bindStatus: rawStatus,
        deviceCode: code,
        time: str(item.updated_at || item.time),
        alarmHint: str(item.alarm_hint || item.alarm_msg),
        iconGlyph: kind.slice(0, 1),
      };
    }
    if (leaf.key === 'iot-alarm') {
      const st = mapAlarmResult(str(item.result));
      const level = str(item.level, '一般');
      return {
        id,
        code: str(item.code, id),
        name: str(item.auto_name || item.name || item.scene_name, '报警'),
        ...st,
        level,
        levelTone: mapLevel(level),
        device: str(item.auto_name || item.device_name || item.scene_name),
        deviceCode: str(item.device_code),
        location: [str(item.shop_name), str(item.line_name)].filter(Boolean).join(' · ') || '—',
        time: str(item.alarmed_at),
        sensorValue: str(item.sensor_value),
        scene: str(item.scene_name),
        result: str(item.result),
      };
    }
    return {
      id,
      code: str(item.code, id),
      name: str(item.name, id),
      status: 'ok',
      statusText: '—',
      statusTone: 'mute' as const,
    };
  });
}
