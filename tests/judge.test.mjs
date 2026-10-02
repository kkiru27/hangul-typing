import test from 'node:test';
import assert from 'node:assert/strict';
import { toKeys, toUnits, objParticle, josa, charName } from '../js/hangul.js';
import { markSeen, SEEN_MAX, gogumaFor, gogumaForTest, saveStageResult, suggestStage, gameWordStages, totalGoguma } from '../js/records.js';
import { Judge } from '../js/judge.js';
import { STAGES, GAMES, gameTitle, buildKeysRound, hasRiskyPair, stageChars, stageTitle, stageItems, freshOrder, itemsForRound } from '../js/lessons.js';
import { keyFor, codesFor, LAYOUTS, LAYOUT_IDS, DEFAULT_LAYOUT, getLayout, layoutKeys } from '../js/layout.js';
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
  assert.equal(objParticle('ㄲ'), '을');   // 쌍기역을
  assert.equal(josa('ㅒ', '은', '는'), '는'); // 얘는
  assert.equal(objParticle('1'), '을');   // 일을
  assert.equal(objParticle('2'), '를');   // 이를
  assert.equal(`${charName('?')}${objParticle('?')}`, '물음표를');
  assert.equal(josa('기본자리', '은', '는'), '는');
  assert.equal(josa('왼손 윗줄', '은', '는'), '은');
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

test('모든 단계 데이터: 판 길이, 쓰는 글자, 합쳐질 수 있는 짝 없음, 키 있음', () => {
  const ids = new Set();
  for (const stage of STAGES) {
    assert.ok(!ids.has(stage.id), `id 중복 ${stage.id}`);
    ids.add(stage.id);
    assert.ok(stage.name && stage.group && stage.tip, stage.id);
    if (stage.type === 'game') { assert.ok(stage.total > 0, stage.id); continue; }
    assert.ok(stage.rounds.length, stage.id);
    for (const ch of stageChars(stage)) assert.ok(keyFor(ch), `${stage.id}: ${ch} 키 없음`);
    if (stage.type !== 'keys') continue;
    for (const k of stage.keys) assert.ok(stageChars(stage).includes(k), `${stage.id}: ${k}를 연습하지 않음`);
    for (const round of stage.rounds) {
      const allowed = new Set([...(round.intro + round.pool).replace(/\s/g, '')]);
      assert.ok(!hasRiskyPair([...round.intro.replace(/\s/g, '')]), `${stage.id} intro: ${round.intro}`);
      assert.ok(round.intro.replace(/\s/g, '').length <= round.length, `${stage.id}: intro가 판보다 김`);
      assert.match(round.hello, /^.+ \(.+\)$/, `${stage.id}: 춘식이 말투 (해석) 형식`);
      for (let t = 0; t < 200; t++) {
        const items = buildKeysRound(round);
        assert.equal(items.length, round.length);
        assert.ok(items.every((j) => allowed.has(j)), items.join(''));
        assert.ok(!hasRiskyPair(items), `${stage.id}: ${items.join('')}`);
      }
    }
  }
});

test('단계 순서와 제목 (게임은 연습 단계와 따로)', () => {
  assert.equal(stageTitle(0), '1단계 · 기본자리');
  assert.equal(STAGES[1].type, 'words');
  assert.equal(stageTitle(1), '2단계 · 기본자리 낱말');
  assert.equal(stageTitle(2), '3단계 · 왼손 윗줄');
  assert.ok(STAGES.every((s) => s.type !== 'game'), '연습 단계에 게임 없음');
  assert.ok(GAMES.length && GAMES.every((g) => g.type === 'game' && g.total > 0 && g.name && g.tip), '게임 목록');
  assert.ok(GAMES.every((g) => !STAGES.some((s) => s.id === g.id)), '게임 id는 단계 id와 겹치지 않음 (기록을 같이 씀)');
  assert.equal(gameTitle(GAMES[0]), '게임 · 고구마 비');
  const at = (id) => stageTitle(STAGES.findIndex((s) => s.id === id));
  assert.equal(at('keys-number'), '9단계 · 숫자·부호');
  assert.equal(at('sentences-1'), '10단계 · 짧은 글');
  assert.equal(at('long-1'), '11단계 · 긴 글');
  assert.equal(at('test-1min'), '검정 · 1분 타자 검정');
});

