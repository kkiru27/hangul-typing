import test from 'node:test';
import assert from 'node:assert/strict';
import { toKeys, toUnits, objParticle } from '../js/hangul.js';
import { Judge } from '../js/judge.js';
import { STAGES, buildKeysRound, hasRiskyPair } from '../js/lessons.js';
import { keyFor, codesFor, ROWS } from '../js/layout.js';
import { ImeSim, typeAll } from './ime-sim.mjs';

test('글자 → 키 순서', () => {
  assert.deepEqual(toKeys('한'), ['ㅎ', 'ㅏ', 'ㄴ']);
  assert.deepEqual(toKeys('괜찮아'), ['ㄱ', 'ㅗ', 'ㅐ', 'ㄴ', 'ㅊ', 'ㅏ', 'ㄴ', 'ㅎ', 'ㅇ', 'ㅏ']);
  assert.deepEqual(toKeys('까'), ['ㄲ', 'ㅏ']);
  assert.deepEqual(toKeys('ㅘ'), ['ㅗ', 'ㅏ']);
  assert.deepEqual(toKeys('ㅀ'), ['ㄹ', 'ㅎ']);
  assert.deepEqual(toKeys('좋아, 고마워!'), [...'ㅈㅗㅎㅇㅏ', ',', ' ', ...'ㄱㅗㅁㅏㅇㅜㅓ', '!']);
  // 조합형 자모(ᄒ ᅡ ᆫ)로 들어와도 같게
  assert.deepEqual(toKeys('한'), ['ㅎ', 'ㅏ', 'ㄴ']);
});

test('글자 단위 구간', () => {
  const u = toUnits('하나');
  assert.deepEqual(u.map((x) => [x.ch, x.start, x.end]), [['하', 0, 2], ['나', 2, 4]]);
});

test('조사', () => {
  assert.equal(objParticle('ㄴ'), '을');
  assert.equal(objParticle('ㅏ'), '를');
});

// 입력기 흉내로 치는 동안 매 순간 입력칸 값을 판정기에 넣는다
function run(target, pressed) {
  const judge = new Judge(target);
  const ime = new ImeSim();
  const log = [];
  for (const k of pressed) {
    const text = ime.press(k);
    for (const ev of judge.update(toKeys(text))) log.push(ev.kind);
  }
  return { judge, log, text: ime.text };
}

test('ㅎ→하→한: 조합 중 글자를 오타로 보지 않는다', () => {
  assert.deepEqual(typeAll(['ㅎ', 'ㅏ', 'ㄴ']), ['ㅎ', '하', '한']);
  const { judge, log } = run('한', ['ㅎ', 'ㅏ', 'ㄴ']);
  assert.deepEqual(log, ['ok', 'ok', 'ok']);
  assert.equal(judge.done, true);
  assert.equal(judge.accuracy, 1);
});

test('도깨비불: 한+ㅏ → 하나', () => {
  assert.deepEqual(typeAll(['ㅎ', 'ㅏ', 'ㄴ', 'ㅏ']), ['ㅎ', '하', '한', '하나']);
  const { judge, log } = run('하나', ['ㅎ', 'ㅏ', 'ㄴ', 'ㅏ']);
  assert.deepEqual(log, ['ok', 'ok', 'ok', 'ok']);
  assert.equal(judge.done, true);
});

test('겹모음·겹받침·문장부호 문장', () => {
  const target = '괜찮아, 앉아요!';
  const { judge, log, text } = run(target, toKeys(target));
  assert.equal(text, target);
  assert.ok(log.every((k) => k === 'ok'));
  assert.equal(judge.done, true);
});

test('자리 연습 자모 나열(입력기가 마음대로 묶어도)', () => {
  const target = 'ㅁㄴㅇㄹㅎㅗㅓㅏㄹㅎㅗㅏㅁㅏㄴ';
  const { judge, log, text } = run(target, [...target]);
  assert.notEqual(text, target); // 화면 글자는 'ㅁㄴㅇㄹ호ㅓㅏㅀ…'처럼 다르게 묶인다
  assert.ok(log.every((k) => k === 'ok'), log.join(','));
  assert.equal(judge.done, true);
});

