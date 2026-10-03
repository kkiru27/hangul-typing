// 춘식이 달리기: 낱말을 칠 때마다 춘식이가 달리고, 동물 친구는 정해진 빠르기(타수)로 달린다. 먼저 들어오면 이김.
// 이 파일은 달리기 길(트랙)과 시계만 맡는다. 낱말 판정은 app.js가 하고 setMe()로 춘식이 자리를 알려 준다.
// 동물은 첫 키를 친 뒤(go)부터 달린다. 멈춘 시간(경고·일시정지)은 빼고 잰다.

export class RaceGame {
  // totalKeys: 모든 낱말(스페이스 포함)을 치는 키 수, cpm: 동물 빠르기(1분에 치는 키 수)
  constructor(field, { rival, rivalName, totalKeys, cpm, onTick, onRivalWin }) {
    this.field = field;
    this.rivalMs = (totalKeys / cpm) * 60000; // 동물이 끝까지 가는 데 걸리는 시간
    this.onTick = onTick;
    this.onRivalWin = onRivalWin;
    this.t = 0;          // 첫 키부터 흐른 게임 시간(ms)
    this.started = false;
    this.paused = false;
    this.running = false;
    this.me = 0;
    this.el = document.createElement('div');
    this.el.className = 'race';
    this.el.innerHTML = `
      <div class="race-words"><div class="race-next"></div><div class="race-word"></div></div>
      <div class="race-track">
      <div class="race-lane me"><span class="race-name">춘식이</span>
        <span class="race-runner"><img src="img/chunsik.png?v=202610030913" alt="" draggable="false"></span></div>
      <div class="race-lane rival"><span class="race-name">${rivalName}</span>
        <span class="race-runner">${rival}</span></div>
      <div class="race-finish" aria-hidden="true"></div></div>`;
    field.appendChild(this.el);
    this.wordEl = this.el.querySelector('.race-word');   // 지금 칠 낱말 (app.js가 채움)
    this.nextEl = this.el.querySelector('.race-next');   // 남은 낱말들
    this.meEl = this.el.querySelector('.me .race-runner');
    this.rivalEl = this.el.querySelector('.rival .race-runner');
  }

  get rival() { return Math.min(1, this.t / this.rivalMs); }

  start() {
    this.running = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame((now) => this.#tick(now));
  }

  // 첫 키: 동물도 출발
  go() { this.started = true; }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.el.remove();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  // 춘식이 자리 (0 ~ 1)
  setMe(p) {
    this.me = Math.min(1, p);
    this.meEl.style.setProperty('--p', this.me);
  }

  // 춘식이가 먼저 들어옴: 시계를 멈춘다
  finish() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  #tick(now) {
    if (!this.running) return;
    if (this.started && !this.paused) this.t += Math.min(100, now - this.last);
    this.last = now;
    this.rivalEl.style.setProperty('--p', this.rival);
    this.onTick?.();
    if (this.rival >= 1) {
      this.running = false;
      this.onRivalWin?.();
      return;
    }
    this.frame = requestAnimationFrame((n) => this.#tick(n));
  }
}
