// 키보드 배열(표준 텐키리스 · 75% K380 · 65% F65)과 두벌식 자모, 손가락 배정.
// 글자 키 부분은 세 배열 모두 같다(보통 키보드, 미국식 배열). 다른 건 기능키 줄·방향키·편집키 자리뿐.
// w = 키 너비(1 = 보통 키 한 칸). 배열마다 한 줄 합계가 units칸으로 같다 (빈 칸은 gap).

// 두벌식: 키 코드 → [기본 자모, Shift 자모]
export const JAMO_BY_CODE = {
  KeyQ: ['ㅂ', 'ㅃ'], KeyW: ['ㅈ', 'ㅉ'], KeyE: ['ㄷ', 'ㄸ'], KeyR: ['ㄱ', 'ㄲ'], KeyT: ['ㅅ', 'ㅆ'],
  KeyY: ['ㅛ'], KeyU: ['ㅕ'], KeyI: ['ㅑ'], KeyO: ['ㅐ', 'ㅒ'], KeyP: ['ㅔ', 'ㅖ'],
  KeyA: ['ㅁ'], KeyS: ['ㄴ'], KeyD: ['ㅇ'], KeyF: ['ㄹ'], KeyG: ['ㅎ'],
  KeyH: ['ㅗ'], KeyJ: ['ㅓ'], KeyK: ['ㅏ'], KeyL: ['ㅣ'],
  KeyZ: ['ㅋ'], KeyX: ['ㅌ'], KeyC: ['ㅊ'], KeyV: ['ㅍ'], KeyB: ['ㅠ'], KeyN: ['ㅜ'], KeyM: ['ㅡ'],
};

// 문장부호·숫자: 키 코드 → [기본, Shift]
const SYMBOL_BY_CODE = {
  Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'],
  Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
  Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
};

// 손가락: L/R + 5(새끼) 4(약지) 3(중지) 2(검지), T = 엄지
export const FINGER_BY_CODE = {
  Escape: 'L5', Backquote: 'L5', Digit1: 'L5', Tab: 'L5', KeyQ: 'L5', CapsLock: 'L5', KeyA: 'L5', ShiftLeft: 'L5', KeyZ: 'L5', ControlLeft: 'L5',
  Digit2: 'L4', KeyW: 'L4', KeyS: 'L4', KeyX: 'L4',
  Digit3: 'L3', KeyE: 'L3', KeyD: 'L3', KeyC: 'L3',
  Digit4: 'L2', Digit5: 'L2', KeyR: 'L2', KeyT: 'L2', KeyF: 'L2', KeyG: 'L2', KeyV: 'L2', KeyB: 'L2',
  Digit6: 'R2', Digit7: 'R2', KeyY: 'R2', KeyU: 'R2', KeyH: 'R2', KeyJ: 'R2', KeyN: 'R2', KeyM: 'R2',
  Digit8: 'R3', KeyI: 'R3', KeyK: 'R3', Comma: 'R3',
  Digit9: 'R4', KeyO: 'R4', KeyL: 'R4', Period: 'R4',
  Digit0: 'R5', Minus: 'R5', Equal: 'R5', Backspace: 'R5', KeyP: 'R5', BracketLeft: 'R5', BracketRight: 'R5',
  Backslash: 'R5', Semicolon: 'R5', Quote: 'R5', Enter: 'R5', Slash: 'R5', ShiftRight: 'R5',
  Space: 'T',
};

export const FINGER_NAMES = {
  L5: '왼손 새끼손가락', L4: '왼손 약지', L3: '왼손 중지', L2: '왼손 검지',
  R2: '오른손 검지', R3: '오른손 중지', R4: '오른손 약지', R5: '오른손 새끼손가락',
  T: '엄지손가락',
};

// 손가락 → 색 계열 (양손 같은 손가락은 같은 색)
export function fingerTone(finger) {
  if (!finger) return 'none';
  if (finger === 'T') return 'thumb';
  return { 5: 'pinky', 4: 'ring', 3: 'middle', 2: 'index' }[finger[1]];
}

