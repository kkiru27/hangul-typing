// 연습 단계 데이터.
//
// type
//   'keys'      자리 연습: 자모·숫자·문장부호를 하나씩 친다
//   'words'     낱말 연습        ┐ 다음에 추가.
//   'sentences' 짧은 문장 연습   │ 목표 글을 Judge에 그대로 넘기면 판정은 같다.
//   'long'      긴 글 연습       ┘
// 연습 글은 모두 직접 지은 것만 쓴다.
//
// 자리 연습 한 판(round): intro(정해진 순서) + 나머지는 pool에서 무작위, 모두 length개.
// hello는 판을 시작할 때 춘식이가 하는 말 (고양이 말 + (해석)).

export const STAGES = [
  {
    id: 'keys-home',
    title: '1단계 · 기본자리',
    short: '기본자리',
    type: 'keys',
    keys: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
    tip: '왼손은 ㅁ ㄴ ㅇ ㄹ, 오른손은 ㅓ ㅏ ㅣ 위에 올려요. ㄹ과 ㅓ에는 볼록한 표시가 있어요.',
    rounds: [
      { title: '왼손 기본자리', hello: '춘! 춘춘! (왼손부터 해 보자!)', intro: 'ㅁㄴㅇㄹ ㄹㅇㄴㅁ ㄹㅎㄹㅎ', pool: 'ㅁㄴㅇㄹㅎ', length: 20 },
      { title: '오른손 기본자리', hello: '츈츈~ 춘! (이번엔 오른손!)', intro: 'ㅣㅏㅓ ㅓㅏㅓ ㅗㅓㅗ ㅣㅣ', pool: 'ㅗㅓㅏㅣ', length: 20 },
      { title: '두 손 함께', hello: '춘춘춘!! (두 손 다 같이!)', intro: '', pool: 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', length: 24 },
    ],
  },
  {
    id: 'keys-top-left',
    title: '2단계 · 왼손 윗줄',
    short: '왼손 윗줄',
    type: 'keys',
    keys: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ'],
    tip: '기본자리에서 손가락을 위로 쭉 뻗었다가 다시 기본자리로 돌아와요.',
    rounds: [
      { title: '왼손 윗줄', hello: '춘! 춘춘! (손가락을 위로 쭉!)', intro: 'ㄱㄹㄱ ㄷㅇㄷ ㅈㄴㅈ ㅂㅁㅂ ㅅㄹㅅ', pool: 'ㅂㅈㄷㄱㅅ', length: 20 },
      { title: '윗줄과 기본자리', hello: '츈츈~ (위아래로 왔다 갔다!)', intro: '', pool: 'ㅂㅈㄷㄱㅅㅁㄴㅇㄹㅎ', length: 22 },
      { title: '모음도 함께', hello: '춘춘춘!! (글자가 만들어져!)', intro: '', pool: 'ㅂㅈㄷㄱㅅㅁㄴㅇㄹㅎㅗㅓㅏㅣ', length: 24 },
    ],
  },
  {
    id: 'keys-top-right',
    title: '3단계 · 오른손 윗줄',
    short: '오른손 윗줄',
    type: 'keys',
    keys: ['ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
    tip: '오른손을 위로 뻗어요. ㅛ는 검지를 왼쪽 위로, ㅔ는 새끼손가락으로 쳐요.',
    rounds: [
      { title: '오른손 윗줄', hello: '춘! (오른손 위로 쭉!)', intro: 'ㅕㅓㅕ ㅑㅏㅑ ㅐㅣㅐ ㅛㅗㅛ ㅔㅔ', pool: 'ㅛㅕㅑㅐㅔ', length: 20 },
      { title: '윗줄과 기본자리 모음', hello: '츈츈~ (모음끼리 섞어 보자!)', intro: '', pool: 'ㅛㅕㅑㅐㅔㅗㅓㅏㅣ', length: 22 },
      { title: '윗줄 모두', hello: '춘춘춘!! (윗줄 다 모였다!)', intro: '', pool: 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣ', length: 24 },
    ],
  },
  {
    id: 'keys-bottom',
    title: '4단계 · 아랫줄',
    short: '아랫줄',
    type: 'keys',
    keys: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
    tip: '손가락을 아래로 살짝 굽혀요. ㅠ는 왼손 검지, ㅜ와 ㅡ는 오른손 검지로 쳐요.',
    rounds: [
      { title: '왼손 아랫줄', hello: '춘! 춘! (손가락을 아래로!)', intro: 'ㅋㅁㅋ ㅌㄴㅌ ㅊㅇㅊ ㅍㄹㅍ ㅠㄹㅠ', pool: 'ㅋㅌㅊㅍㅠ', length: 20 },
      { title: '오른손 아랫줄', hello: '츈츈! (오른손 검지 차례!)', intro: 'ㅜㅓㅜ ㅡㅓㅡ ㅜㅡㅜ', pool: 'ㅜㅡㅓㅏㅣㅗ', length: 20 },
      { title: '아랫줄 모두', hello: '춘춘춘!! (아랫줄 다 모였다!)', intro: '', pool: 'ㅋㅌㅊㅍㅠㅜㅡㅁㄴㅇㄹㅎㅗㅓㅏㅣ', length: 24 },
    ],
  },
  {
    id: 'keys-shift',
    title: '5단계 · Shift',
    short: 'Shift 글자',
    type: 'keys',
    keys: ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ'],
    tip: 'Shift를 반대쪽 새끼손가락으로 누른 채 쳐요. 왼손 글자는 오른쪽 Shift, 오른손 글자는 왼쪽 Shift!',
    rounds: [
      { title: '쌍자음', hello: '춘?! 춘춘! (Shift 누른 채 쳐 봐!)', intro: 'ㄲㄱㄲ ㄸㄷㄸ ㅃㅂㅃ ㅆㅅㅆ ㅉㅈㅉ', pool: 'ㄲㄸㅃㅆㅉ', length: 20 },
      { title: 'ㅒ와 ㅖ', hello: '츈츈~ (이번엔 왼쪽 Shift!)', intro: 'ㅒㅐㅒ ㅖㅔㅖ', pool: 'ㅒㅖㅐㅔ', length: 16 },
      { title: 'Shift 섞어서', hello: '춘춘춘!! (누를 때 안 누를 때!)', intro: '', pool: 'ㄲㄸㅃㅆㅉㅒㅖㄱㄷㅂㅅㅈㅐㅔ', length: 24 },
    ],
  },
  {
    id: 'keys-number',
    title: '6단계 · 숫자·문장부호',
    short: '숫자·부호',
    type: 'keys',
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', ',', '?', '!'],
    tip: '숫자 줄은 멀어요. 손가락을 크게 뻗었다가 기본자리로 돌아와요. ? 와 ! 는 Shift와 함께!',
    rounds: [
      { title: '왼손 숫자', hello: '춘! 춘! (숫자는 맨 위 줄!)', intro: '12345 54321', pool: '12345', length: 20 },
      { title: '오른손 숫자', hello: '츈츈~ (오른손 숫자!)', intro: '67890 09876', pool: '67890', length: 20 },
      { title: '문장부호', hello: '춘춘?! (점, 쉼표, 물음표, 느낌표!)', intro: '.,.,?!', pool: '.,?!1234567890', length: 20 },
    ],
  },
  // 다음: { id: 'words-1', title: '낱말 연습', type: 'words', ... }
];

// 입력기에 따라 합쳐질 수 있는 짝. 자리 연습에서는 나란히 두지 않는다.
//  - 모음: ㅏ+ㅣ→ㅐ 처럼 묶는 입력기가 있다
//  - 같은 자음 두 번: ㄱ+ㄱ→ㄲ 처럼 묶는 입력기가 있다
export const RISKY_PAIRS = new Set(['ㅏㅣ', 'ㅓㅣ', 'ㅑㅣ', 'ㅕㅣ', 'ㄱㄱ', 'ㄷㄷ', 'ㅂㅂ', 'ㅅㅅ', 'ㅈㅈ']);

export function hasRiskyPair(items) {
  for (let i = 1; i < items.length; i++) {
    if (RISKY_PAIRS.has(items[i - 1] + items[i])) return true;
  }
  return false;
}

// 한 단계에서 쓰는 모든 글자 (가상 키보드에서 또렷하게 보일 키)
export function stageChars(stage) {
  const set = new Set();
  for (const r of stage.rounds) for (const ch of (r.intro + r.pool).replace(/\s/g, '')) set.add(ch);
  return [...set];
}

// 자리 연습 한 판의 목록 만들기: intro(정해진 순서) + 나머지는 무작위
export function buildKeysRound(round, rand = Math.random) {
  const items = [...round.intro.replace(/\s/g, '')];
  const pool = [...round.pool];
  let guard = 0;
  while (items.length < round.length && guard++ < 10000) {
    const pick = pool[Math.floor(rand() * pool.length)];
    const n = items.length;
    if (n && RISKY_PAIRS.has(items[n - 1] + pick)) continue;
    if (n >= 2 && items[n - 1] === pick && items[n - 2] === pick) continue; // 같은 키 세 번 연속 금지
    items.push(pick);
  }
  return items;
}
