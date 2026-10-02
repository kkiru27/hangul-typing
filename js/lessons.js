// 연습 단계 데이터.
//
// 단계는 배우는 순서대로 한 줄로 늘어선다 (자리 연습 사이사이에 배운 자리로만 만든 낱말 연습).
// 단계 번호는 순서에서 나온다(stageTitle). 기록은 id로 저장하니 순서를 바꿔도 기록은 유지된다.
//
// type
//   'keys'   자리 연습: 자모·숫자·문장부호를 하나씩 친다
//            한 판(round): intro(정해진 순서) + 나머지는 pool에서 무작위, 모두 length개
//   'words'  낱말 연습: 낱말을 치고 스페이스바로 다음 낱말. 한 판에 count개
//   'sentences' 짧은 글: 문장을 끝까지 치고 Enter(또는 스페이스바)로 다음 문장. 모든 문장은 문장부호로 끝난다
//   'long'      긴 글: 이야기를 줄마다 차례로 (짧은 글과 같게 Enter로 다음 줄)
//   'test'      타자 검정: 정해진 시간(duration) 동안 짧은 글을 치고 타수·정확도를 잰다
// label이 있는 단계(검정)는 단계 번호 대신 label을 쓰고 번호 셀 때 빠진다. 게임은 따로 GAMES에 있다.
// hello는 판을 시작할 때 춘식이가 하는 말 (고양이 말 + (해석)).
// 연습 글은 모두 직접 고른 일상 낱말·직접 지은 글만 쓴다.

import { toKeys } from './hangul.js';
import { makeSentences } from './sentence-maker.js';

