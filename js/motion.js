// 움직임 한 번: Web Animations로 한다.
// 예전처럼 class를 뗐다 붙이며 다시 시작하면(void el.offsetWidth) 그때마다 화면 배치를 강제로 다시 계산해서 타자가 버벅일 수 있다.
// 기기의 '동작 줄이기'가 켜져 있으면 움직이지 않는다.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function play(el, keyframes, opts) {
  if (!el?.animate || reducedMotion()) return null;
  try { return el.animate(keyframes, opts); } catch { return null; } // 오래된 브라우저: 움직임 없이
}

// 같은 요소의 같은 이름 움직임은 앞의 것을 멈추고 처음부터
export function replay(el, name, [keyframes, opts]) {
  if (!el) return null;
  el._moves ??= {};
  el._moves[name]?.cancel();
  return (el._moves[name] = play(el, keyframes, opts));
}

const SPRING = 'cubic-bezier(.3,1.35,.55,1)';

// 자주 쓰는 움직임 [장면들, 설정]
export const MOVES = {
  // 춘식이: 맞음(깡충) · 틀림(흔들) · 끝(만세)
  hop: [[{ transform: 'none' }, { transform: 'scale(1.05, .92)', offset: .3 }, { transform: 'translateY(-16px) scale(.97, 1.04)', offset: .6 }, { transform: 'none' }], { duration: 340, easing: 'ease-out' }],
  oops: [[{ rotate: '0deg' }, { rotate: '-10deg', offset: .2 }, { rotate: '8deg', offset: .4 }, { rotate: '-6deg', offset: .6 }, { rotate: '3deg', offset: .8 }, { rotate: '0deg' }], { duration: 500, easing: 'ease-in-out' }],
  cheer: [[{ transform: 'none' }, { transform: 'translateY(-22px) rotate(-8deg)', offset: .25 }, { transform: 'none', offset: .5 }, { transform: 'translateY(-22px) rotate(8deg)', offset: .75 }, { transform: 'none' }], { duration: 800, iterations: 2, easing: 'ease-in-out' }],
  // 춘식이 옆 땀방울·반짝이: 나타났다 위로 사라짐
  fx: [[{ opacity: 0, transform: 'translateY(6px) scale(.6)' }, { opacity: 1, transform: 'none', offset: .25 }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 1000, easing: 'ease-out' }],
  // 말풍선·콤보: 톡 튀어나옴
  pop: [[{ scale: '.86' }, { scale: '1.05', offset: .7 }, { scale: '1' }], { duration: 300, easing: SPRING }],
  // 좌우로 흔들기 (translate를 써서 원래 transform(떠오름 등)과 겹쳐도 된다)
  shake: [[{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 350, easing: 'ease-in-out' }],
  // 화면이 바뀔 때 살짝 떠오르며 나타남
  enter: [[{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,.8,.24,1)' }],
};
