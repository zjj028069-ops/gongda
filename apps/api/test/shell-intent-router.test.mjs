import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const R = require(path.join(root, 'chat-shell/guide/shell-intent-router.js'));

const inProg = { l1InProgress: true, global: 'in_progress' };

test('给加工单加个紧急度 → B（即使 in_progress）', () => {
  const r = R.shellIntentRouter('给加工单加个紧急度', inProg);
  assert.equal(r.track, 'B');
});

test('给商品列表加个货源地 → B（不被商品吞）', () => {
  const r = R.shellIntentRouter('给商品列表加个货源地', inProg);
  assert.equal(r.track, 'B');
  assert.equal(R.looksLikeExplicitOnboarding('给商品列表加个货源地'), false);
});

test('帮我建三个货 → A', () => {
  const r = R.shellIntentRouter('帮我建三个货：水泵壳、叶轮、端盖', inProg);
  assert.equal(r.track, 'A');
});

test('做一个带复位的倒计时 → C', () => {
  const r = R.shellIntentRouter('做一个带复位的倒计时', inProg);
  assert.equal(r.track, 'C');
});

test('这单进度怎么样了 → D', () => {
  const r = R.shellIntentRouter('这单进度怎么样了', inProg);
  assert.equal(r.track, 'D');
});

test('给商品加点东西 → ambiguous', () => {
  const r = R.shellIntentRouter('给商品加点东西', inProg);
  assert.equal(r.track, 'ambiguous');
});

test('铸造机加热处理都计件 → A', () => {
  const r = R.shellIntentRouter('铸造机加热处理都计件，单价 8、12、10', inProg);
  assert.equal(r.track, 'A');
});

test('以后再说 → A 控制类', () => {
  const r = R.shellIntentRouter('以后再说', inProg);
  assert.equal(r.track, 'A');
});

test('单独「商品」不够开户', () => {
  assert.equal(R.looksLikeExplicitOnboarding('商品'), false);
  const r = R.shellIntentRouter('商品', inProg);
  assert.notEqual(r.track, 'A');
});
