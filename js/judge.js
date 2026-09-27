// 입력 판정기.
// 입력칸의 "지금 상태 전체"를 키 순서 배열로 받아서, 이전 상태와 비교해 새로 눌린 키만 판정한다.
// - 조합 중인 글자('하' 치는 중의 'ㅎ')는 목표 키 순서의 앞부분과 맞으면 정답으로 본다.
// - 틀린 키는 입력칸에 남는다. 지워질 때까지(Backspace) 다음으로 넘어가지 않는다.
// - 정확도 = 맞게 친 키 / (맞게 친 키 + 틀린 키)
//   · 틀린 뒤 지우기 전에 더 친 키는 한 번만 센다 (초보가 연달아 틀려도 점수가 무너지지 않게)
//   · 지웠다가 다시 친 키는 두 번 세지 않는다

import { toKeys, toUnits } from './hangul.js?v=202609270917';

const LATIN = /^[A-Za-z]$/;

function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

export class Judge {
  constructor(targetText) {
    this.text = targetText;
    this.units = toUnits(targetText);
    this.target = toKeys(targetText);
    this.typed = [];
    this.okLen = 0;      // 목표와 앞부분이 일치하는 키 개수 (= 다음에 칠 위치)
    this.best = 0;       // 지금까지 도달한 가장 먼 위치 (재입력 중복 집계 방지)
    this.correct = 0;
    this.mistakes = 0;
    this.missByKey = {}; // 목표 키별 틀린 횟수
    this.startedAt = 0;
    this.finishedAt = 0;
  }

  get errLen() { return this.typed.length - this.okLen; }
  get hasError() { return this.errLen > 0; }
  get done() { return this.okLen >= this.target.length; }
  get nextKey() { return this.done ? null : this.target[this.okLen]; }

  get accuracy() {
    const total = this.correct + this.mistakes;
    return total ? this.correct / total : null;
  }

  // typed: 이번 판에 입력된 키 순서 전체. 새로 눌린 키마다 판정 결과를 돌려준다.
  // kind: 'ok'(맞음) | 'retype'(지웠다 다시 맞음) | 'miss'(틀림, 집계) | 'extra'(이미 틀린 뒤 더 침) | 'latin'(영문)
  update(typed) {
    const prev = this.typed;
    const from = commonPrefix(prev, typed);
    this.typed = typed.slice();
    this.okLen = commonPrefix(typed, this.target);

    const events = [];
    // from < prev.length 인 구간은 입력기가 기존 글자를 고쳐 쓴 것 → 새 키가 아니다
    for (let i = Math.max(from, prev.length); i < typed.length; i++) {
      const key = typed[i];
      const expect = i < this.target.length ? this.target[i] : null;
      let kind;
      if (i < this.okLen) {
        kind = i >= this.best ? 'ok' : 'retype';
        if (kind === 'ok') { this.correct++; this.best = i + 1; }
      } else if (LATIN.test(key)) {
        kind = 'latin';
      } else if (i === this.okLen) {
        kind = 'miss';
        this.mistakes++;
        if (expect) this.missByKey[expect] = (this.missByKey[expect] || 0) + 1;
      } else {
        kind = 'extra';
      }
      events.push({ index: i, key, expect, kind });
    }

    const now = Date.now();
    if (events.length && !this.startedAt) this.startedAt = now;
    if (this.done && !this.finishedAt) this.finishedAt = now;
    return events;
  }

  // 글자별 상태 (낱말·문장 화면용): 'done' | 'typing'(조합 중) | 'error' | 'pending'
  unitStates() {
    return this.units.map((u) => {
      if (u.end <= this.okLen && u.keys.length) return 'done';
      if (this.hasError && this.okLen >= u.start && this.okLen < u.end) return 'error';
      if (u.start < this.okLen) return 'typing';
      return 'pending';
    });
  }

  // 첫 키부터 지금(또는 끝낸 때)까지 걸린 시간(ms). 타수 계산용
  elapsed(now = Date.now()) {
    if (!this.startedAt) return 0;
    return (this.finishedAt || now) - this.startedAt;
  }

  result() {
    return {
      text: this.text,
      correct: this.correct,
      mistakes: this.mistakes,
      accuracy: this.accuracy,
      missByKey: { ...this.missByKey },
      ms: this.finishedAt && this.startedAt ? this.finishedAt - this.startedAt : 0,
    };
  }
}