const k = (code, w, extra = {}) => ({ code, w, ...extra });
const gap = (w) => ({ code: '', w, gap: true });   // 키 사이 빈 칸
const nav = (code, w, label, extra = {}) => k(code, w, { label, nav: true, ...extra });
const fkeys = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => nav(`F${from + i}`, 1, `F${from + i}`));
const fnRow = (keys) => Object.assign(keys, { fn: true }); // 기능키 줄 (반 칸 높이로 작게)

// 글자 키 부분 (세 배열 공통)
const digits = () => [
  k('Digit1', 1), k('Digit2', 1), k('Digit3', 1), k('Digit4', 1), k('Digit5', 1),
  k('Digit6', 1), k('Digit7', 1), k('Digit8', 1), k('Digit9', 1), k('Digit0', 1),
  k('Minus', 1), k('Equal', 1),
  k('Backspace', 2, { label: 'Backspace', icon: '⌫' }),
];
const topRow = () => [
  k('Tab', 1.5, { label: 'Tab' }),
  ...'QWERTYUIOP'.split('').map((c) => k(`Key${c}`, 1, { label: c })),
  k('BracketLeft', 1), k('BracketRight', 1),
  k('Backslash', 1.5),
];
const homeRow = () => [
  k('CapsLock', 1.75, { label: 'Caps Lock', hint: '한/영' }),
  ...'ASDFGHJKL'.split('').map((c) => k(`Key${c}`, 1, { label: c, bump: c === 'F' || c === 'J' })),
  k('Semicolon', 1), k('Quote', 1),
  k('Enter', 2.25, { label: 'Enter', icon: '⏎' }),
];
const shiftRow = (rightShift) => [
  k('ShiftLeft', 2.25, { label: 'Shift', icon: '⇧' }),
  ...'ZXCVBNM'.split('').map((c) => k(`Key${c}`, 1, { label: c })),
  k('Comma', 1), k('Period', 1), k('Slash', 1),
  k('ShiftRight', rightShift, { label: 'Shift', icon: '⇧' }),
];
const arrow = (code, icon) => k(code, 1, { icon, nav: true });

export const LAYOUTS = {
  // 표준: 숫자패드 없는 보통 키보드 (87키). 기능키 줄 · 편집키 6개 · 방향키 역T
  tkl: {
    id: 'tkl', name: '표준', note: '텐키리스', units: 18.25,
    rows: [
      fnRow([k('Escape', 1, { label: 'Esc' }), gap(1), ...fkeys(1, 4), gap(0.5), ...fkeys(5, 8), gap(0.5), ...fkeys(9, 12),
        gap(0.25), nav('PrintScreen', 1, 'PrtSc'), nav('ScrollLock', 1, 'ScrLk'), nav('Pause', 1, 'Pause')]),
      [k('Backquote', 1), ...digits(), gap(0.25), nav('Insert', 1, 'Ins'), nav('Home', 1, 'Home'), nav('PageUp', 1, 'PgUp')],
      [...topRow(), gap(0.25), nav('Delete', 1, 'Del'), nav('End', 1, 'End'), nav('PageDown', 1, 'PgDn')],
      [...homeRow(), gap(3.25)],
      [...shiftRow(2.75), gap(1.25), arrow('ArrowUp', '↑'), gap(1)],
      [
        k('ControlLeft', 1.25, { label: 'Ctrl' }), k('MetaLeft', 1.25, { label: 'Win' }), k('AltLeft', 1.25, { label: 'Alt' }),
        k('Space', 6.25, { label: '스페이스' }),
        k('AltRight', 1.25, { label: 'Alt' }), k('MetaRight', 1.25, { label: 'Win' }), k('ContextMenu', 1.25, { label: 'Menu' }),
        k('ControlRight', 1.25, { label: 'Ctrl' }),
        gap(0.25), arrow('ArrowLeft', '←'), arrow('ArrowDown', '↓'), arrow('ArrowRight', '→'),
      ],
    ],
  },
  // 75%: 로지텍 K380 모양. 작은 기능키 줄(esc ~ del), 아래 줄 오른쪽에 작은 방향키(↑↓는 위아래 반 칸)
  k380: {
    id: 'k380', name: '75%', note: 'K380', units: 15,
    rows: [
      fnRow([k('Escape', 1, { label: 'esc' }), ...fkeys(1, 12), nav('Insert', 1, 'ins'), nav('Delete', 1, 'del')]),
      [k('Backquote', 1), ...digits()],
      topRow(),
      homeRow(),
      shiftRow(2.75),
      [
        k('ControlLeft', 1, { label: 'ctrl' }), k('Fn', 1, { label: 'fn' }), k('AltLeft', 1, { label: 'opt' }),
        k('MetaLeft', 1.25, { label: 'cmd' }), k('Space', 5.5, { label: '스페이스' }), k('MetaRight', 1.25, { label: 'cmd' }),
        k('AltRight', 1, { label: 'opt' }),
        arrow('ArrowLeft', '←'),
        k('ArrowStack', 1, { stack: [arrow('ArrowUp', '↑'), arrow('ArrowDown', '↓')] }),
        arrow('ArrowRight', '→'),
      ],
    ],
  },
  // 65%: AULA F65 모양. 기능키 줄 없음(Esc가 1 왼쪽), 오른쪽에 편집키 한 줄, 방향키
  f65: {
    id: 'f65', name: '65%', note: 'F65', units: 16,
    rows: [
      [k('Escape', 1, { label: 'Esc' }), ...digits(), nav('Delete', 1, 'Del')],
      [...topRow(), nav('PageUp', 1, 'PgUp')],
      [...homeRow(), nav('PageDown', 1, 'PgDn')],
      [...shiftRow(1.75), arrow('ArrowUp', '↑'), nav('End', 1, 'End')],
      [
        k('ControlLeft', 1.25, { label: 'Ctrl' }), k('MetaLeft', 1.25, { label: 'Win' }), k('AltLeft', 1.25, { label: 'Alt' }),
        k('Space', 6.25, { label: '스페이스' }), k('AltRight', 1.5, { label: 'Alt' }), k('Fn', 1.5, { label: 'Fn' }),
        arrow('ArrowLeft', '←'), arrow('ArrowDown', '↓'), arrow('ArrowRight', '→'),
      ],
    ],
  },
};
export const LAYOUT_IDS = Object.keys(LAYOUTS);
export const DEFAULT_LAYOUT = 'tkl';

