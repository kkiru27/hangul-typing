// 고구마 캐기: 구멍에서 고구마가 쏙 올라오면, 적힌 글자 키를 눌러 캔다. 낱말을 몰라도 되는 자리 익히기 게임.
// 게임 오버 없음. 시간이 지나면 고구마가 다시 쏙 들어간다(놓침). 경고 중·일시정지 중에는 멈춘다(pause).

import { GOGUMA_SVG } from './chunsik-view.js';

const HOLES = 8; // 2줄 × 4칸

export class DigGame {
  // keys: 나올 자모, stay: 올라와 있는 시간(ms), every: 다음 고구마까지(ms), max: 한 번에 올라와 있는 개수
  constructor(field, { keys, total = 16, stay = 4000, every = 1600, max = 1, onSpawn, onHit, onMiss, onEnd, rand = Math.random }) {
    this.field = field;
    this.keys = keys;
    this.total = total;
    this.stay = stay;
    this.every = every;
    this.max = max;
    this.onSpawn = onSpawn;
    this.onHit = onHit;
    this.onMiss = onMiss;
    this.onEnd = onEnd;
    this.rand = rand;
    this.active = [];   // 올라와 있는 고구마 { hole, key, born, el }
    this.spawned = 0;
    this.hits = 0;
    this.missed = 0;
    this.wrong = 0;
    this.paused = false;
    this.running = false;
    this.board = document.createElement('div');
    this.board.className = 'dig-board';
    this.holes = Array.from({ length: HOLES }, () => {
      const hole = document.createElement('div');
      hole.className = 'dig-hole';
      hole.innerHTML = `<div class="dig-sprout"><span class="dig-key"></span>${GOGUMA_SVG}</div>`;
      this.board.appendChild(hole);
      return hole;
    });
    field.appendChild(this.board);
  }

  get resolved() { return this.hits + this.missed; }

  start() {
    this.running = true;
    this.t = 0;              // 멈춘 시간을 뺀 게임 시간(ms)
    this.last = performance.now();
    this.nextAt = 500;
    this.frame = requestAnimationFrame((now) => this.#tick(now));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.board.remove();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  #tick(now) {
    if (!this.running) return;
    if (!this.paused) {
      this.t += Math.min(100, now - this.last); // 탭 전환 등으로 한참 멈췄다 돌아와도 한 번에 뛰지 않게
      for (const g of [...this.active]) if (this.t - g.born >= this.stay) this.#miss(g);
      this.#spawnIfDue();
    }
    this.last = now;
    if (this.spawned >= this.total && !this.active.length) {
      this.running = false;
      this.onEnd?.({ hits: this.hits, missed: this.missed, wrong: this.wrong, total: this.total });
      return;
    }
    this.frame = requestAnimationFrame((n) => this.#tick(n));
  }

  #spawnIfDue() {
    if (this.spawned >= this.total || this.t < this.nextAt || this.active.length >= this.max) return;
    const used = new Set(this.active.map((g) => g.hole));
    const free = this.holes.map((_, i) => i).filter((i) => !used.has(i));
    const hole = free[Math.floor(this.rand() * free.length)];
    const onScreen = new Set(this.active.map((g) => g.key));
    const choices = this.keys.filter((k) => !onScreen.has(k) && k !== this.lastKey);
    const key = choices[Math.floor(this.rand() * choices.length)] ?? this.keys[0];
    this.lastKey = key;
    const el = this.holes[hole];
    el.querySelector('.dig-key').textContent = key;
    el.classList.remove('hit', 'gone');
    el.classList.add('up');
    const g = { hole, key, born: this.t, el };
    this.active.push(g);
    this.spawned++;
    this.nextAt = this.t + this.every;
    this.onSpawn?.(g);
  }

  #remove(g, cls) {
    this.active = this.active.filter((x) => x !== g);
    g.el.classList.remove('up');
    g.el.classList.add(cls);
    // 같은 구멍에 다음 고구마가 올라오기 전에 효과만 지운다
    setTimeout(() => !this.active.some((x) => x.el === g.el) && g.el.classList.remove(cls), 450);
  }

  #miss(g) {
    this.missed++;
    this.#remove(g, 'gone');
    this.onMiss?.(g);
  }

  // 가장 먼저 올라온 고구마 (힌트용)
  oldest() {
    return this.active.reduce((a, g) => (!a || g.born < a.born ? g : a), null);
  }

  // 키 하나 누름: 그 글자 고구마가 있으면 캔다(먼저 올라온 것부터). 없으면 틀림
  press(key) {
    const g = this.active.filter((x) => x.key === key).sort((a, b) => a.born - b.born)[0];
    if (!g) {
      this.wrong++;
      return null;
    }
    this.hits++;
    this.#remove(g, 'hit');
    this.onHit?.(g);
    return g;
  }
}