test('긴 글은 이야기 순서대로 판마다 이어짐', () => {
  const stage = STAGES.find((s) => s.type === 'long');
  const parts = stage.rounds.map((_, i) => itemsForRound(stage.lines, stage, i));
  assert.deepEqual(parts.flat(), stage.lines);
});

test('게임 낱말: 해 본 단계까지의 낱말 단계만', () => {
  const idx = (id) => STAGES.findIndex((s) => s.id === id);
  const words = STAGES.filter((s) => s.type === 'words');
  const ids = (rec) => gameWordStages(STAGES, rec).map((s) => s.id);
  assert.deepEqual(ids({}), [words[0].id]);                                   // 처음: 첫 낱말 단계만
  assert.deepEqual(ids({ 'keys-home': { plays: 1 } }), [words[0].id]);        // 1단계만 해 봄
  assert.deepEqual(ids({ 'game-rain': { plays: 3 } }), [words[0].id]);        // 게임만 해 본 건 안 셈
  // Shift 단계까지 해 봄 → 그 앞의 낱말 단계들 (Shift 글자가 든 '모든 자리 낱말'은 빠짐)
  assert.deepEqual(ids({ 'keys-shift': { plays: 1 } }), words.filter((w) => STAGES.indexOf(w) < idx('keys-shift')).map((w) => w.id));
  assert.deepEqual(ids({ 'test-1min': { plays: 1 } }), words.map((w) => w.id)); // 검정까지 해 봤으면 모든 낱말
});

test('낱말 단계: 앞에서 배운 자리로만 칠 수 있는 낱말', () => {
  const learned = new Set([' ']);
  for (const stage of STAGES) {
    if (stage.type === 'keys') {
      for (const ch of stageChars(stage)) learned.add(ch);
      continue;
    }
    if (stage.type === 'sentences' || stage.type === 'long' || stage.type === 'test') {
      for (const t of stageItems(stage)) {
        const bad = toKeys(t).filter((k) => !learned.has(k));
        assert.deepEqual(bad, [], `${stage.id}: '${t}'에 아직 안 배운 키 ${bad.join(' ')}`);
        assert.match(t, /[.!?]$/, `${stage.id}: '${t}'는 문장부호로 끝나야 함`);
        assert.ok(!/\s\s|^\s|\s$/.test(t), `${stage.id}: '${t}' 띄어쓰기`);
      }
      assert.ok(stageItems(stage).length >= stage.rounds.reduce((n, r) => n + r.count, 0), '문장이 판보다 적음');
      continue;
    }
    if (stage.type !== 'words') continue;
    const words = Object.keys(stage.words);
    assert.ok(words.length >= 20, `${stage.id}: 낱말이 너무 적음`);
    for (const w of words) {
      const bad = toKeys(w).filter((k) => !learned.has(k));
      assert.deepEqual(bad, [], `${stage.id}: '${w}'에 아직 안 배운 키 ${bad.join(' ')}`);
    }
    for (const r of stage.rounds) {
      assert.ok(r.count > 0);
      assert.match(r.hello, /^.+ \(.+\)$/, `${stage.id}: 춘식이 말투`);
    }
  }
});

test('낱말 판 만들기: 섞은 순서를 판마다 이어서, 모자라면 처음부터', () => {
  const stage = STAGES.find((s) => s.type === 'words');
  const order = freshOrder(stageItems(stage));
  assert.equal(new Set(order).size, Object.keys(stage.words).length);
  const r0 = itemsForRound(order, stage, 0);
  const r1 = itemsForRound(order, stage, 1);
  assert.equal(r0.length, stage.rounds[0].count);
  assert.deepEqual(r1[0], order[stage.rounds[0].count]);
  assert.equal(new Set([...r0, ...r1]).size, r0.length + r1.length); // 앞 두 판은 겹치지 않음
  const all = stage.rounds.flatMap((_, i) => itemsForRound(order, stage, i));
  assert.ok(all.every(Boolean));
});

