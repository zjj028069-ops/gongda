import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  looksLikeOnboardingIntent,
  parseOnboardingRules,
  resolveOnboardingUtterance,
} from '../src/ai/onboarding-nlu.js';

test('工序：铸造机加热处理都计件+三单价 → 3 道，不含计件/单价名', () => {
  const r = parseOnboardingRules('铸造机加热处理都计件，单价 8、12、10', { currentStep: 'process' });
  assert.equal(r.intent, 'process_upsert');
  assert.ok(r.rows);
  assert.equal(r.rows!.length, 3);
  const names = r.rows!.map((x) => String(x.name));
  assert.deepEqual(names, ['铸造', '机加', '热处理']);
  for (const n of names) {
    assert.equal(['计件', '计时', '单价'].includes(n), false);
  }
  assert.equal(r.rows![0]!.pricing, '计件');
  assert.equal(r.rows![0]!.wage, 8);
  assert.equal(r.rows![1]!.wage, 12);
  assert.equal(r.rows![2]!.wage, 10);
});

test('商品：帮我建三个货 → goods_upsert ×3', () => {
  const r = parseOnboardingRules('帮我建三个货：水泵壳、叶轮、端盖', { currentStep: 'goods' });
  assert.equal(r.intent, 'goods_upsert');
  assert.ok(r.rows);
  assert.equal(r.rows!.length, 3);
  assert.deepEqual(
    r.rows!.map((x) => x.name),
    ['水泵壳', '叶轮', '端盖'],
  );
});

test('跨步：组织步时说建三个货 → 仍 goods_upsert（不看 currentStep）', () => {
  const r = parseOnboardingRules('帮我建三个货：水泵壳、叶轮、端盖', { currentStep: 'org' });
  assert.equal(r.intent, 'goods_upsert');
  assert.equal(r.step_hint, 'goods');
  assert.equal(r.rows!.length, 3);
});

test('跨步：欢迎/组织步说工序计件 → process_upsert', () => {
  const r = parseOnboardingRules('铸造机加热处理都计件，单价 8、12、10', { currentStep: 'org' });
  assert.equal(r.intent, 'process_upsert');
  assert.equal(r.step_hint, 'process');
  assert.equal(r.rows!.length, 3);
});

test('跳过：工序以后再说 → skip_step', () => {
  const r = parseOnboardingRules('工序以后再说', { currentStep: 'process' });
  assert.equal(r.intent, 'skip_step');
  assert.equal(r.step_hint, 'process');
});

test('乱序组织可抽部门人员车间', () => {
  const r = parseOnboardingRules('车间精工，张三和李四在生产部', { currentStep: 'welcome' });
  assert.equal(r.intent, 'org_upsert');
  const kinds = (r.rows || []).map((x) => x.kind);
  assert.ok(kinds.includes('dept'));
  assert.ok(kinds.includes('workshop'));
  assert.ok(kinds.includes('user'));
});

test('多意图混说：组织+货+工序 → multi_upsert', () => {
  const r = parseOnboardingRules('生产部张三；货有端盖；铸造计件，单价 8', { currentStep: 'org' });
  assert.equal(r.intent, 'multi_upsert');
  assert.ok(r.intents && r.intents.length >= 2);
  const intents = r.intents!.map((x) => x.intent);
  assert.ok(intents.includes('org_upsert') || intents.includes('goods_upsert'));
  assert.ok(intents.includes('process_upsert') || intents.includes('goods_upsert'));
});

test('looksLike + resolve 无 Key 走规则', async () => {
  assert.equal(looksLikeOnboardingIntent('帮我建三个货：A、B、C'), true);
  const r = await resolveOnboardingUtterance('帮我建三个货：水泵壳、叶轮、端盖', {
    currentStep: 'org',
  });
  assert.equal(r.intent, 'goods_upsert');
  assert.equal(r.source, 'rules');
  assert.equal(r.rows?.length, 3);
});

test('工序名过滤：计件/单价不得进 names', () => {
  const r = parseOnboardingRules('工序有铸造、计件、单价，单价 8、12、10', { currentStep: 'goods' });
  assert.equal(r.intent, 'process_upsert');
  const names = (r.rows || []).map((x) => String(x.name));
  assert.ok(names.includes('铸造'));
  assert.equal(names.includes('计件'), false);
  assert.equal(names.includes('单价'), false);
});

test('闲聊在开户步应交还 not_l1（不再任意 clarify）', () => {
  const r = parseOnboardingRules('嗯嗯好的吧', { currentStep: 'org' });
  assert.equal(r.intent, 'not_l1');
});

test('加字段硬特征 → not_l1（不被商品词吞）', () => {
  const r = parseOnboardingRules('给商品列表加个货源地', { currentStep: 'goods' });
  assert.equal(r.intent, 'not_l1');
  assert.equal(looksLikeOnboardingIntent('给商品列表加个货源地', { currentStep: 'goods' }), false);
  assert.equal(looksLikeOnboardingIntent('给加工单加个紧急度', { currentStep: 'org' }), false);
});

test('显式建货仍开户', () => {
  assert.equal(looksLikeOnboardingIntent('帮我建三个货：水泵壳、叶轮、端盖'), true);
});
