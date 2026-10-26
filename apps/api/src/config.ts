import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const projectRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const mode = env.DB_MODE ?? (production ? 'postgres' : 'pglite');
  if (mode !== 'postgres' && mode !== 'pglite') throw new Error('DB_MODE必须是postgres或pglite');
  if (production && mode !== 'postgres') throw new Error('生产环境不能使用本地嵌入数据库');
  if (production && !env.PUBLIC_ORIGIN) throw new Error('生产环境需设置PUBLIC_ORIGIN');
  const trustedProxy = env.TRUST_PROXY_CIDRS?.split(',').map(value => value.trim()).filter(Boolean);
  if (production && !trustedProxy?.length) throw new Error('生产部署需配置TRUST_PROXY_CIDRS，禁止直接信任任意转发头');
  const origin = new URL(env.PUBLIC_ORIGIN ?? 'http://127.0.0.1:5173').origin;
  if (production && !origin.startsWith('https://')) throw new Error('生产PUBLIC_ORIGIN必须使用https');
  const port = Number(env.PORT ?? 3001);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT不合法');
  return { production, trustedProxy, mode: mode as 'pglite' | 'postgres', url: env.DATABASE_URL, dataDir: env.LOCAL_DB_DIR ?? resolve(projectRoot, '.local/database'), origin, port, host: env.HOST ?? '127.0.0.1' };
}