// 낱말 → 그림 (그림이 없으면 빈칸). 주제별로 모아 적고, 판에서는 섞어서 낸다 (덜 본 낱말 먼저: app.js freshOrder)
// 기본자리(ㅁㄴㅇㄹㅎ ㅗㅓㅏㅣ)로만 칠 수 있는 낱말. ㅘ(ㅗ+ㅏ)·ㅚ(ㅗ+ㅣ)도 이 키로 칠 수 있다. 이 자리로 되는 낱말은 원래 많지 않다
const WORDS_HOME = {
  // 사람
  엄마: '👩', 어머니: '👩', 이모: '👩', 언니: '👧', 할머니: '👵', 아이: '🧒', 어린이: '🧒',
  // 동물
  하마: '🦛', 호랑이: '🐯', 오리: '🦆', 말: '🐴', 라마: '🦙',
  // 먹을 것
  오이: '🥒', 미나리: '🌿', 알: '🥚', 오리알: '🥚', 라임: '🍋', 회: '🍣',
  // 몸
  머리: '💇', 이마: '', 허리: '',
  // 물건·자연
  어항: '🐠', 항아리: '🏺', 알람: '⏰', 오로라: '🌌', 미로: '🌀', 나라: '', 왕: '👑', 날: '📅', 노랑: '💛',
  // 소리·느낌
  멍멍: '🐶', 엉엉: '😭', 하하: '😆', 호호: '😊', 히히: '😁', 아하: '💡', 어머: '😮', 랄랄라: '🎵', 미안: '🙏',
  // 놀이·수
  놀이: '🎠', 말놀이: '🗣️', 어린이날: '🎈', 나란히: '👫', 하나: '☝️', 나이: '🎂',
};
// + 윗줄(ㅂㅈㄷㄱㅅ ㅛㅕㅑㅐㅔ). Shift 글자(ㅖ ㅒ ㄲ …)는 아직 안 쓴다 (예: 계란 대신 달걀)
const WORDS_TOP = {
  // 동물
  고양이: '🐱', 강아지: '🐶', 사자: '🦁', 개: '🐕', 새: '🐦', 병아리: '🐤', 거미: '🕷️', 오징어: '🦑',
  나비: '🦋', 개미: '🐜', 고래: '🐋', 기린: '🦒', 염소: '🐐', 양: '🐑', 돼지: '🐷', 게: '🦀', 매미: '',
  잠자리: '', 제비: '', 악어: '🐊', 상어: '🦈', 가재: '🦞', 낙지: '🐙', 송아지: '🐄', 벌: '🐝', 곰: '🐻', 지렁이: '🪱', 조개: '🐚',
  // 먹을 것
  사과: '🍎', 바나나: '🍌', 감자: '🥔', 가지: '🍆', 고기: '🍖', 김밥: '🍙', 밥: '🍚', 달걀: '🥚', 과자: '🍪', 젤리: '🍬',
  버섯: '🍄', 고사리: '🌿', 생선: '🐟', 비빔밥: '🍲', 간식: '', 도시락: '🍱', 요리: '🍳',
  // 물건
  가방: '🎒', 신발: '👟', 모자: '🧢', 안경: '👓', 양말: '🧦', 지갑: '👛', 베개: '🛏️', 공: '⚽', 지도: '🗺️', 사진: '📷',
  열쇠: '🔑', 상자: '📦', 바지: '👖', 장갑: '🧤', 목도리: '🧣', 색종이: '📄', 장난감: '🧸', 요요: '🪀', 사다리: '🪜',
  // 곳
  학교: '🏫', 가게: '🏪', 집: '🏠', 방: '🚪', 시장: '🛒', 역: '🚉', 마당: '🏡', 소방서: '🚒', 사막: '🏜️',
  // 자연·날씨·때
  해: '☀️', 달: '🌙', 별: '⭐', 봄: '🌷', 바다: '🌊', 산: '⛰️', 강: '🏞️', 섬: '🏝️', 모래: '🏖️', 바람: '🌬️',
  비: '🌧️', 번개: '⚡', 장미: '🌹', 저녁: '🌆', 새해: '🎍', 세상: '🌍',
  // 사람·마음
  선생님: '🧑‍🏫', 아기: '👶', 동생: '👦', 여왕: '👸', 왕자: '🤴', 사랑: '❤️', 생일: '🎂', 생각: '💭',
  // 탈것·놀이
  비행기: '✈️', 배: '🚢', 자전거: '🚲', 노래: '🎤', 시소: '', 시험: '📝', 이야기: '📖', 여행: '🧳',
  // 소리
  야옹: '🐱', 냠냠: '😋',
};
// + 아랫줄(ㅋㅌㅊㅍㅠㅜㅡ)과 Shift(ㅃㅉㄸㄲㅆㅒㅖ): 이제 모든 글자
const WORDS_ALL = {
  // 동물
  춘식이: '🐱', 토끼: '🐰', 코끼리: '🐘', 다람쥐: '🐿️', 거북이: '🐢', 까치: '🐦', 여우: '🦊', 사슴: '🦌',
  부엉이: '🦉', 펭귄: '🐧', 판다: '🐼', 원숭이: '🐒', 개구리: '🐸', 고슴도치: '🦔', 두더지: '', 문어: '🐙',
  해파리: '', 꿀벌: '🐝', 공룡: '🦖', 참새: '🐦', 앵무새: '🦜', 코뿔소: '🦏', 얼룩말: '🦓', 캥거루: '🦘',
  너구리: '🦝', 독수리: '🦅',
  // 먹을 것
  고구마: '🍠', 포도: '🍇', 딸기: '🍓', 수박: '🍉', 우유: '🥛', 빵: '🍞', 쌀: '🍚', 떡: '🍡', 짜장면: '🍜',
  김치: '🥬', 떡볶이: '🍢', 피자: '🍕', 햄버거: '🍔', 치킨: '🍗', 아이스크림: '🍦', 초콜릿: '🍫', 케이크: '🍰',
  귤: '🍊', 복숭아: '🍑', 체리: '🍒', 파인애플: '🍍', 옥수수: '🌽', 당근: '🥕', 양파: '🧅', 토마토: '🍅',
  치즈: '🧀', 쿠키: '🍪', 팝콘: '🍿', 국수: '🍜', 만두: '🥟', 주먹밥: '🍙', 샌드위치: '🥪', 수프: '🥣',
  // 탈것
  기차: '🚂', 자동차: '🚗', 버스: '🚌', 택시: '🚕', 트럭: '🚚', 오토바이: '🏍️', 헬리콥터: '🚁',
  소방차: '🚒', 구급차: '🚑', 경찰차: '🚓', 지하철: '🚇', 로켓: '🚀', 잠수함: '',
  // 자연·날씨·때
  하늘: '🌤️', 구름: '☁️', 무지개: '🌈', 눈사람: '⛄', 꽃: '🌸', 도토리: '🌰', 겨울: '⛄', 여름: '🌞', 가을: '🍂',
  태양: '☀️', 눈: '❄️', 천둥: '⛈️', 나무: '🌳', 풀: '🌿', 숲: '🌲', 바위: '🪨', 단풍: '🍁', 해바라기: '🌻', 튤립: '🌷',
  // 학교·집
  컴퓨터: '💻', 키보드: '⌨️', 시계: '⏰', 책: '📚', 연필: '✏️', 지우개: '', 공책: '📒', 크레파스: '🖍️', 가위: '✂️',
  칠판: '', 교실: '', 운동장: '', 필통: '', 냉장고: '', 텔레비전: '📺', 침대: '🛏️', 의자: '🪑', 책상: '',
  창문: '🪟', 우산: '☂️', 거울: '🪞', 칫솔: '🪥', 수건: '', 비누: '🧼', 휴지: '🧻',
  // 놀이
  축구: '⚽', 야구: '⚾', 농구: '🏀', 수영: '🏊', 그네: '', 미끄럼틀: '', 블록: '🧱', 퍼즐: '🧩', 풍선: '🎈',
  인형: '🧸', 줄넘기: '', 선물: '🎁',
  // 사람·마음
  친구: '🤝', 가족: '👪', 아빠: '👨', 웃음: '😄', 행복: '😊', 기쁨: '😆', 칭찬: '👍',
};