test('틀린 키 → Backspace로 지우고 다시', () => {
  // 목표 ㅁㄴ 인데 ㅁ 다음 ㅏ를 잘못 침 → '마'
  const judge = new Judge('ㅁㄴ');
  const ime = new ImeSim();
  assert.deepEqual(judge.update(toKeys(ime.press('ㅁ'))).map((e) => e.kind), ['ok']);
  const miss = judge.update(toKeys(ime.press('ㅏ')));
  assert.deepEqual(miss, [{ index: 1, key: 'ㅏ', expect: 'ㄴ', kind: 'miss' }]);
  assert.equal(judge.hasError, true);
  assert.equal(judge.nextKey, 'ㄴ');
  // 지우기 전에 또 치면 extra (한 번만 집계)
  assert.equal(judge.update(toKeys(ime.press('ㅇ')))[0].kind, 'extra');
  assert.equal(judge.mistakes, 1);
  judge.update(toKeys(ime.press('Backspace')));
  judge.update(toKeys(ime.press('Backspace')));
  assert.equal(judge.hasError, false);
  assert.equal(judge.update(toKeys(ime.press('ㄴ')))[0].kind, 'ok');
  assert.equal(judge.done, true);
  assert.equal(judge.correct, 2);
  assert.equal(judge.accuracy, 2 / 3);
  assert.deepEqual(judge.missByKey, { 'ㄴ': 1 });
});

test('Backspace가 글자 통째로 지우는 기기여도 다시 맞게 치면 이어진다', () => {
  const judge = new Judge('ㅁㅏㄴ');
  judge.update(['ㅁ']);
  judge.update(['ㅁ', 'ㅏ']);
  judge.update(['ㅁ', 'ㅏ', 'ㅇ']); // 틀림
  judge.update([]);                // '망' 통째로 삭제
  assert.deepEqual(judge.update(['ㅁ']).map((e) => e.kind), ['retype']);
  judge.update(['ㅁ', 'ㅏ']);
  assert.equal(judge.update(['ㅁ', 'ㅏ', 'ㄴ'])[0].kind, 'ok');
  assert.equal(judge.correct, 3);
  assert.equal(judge.mistakes, 1);
});

test('영문 키는 오타로 세지 않는다', () => {
  const judge = new Judge('ㅁㄴ');
  assert.equal(judge.update(['a'])[0].kind, 'latin');
  assert.equal(judge.mistakes, 0);
});

test('글자별 상태', () => {
  const judge = new Judge('하나');
  judge.update(['ㅎ', 'ㅏ', 'ㄴ']);
  assert.deepEqual(judge.unitStates(), ['done', 'typing']);
  judge.update(['ㅎ', 'ㅏ', 'ㅁ']);
  assert.deepEqual(judge.unitStates(), ['done', 'error']);
});

test('1단계 데이터: 기본자리 자모만, 합쳐질 수 있는 모음 짝 없음', () => {
  const stage = STAGES[0];
  for (const round of stage.rounds) {
    for (let t = 0; t < 200; t++) {
      const items = buildKeysRound(round);
      assert.equal(items.length, round.length);
      assert.ok(items.every((j) => stage.keys.includes(j)), items.join(''));
      assert.ok(!hasRiskyPair(items), items.join(''));
    }
  }
});

test('F65 배열: 줄마다 16칸, 67키, 자모마다 키가 있음', () => {
  for (const row of ROWS) assert.equal(row.reduce((s, k) => s + k.w, 0), 16);
  assert.equal(ROWS.flat().length, 67);
  for (const j of 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡㅃㅉㄸㄲㅆㅒㅖ') assert.ok(keyFor(j), j);
  assert.deepEqual(codesFor('ㅁ'), ['KeyA']);
  assert.deepEqual(codesFor('ㅃ'), ['ShiftRight', 'KeyQ']);
  assert.deepEqual(codesFor('?'), ['ShiftLeft', 'Slash']);
  assert.equal(keyFor('`'), null);
});
