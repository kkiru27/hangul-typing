// 고구마 비: 낱말이 적힌 고구마가 떨어진다. 낱말을 치고 스페이스바(또는 Enter)를 누르면 춘식이가 먹는다.
// 초보용: 게임 오버 없음, 천천히 떨어지고, 한 화면에 최대 3개.

import { toKeys } from './hangul.js?v=202609270905';
import { GOGUMA_SVG } from './chunsik-view.js?v=202609270905';

const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

export class RainGame {
  constructor(field, { words, total = 12, maxActive = 3, onSpawn, onCatch, onMiss, onEnd, rand = Math.random }) {
    this.field = field;
    this.total = total;
    this.maxActive = maxActive;
    this.onSpawn = onSpawn;
    this.onCatch = onCatch;
    this.onMiss = onMiss;
    this.onEnd = onEnd;
    this.rand = rand;
    this.pool = [...words];
    this.drops = [];
    this.spawned = 0;
    this.caught = 0;
    this.missed = 0;
    this.wrong = 0;
    this.paused = false;
    this.running = false;
    this.focus = null;
  }

  start() {
    this.running = true;
    this.t = 0;              // 멈춘 시간을 뺀 게임 시간(ms)
    this.last = performance.now();
    this.nextSpawnAt = 600;
    this.frame = requestAnimationFrame((now) => this.#tick(now));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    for (const d of this.drops) d.el.remove();
    this.drops = [];
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  get resolved() { return this.caught + this.missed; }

  #tick(now) {
    if (!this.running) return;
    if (!this.paused) {
      this.t += Math.min(100, now - this.last); // 탭 전환 등으로 한참 멈췄다 돌아와도 한 번에 뛰지 않게
      this.#spawnIfDue();
      this.#move();
    }
    this.last = now;
    if (this.spawned >= this.total && !this.drops.length) {
      this.running = false;
      this.onEnd?.({ caught: this.caught, missed: this.missed, wrong: this.wrong, total: this.total });
      return;
    }
    this.frame = requestAnimationFrame((n) => this.#tick(n));
  }

  #spawnIfDue() {
    if (this.spawned >= this.total || this.t < this.nextSpawnAt || this.drops.length >= this.maxActive) return;
    const progress = this.spawned / this.total;
    const word = this.#pickWord();
    const el = document.createElement('div');
    el.className = 'drop';
    el.innerHTML = `<span class="drop-word"></span>${GOGUMA_SVG}`;
    el.querySelector('.drop-word').textContent = word;
    this.field.appendChild(el);
    const drop = {
      word,
      keys: toKeys(word),
      el,
      born: this.t,
      dur: lerp(16000, 10000, progress), // 점점 빨라진다
      x: this.#pickX(el.offsetWidth),
      y: 0,
      h: el.offsetHeight,
    };
    this.drops.push(drop);
    this.spawned++;
    this.nextSpawnAt = this.t + lerp(5200, 3600, progress);
    this.onSpawn?.(drop);
  }

  // 화면에 이미 있는 낱말은 피해서 고른다
  #pickWord() {
    const onScreen = new Set(this.drops.map((d) => d.word));
    const choices = this.pool.filter((w) => !onScreen.has(w));
    const list = choices.length ? choices : this.pool;
    return list[Math.floor(this.rand() * list.length)];
  }

  // 다른 고구마와 겹치지 않게 가로 위치 고르기 (몇 번 뽑아서 가장 멀리 떨어진 곳)
  #pickX(w) {
    const max = Math.max(0, this.field.clientWidth - w);
    let best = this.rand() * max;
    let bestGap = -1;
    for (let i = 0; i < 8; i++) {
      const x = this.rand() * max;
      const gap = Math.min(Infinity, ...this.drops.map((d) => Math.abs(d.x - x)));
      if (gap > bestGap) { best = x; bestGap = gap; }
    }
    return best;
  }

  #move() {
    const ground = 26; // 땅 두께 (css .rain-ground와 같게)
    for (const d of [...this.drops]) {
      const p = (this.t - d.born) / d.dur;
      d.y = p * (this.field.clientHeight - ground - d.h); // 고구마 아래가 땅에 닿으면 놓침
      d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
      if (p >= 1) this.#miss(d);
    }
  }

  #remove(d) {
    this.drops = this.drops.filter((x) => x !== d);
    if (this.focus === d) this.focus = null;
  }

  #miss(d) {
    this.#remove(d);
    this.missed++;
    d.el.classList.add('missed');
    setTimeout(() => d.el.remove(), 700);
    this.onMiss?.(d);
  }

  // 친 키 순서로 시작하는 고구마 중 가장 아래(급한) 것. 아무것도 안 쳤으면 가장 아래 고구마.
  // 친 것과 맞는 고구마가 없으면 null
  pickFocus(typedKeys) {
    const match = this.drops.filter((d) => typedKeys.every((k, i) => d.keys[i] === k));
    const best = match.sort((a, b) => b.y - a.y)[0] || null;
    if (this.focus !== best) {
      this.focus?.el.classList.remove('focus');
      best?.el.classList.add('focus');
      this.focus = best;
    }
    return best;
  }

  // 낱말 내기: 맞는 고구마가 있으면 잡는다
  submit(word) {
    const d = this.drops.filter((x) => x.word === word).sort((a, b) => b.y - a.y)[0];
    if (!d) {
      this.wrong++;
      return null;
    }
    this.#remove(d);
    this.caught++;
    d.el.classList.add('caught');
    setTimeout(() => d.el.remove(), 500);
    this.onCatch?.(d);
    return d;
  }
}
