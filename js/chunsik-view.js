// 춘식이: 이미지 세 장(서 있음, 고구마 먹음, 베개 안고 울음)을 말풍선과 몸짓(CSS 움직임)으로 살린다.
// 흰 배경은 tools/cutout.py로 가장자리에서만 지웠다 (코·베개·눈 반짝임·눈물은 보존).

export const POSES = {
  stand: 'img/chunsik.png?v=202610030913',
  goguma: 'img/chunsik-goguma.png?v=202610030913',
  sad: 'img/chunsik-sad.png?v=202610030913',
};

// 고구마 그림은 icons.js에 (예전 import 자리 그대로 쓸 수 있게 다시 내보냄)
export { GOGUMA_SVG } from './icons.js?v=202610030913';
import { FX } from './icons.js?v=202610030913';

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
    const fx = FX[kind];
    if (fx) {
      this.fx.innerHTML = fx;
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
