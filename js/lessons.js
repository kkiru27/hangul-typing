// 연습 단계 데이터.
//
// type
//   'keys'      자리 연습: 자모를 하나씩 친다 (지금 구현됨)
//   'words'     낱말 연습        ┐ 나중에 추가.
//   'sentences' 짧은 문장 연습   │ 목표 글을 Judge에 그대로 넘기면 판정은 같다.
//   'long'      긴 글 연습       ┘ 화면(글자별 색칠)만 새로 만들면 된다.
// 연습 글은 모두 직접 지은 것만 쓴다.

export const STAGES = [
  {
    id: 'keys-home',
    group: '자리 연습',
    title: '1단계 · 기본자리',
    type: 'keys',
    keys: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
    tip: '왼손은 ㅁ ㄴ ㅇ ㄹ, 오른손은 ㅓ ㅏ ㅣ 위에 올려요. ㄹ과 ㅓ에는 볼록한 표시가 있어요.',
    rounds: [
      { title: '왼손 기본자리', intro: 'ㅁㄴㅇㄹ ㄹㅇㄴㅁ ㄹㅎㄹㅎ', pool: 'ㅁㄴㅇㄹㅎ', length: 20 },
      { title: '오른손 기본자리', intro: 'ㅣㅏㅓ ㅓㅏㅓ ㅗㅓㅗ ㅣㅣ', pool: 'ㅗㅓㅏㅣ', length: 20 },
      { title: '두 손 함께', intro: '', pool: 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', length: 24 },
    ],
  },
  // 다음 단계 예시 (아직 안 만듦):
  // { id: 'keys-top', group: '자리 연습', title: '2단계 · 윗줄', type: 'keys', keys: [...], rounds: [...] },
  // { id: 'words-1', group: '낱말 연습', title: '쉬운 낱말', type: 'words', items: ['나무', ...] },
];

// 입력기에 따라 앞 모음과 합쳐질 수 있는 짝(ㅏ+ㅣ→ㅐ 등). 자리 연습에서는 나란히 두지 않는다.
export const RISKY_PAIRS = new Set(['ㅏㅣ', 'ㅓㅣ', 'ㅑㅣ', 'ㅕㅣ']);

export function hasRiskyPair(items) {
  for (let i = 1; i < items.length; i++) {
    if (RISKY_PAIRS.has(items[i - 1] + items[i])) return true;
  }
  return false;
}

// 자리 연습 한 판의 자모 목록 만들기: intro(정해진 순서) + 나머지는 무작위
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
