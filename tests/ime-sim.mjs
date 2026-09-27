// 테스트용 두벌식 입력기 흉내. 키(자모)를 하나씩 넣으면 입력칸에 보일 문자열을 돌려준다.
// 실제 iOS 입력기와 100% 같다는 보장은 없다. 판정기가 "조합 중 상태"를 견디는지 보는 용도.

import { CHO, JUNG, JONG, COMPOUND, isVowel } from '../js/hangul.js';

const PAIR = {};
for (const [whole, [a, b]] of Object.entries(COMPOUND)) PAIR[a + b] = whole;
const NO_FINAL = new Set(['ㄸ', 'ㅃ', 'ㅉ']);

function render(cur) {
  if (!cur) return '';
  if (cur.cho && cur.jung) {
    const code = 0xac00 + (CHO.indexOf(cur.cho) * 21 + JUNG.indexOf(cur.jung)) * 28 + (cur.jong ? JONG.indexOf(cur.jong) : 0);
    return String.fromCharCode(code);
  }
  return cur.cho || cur.jung || '';
}

export class ImeSim {
  constructor() {
    this.committed = '';
    this.cur = null; // { cho, jung, jong, keys: [...] }
  }
  get text() { return this.committed + render(this.cur); }
  get composing() { return !!this.cur; }

  #commit() { this.committed += render(this.cur); this.cur = null; }

  press(k) {
    if (k === 'Backspace') return this.#backspace();
    const cur = this.cur;
    if (!/^[ㄱ-ㅣ]$/.test(k)) { this.#commit(); this.committed += k; return this.text; }

    if (!isVowel(k)) {
      if (!cur) this.cur = { cho: k, keys: [k] };
      else if (!cur.jung) {
        // 자음만 있는 상태: 겹자음(ㄳ 등)으로 묶이면 묶는다
        const pair = PAIR[cur.cho + k];
        if (pair && cur.keys.length === 1) { cur.cho = pair; cur.keys.push(k); }
        else { this.#commit(); this.cur = { cho: k, keys: [k] }; }
      } else if (!cur.cho) { this.#commit(); this.cur = { cho: k, keys: [k] }; }
      else if (!cur.jong) {
        if (NO_FINAL.has(k)) { this.#commit(); this.cur = { cho: k, keys: [k] }; }
        else { cur.jong = k; cur.keys.push(k); }
      } else {
        const pair = PAIR[cur.jong + k];
        if (pair && !COMPOUND[cur.jong]) { cur.jong = pair; cur.keys.push(k); }
        else { this.#commit(); this.cur = { cho: k, keys: [k] }; }
      }
    } else {
      if (!cur) this.cur = { jung: k, keys: [k] };
      else if (!cur.jung) {
        if (COMPOUND[cur.cho]) {
          // ㄳ + ㅏ → ㄱ 사
          const [a, b] = COMPOUND[cur.cho];
          this.committed += a;
          this.cur = { cho: b, jung: k, keys: [b, k] };
        } else { cur.jung = k; cur.keys.push(k); }
      } else if (!cur.jong) {
        const pair = PAIR[cur.jung + k];
        if (pair && !COMPOUND[cur.jung]) { cur.jung = pair; cur.keys.push(k); }
        else { this.#commit(); this.cur = { jung: k, keys: [k] }; }
      } else {
        // 도깨비불: 받침이 다음 글자 첫소리로 넘어간다 (한+ㅏ → 하나, 앉+ㅏ → 안자)
        let moved;
        if (COMPOUND[cur.jong]) { const [a, b] = COMPOUND[cur.jong]; cur.jong = a; moved = b; }
        else { moved = cur.jong; cur.jong = null; }
        cur.keys.pop();
        this.#commit();
        this.cur = { cho: moved, jung: k, keys: [moved, k] };
      }
    }
    return this.text;
  }

  // 조합 중이면 자모 하나씩 지운다 (맥·iOS 방식이라고 가정)
  #backspace() {
    if (this.cur) {
      const keys = this.cur.keys.slice(0, -1);
      this.cur = null;
      for (const k of keys) this.press(k);
      if (!keys.length) this.cur = null;
    } else {
      this.committed = [...this.committed].slice(0, -1).join('');
    }
    return this.text;
  }

  // 조합을 끝낸다 (스페이스/엔터/포커스 이동)
  commit() { this.#commit(); return this.text; }
}

// 키 목록을 차례로 넣으며 매 순간의 입력칸 문자열을 돌려준다.
export function typeAll(keys) {
  const ime = new ImeSim();
  return keys.map((k) => ime.press(k));
}
