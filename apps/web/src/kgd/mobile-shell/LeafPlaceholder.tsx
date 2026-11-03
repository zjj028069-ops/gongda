import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { C8_LEAF_REGISTRY } from './leaves/registry';

/**
 * 功能叶子 / 设置深链。
 * C8 二十叶走 registry 真皮；其余仍为壳占位（报价合同入口保留）。
 */
export function LeafPlaceholder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const key = params.get('key') || '';
  const title = params.get('title') || '功能页';
  const path = params.get('path') || '';

  const Skin = C8_LEAF_REGISTRY[key];
  if (Skin) return <Skin />;

  const isQuote = key === 'quote' || path.includes('contract_quotation');
  const isContract = key === 'contract' || path.includes('customer_contract');

  const note = useMemo(() => {
    if (isQuote) return '合同报价单手机端入口保留，业务页后续接入。';
    if (isContract) return '销售合同须能选上游报价，入口保留。';
    return '阶段 B 壳骨架：业务语义未改；本页为占位，菜单树已通。';
  }, [isQuote, isContract]);

  return (
    <div className="ms-leaf" data-testid="ms-leaf" data-key={key}>
      <button type="button" className="ms-back" onClick={() => navigate(-1)}>
        ‹ 返回
      </button>
      <h2>{title}</h2>
      <p className="ms-leaf-note">{note}</p>
      {(isQuote || isContract) && (
        <div className="ms-leaf-actions">
          {isQuote && (
            <button
              type="button"
              className="ms-btn"
              onClick={() =>
                navigate(
                  '/ms/leaf?key=quote&title=%E6%96%B0%E5%A2%9E%E6%8A%A5%E4%BB%B7%E5%90%88%E5%90%8C&path=%2Fcontract_quotation_bill%2Flist',
                )
              }
            >
              新增报价（入口保留）
            </button>
          )}
          {isContract && (
            <>
              <button
                type="button"
                className="ms-btn primary"
                onClick={() =>
                  navigate(
                    '/ms/leaf?key=contract-from-quote&title=%E6%8A%A5%E4%BB%B7%E5%8D%95%E5%88%9B%E5%BB%BA%E5%90%88%E5%90%8C&path=%2Fcustomer_contract%2Flist',
                  )
                }
              >
                报价单创建（选上游）
              </button>
              <button
                type="button"
                className="ms-btn"
                onClick={() =>
                  navigate(
                    '/ms/leaf?key=contract-blank&title=%E7%9B%B4%E6%8E%A5%E5%88%9B%E5%BB%BA%E5%90%88%E5%90%8C&path=%2Fcustomer_contract%2Flist',
                  )
                }
              >
                直接创建（并存，非唯一）
              </button>
            </>
          )}
        </div>
      )}
      {key === 'contract-from-quote' && (
        <div className="ms-pick-skin">
          <p>壳级交互预览：＋下拉 → 勾选上游报价 → 完成(N)</p>
          <label className="ms-pick-row">
            <input type="checkbox" defaultChecked /> BJ-2026-012 · ¥128,000
          </label>
          <label className="ms-pick-row">
            <input type="checkbox" /> BJ-2026-008 · ¥56,400
          </label>
          <button type="button" className="ms-btn primary" disabled>
            完成(1) · 业务写回后续
          </button>
        </div>
      )}
    </div>
  );
}