const WORD_TIP = '낱말을 다 치면 스페이스바를 엄지로 눌러 다음 낱말로 가요.';

// 짧은 글 (직접 지은 문장). 문장부호로 끝나서 마지막 글자 조합이 깔끔하게 끝난다
const SENTENCES = [
  '춘식이는 고구마를 좋아해요.', '오늘은 날씨가 맑아요.', '나는 타자 연습을 해요.', '고양이가 창밖을 봐요.',
  '엄마와 함께 산책을 가요.', '아침에 우유를 마셨어요.', '친구에게 편지를 써요.', '하늘에 구름이 떠 있어요.',
  '동생이 그림을 그려요.', '우리 집 강아지는 귀여워요.', '비가 오면 우산을 써요.', '고구마는 달콤하고 맛있어요!',
  '오늘 무엇을 할까?', '책을 읽으면 즐거워요.', '손가락이 척척 움직여요!', '바다에서 조개를 주웠어요.',
  '봄에는 꽃이 활짝 펴요.', '겨울에는 눈사람을 만들어요.', '춘식이가 낮잠을 자요.', '사과 두 개, 귤 세 개.',
  '내일도 같이 놀자!', '키보드를 보지 않고 쳐 봐요.', '천천히, 정확하게 쳐요.', '밥을 먹고 이를 닦아요.',
  '우리 반 친구들은 친절해요.', '공원에서 자전거를 탔어요.', '별이 반짝반짝 빛나요.', '배가 고프면 고구마를 먹어요.',
  '누가 제일 빨리 칠까?', '오늘도 잘했어요!',
];

// 긴 글: 직접 지은 이야기 "춘식이의 고구마 밭" (한 줄 = 한 문장, 차례대로 친다)
const STORY = [
  '춘식이는 고구마를 아주 좋아하는 고양이예요.',
  '어느 날 아침, 춘식이는 고구마 밭에 가기로 했어요.',
  '가방에 물병과 모자를 챙겼어요.',
  '햇살이 따뜻하고 바람이 살랑살랑 불었어요.',
  '춘식이는 콧노래를 부르며 길을 걸었어요.',
  '밭에 도착하니 잎사귀가 초록빛으로 반짝였어요.',
  '춘식이는 작은 삽으로 흙을 살살 팠어요.',
  '커다란 고구마가 쑥 하고 나왔어요!',
  '춘식이는 너무 기뻐서 폴짝폴짝 뛰었어요.',
  '고구마를 바구니에 가득 담았어요.',
  '집에 돌아와 고구마를 맛있게 구웠어요.',
  '달콤한 냄새가 온 집 안에 퍼졌어요.',
  '춘식이는 친구들을 불러 고구마를 나눠 먹었어요.',
  '모두 함께 먹으니 더 맛있었어요.',
  '오늘은 정말 행복한 하루였어요!',
];

