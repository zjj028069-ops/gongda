import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { leafPath } from '../nav';

/**
 * 只读深链：≤768 不嵌入 PC 单据页，保留 link_path 入口供后续办卡接入。
 * 宽屏请直接走 PC 路由；本波不做「消息即任务办卡」。
 */
export function MobileDeepLinkPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id') || '';
  const title = params.get('title') || '消息详情';
  const path = params.get('path') || '';
  const body = params.get('body') || '';

  const hint = useMemo(() => {
    if (!path) return '本条消息未附带单据深链；可返回消息列表继续处理。';
    return '已定位到目标单据路径（只读深链）。完整表单请在 ≥769 PC 侧栏打开；本波手机端不改审核流。';
  }, [path]);

  return (
    <div className="ms-deeplink" data-testid="ms-deeplink" data-msg-id={id}>
      <button type="button" className="ms-back" onClick={() => navigate(-1)}>
        ‹ 返回
      </button>
      <h2>{title}</h2>
      {body ? <p className="ms-deeplink-body">{body}</p> : null}
      <p className="ms-leaf-note">{hint}</p>
      {path ? (
        <div className="ms-leaf-meta">
          <span>PC path：{path}</span>
        </div>
      ) : null}
      <div className="ms-leaf-actions">
        {path ? (
          <button
            type="button"
            className="ms-btn primary"
            data-testid="ms-deeplink-open"
            onClick={() =>
              navigate(
                leafPath({
                  key: 'deeplink-target',
                  title: title.slice(0, 40) || '单据入口',
                  path,
                  l1: 'message',
                }),
              )
            }
          >
            打开单据入口
          </button>
        ) : null}
        <button type="button" className="ms-btn" onClick={() => navigate('/ms/message/list')}>
          返回消息列表
        </button>
      </div>
    </div>
  );
}
