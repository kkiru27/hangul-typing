// 입력칸 다리(input-bridge.js): 일시정지 동안 들어온 글자를 판정에 넘기지 않고, 다시 시작할 때 되돌리는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { InputBridge } from '../js/input-bridge.js';

// 입력칸 흉내: value와 이벤트만
class FakeInput {
  constructor() { this.value = ''; this.handlers = {}; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  fire(type) { for (const fn of this.handlers[type] || []) fn(); }
  type(value, composing = false) {
    if (composing) this.fire('compositionstart');
    this.value = value;
    this.fire('input');
  }
  endComposition() { this.fire('compositionend'); }
}

function setup() {
  const el = new FakeInput();
  const seen = [];
  const bridge = new InputBridge(el, { onChange: (c) => seen.push(c) });
  return { el, bridge, seen };
}

test('멈춘 동안 친 글자는 판정에 안 넘기고, 다시 시작하면 멈춘 때 값으로', () => {
  const { el, bridge, seen } = setup();
  el.type('하');
  assert.equal(seen.at(-1).raw, '하');
  bridge.hold();
  el.type('하ㅋㅋ');
  assert.equal(seen.at(-1).raw, '하', '멈춘 동안은 알리지 않음');
  bridge.release();
  assert.equal(el.value, '하', '멈춘 때 값으로 되돌림');
  assert.deepEqual(seen.at(-1).keys, ['ㅎ', 'ㅏ']);
  el.type('하나');
  assert.deepEqual(seen.at(-1).keys, ['ㅎ', 'ㅏ', 'ㄴ', 'ㅏ'], '다시 시작한 뒤에는 그대로 판정');
});

test('아무것도 안 쳤으면 그대로 이어서 (조합 중이어도)', () => {
  const { el, bridge, seen } = setup();
  el.type('ㅎ', true); // 조합 중에 멈춤
  const n = seen.length;
  bridge.hold();
  bridge.release();
  assert.equal(el.value, 'ㅎ');
  assert.equal(seen.length, n, '바뀐 게 없으면 알리지 않음');
  el.type('하', false);
  assert.deepEqual(seen.at(-1).keys, ['ㅎ', 'ㅏ']);
});

test('다시 시작할 때 조합 중이면 값을 건드리지 않고 들어온 글자를 넘긴다 (Backspace로 지우게)', () => {
  const { el, bridge, seen } = setup();
  el.type('하');
  bridge.hold();
  el.type('하ㅋ', true);
  bridge.release();
  assert.equal(el.value, '하ㅋ', '조합 중에는 값을 고치지 않음 (iOS 글자 겹침)');
  assert.deepEqual(seen.at(-1).keys, ['ㅎ', 'ㅏ', 'ㅋ']);
});

test('멈춘 채로 새 판을 시작하면(rebase) 멈춤이 풀린다', () => {
  const { el, bridge, seen } = setup();
  el.type('하');
  bridge.hold();
  bridge.rebase();
  assert.equal(el.value, '');
  el.type('ㅁ');
  assert.equal(seen.at(-1).raw, 'ㅁ');
});