export const STAGES = [
  {
    id: 'keys-home',
    group: '자리 연습',
    name: '기본자리',
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
    id: 'words-home',
    group: '낱말 연습',
    name: '기본자리 낱말',
    type: 'words',
    words: WORDS_HOME,
    tip: WORD_TIP,
    rounds: [
      { title: '낱말 첫걸음', hello: '춘! 춘춘! (이제 낱말을 쳐 보자!)', count: 8 },
      { title: '낱말 두 번째', hello: '츈츈~ (스페이스바는 엄지로!)', count: 8 },
      { title: '낱말 세 번째', hello: '춘춘춘!! (거의 다 왔어!)', count: 8 },
    ],
  },
  {
    id: 'keys-top-left',
    group: '자리 연습',
    name: '왼손 윗줄',
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
    group: '자리 연습',
    name: '오른손 윗줄',
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
    id: 'words-top',
    group: '낱말 연습',
    name: '윗줄 낱말',
    type: 'words',
    words: WORDS_TOP,
    tip: WORD_TIP,
    rounds: [
      { title: '동물과 물건', hello: '춘! (윗줄 글자로 낱말 만들기!)', count: 8 },
      { title: '여러 낱말', hello: '츈츈~ (천천히 정확하게!)', count: 8 },
      { title: '마지막 판', hello: '춘춘춘!! (고구마가 보인다!)', count: 8 },
    ],
  },
  {
    id: 'keys-bottom',
    group: '자리 연습',
    name: '아랫줄',
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
    group: '자리 연습',
    name: 'Shift 글자',
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
    id: 'words-all',
    group: '낱말 연습',
    name: '모든 자리 낱말',
    type: 'words',
    words: WORDS_ALL,
    tip: WORD_TIP,
    rounds: [
      { title: '맛있는 낱말', hello: '춘춘! (고구마도 나올까?)', count: 8 },
      { title: '여러 낱말', hello: '츈츈~ (Shift 글자도 있어!)', count: 8 },
      { title: '마지막 판', hello: '춘춘춘!! (다 칠 수 있어!)', count: 8 },
    ],
  },
  {
    id: 'keys-number',
    group: '자리 연습',
    name: '숫자·부호',
    type: 'keys',
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', ',', '?', '!'],
    tip: '숫자 줄은 멀어요. 손가락을 크게 뻗었다가 기본자리로 돌아와요. ? 와 ! 는 Shift와 함께!',
    rounds: [
      { title: '왼손 숫자', hello: '춘! 춘! (숫자는 맨 위 줄!)', intro: '12345 54321', pool: '12345', length: 20 },
      { title: '오른손 숫자', hello: '츈츈~ (오른손 숫자!)', intro: '67890 09876', pool: '67890', length: 20 },
      { title: '문장부호', hello: '춘춘?! (점, 쉼표, 물음표, 느낌표!)', intro: '.,.,?!', pool: '.,?!1234567890', length: 20 },
    ],
  },
  {
    id: 'sentences-1',
    group: '짧은 글',
    name: '짧은 글',
    type: 'sentences',
    sentences: SENTENCES,
    preview: '춘식이는 고구마를…',
    tip: '문장을 끝까지 치고 Enter를 누르면 다음 문장이에요. 띄어쓰기는 스페이스바!',
    rounds: [
      { title: '문장 1', hello: '춘! 춘춘! (이제 문장을 쳐 보자!)', count: 5 },
      { title: '문장 2', hello: '츈츈~ (띄어쓰기도 잊지 마!)', count: 5 },
      { title: '문장 3', hello: '춘춘춘!! (마지막 판이야!)', count: 5 },
    ],
  },
  {
    id: 'long-1',
    group: '긴 글',
    name: '긴 글',
    type: 'long',
    lines: STORY,
    preview: '춘식이의 고구마 밭',
    tip: '이야기를 한 줄씩 차례로 쳐요. 줄 끝에서 Enter를 누르면 다음 줄이에요.',
    rounds: [
      { title: '이야기 1', hello: '춘! 춘춘! (내 이야기를 쳐 줘!)', count: 5 },
      { title: '이야기 2', hello: '츈츈~ (고구마를 캐러 가자!)', count: 5 },
      { title: '이야기 3', hello: '춘춘춘!! (이야기의 끝이야!)', count: 5 },
    ],
  },
  {
    id: 'test-1min',
    group: '검정',
    name: '1분 타자 검정',
    type: 'test',
    label: '검정',
    sentences: SENTENCES,
    duration: 60000,
    preview: '⏱️ 1분 동안 문장 치기',
    tip: '1분 동안 문장을 쳐서 타수를 재요. 첫 글자를 치면 시간이 가기 시작해요. 빠르기보다 정확하게!',
    rounds: [{ title: '1분 검정', hello: '춘?! (준비됐으면 치기 시작!)', count: 30 }],
  },
];

