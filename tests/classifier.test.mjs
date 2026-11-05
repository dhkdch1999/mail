// 실행: node --test tests/classifier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, replyDraft } from '../js/classifier.js';
import { LEAVES } from '../js/tree.js';
import { PERSONAS, sampleMails } from '../js/sample.js';

const NOW = new Date('2026-11-04T18:00:00+09:00');

for (const persona of PERSONAS) {
  const mails = sampleMails(NOW, persona.id);

  test(`[${persona.label}] 받은편지함 ${mails.length}통이 모두 기대한 칸으로 분류된다`, () => {
    const wrong = mails
      .map((m) => ({ m, r: classify(m, persona.profile) }))
      .filter(({ m, r }) => r.leaf !== m.expected)
      .map(({ m, r }) => `${m.subject}: 기대 ${m.expected}, 실제 ${r.leaf} (${r.reasons.join(' / ')})`);
    assert.deepEqual(wrong, []);
  });

  test(`[${persona.label}] 로직 트리 모든 칸에 샘플이 1통 이상 있다`, () => {
    const covered = new Set(mails.map((m) => m.expected));
    assert.deepEqual(Object.keys(LEAVES).filter((id) => !covered.has(id)), []);
    assert.ok(mails.length >= 70, `메일 ${mails.length}통`);
  });

  test(`[${persona.label}] 메일 id와 제목이 겹치지 않는다`, () => {
    assert.equal(new Set(mails.map((m) => m.id)).size, mails.length);
    assert.equal(new Set(mails.map((m) => m.subject)).size, mails.length);
  });
}

test('김신입 샘플 계정에는 메일이 약 280통 있다', () => {
  const n = sampleMails(NOW, 'sales').length;
  assert.ok(n >= 270 && n <= 290, `메일 ${n}통`);
});

test('급한 메일은 최근 받은 쪽에 모여 있다', () => {
  const mails = sampleMails(NOW, 'sales');
  const last = Math.max(...mails.map((m, i) => (m.expected.startsWith('mine_urgent') ? i : -1)));
  assert.ok(last < 80, `가장 오래된 급한 메일 위치 ${last}`);
});

test('사용자가 고친 분류(발신자 기준)를 우선 적용한다', () => {
  const persona = PERSONAS[0];
  const m = sampleMails(NOW, persona.id).find((x) => x.expected === 'promo_out_skip');
  const r = classify(m, persona.profile, { [m.from.email]: 'promo_out_like' });
  assert.equal(r.leaf, 'promo_out_like');
});

test('오발송 회신 초안은 발신자에게 RE: 제목으로 만든다', () => {
  const persona = PERSONAS[0];
  const m = sampleMails(NOW, persona.id).find((x) => x.expected === 'wrong_notify_title');
  const d = replyDraft(m, persona.profile);
  assert.equal(d.to, m.from.email);
  assert.ok(d.subject.startsWith('RE: '));
  assert.ok(d.body.includes('잘못 전달'));
});