test('덜 본 것 먼저: 안 친 것 → 오래전에 친 것 순, 안 친 것끼리는 섞임', () => {
  const items = ['가', '나', '다', '라', '마'];
  const seen = { 가: 300, 나: 100 };
  const order = freshOrder(items, seen);
  assert.deepEqual(order.slice(3), ['나', '가'], '친 것은 뒤로, 오래된 것 먼저');
  assert.deepEqual(new Set(order.slice(0, 3)), new Set(['다', '라', '마']));
  const firsts = new Set();
  for (let i = 0; i < 30; i++) firsts.add(freshOrder(items, seen)[0]);
  assert.ok(firsts.size > 1, '안 친 것끼리는 매번 다른 순서');
  // 너무 많아지면 오래된 것부터 버린다 (노드에는 저장소가 없어도 동작)
  const big = {};
  for (let i = 0; i < SEEN_MAX + 5; i++) markSeen(big, `글${i}`, i);
  assert.ok(Object.keys(big).length <= SEEN_MAX && big[`글${SEEN_MAX + 4}`] != null && big['글0'] == null);
});

test('낱말 + 스페이스를 입력기 흉내로 판정 (스페이스가 조합을 끝냄)', () => {
  for (const w of ['할머니 ', '호랑이 ', '병아리 ', '춘식이 ', '떡 ']) {
    const { judge, log } = run(w, toKeys(w));
    assert.ok(log.every((k) => k === 'ok'), `${w}: ${log.join(',')}`);
    assert.equal(judge.done, true);
  }
  // 스페이스를 안 치고 다음 글자를 치면 틀림
  const { judge, log } = run('하마 ', [...toKeys('하마'), 'ㅇ']);
  assert.equal(log.at(-1), 'miss');
  assert.equal(judge.missByKey[' '], 1);
});

test('짧은 글·긴 글 문장을 입력기 흉내로 판정 (띄어쓰기·겹받침·쌍자음·문장부호)', () => {
  const lines = STAGES.filter((s) => s.type === 'sentences' || s.type === 'long').flatMap(stageItems);
  for (const t of lines) {
    const { judge, log, text } = run(t, toKeys(t));
    assert.equal(text, t);
    assert.ok(log.every((k) => k === 'ok'), `${t}: ${log.join(',')}`);
    assert.equal(judge.done, true);
  }
});

test('타수용 경과 시간', () => {
  const judge = new Judge('하');
  assert.equal(judge.elapsed(), 0);
  judge.update(['ㅎ']);
  judge.startedAt -= 3000;
  assert.ok(judge.elapsed() >= 3000);
  judge.update(['ㅎ', 'ㅏ']);
  const e = judge.elapsed();
  assert.equal(judge.elapsed(Date.now() + 99999), e); // 끝난 뒤에는 늘지 않음
});

test('Shift 글자·숫자·문장부호도 입력기 흉내로 판정', () => {
  const target = 'ㄲㄱㄲㅒㅐ12!?.,';
  const { judge, log } = run(target, [...target]);
  assert.ok(log.every((k) => k === 'ok'), log.join(','));
  assert.equal(judge.done, true);
});