export function getLayout(id) {
  return LAYOUTS[id] || LAYOUTS[DEFAULT_LAYOUT];
}

// 화면에 그려지는 키 하나하나 (↑↓처럼 한 칸에 두 개 있는 키도 따로, 빈 칸은 빼고)
export function layoutKeys(layout) {
  return layout.rows.flat().flatMap((key) => key.stack || [key]).filter((key) => !key.gap);
}

for (const layout of Object.values(LAYOUTS)) {
  for (const key of layoutKeys(layout)) {
    key.jamo = JAMO_BY_CODE[key.code] || null;
    key.symbol = SYMBOL_BY_CODE[key.code] || null;
    key.finger = FINGER_BY_CODE[key.code] || null;
  }
}

// 글자(키 하나) → { code, shift }
const CHAR_TO_KEY = new Map();
for (const [code, [base, shifted]] of Object.entries({ ...JAMO_BY_CODE, ...SYMBOL_BY_CODE })) {
  CHAR_TO_KEY.set(base, { code, shift: false });
  if (shifted) CHAR_TO_KEY.set(shifted, { code, shift: true });
}
CHAR_TO_KEY.set(' ', { code: 'Space', shift: false });

// 키 이름 (안내 카드의 "F 자리", "Shift + R" 같은 글자)
export const KEY_LABEL = {};
for (const layout of Object.values(LAYOUTS)) {
  for (const key of layoutKeys(layout)) KEY_LABEL[key.code] = key.symbol ? key.symbol[0] : key.label || key.code;
}
KEY_LABEL.Space = '스페이스';

export function keyFor(char) {
  return CHAR_TO_KEY.get(char) || null;
}

// 이 글자를 치려면 눌러야 하는 키들. Shift는 반대 손 Shift를 쓴다.
export function codesFor(char) {
  const key = keyFor(char);
  if (!key) return [];
  if (!key.shift) return [key.code];
  const hand = (FINGER_BY_CODE[key.code] || 'L')[0];
  return [hand === 'L' ? 'ShiftRight' : 'ShiftLeft', key.code];
}
