/** 功能叶子 / 只读深链共用路径构造 */

export function leafPath(opts: { key: string; title: string; path?: string; l1?: string }) {
  const q = new URLSearchParams();
  q.set('key', opts.key);
  q.set('title', opts.title);
  if (opts.path) q.set('path', opts.path);
  if (opts.l1) q.set('l1', opts.l1);
  return `/ms/leaf?${q.toString()}`;
}

/** 工作台 / 消息列表等已镜像叶子：走真实页，不落占位 */
export function mirroredLeafHref(node: { key?: string; path?: string; label?: string }): string | null {
  const key = node.key || '';
  const path = node.path || '';
  if (key === 'workplace-home' || path === '/staging/area' || path === '/workplace' || path === '/staging') {
    return '/ms/staging/area';
  }
  if (key === 'message-list' || path === '/message/list') {
    return '/ms/message/list';
  }
  return null;
}

export function deeplinkHref(opts: { id: string; title: string; path?: string; body?: string }) {
  const q = new URLSearchParams();
  q.set('id', opts.id);
  q.set('title', opts.title);
  if (opts.path) q.set('path', opts.path);
  if (opts.body) q.set('body', opts.body.slice(0, 200));
  return `/ms/deeplink?${q.toString()}`;
}
