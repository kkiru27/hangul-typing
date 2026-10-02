// 키보드 위 손 모양 계산 (hands-view.js handShapes): 손가락 끝이 기본자리·목표 키에 가는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { handShapes } from '../js/hands-view.js';

// 보통 키보드처럼 줄마다 조금씩 밀린 격자 (키 한 칸 60px, 줄 간격 50px)
const U = 60, ROW = 50, KH = 44;
const ROWS = [
  [0, 'Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0'],
  [1.5, 'KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP'],
  [1.75, 'KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote'],
  [2.25, 'KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight'],
];
const keys = {};
ROWS.forEach(([off, codes], r) => codes.split(' ').forEach((c, i) => { keys[c] = { x: (off + i + 0.5) * U, y: (r + 0.5) * ROW }; }));
keys.ShiftLeft = { x: 1.1 * U, y: 3.5 * ROW };
keys.Space = { x: 7 * U, y: 4.5 * ROW };
const geo = { keys, u: U, row: ROW, kh: KH };
const finger = (hands, id) => hands.flatMap((h) => [...h.fingers, h.thumb]).find((f) => f.id === id);
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 0.5;
const onKey = (code) => ({ x: keys[code].x, y: keys[code].y + KH * 0.18 });

test('쉬는 손: 손가락 끝은 기본자리, 엄지는 스페이스바 줄', () => {
  const hands = handShapes(geo, []);
  assert.equal(hands.length, 2);
  for (const [id, code] of [['L5', 'KeyA'], ['L4', 'KeyS'], ['L3', 'KeyD'], ['L2', 'KeyF'], ['R2', 'KeyJ'], ['R3', 'KeyK'], ['R4', 'KeyL'], ['R5', 'Semicolon']]) {
    assert.ok(near(finger(hands, id).tip, onKey(code)), `${id} → ${code}`);
    assert.ok(finger(hands, id).knuckle.y > finger(hands, id).tip.y, `${id}: 손가락 마디는 끝보다 아래`);
  }
  for (const h of hands) assert.ok(Math.abs(h.thumb.tip.y - keys.Space.y) < KH, '엄지는 스페이스바 줄');
  assert.ok(hands.every((h) => [...h.fingers, h.thumb].every((f) => !f.active)), '쉴 때는 색칠된 손가락 없음');
});

test('쳐야 할 키: 그 손가락만 색칠되고 그 키로 뻗는다', () => {
  const hands = handShapes(geo, ['KeyR']);
  const f = finger(hands, 'L2');
  assert.ok(f.active && near(f.tip, onKey('KeyR')));
  assert.ok(near(finger(hands, 'L5').tip, onKey('KeyA')), '가까운 키면 손은 그대로');
  assert.equal(hands.flatMap((h) => [...h.fingers, h.thumb]).filter((x) => x.active).length, 1);
});

test('먼 키(숫자 줄)는 손 전체가 그쪽으로 옮겨 간다', () => {
  const rest = handShapes(geo, []);
  const hands = handShapes(geo, ['Digit1']);
  assert.ok(near(finger(hands, 'L5').tip, onKey('Digit1')), '새끼손가락 끝은 1');
  assert.ok(finger(hands, 'L3').tip.y < finger(rest, 'L3').tip.y, '같은 손 다른 손가락도 위로');
  assert.ok(near(finger(hands, 'R2').tip, onKey('KeyJ')), '다른 손은 그대로');
});

test('Shift 글자: 두 손가락 (반대 손 Shift + 글자)', () => {
  const hands = handShapes(geo, ['ShiftRight', 'KeyQ']);
  assert.ok(finger(hands, 'R5').active && near(finger(hands, 'R5').tip, onKey('ShiftRight')));
  assert.ok(finger(hands, 'L5').active && near(finger(hands, 'L5').tip, onKey('KeyQ')));
});

test('스페이스: 두 엄지', () => {
  const hands = handShapes(geo, ['Space']);
  assert.ok(hands.every((h) => h.thumb.active));
});
