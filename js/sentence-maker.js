// 문장 조립기: 직접 지은 조각을 맞춰 짧은 글 문장을 만든다 (판마다 새 문장).
//   [때] [누가]이/가(은/는) [곳]에서 [무엇]을/를 [어떻게] [하다].   예) 어제 춘식이는 시장에서 귤을 샀어요.
// 장면마다 어울리는 곳·물건·말끔만 묶어 두어서 이상한 문장(부엌에서 고래를 봐요)이 나오지 않게 한다.
// 조사(은/는·이/가·을/를·와/과)는 받침으로 고르고, 때 말(어제·내일)에 맞춰 시제를 바꾼다.

import { josa } from './hangul.js?v=202610030913';

// 하다 말: 지금 · 지난 · 앞으로 · 물음
const V = {
  먹다: { pres: '먹어요', past: '먹었어요', fut: '먹을 거예요', q: '먹을까' },
  보다: { pres: '봐요', past: '봤어요', fut: '볼 거예요', q: '볼까' },
  찾다: { pres: '찾아요', past: '찾았어요', fut: '찾을 거예요', q: '찾을까' },
  사다: { pres: '사요', past: '샀어요', fut: '살 거예요', q: '살까' },
  만들다: { pres: '만들어요', past: '만들었어요', fut: '만들 거예요', q: '만들까' },
  읽다: { pres: '읽어요', past: '읽었어요', fut: '읽을 거예요', q: '읽을까' },
  그리다: { pres: '그려요', past: '그렸어요', fut: '그릴 거예요', q: '그릴까' },
  뛰어놀다: { pres: '뛰어놀아요', past: '뛰어놀았어요', fut: '뛰어놀 거예요' },
  노래하다: { pres: '노래해요', past: '노래했어요', fut: '노래할 거예요' },
  춤추다: { pres: '춤춰요', past: '춤췄어요', fut: '춤출 거예요' },
  낮잠자다: { pres: '낮잠을 자요', past: '낮잠을 잤어요', fut: '낮잠을 잘 거예요' },
  가다: { pres: '가요', past: '갔어요', fut: '갈 거예요' },
};

export const SUBJECTS = ['춘식이', '동생', '내 친구', '강아지', '고양이', '아기 곰', '토끼', '펭귄', '우리 반 친구들', '우리'];

// 때 말과 어울리는 시제
export const TIMES = [
  { w: '', tense: ['pres', 'past'] }, { w: '오늘', tense: ['pres', 'past'] }, { w: '지금', tense: ['pres'] },
  { w: '아침에', tense: ['pres', 'past'] }, { w: '어제', tense: ['past'] }, { w: '아까', tense: ['past'] },
  { w: '내일', tense: ['fut'] }, { w: '주말에', tense: ['fut'] }, { w: '방학에', tense: ['fut'] },
];

// 무엇을 하는 장면: 곳(…에서) · 물건(…을/를) · 어떻게 · 하다
export const SCENES = [
  { verb: '먹다', places: ['부엌', '거실', '공원', '마당', '할머니 댁'], objects: ['고구마', '사과', '김밥', '떡볶이', '수박', '빵', '귤', '만두', '옥수수', '딸기'], how: ['맛있게', '천천히', '다 같이', '냠냠'] },
  { verb: '보다', places: ['마당', '옥상', '공원', '언덕 위'], objects: ['별', '무지개', '구름', '달', '비행기', '새'], how: ['한참', '가만히', '다 같이'] },
  { verb: '보다', places: ['바닷가', '배 위', '바다'], objects: ['고래', '갈매기', '물고기', '파도', '돌고래'], how: ['한참', '가만히', '처음으로'] },
  { verb: '찾다', places: ['방', '마당', '숲', '침대 밑', '가방 속'], objects: ['양말', '열쇠', '도토리', '장난감', '보물', '연필', '모자'], how: ['열심히', '함께'] },
  { verb: '사다', places: ['빵집'], objects: ['빵', '케이크', '쿠키'], how: ['얼른', '조금', '많이'] },
  { verb: '사다', places: ['문구점'], objects: ['연필', '공책', '지우개', '크레파스', '풍선'], how: ['얼른', '하나', '같이'] },
  { verb: '사다', places: ['시장'], objects: ['사과', '귤', '생선', '고구마', '옥수수'], how: ['조금', '많이', '같이'] },
  { verb: '사다', places: ['가게'], objects: ['우유', '과자', '아이스크림', '사탕'], how: ['얼른', '조금', '같이'] },
  { verb: '만들다', places: ['마당', '공원'], objects: ['눈사람'], how: ['크게', '함께', '신나게'] },
  { verb: '만들다', places: ['바닷가'], objects: ['모래성'], how: ['크게', '함께', '신나게'] },
  { verb: '만들다', places: ['부엌'], objects: ['김밥', '주먹밥', '케이크', '샌드위치'], how: ['함께', '열심히', '맛있게'] },
  { verb: '만들다', places: ['교실', '방'], objects: ['종이배', '카드', '왕관'], how: ['예쁘게', '함께', '열심히'] },
  { verb: '읽다', places: ['방', '도서관', '교실', '침대'], objects: ['책', '동화책', '편지', '만화책'], how: ['재미있게', '천천히', '조용히'] },
  { verb: '그리다', places: ['방', '교실', '마당'], objects: ['그림', '꽃', '고양이', '무지개', '바다'], how: ['예쁘게', '열심히', '크게'] },
];

