import { useState } from 'react';

type Props = {
  kind: 'goods' | 'bom';
  title: string;
  onCancel: () => void;
  onSave: () => void;
  linkedGoods?: string;
};

/** 新增直进表单（无模板）· 皮层，不落库 */
export function CreateForm({ kind, title, onCancel, onSave, linkedGoods }: Props) {
  const [name, setName] = useState(kind === 'goods' ? '深沟球轴承 6205-2RS' : '');
  const [code, setCode] = useState('');
  const category = '原材料';
  const [spec, setSpec] = useState(kind === 'goods' ? '内径25×外径52×宽15' : '');
  const unit = '套';
  const source = '外购';
  const [price, setPrice] = useState('12.80');
  const [cost, setCost] = useState('8.50');
  const [min, setMin] = useState('200');
  const [max, setMax] = useState('5000');
  const [stale, setStale] = useState('90');
  const [bomName, setBomName] = useState('');
  const [product, setProduct] = useState(linkedGoods || '');

  return (
    <div className="c5-create" data-testid="c5-create-form" data-kind={kind}>
      <header className="ms-top c5-leaf-top">
        <button type="button" className="ms-back-inline" onClick={onCancel} aria-label="取消">‹</button>
        <h1 className="ms-top-title c5-leaf-title">{title}</h1>
        <button type="button" className="c5-top-cancel" onClick={onCancel}>取消</button>
      </header>

      <div className="c5-create-banner" data-testid="c5-create-banner">
        {kind === 'goods'
          ? '对齐快工单：空白新建，直进表单（无商品模板）'
          : '新增 BOM 直进表单 · 可关联商品 · 无模板勾选'}
      </div>

      {kind === 'goods' ? (
        <>
          <section className="c5-form-card">
            <h2 className="c5-form-h">基础信息</h2>
            <label className="c5-field">
              <span>商品编号</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="忽略将自动生成" />
            </label>
            <label className="c5-field">
              <span className="is-req">商品名</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="c5-field is-pick">
              <span>类别</span>
              <button type="button">{category}<i>›</i></button>
            </label>
            <label className="c5-field">
              <span>规格</span>
              <input value={spec} onChange={(e) => setSpec(e.target.value)} />
            </label>
            <label className="c5-field is-pick">
              <span>单位</span>
              <button type="button">{unit}<i>›</i></button>
            </label>
            <label className="c5-field is-pick">
              <span>商品来源</span>
              <button type="button">{source}<i>›</i></button>
            </label>
          </section>
          <section className="c5-form-card">
            <h2 className="c5-form-h">价格与库存预警</h2>
            <label className="c5-field">
              <span>销售单价</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </label>
            <label className="c5-field">
              <span>成本单价</span>
              <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
            </label>
            <label className="c5-field">
              <span>库存下限</span>
              <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" />
            </label>
            <label className="c5-field">
              <span>库存上限</span>
              <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" />
            </label>
            <label className="c5-field">
              <span>呆滞警告(天)</span>
              <input value={stale} onChange={(e) => setStale(e.target.value)} inputMode="numeric" />
            </label>
          </section>
        </>
      ) : (
        <section className="c5-form-card">
          <h2 className="c5-form-h">BOM 基础</h2>
          <label className="c5-field">
            <span>BOM编号</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="忽略将自动生成" />
          </label>
          <label className="c5-field">
            <span className="is-req">BOM名称</span>
            <input value={bomName} onChange={(e) => setBomName(e.target.value)} placeholder="如：液压泵站总成BOM" />
          </label>
          <label className="c5-field">
            <span>关联商品</span>
            <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="可关联成品/半成品" />
          </label>
          <label className="c5-field is-pick">
            <span>类别</span>
            <button type="button">{category}<i>›</i></button>
          </label>
        </section>
      )}

      <div className="c5-create-actions">
        <button type="button" className="c5-btn-ghost" onClick={onCancel}>取消</button>
        <button type="button" className="c5-btn-primary" data-testid="c5-create-save" onClick={onSave}>保存</button>
      </div>
    </div>
  );
}
