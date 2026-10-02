// 춘식이: 이미지 세 장(서 있음, 고구마 먹음, 베개 안고 울음)을 말풍선과 몸짓(CSS 움직임)으로 살린다.
// 흰 배경은 tools/cutout.py로 가장자리에서만 지웠다 (코·베개·눈 반짝임·눈물은 보존).

export const POSES = {
  stand: 'img/chunsik.png',
  goguma: 'img/chunsik-goguma.png',
  sad: 'img/chunsik-sad.png',
};

// 고구마 (직접 그린 그림)
export const GOGUMA_SVG = `
<svg viewBox="0 0 64 44" class="goguma" aria-label="고구마">
  <path d="M14 30 C8 22 16 10 32 9 C47 8 58 16 56 25 C54 34 42 38 29 37 C22 36 17 34 14 30 Z"
        fill="#b8477a" stroke="#6e2346" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M22 17 q3 -2 6 -1 M36 28 q3 1 5 -1 M42 16 q2 1 3 3" stroke="#e58bb0" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M56 24 q6 -1 7 -5" stroke="#6e2346" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M14 29 C8 28 4 22 6 16 C10 19 13 22 14 29 Z" fill="#5fb345" stroke="#2f6b22" stroke-width="2" stroke-linejoin="round"/>
  <path d="M15 28 C12 21 13 14 18 10 C19 16 18 22 15 28 Z" fill="#7bc95e" stroke="#2f6b22" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

export class Chunsik {
  constructor(el, { size = 'm', pose = 'stand' } = {}) {
    this.el = el;
    el.classList.add('chunsik', `cs-${size}`);
    el.innerHTML = `
      <div class="cs-bubble" hidden></div>
      <div class="cs-body">
        <img class="cs-img" src="${POSES[pose]}" alt="춘식이" draggable="false">
        <span class="cs-fx"></span>
      </div>`;
    this.bubble = el.querySelector('.cs-bubble');
    this.img = el.querySelector('.cs-img');
    this.fx = el.querySelector('.cs-fx');
    el.dataset.pose = pose;
  }

  pose(name) {
    const src = POSES[name];
    if (!this.img.src.endsWith(src)) this.img.src = src;
    this.el.dataset.pose = name;
  }

  // 말풍선. '춘춘! (좋아!)'처럼 괄호 앞은 춘식이 말, 괄호 안은 해석으로 나눠 보여 준다.
  // tone: '' | 'bad' | 'good' | 'warn'
  say(text, tone = '') {
    const b = this.bubble;
    b.hidden = !text;
    if (!text || (b.dataset.text === text && b.dataset.tone === tone)) return;
    b.dataset.text = text;
    b.dataset.tone = tone;
    const m = text.match(/^(.*?)\s*(\(.*\))$/s);
    if (m) {
      const meow = Object.assign(document.createElement('b'), { className: 'cs-meow', textContent: m[1] });
      const trans = Object.assign(document.createElement('span'), { className: 'cs-trans', textContent: m[2] });
      b.replaceChildren(meow, trans);
    } else {
      b.textContent = text;
    }
    restart(b, 'pop');
  }

  // 한 번 하는 몸짓: 'hop'(맞음) | 'oops'(틀림) | 'cheer'(끝)
  act(kind) {
    this.img.classList.remove('hop', 'oops', 'cheer');
    restart(this.img, kind);
    const fx = { oops: '💦', cheer: '✨' }[kind];
    if (fx) {
      this.fx.textContent = fx;
      restart(this.fx, 'show');
    }
  }

  // 계속하는 움직임: 'party'(신나서 들썩) | null(살랑살랑)
  mood(kind) {
    this.el.classList.toggle('party', kind === 'party');
  }
}

function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // 애니메이션 처음부터 다시
  el.classList.add(cls);
}