// 물건 없이 하는 장면: 곳(…에서) · 어떻게 · 하다
export const ACTS = [
  { verb: '뛰어놀다', places: ['공원', '놀이터', '마당', '운동장'], how: ['신나게', '즐겁게', '하루 종일'] },
  { verb: '노래하다', places: ['거실', '무대 위', '교실'], how: ['신나게', '큰 소리로', '즐겁게'] },
  { verb: '춤추다', places: ['거실', '무대 위', '교실'], how: ['신나게', '즐겁게', '빙글빙글'] },
  { verb: '낮잠자다', places: ['소파', '침대', '거실', '나무 그늘'], how: ['쿨쿨', '푹', '새근새근'] },
];

// 누구와 함께 어디에 가는 장면
export const WITH = ['엄마', '아빠', '친구', '동생', '할머니', '강아지', '춘식이'];
export const GO = ['바다', '산', '공원', '시장', '도서관', '놀이공원', '할머니 댁', '동물원', '수영장'];

export const MAX_LEN = 26; // 한 줄에 크게 보이도록 (손으로 쓴 이야기 줄은 29자까지 있음)

const pick = (list, rand) => list[Math.floor(rand() * list.length)];
const subj = (w, rand) => w + (rand() < 0.5 ? josa(w, '이', '가') : josa(w, '은', '는'));
const obj = (w) => w + josa(w, '을', '를');
const ending = (rand) => (rand() < 0.2 ? '!' : '.');

// 문장 종류: 물음 · 물건을 …하기 · 그냥 …하기 · 누구와 어디에 가기 (비율)
const KINDS = [['ask', 0.08], ['scene', 0.5], ['act', 0.22], ['go', 0.2]];

function pickKind(rand) {
  let r = rand();
  for (const [kind, w] of KINDS) if ((r -= w) < 0) return kind;
  return 'scene';
}

function once(kind, rand) {
  const who = pick(SUBJECTS, rand);
  if (kind === 'ask') {
    // 물음: 동생은 빵집에서 무엇을 살까?
    const s = pick(SCENES, rand);
    return `${who}${josa(who, '은', '는')} ${pick(s.places, rand)}에서 무엇을 ${V[s.verb].q}?`;
  }
  const time = pick(TIMES, rand);
  const tense = pick(time.tense, rand);
  const head = [time.w, subj(who, rand)].filter(Boolean);
  if (kind === 'scene') {
    const s = pick(SCENES, rand);
    const how = rand() < 0.6 ? [pick(s.how, rand)] : [];
    return [...head, `${pick(s.places, rand)}에서`, obj(pick(s.objects, rand)), ...how, V[s.verb][tense]].join(' ') + ending(rand);
  }
  if (kind === 'act') {
    const a = pick(ACTS, rand);
    return [...head, `${pick(a.places, rand)}에서`, pick(a.how, rand), V[a.verb][tense]].join(' ') + ending(rand);
  }
  const mate = pick(WITH.filter((w) => !who.includes(w)), rand); // '내 친구는 친구와' 같은 겹침 없게
  return [...head, `${mate}${josa(mate, '과', '와')} 함께`, `${pick(GO, rand)}에`, V.가다[tense]].join(' ') + ending(rand);
}

// 문장 하나: 종류를 먼저 고르고, 너무 길면 같은 종류로 다시 만든다 (짧은 종류만 남지 않게)
export function makeSentence(rand = Math.random) {
  const kind = pickKind(rand);
  for (let i = 0; i < 50; i++) {
    const s = once(kind, rand);
    if (s.length <= MAX_LEN) return s;
  }
  return '춘식이가 고구마를 먹어요.';
}

// 서로 다른 문장 n개. avoid에 있는 문장(최근에 친 것)은 되도록 빼고
export function makeSentences(n, rand = Math.random, avoid = new Set()) {
  const out = new Set();
  for (let i = 0; out.size < n && i < n * 30; i++) {
    const s = makeSentence(rand);
    if (!avoid.has(s)) out.add(s);
  }
  return [...out];
}