// 게임: 연습으로 실력을 키운 뒤 노는 곳 (처음 화면에서 '게임'을 고르면 나오는 목록). 기록은 단계와 같이 id로 저장
export const GAMES = [
  {
    id: 'game-rain',
    group: '게임',
    name: '고구마 비',
    type: 'game',
    preview: '🍠 떨어지는 낱말 잡기',
    tip: '떨어지는 고구마에 적힌 낱말을 치고 스페이스바! 땅에 닿기 전에 춘식이가 먹게 해 줘요.',
    total: 12,
  },
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

// 단계 번호: label이 있는 단계(검정)는 label, 나머지는 label 없는 단계만 센다
export function stageNum(i) {
  if (STAGES[i].label) return STAGES[i].label;
  return `${STAGES.slice(0, i + 1).filter((s) => !s.label).length}단계`;
}

export function stageTitle(i) {
  return `${stageNum(i)} · ${STAGES[i].name}`;
}

export function gameTitle(game) {
  return `게임 · ${game.name}`;
}

// 한 단계에서 치는 모든 키 (가상 키보드에서 또렷하게 보일 키). 낱말은 키 순서로 풀고 스페이스 포함
export function stageChars(stage) {
  const set = new Set();
  if (['words', 'sentences', 'long', 'test'].includes(stage.type)) {
    for (const w of stageItems(stage)) for (const k of toKeys(w)) set.add(k);
    set.add(' ');
  } else if (stage.type === 'keys') {
    for (const r of stage.rounds) for (const ch of (r.intro + r.pool).replace(/\s/g, '')) set.add(ch);
  }
  return [...set];
}

// 단계 카드에 보일 미리보기
export function stagePreview(stage) {
  if (stage.preview) return stage.preview;
  return stage.type === 'words' ? Object.keys(stage.words).slice(0, 4).join(' ') : stage.keys.join(' ');
}

// 낱말·문장 단계의 연습 글 목록
export function stageItems(stage) {
  if (stage.type === 'sentences' || stage.type === 'test') return stage.sentences;
  if (stage.type === 'long') return stage.lines;
  return Object.keys(stage.words);
}

// 덜 본 것 먼저: 한 번도 안 친 것 → 오래전에 친 것 순. 같은 무리(안 친 것끼리)는 섞는다
//   seen: 글 → 마지막으로 친 때(ms). records.js loadSeen
export function freshOrder(items, seen = {}, rand = Math.random) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.sort((a, b) => (seen[a] ?? 0) - (seen[b] ?? 0)); // sort는 순서를 지키므로 섞은 순서가 남는다
}

// 짧은 글·검정의 문장 순서: 조립한 새 문장 2 : 손으로 쓴 문장(덜 본 것 먼저) 1
export function sentenceOrder(stage, seen = {}, rand = Math.random) {
  const hand = freshOrder(stageItems(stage), seen, rand);
  const made = makeSentences(hand.length * 2, rand, new Set(Object.keys(seen)));
  const out = [];
  hand.forEach((h, i) => out.push(...made.slice(i * 2, i * 2 + 2), h));
  return out;
}

// 단계를 시작할 때 정한 순서(order)에서 판마다 count개씩 차례로 쓴다 (모자라면 처음부터 다시)
export function itemsForRound(order, stage, roundIdx) {
  const before = stage.rounds.slice(0, roundIdx).reduce((n, r) => n + r.count, 0);
  const { count } = stage.rounds[roundIdx];
  return Array.from({ length: count }, (_, i) => order[(before + i) % order.length]);
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
