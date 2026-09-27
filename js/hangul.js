// 한글 글자를 "실제로 누르는 키 순서"의 자모 배열로 푼다.
//   '한'  → ['ㅎ','ㅏ','ㄴ']
//   '괜'  → ['ㄱ','ㅗ','ㅐ','ㄴ']      (ㅙ = ㅗ + ㅐ 두 번 누름)
//   '앉'  → ['ㅇ','ㅏ','ㄴ','ㅈ']      (ㄵ = ㄴ + ㅈ)
//   '까'  → ['ㄲ','ㅏ']               (ㄲ은 Shift+ㄱ 한 번)
// 키 순서는 입력기가 글자를 어떻게 묶든(ㅎ→하→한, 한+ㅏ→하나) 흔들리지 않는다.
// 그래서 판정은 "화면 글자"가 아니라 이 키 순서로 비교한다.

const S_BASE = 0xac00;
const S_LAST = 0xd7a3;

export const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 두 번 눌러 만드는 겹모음·겹받침
export const COMPOUND = {
  'ㅘ': ['ㅗ', 'ㅏ'], 'ㅙ': ['ㅗ', 'ㅐ'], 'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'], 'ㅞ': ['ㅜ', 'ㅔ'], 'ㅟ': ['ㅜ', 'ㅣ'], 'ㅢ': ['ㅡ', 'ㅣ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const VOWELS = new Set(JUNG);

export function isSyllable(ch) {
  const c = ch.codePointAt(0);
  return c >= S_BASE && c <= S_LAST;
}

// 호환 자모(ㄱ~ㅣ, U+3131~U+3163)
export function isJamo(ch) {
  const c = ch.codePointAt(0);
  return c >= 0x3131 && c <= 0x3163;
}

export function isVowel(jamo) {
  return VOWELS.has(jamo);
}

export function isHangul(ch) {
  return isSyllable(ch) || isJamo(ch);
}

// 조합형 자모(U+1100대)가 섞여 들어오면 호환 자모로 바꾼다.
function toCompatJamo(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x1100 && c <= 0x1112) return CHO[c - 0x1100];
  if (c >= 0x1161 && c <= 0x1175) return JUNG[c - 0x1161];
  if (c >= 0x11a8 && c <= 0x11c2) return JONG[c - 0x11a8 + 1];
  if (c === 0x115f || c === 0x1160 || c === 0x3164) return ''; // 채움 문자
  return ch;
}

function splitJamo(jamo) {
  return COMPOUND[jamo] ? [...COMPOUND[jamo]] : [jamo];
}

// 글자 하나 → 키 순서 배열
export function charToKeys(ch) {
  const c = toCompatJamo(ch);
  if (c === '') return [];
  if (isSyllable(c)) {
    const idx = c.codePointAt(0) - S_BASE;
    const cho = CHO[Math.floor(idx / 588)];
    const jung = JUNG[Math.floor((idx % 588) / 28)];
    const jong = JONG[idx % 28];
    return [cho, ...splitJamo(jung), ...(jong ? splitJamo(jong) : [])];
  }
  if (isJamo(c)) return splitJamo(c);
  return [c];
}

// 문자열 → 키 순서 배열
export function toKeys(text) {
  const out = [];
  for (const ch of text.normalize('NFC')) out.push(...charToKeys(ch));
  return out;
}

// 목표 문장을 글자 단위로 나누고, 각 글자가 키 순서에서 차지하는 구간을 붙인다.
// (나중에 낱말·문장 연습에서 글자별로 색칠할 때 쓴다)
export function toUnits(text) {
  const units = [];
  let pos = 0;
  for (const ch of text.normalize('NFC')) {
    const keys = charToKeys(ch);
    units.push({ ch, keys, start: pos, end: pos + keys.length });
    pos += keys.length;
  }
  return units;
}

// 글자를 말로 읽을 때 쓰는 이름 (문장부호는 이름으로)
const PUNCT_NAME = { '.': '마침표', ',': '쉼표', '?': '물음표', '!': '느낌표', ' ': '스페이스' };
const DIGIT_READ = { 0: '영', 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구' };

export function charName(ch) {
  return PUNCT_NAME[ch] || ch;
}

// 읽었을 때 받침으로 끝나는지 (자음 이름 니은·리을…은 모두 받침으로 끝남, 숫자는 일·이·삼…으로 읽음)
function endsWithBatchim(ch) {
  const word = PUNCT_NAME[ch] || DIGIT_READ[ch] || ch;
  const last = word[word.length - 1];
  if (isJamo(last)) return !isVowel(last);
  if (isSyllable(last)) return (last.codePointAt(0) - S_BASE) % 28 !== 0;
  return false;
}

// 조사 고르기: josa('ㄴ', '을', '를') → '을'
export function josa(ch, withBatchim, without) {
  return endsWithBatchim(ch) ? withBatchim : without;
}

// 목적격 조사 (ㄴ을 / ㅏ를 / 1을 / 2를)
export function objParticle(ch) {
  return josa(ch, '을', '를');
}
