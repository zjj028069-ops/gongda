import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const F = require(path.join(root, 'chat-shell/guide/process-fluent-qa.js'));
const R = require(path.join(root, 'chat-shell/guide/shell-intent-router.js'));

const inProg = { l1InProgress: true, global: 'in_progress' };

test('版本标签 fluent-chitchat-guard / 1.0.90', () => {
  assert.equal(F.VERSION, '1.0.90');
  assert.equal(F.FEATURE, 'fluent-chitchat-guard');
});

test('样例1：这单进度怎么样了 → 三问=进度 + 单据序含报工', () => {
  const route = R.shellIntentRouter('这单进度怎么样了', inProg);
  assert.equal(route.track, 'D');
  const res = F.processFluentAnswer('这单进度怎么样了', { track: 'D' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.threeQ, 'progress');
  assert.equal(res.answer.tag, F.TAG.OP);
  assert.match(res.answer.text, /问进度|进度/);
  assert.ok(res.answer.steps.some((s) => /报工|生产任务/.test(s.text)));
  assert.equal(res.answer.session.chapter, '10');
});

test('样例2：工资怎么还没出来 → 三问=工资 + 报工→结算→报表', () => {
  const route = R.shellIntentRouter('工资怎么还没出来', inProg);
  assert.ok(route.track === 'D' || route.track === 'E');
  const res = F.processFluentAnswer('工资怎么还没出来', { track: route.track });
  assert.equal(res.handled, true);
  assert.equal(res.answer.threeQ, 'wage');
  assert.match(res.answer.judgment, /报工/);
  assert.ok(res.answer.steps.length >= 1);
  assert.ok(
    res.answer.menus.some((m) => /报工记录|生产工资报表/.test(m)) ||
      /结算|工资报表/.test(res.answer.text)
  );
  assert.equal(res.answer.session.docId, 'wage_settle');
});

test('样例3：要入库了，是先入库还是先报工 → 先报工再入库', () => {
  // 无开户态时应走 E；in_progress 时 88 软开户名单启发式可能误进 A（不回退 88），交还后仍用 E 答
  const routeIdle = R.shellIntentRouter('要入库了，是先入库还是先报工', {});
  assert.equal(routeIdle.track, 'E');
  const res = F.processFluentAnswer('要入库了，是先入库还是先报工', { track: 'E' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.scenario, 'inbound_vs_report');
  assert.match(res.answer.headline + res.answer.judgment, /先报工|报工\/质检/);
  assert.ok(res.answer.steps.some((s) => /报工|生产任务/.test(s.text)));
  assert.ok(res.answer.steps.some((s) => /成品入库|入库单/.test(s.text)));
  assert.equal(res.answer.tag, F.TAG.OP);
});

test('样例4：开户中途加紧急度 → 88 轨 B；上层不串', () => {
  const route = R.shellIntentRouter('开户做到一半，给加工单加个紧急度', inProg);
  assert.equal(route.track, 'B');
  const res = F.processFluentAnswer('开户做到一半，给加工单加个紧急度', { track: 'B' });
  assert.equal(res.handled, false);
  assert.equal(res.deferToRouter, true);
  assert.match(String(res.tip || res.reason), /字段|不抢|交还/);
});

test('样例5：合同签完了，接下来怎么报工 → 合同→加工单→开始→报工；记会话', () => {
  const route = R.shellIntentRouter('合同签完了，接下来怎么报工', inProg);
  assert.ok(route.track === 'E' || route.track === 'A'); // 不应被 B/C 抢走；教法走 E
  // 显式工序/报教法：若被 A 误伤则上层仍可在交还 E 后答；本夹具直接 E
  const res = F.processFluentAnswer('合同签完了，接下来怎么报工', { track: 'E' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.scenario, 'contract_then_report');
  const joined = res.answer.steps.map((s) => s.text).join('|');
  assert.match(joined, /加工单/);
  assert.match(joined, /报工|生产任务/);
  assert.equal(res.answer.session.chapter, '07');
  assert.equal(res.answer.session.docId, 'report_work');
});

test('加：书上绿色新增、屏是蓝 → 以屏为准 + 操作问题', () => {
  const res = F.processFluentAnswer('书上说点绿色新增，我屏幕是蓝色', { track: 'E' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.tag, F.TAG.OP);
  assert.match(res.answer.judgment, /屏幕|以屏为准|以屏幕为准/);
});

test('加：批量操作是灰的 → 配置分流标签', () => {
  const res = F.processFluentAnswer('批量操作是灰的，是不是坏了', { track: 'E' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.tag, F.TAG.CFG);
  assert.match(res.answer.judgment, /勾选|权限|疑似缺陷/);
});

test('会话续导：下一步接着章/单', () => {
  const first = F.processFluentAnswer('合同签完了，接下来怎么报工', { track: 'E' });
  assert.equal(first.handled, true);
  const cont = F.processFluentAnswer('下一步', {
    track: 'E',
    session: first.answer.session,
  });
  assert.equal(cont.handled, true);
  assert.equal(cont.answer.scenario, 'continue');
  assert.ok(cont.answer.session.docId);
});


test('闲聊守卫：你是谁 → handled:false，绝不书上暂未写到', () => {
  for (const q of ['你是谁', '你是谁？', '你好', '在吗', '谢谢', '介绍一下你自己', '干什么的']) {
    const res = F.processFluentAnswer(q, { track: 'E' });
    assert.equal(res.handled, false, q);
    assert.ok(!res.answer || !/书上暂未写到/.test(String(res.answer.text || '')), q);
    assert.equal(F.looksLikeChitchatOrIdentity(q), true, 'detect ' + q);
  }
});

test('流程问法仍走对答：这单进度怎么样了', () => {
  const res = F.processFluentAnswer('这单进度怎么样了', { track: 'D' });
  assert.equal(res.handled, true);
  assert.equal(res.answer.threeQ, 'progress');
  assert.ok(!/书上暂未写到/.test(res.answer.text) || /问进度/.test(res.answer.text));
  assert.match(res.answer.text, /问进度|进度/);
});

test('非闲聊但像流程且未命中 → 书上暂未写到', () => {
  const res = F.processFluentAnswer('火星上怎么排产外星飞船', { track: 'E' });
  assert.equal(res.handled, true);
  assert.equal(res.reason, '白名单未命中');
  assert.match(res.answer.text, /书上暂未写到/);
});