test('고구마와 골라 둘 단계', () => {
  assert.equal(gogumaFor(null), 0);
  assert.equal(gogumaFor(0.69), 0);
  assert.equal(gogumaFor(0.7), 1);
  assert.equal(gogumaFor(0.85), 2);
  assert.equal(gogumaFor(0.95), 3);
  const rec = {};
  assert.equal(suggestStage(STAGES, rec), 0);      // 처음엔 1단계
  let r = saveStageResult(rec, STAGES[0].id, 0.6); // 저장소가 없어도(노드) 동작해야 함
  assert.deepEqual([r.goguma, r.firstClear, r.newBest], [0, false, false]);
  assert.equal(suggestStage(STAGES, rec), 0);      // 고구마 못 받음 → 같은 단계
  r = saveStageResult(rec, STAGES[0].id, 0.9);
  assert.deepEqual([r.goguma, r.firstClear, r.newBest], [2, true, true]);
  assert.equal(suggestStage(STAGES, rec), 1);      // 받음 → 다음 단계
  r = saveStageResult(rec, STAGES[0].id, 0.8); // 더 낮은 기록은 고구마를 줄이지 않음
  assert.deepEqual([r.goguma, r.firstClear, r.newBest], [1, false, false]);
  assert.equal(rec[STAGES[0].id].goguma, 2);
  assert.equal(rec[STAGES[0].id].plays, 3);
  assert.equal(totalGoguma(STAGES, rec), 2);
  // 검정: 타수와 정확도 둘 다
  assert.equal(gogumaForTest(1, 6), 0);      // 정확해도 너무 느리면 0
  assert.equal(gogumaForTest(1, 65), 2);
  assert.equal(gogumaForTest(0.8, 150), 1);  // 빨라도 부정확하면 낮은 쪽
  assert.equal(gogumaForTest(0.96, 120), 3);
  // 타수 최고 기록
  const r2 = {};
  saveStageResult(r2, 'x', 0.9, 80);
  const c = saveStageResult(r2, 'x', 0.9, 95);
  assert.deepEqual([c.newBestCpm, c.bestCpm], [true, 95]);
  const d = saveStageResult(r2, 'x', 0.9, 70);
  assert.deepEqual([d.newBestCpm, d.bestCpm], [false, 95]);
  // 가장 최근에 한 단계 기준 (앞 단계를 안 했어도 상관없음), 마지막 단계는 그대로
  assert.equal(suggestStage(STAGES, { [STAGES[0].id]: { goguma: 3, lastAt: 1 }, [STAGES[7].id]: { goguma: 0, lastAt: 2 } }), 7);
  assert.equal(suggestStage(STAGES, { [STAGES[5].id]: { goguma: 1, lastAt: 5 } }), 6);
  const lastI = STAGES.length - 1;
  assert.equal(suggestStage(STAGES, { [STAGES[lastI].id]: { goguma: 2, lastAt: 1 } }), lastI);
});

test('키보드 배열 3개: 줄 너비가 같고, 글자 키는 모두 같은 자리', () => {
  assert.deepEqual(LAYOUT_IDS, ['tkl', 'k380', 'f65']);
  assert.equal(DEFAULT_LAYOUT, 'tkl');
  const mainCodes = (L) => layoutKeys(L).filter((key) => key.jamo || key.symbol).map((key) => key.code).filter((c) => c !== 'Backquote');
  for (const L of Object.values(LAYOUTS)) {
    for (const row of L.rows) assert.equal(row.reduce((n, key) => n + key.w, 0), L.units, `${L.id} 줄 너비`);
    const codes = layoutKeys(L).map((key) => key.code);
    assert.equal(new Set(codes).size, codes.length, `${L.id}: 키 코드 중복 없음`);
    for (const c of ['Escape', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'Space', 'Enter', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      assert.ok(codes.includes(c), `${L.id}: ${c}`);
    }
    assert.deepEqual(mainCodes(L), mainCodes(LAYOUTS.tkl), `${L.id}: 글자·숫자·문장부호 키 순서가 표준과 같음`);
  }
  assert.equal(layoutKeys(LAYOUTS.tkl).length, 87, '표준 텐키리스 87키');
  assert.equal(layoutKeys(LAYOUTS.f65).length, 67, 'F65 67키');
  const has = (id, c) => layoutKeys(LAYOUTS[id]).some((key) => key.code === c);
  assert.ok(has('tkl', 'Home') && has('tkl', 'PrintScreen') && has('tkl', 'F12'), '표준: 편집키·기능키');
  assert.ok(LAYOUTS.k380.rows[0].fn && !has('k380', 'PageUp') && has('k380', 'Backquote'), 'K380: 작은 기능키 줄, PgUp 없음');
  assert.ok(!LAYOUTS.f65.rows.some((r) => r.fn) && !has('f65', 'F1') && has('f65', 'PageUp'), 'F65: 기능키 줄 없음');
  assert.equal(getLayout('없는배열').id, 'tkl', '모르는 배열이면 표준');
  for (const j of 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡㅃㅉㄸㄲㅆㅒㅖ') assert.ok(keyFor(j), j);
  assert.deepEqual(codesFor('ㅁ'), ['KeyA']);
  assert.deepEqual(codesFor('ㅃ'), ['ShiftRight', 'KeyQ']);
  assert.deepEqual(codesFor('?'), ['ShiftLeft', 'Slash']);
});
