// AULA F65 (65%, 67키) 배열과 두벌식 자모, 손가락 배정.
// w = 키 너비(1 = 보통 키 한 칸). 한 줄 합계는 16칸.

// 두벌식: 키 코드 → [기본 자모, Shift 자모]
export const JAMO_BY_CODE = {
  KeyQ: ['ㅂ', 'ㅃ'], KeyW: ['ㅈ', 'ㅉ'], KeyE: ['ㄷ', 'ㄸ'], KeyR: ['ㄱ', 'ㄲ'], KeyT: ['ㅅ', 'ㅆ'],
  KeyY: ['ㅛ'], KeyU: ['ㅕ'], KeyI: ['ㅑ'], KeyO: ['ㅐ', 'ㅒ'], KeyP: ['ㅔ', 'ㅖ'],
  KeyA: ['ㅁ'], KeyS: ['ㄴ'], KeyD: ['ㅇ'], KeyF: ['ㄹ'], KeyG: ['ㅎ'],
  KeyH: ['ㅗ'], KeyJ: ['ㅓ'], KeyK: ['ㅏ'], KeyL: ['ㅣ'],
  KeyZ: ['ㅋ'], KeyX: ['ㅌ'], KeyC: ['ㅊ'], KeyV: ['ㅍ'], KeyB: ['ㅠ'], KeyN: ['ㅜ'], KeyM: ['ㅡ'],
};

// 문장부호·숫자: 키 코드 → [기본, Shift]  (` ~ 는 F65에서 Fn 조합이라 연습에서 뺀다)
const SYMBOL_BY_CODE = {
  Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'],
  Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
  Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
};

// 손가락: L/R + 5(새끼) 4(약지) 3(중지) 2(검지), T = 엄지
export const FINGER_BY_CODE = {
  Escape: 'L5', Digit1: 'L5', Tab: 'L5', KeyQ: 'L5', CapsLock: 'L5', KeyA: 'L5', ShiftLeft: 'L5', KeyZ: 'L5', ControlLeft: 'L5',
  Digit2: 'L4', KeyW: 'L4', KeyS: 'L4', KeyX: 'L4',
  Digit3: 'L3', KeyE: 'L3', KeyD: 'L3', KeyC: 'L3',
  Digit4: 'L2', Digit5: 'L2', KeyR: 'L2', KeyT: 'L2', KeyF: 'L2', KeyG: 'L2', KeyV: 'L2', KeyB: 'L2',
  Digit6: 'R2', Digit7: 'R2', KeyY: 'R2', KeyU: 'R2', KeyH: 'R2', KeyJ: 'R2', KeyN: 'R2', KeyM: 'R2',
  Digit8: 'R3', KeyI: 'R3', KeyK: 'R3', Comma: 'R3',
  Digit9: 'R4', KeyO: 'R4', KeyL: 'R4', Period: 'R4',
  Digit0: 'R5', Minus: 'R5', Equal: 'R5', Backspace: 'R5', KeyP: 'R5', BracketLeft: 'R5', BracketRight: 'R5',
  Backslash: 'R5', Semicolon: 'R5', Quote: 'R5', Enter: 'R5', Slash: 'R5', ShiftRight: 'R5',
  Space: 'T', AltLeft: 'T', AltRight: 'T',
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

// 화면에 그릴 배열. label: 영문 각인, 나머지 표시는 JAMO/SYMBOL 표에서 채운다.
export const ROWS = [
  [
    k('Escape', 1, { label: 'Esc' }),
    k('Digit1', 1), k('Digit2', 1), k('Digit3', 1), k('Digit4', 1), k('Digit5', 1),
    k('Digit6', 1), k('Digit7', 1), k('Digit8', 1), k('Digit9', 1), k('Digit0', 1),
    k('Minus', 1), k('Equal', 1),
    k('Backspace', 2, { label: 'Backspace', icon: '⌫' }),
    k('Delete', 1, { label: 'Del', nav: true }),
  ],
  [
    k('Tab', 1.5, { label: 'Tab' }),
    k('KeyQ', 1, { label: 'Q' }), k('KeyW', 1, { label: 'W' }), k('KeyE', 1, { label: 'E' }), k('KeyR', 1, { label: 'R' }),
    k('KeyT', 1, { label: 'T' }), k('KeyY', 1, { label: 'Y' }), k('KeyU', 1, { label: 'U' }), k('KeyI', 1, { label: 'I' }),
    k('KeyO', 1, { label: 'O' }), k('KeyP', 1, { label: 'P' }),
    k('BracketLeft', 1), k('BracketRight', 1),
    k('Backslash', 1.5),
    k('PageUp', 1, { label: 'PgUp', nav: true }),
  ],
  [
    k('CapsLock', 1.75, { label: 'Caps Lock', hint: '한/영' }),
    k('KeyA', 1, { label: 'A' }), k('KeyS', 1, { label: 'S' }), k('KeyD', 1, { label: 'D' }), k('KeyF', 1, { label: 'F', bump: true }),
    k('KeyG', 1, { label: 'G' }), k('KeyH', 1, { label: 'H' }), k('KeyJ', 1, { label: 'J', bump: true }), k('KeyK', 1, { label: 'K' }),
    k('KeyL', 1, { label: 'L' }),
    k('Semicolon', 1), k('Quote', 1),
    k('Enter', 2.25, { label: 'Enter', icon: '⏎' }),
    k('PageDown', 1, { label: 'PgDn', nav: true }),
  ],
  [
    k('ShiftLeft', 2.25, { label: 'Shift', icon: '⇧' }),
    k('KeyZ', 1, { label: 'Z' }), k('KeyX', 1, { label: 'X' }), k('KeyC', 1, { label: 'C' }), k('KeyV', 1, { label: 'V' }),
    k('KeyB', 1, { label: 'B' }), k('KeyN', 1, { label: 'N' }), k('KeyM', 1, { label: 'M' }),
    k('Comma', 1), k('Period', 1), k('Slash', 1),
    k('ShiftRight', 1.75, { label: 'Shift', icon: '⇧' }),
    k('ArrowUp', 1, { icon: '↑', nav: true }),
    k('End', 1, { label: 'End', nav: true }),
  ],
  [
    k('ControlLeft', 1.25, { label: 'Ctrl' }),
    k('MetaLeft', 1.25, { label: 'Win' }),
    k('AltLeft', 1.25, { label: 'Alt' }),
    k('Space', 6.25, { label: '스페이스' }),
    k('AltRight', 1.5, { label: 'Alt' }),
    k('Fn', 1.5, { label: 'Fn' }),
    k('ArrowLeft', 1, { icon: '←', nav: true }),
    k('ArrowDown', 1, { icon: '↓', nav: true }),
    k('ArrowRight', 1, { icon: '→', nav: true }),
  ],
];

for (const row of ROWS) {
  for (const key of row) {
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

// WASD 자리 (F65는 Fn+W로 이 네 키와 방향키가 서로 바뀐다)
export const WASD = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
export const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
