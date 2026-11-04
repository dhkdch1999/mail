// 실행: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, replyDraft } from '../js/classifier.js';
import { LEAVES } from '../js/tree.js';
import { SAMPLE_PROFILE, sampleMails } from '../js/sample.js';

const mails = sampleMails(new Date('2026-11-04T18:00:00+09:00'));

for (const m of mails) {
  test(`${m.expected} ← ${m.subject}`, () => {
    const r = classify(m, SAMPLE_PROFILE);
    assert.equal(r.leaf, m.expected, r.reasons.join(' / '));
    assert.ok(r.reasons.length > 0, '분류 근거가 있어야 함');
  });
}

test('모든 리프가 샘플로 최소 1건씩 검증된다', () => {
  const covered = new Set(mails.map((m) => m.expected));
  const missing = Object.keys(LEAVES).filter((id) => !covered.has(id));
  assert.deepEqual(missing, []);
});

test('사용자가 고친 분류(발신자 기준)를 우선 적용한다', () => {
  const m = mails.find((x) => x.expected === 'promo_out_skip');
  const r = classify(m, SAMPLE_PROFILE, { [m.from.email]: 'promo_out_like' });
  assert.equal(r.leaf, 'promo_out_like');
});

test('오발송 회신 초안은 발신자에게 RE: 제목으로 만든다', () => {
  const m = mails.find((x) => x.expected === 'wrong_notify_title');
  const d = replyDraft(m, SAMPLE_PROFILE);
  assert.equal(d.to, m.from.email);
  assert.ok(d.subject.startsWith('RE: '));
  assert.ok(d.body.includes('잘못 전달'));
});
