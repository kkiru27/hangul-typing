// 한글 타자 연습 앱: 단계 지도 → 연습(판 3개) → 결과(고구마) → 단계 지도
// 한 판은 목표 글(items) 여러 개로 이뤄진다. 자리 연습은 1개(자모 줄 전체), 낱말 연습은 낱말마다 1개("하마 "),
// 짧은 글은 문장마다 1개 (문장을 다 치면 Enter 또는 스페이스바로 다음 문장).

import { Judge } from './judge.js?v=202610030859';
import { InputBridge } from './input-bridge.js?v=202610030859';
import { KeyboardView } from './keyboard-view.js?v=202610030859';
import { HandsView } from './hands-view.js?v=202610030859';
import { STAGES, GAMES, gameLevel, levelKeys, levelWords, buildKeysRound, stageChars, stageNum, stageTitle, gameTitle, stagePreview, stageItems, freshOrder, sentenceOrder, pickStory, storyKey, itemsForRound } from './lessons.js?v=202610030859';
import { codesFor, keyFor, FINGER_BY_CODE, FINGER_NAMES, KEY_LABEL, fingerTone, LAYOUTS, LAYOUT_IDS } from './layout.js?v=202610030859';
import { isHangul, charName, josa, toUnits, toKeys } from './hangul.js?v=202610030859';
import { loadRecords, loadSeen, markSeen, saveStageResult, suggestStage, levelId, gameGoguma, gamesMax, isLevelOpen, isGameOpen, suggestLevel, totalGoguma, gogumaFor, gogumaForTest, GOGUMA_MAX } from './records.js?v=202610030859';
import { VERSION } from './version.js?v=202610030859';
import { Chunsik } from './chunsik-view.js?v=202610030859';
import { icon, ART, DEFS, GOGUMA_SVG } from './icons.js?v=202610030859';
import { checkForUpdate } from './update-check.js?v=202610030859';
import { RainGame } from './game-rain.js?v=202610030859';
import { DigGame } from './game-dig.js?v=202610030859';
import { RaceGame } from './game-race.js?v=202610030859';
import { Sound } from './sound.js?v=202610030859';
import { loadSettings, saveSettings } from './settings.js?v=202610030859';

const $ = (id) => document.getElementById(id);
document.body.insertAdjacentHTML('afterbegin', DEFS); // 아이콘 그라데이션 (한 번만)
const REDUCED_MOTION = () => matchMedia('(prefers-reduced-motion: reduce)').matches; // 기기의 '동작 줄이기'

const settings = loadSettings();
const sound = new Sound(settings.sound);
// 아이패드는 사용자 동작 안에서만 소리를 켤 수 있다 → 키·터치마다 (처음 한 번만 실제로 일함)
for (const type of ['keydown', 'pointerdown', 'touchend']) document.addEventListener(type, () => sound.unlock(), { capture: true });

const keyboard = new KeyboardView($('keyboard'), settings.layout);
const hands = new HandsView(keyboard); // 가상 키보드 위의 반투명 손
const bridge = new InputBridge($('ime'), { onChange, onLatin });
const homeCs = new Chunsik($('homeChunsik'), { size: 'l' });
const playCs = new Chunsik($('playChunsik'));
const resultCs = new Chunsik($('resultChunsik'), { size: 'l' });
const gameCs = new Chunsik($('gameChunsik'));
$('trackGoal').innerHTML = GOGUMA_SVG;
$('brandLogo').innerHTML = ART.logo;

// 춘식이 말투: 고양이 말 + (해석)
const CHEERS = ['춘춘!! (좋아!)', '츈츈춘~! (잘한다!)', '춘! 춘! (척척!)', '춘춘춘!! (최고야!)', '츈~ 춘춘! (멋져!)', '춘?! 춘춘! (우와!)'];
const SAD = ['츄... 춘...', '춘... 츈츈...', '츈... 춘...'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const IDLE_MS = 7000;
const NAV_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
const MAP_COLS = 3;
const MAP_PAGE = 6; // 단계 지도 한 쪽에 보이는 단계 수

const state = {
  screen: 'home',      // home | play | game | roundDone | stageDone
  page: 'menu',        // 처음 화면(home)에서 보이는 곳: menu(갈래 고르기) | practice(단계 지도) | games(게임 목록) | levels(게임 레벨)
  records: loadRecords(),
  seen: loadSeen(),    // 낱말·문장을 마지막으로 친 때 (덜 본 것 먼저)
  story: null,         // 긴 글: 지금 치는 이야기 { title, lines }
  menuSel: 0,          // 갈래 고르기에서 고른 것 (0 타자 연습, 1 게임)
  sel: 0,              // 단계 지도에서 고른 단계
  gameSel: 0,          // 게임 목록에서 고른 게임
  levelSel: 0,         // 레벨 목록에서 고른 레벨 (0부터)
  level: null,         // 게임 중이면 지금 레벨 (lessons.js gameLevel)
  combo: 0,            // 게임: 연달아 잡은 수
  digLen: 0,           // 고구마 캐기: 입력칸에서 이미 낸 키 수
  race: null,          // 춘식이 달리기: { items, idx, judge, doneKeys, totalKeys, correct, mistakes }
  bestCombo: 0,
  stageIdx: 0,
  stage: STAGES[0],
  roundIdx: 0,
  items: [],           // 이번 판 목표 글들
  itemIdx: 0,
  judge: null,         // 지금 목표 글의 판정기
  roundAcc: null,      // 이번 판에서 끝낸 목표 글들의 합계 {correct, mistakes, missByKey, ms}
  itemOrder: [],       // 낱말·문장 단계: 섞은 순서
  awaitNext: false,    // 짧은 글·긴 글·검정: 문장을 다 쳐서 Enter를 기다리는 중
  testStart: 0,        // 타자 검정: 첫 키를 친 시각
  testTimer: 0,
  results: [],
  warn: null,          // english | focus | null
  streak: 0,           // 연속으로 맞힌 키 (춘식이 칭찬용)
  input: { raw: '', base: 0, composing: false }, // 입력칸 값 (친 글자 막대용)
  idleTimer: 0,
  paused: null,        // 일시정지 중이면 { at: 멈춘 시각, sel: 고른 항목 }
  game: null,          // 고구마 비 게임
};

// ───── 화면 전환 ─────

function show(screen) {
  const changed = state.screen !== screen;
  state.screen = screen;
  closePause();
  setNav(screen === 'play' || screen === 'game' ? 'pause' : null);
  $('homeScreen').hidden = screen !== 'home';
  $('playScreen').hidden = screen !== 'play';
  $('gameScreen').hidden = screen !== 'game';
  if (screen !== 'game' && state.game) { state.game.stop(); state.game = null; }
  $('resultScreen').hidden = !(screen === 'roundDone' || screen === 'stageDone');
  // 연습 중에는 위쪽 막대 가운데에 판 이름과 고구마 길
  $('roundHead').hidden = screen !== 'play' && screen !== 'game';
  $('speedStat').hidden = !(screen === 'play' && hasSpeed());
  $('progressLabel').textContent = screen === 'play' && state.stage.type === 'test' ? '남은 시간' : '진행';
  if (screen !== 'play') stopTestTimer();
  $('stageLabel').hidden = !$('roundHead').hidden;
  if (screen !== 'play') setWarn(null);
  // 처음 화면: 오른쪽 위는 모은 고구마, 연습·게임·결과: 진행·정확도
  document.querySelector('.stats').dataset.mode = screen === 'home' ? 'home' : 'play';
  $('gogumaChip').hidden = screen !== 'home';
  if (changed && screen !== 'home') enter(document.querySelector('.screen:not([hidden])'));
}

// ───── 처음 화면: 갈래 고르기 → 타자 연습(단계 지도) / 게임 목록 ─────

const MENU = [
  { page: 'practice', art: 'keyboard', name: '타자 연습', desc: '기본자리부터 긴 글·검정까지', cta: '연습하러 가기' },
  { page: 'games', art: 'gamepad', name: '게임', desc: '고구마를 모으면 새 게임이 열려요', cta: '게임하러 가기' },
];
// 게임 작은 그림 (게임 종류별) + 바탕 색
const GAME_ICON = {
  dig: { tone: 'pinky', html: () => GOGUMA_SVG },
  rain: { tone: 'index', html: () => icon('drop') },
  race: { tone: 'middle', html: () => icon('flag') },
};
const gameIcon = (g) => `<span class="g-icon tone-${GAME_ICON[g.type].tone}">${GAME_ICON[g.type].html()}</span>`;

function goHome(page = state.page) {
  clearTimeout(state.idleTimer);
  const changed = state.screen !== 'home' || state.page !== page;
  state.page = page;
  show('home');
  $('progress').textContent = '–';
  $('accuracy').textContent = '–';
  keyboard.setFocusSet(null);
  keyboard.setNext(['Enter']);
  hands.setTargets([]);
  renderHome();
  if (changed) enter($('homeScreen'));
}

function goBack() {
  if (state.screen !== 'home' || state.page === 'menu') return;
  sound.play('move');
  goHome(state.page === 'levels' ? 'games' : 'menu');
}

// 모은 고구마: 연습 단계 + 게임 레벨 (게임을 여는 기준)
const allGoguma = () => totalGoguma(STAGES, state.records) + GAMES.reduce((sum, g) => sum + gameGoguma(g, state.records), 0);
const allMax = () => STAGES.length * GOGUMA_MAX + gamesMax(GAMES);

const HINT_SEP = '<span class="sep"></span>';
const HINTS = {
  menu: `<kbd>←</kbd><kbd>→</kbd> 고르기${HINT_SEP}<kbd>Enter</kbd> 시작${HINT_SEP}<kbd>↓</kbd> 설정`,
  list: `<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> 고르기${HINT_SEP}<kbd>Enter</kbd> 시작${HINT_SEP}<kbd>Esc</kbd> 뒤로`,
};

function renderHome() {
  const { page } = state;
  $('homeScreen').dataset.page = page;
  $('stageMap').style.setProperty('--cols', page === 'games' ? Math.min(MAP_COLS, GAMES.length) : MAP_COLS);
  $('stageLabel').innerHTML = { practice: `${icon('keyboard')} 타자 연습`, games: `${icon('gamepad')} 게임`, levels: `${icon('gamepad')} ${GAMES[state.gameSel].name}` }[page] || '';
  setNav(page === 'menu' ? null : 'back');
  setHtml($('homeHint'), page === 'menu' ? HINTS.menu : HINTS.list);
  setHtml($('gogumaChip'), `${GOGUMA_SVG}<b>${allGoguma()}</b><span>개 모았어요</span>`);
  $('homeSettings').hidden = page !== 'menu';
  if (page === 'practice') renderMap();
  else if (page === 'games') renderGames();
  else if (page === 'levels') renderLevels();
  else renderMenu();
}

// 내용이 바뀔 때만 새로 그린다 (고른 것만 바뀌면 그대로 두어서 카드가 부드럽게 떠오르고 가라앉게)
function setHtml(el, html) {
  if (el._html === html) return false;
  el.innerHTML = html;
  el._html = html;
  return true;
}

function setCards(html, sel) {
  setHtml($('stageMap'), html);
  for (const card of $('stageMap').children) card.classList.toggle('selected', Number(card.dataset.idx) === sel);
}

// 위쪽 막대 왼쪽 단추: 'back'(처음으로) | 'pause'(멈춤) | null(앱 이름)
function setNav(kind) {
  $('brand').hidden = !!kind;
  $('navBtn').hidden = !kind;
  $('navBtn').dataset.kind = kind || '';
  const back = `${icon('back')} ${state.page === 'levels' ? '게임 목록' : '처음으로'}`;
  $('navBtn').innerHTML = { pause: `${icon('pause')} 멈춤`, resume: `${icon('play')} 계속하기`, back }[kind] + ' <kbd>Esc</kbd>';
}

function gogumaIcons(n, cls = '') {
  return Array.from({ length: GOGUMA_MAX }, (_, i) =>
    GOGUMA_SVG.replace('class="goguma"', `class="goguma ${i < n ? 'earned' : 'off'} ${cls}"`)).join('');
}

// 단계 카드
function cardHtml(s, i, num, preview = stagePreview(s)) {
  const rec = state.records[s.id];
  return `<div class="stage-card" data-idx="${i}">
      <span class="sc-top"><span class="sc-num">${num}</span><span class="sc-group ${s.type}">${s.group}</span></span>
      <span class="sc-name">${s.name}</span>
      <span class="sc-keys">${preview}</span>
      <span class="sc-goguma">${gogumaIcons(rec?.goguma ?? 0)}</span>
    </div>`;
}

// 처음 화면 아래쪽 설정 줄: 키보드 배열 3개 + 소리. 고른 칸은 state.menuSel = MENU.length + i
const LAYOUT_TIPS = {
  tkl: '숫자패드 없는 보통 키보드(텐키리스)예요. 타자 연습은 이걸로 시작해요',
  k380: '로지텍 K380처럼 작은 키보드예요. 기능키 줄이 작고 방향키가 아래 줄에 있어요',
  f65: 'AULA F65처럼 기능키 줄이 없는 작은 키보드예요. Esc가 1 왼쪽에 있어요',
};

function settingItems() {
  return [
    ...LAYOUT_IDS.map((id) => ({ id: `layout:${id}`, on: settings.layout === id, tip: LAYOUT_TIPS[id], name: LAYOUTS[id].name, note: LAYOUTS[id].note })),
    { id: 'sound', on: settings.sound, tip: 'Enter를 누르면 소리가 켜지고 꺼져요' },
  ];
}

function settingsHtml(items) {
  const layouts = items.filter((it) => it.id.startsWith('layout:')).map((it) =>
    `<button type="button" class="set-chip seg-btn ${it.on ? 'on' : ''}" data-set="${it.id}" aria-pressed="${it.on}"><b>${it.name}</b><small>${it.note}</small></button>`).join('');
  const snd = items.find((it) => it.id === 'sound');
  return `<div class="seg" role="group" aria-label="키보드 모양"><span class="seg-label">키보드</span>${layouts}</div>
    <button type="button" class="set-chip sound-btn ${snd.on ? 'on' : ''}" data-set="sound" aria-pressed="${snd.on}">
      ${icon(snd.on ? 'sound' : 'mute')}<span>${snd.on ? '소리 켜짐' : '소리 꺼짐'}</span><span class="switch"></span>
    </button>`;
}

function chooseSetting(id) {
  if (id.startsWith('layout:')) {
    settings.layout = id.slice('layout:'.length);
    saveSettings(settings);
    keyboard.setLayout(settings.layout);
    sound.play('select');
  } else if (id === 'sound') {
    settings.sound = sound.enabled = !settings.sound;
    saveSettings(settings);
    sound.play('select');
  }
  renderHome();
}

function renderMenu() {
  const practice = totalGoguma(STAGES, state.records);
  const games = allGoguma() - practice;
  const played = STAGES.some((st) => state.records[st.id]);
  const cleared = STAGES.filter((st) => (state.records[st.id]?.goguma ?? 0) > 0).length;
  const chip = (n, max) => `<span class="mc-chip">${GOGUMA_SVG}${n} / ${max}</span>`;
  const total = allGoguma();
  const gameTiles = GAMES.map((g) => {
    const open = isGameOpen(g, total);
    const levels = g.levels.filter((_, k) => isLevelOpen(g, k + 1, state.records)).length;
    return `<span class="mg ${open ? '' : 'locked'}">${open ? gameIcon(g) : `<span class="g-icon">${icon('lock')}</span>`}
        <b>${g.name}</b><small>${open ? `레벨 ${levels}` : `고구마 ${g.unlock - total}개 더`}</small></span>`;
  }).join('');
  const body = [
    `<span class="mc-progress">
        <span class="mc-row"><b>${played ? `이어서: ${stageTitle(state.sel)}` : '처음이면 1단계부터!'}</b><small>${cleared}/${STAGES.length}단계</small></span>
        <span class="bar"><i style="width:${Math.round((cleared / STAGES.length) * 100)}%"></i></span>
      </span>`,
    `<span class="mc-games">${gameTiles}</span>`,
  ];
  const chips = [chip(practice, STAGES.length * GOGUMA_MAX), chip(games, gamesMax(GAMES))];
  setCards(MENU.map((m, i) => `<div class="stage-card menu-card" data-idx="${i}">
      <span class="mc-top">${ART[m.art]}${chips[i]}</span>
      <span class="mc-text"><span class="sc-name">${m.name}</span><span class="sc-keys">${m.desc}</span></span>
      <span class="mc-fill"></span>
      ${body[i]}
      <span class="mc-cta">${m.cta}<kbd>Enter</kbd></span>
    </div>`).join(''), state.menuSel);
  $('mapPages').innerHTML = '';
  const items = settingItems();
  setHtml($('homeSettings'), settingsHtml(items));
  const chips2 = $('homeSettings').querySelectorAll('.set-chip');
  chips2.forEach((c, i) => c.classList.toggle('selected', state.menuSel === MENU.length + i));
  const onSetting = state.menuSel >= MENU.length;
  $('mapTip').textContent = '';
  if (onSetting) homeCs.say(`춘? (${items[state.menuSel - MENU.length].tip})`);
  else if (!Object.keys(state.records).length) homeCs.say('츈츈! 춘춘춘~ (안녕! 연습할까, 게임할까?)');
  else homeCs.say(state.menuSel === 0 ? '춘춘? (타자 연습 할까?)' : '춘춘! (게임 하러 갈까?)');
}

function renderMap() {
  const page = Math.floor(state.sel / MAP_PAGE);
  const pages = Math.ceil(STAGES.length / MAP_PAGE);
  setCards(STAGES.map((s, i) =>
    (Math.floor(i / MAP_PAGE) === page ? cardHtml(s, i, stageNum(i)) : '')).join(''), state.sel);
  $('mapPages').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, p) => `<span class="${p === page ? 'on' : ''}"></span>`).join('') : '';
  const s = STAGES[state.sel];
  $('mapTip').textContent = s.tip;

  const rec = state.records[s.id];
  if (!STAGES.some((st) => state.records[st.id])) homeCs.say('츈츈! (해 보고 싶은 단계를 골라 봐)');
  else if ((rec?.goguma ?? 0) >= GOGUMA_MAX) homeCs.say(`춘춘! (${s.name}${josa(s.name, '은', '는')} 고구마 다 모았어!)`);
  else homeCs.say(`춘춘? (${s.name} 해 볼까?)`);
}

// 게임 목록: 모은 고구마로 열리는 게임 (잠긴 게임은 몇 개 더 모아야 하는지)
function renderGames() {
  const total = allGoguma();
  setCards(GAMES.map((g, i) => {
    const open = isGameOpen(g, total);
    const levels = g.levels.filter((_, k) => isLevelOpen(g, k + 1, state.records)).length;
    const meta = open
      ? `레벨 ${levels}/${g.levels.length} · ${GOGUMA_SVG} ${gameGoguma(g, state.records)} / ${g.levels.length * GOGUMA_MAX}`
      : `고구마 ${g.unlock - total}개 더 모으면 열려요`;
    return `<div class="stage-card game-card ${open ? '' : 'locked'}" data-idx="${i}">
      <span class="sc-top">${open ? gameIcon(g) : `<span class="g-icon">${icon('lock')}</span>`}<span class="sc-num">게임 ${i + 1}</span></span>
      <span class="sc-name">${g.name}</span>
      <span class="sc-keys">${g.preview}</span>
      <span class="gc-meta">${meta}</span>
    </div>`;
  }).join(''), state.gameSel);
  $('mapPages').innerHTML = '';
  const g = GAMES[state.gameSel];
  const open = isGameOpen(g, total);
  $('mapTip').textContent = open ? g.tip : `연습에서 고구마를 모으면 열려요. (지금 ${total}개, ${g.unlock}개 필요)`;
  homeCs.say(open ? `춘춘? (${g.name} 해 볼까?)` : `춘... (고구마 ${g.unlock - total}개만 더 모으면 열려!)`);
}

// 레벨 목록: 레벨 1은 늘, 다음 레벨은 앞 레벨에서 고구마를 받으면 열린다
function renderLevels() {
  const g = GAMES[state.gameSel];
  setCards(g.levels.map((_, k) => {
    const L = gameLevel(g, k + 1);
    const open = isLevelOpen(g, k + 1, state.records);
    return `<div class="stage-card ${open ? '' : 'locked'}" data-idx="${k}">
      <span class="sc-top"><span class="sc-num">레벨 ${k + 1}</span>${open ? '' : `<span class="sc-lock">${icon('lock')}</span>`}</span>
      <span class="sc-name">${L.name}</span>
      <span class="sc-keys">${L.desc}</span>
      <span class="sc-goguma">${gogumaIcons(state.records[levelId(g, k + 1)]?.goguma ?? 0)}</span>
    </div>`;
  }).join(''), state.levelSel);
  $('mapPages').innerHTML = '';
  const n = state.levelSel + 1;
  const open = isLevelOpen(g, n, state.records);
  $('mapTip').textContent = open ? g.tip : `레벨 ${n - 1}에서 고구마를 1개라도 받으면 열려요.`;
  homeCs.say(open ? `춘춘! (레벨 ${n}, ${gameLevel(g, n).name}!)` : `춘... (레벨 ${n - 1}에서 고구마를 받으면 열려!)`);
}

// 잠긴 카드를 고르면: 흔들고 안내
function lockedShake(i) {
  sound.play('warn');
  renderHome();
  const card = $('stageMap').querySelector(`[data-idx="${i}"]`);
  if (card?.animate && !REDUCED_MOTION()) {
    card.animate([{ translate: '0 0' }, { translate: '-6px 0' }, { translate: '6px 0' }, { translate: '-3px 0' }, { translate: '0 0' }],
      { duration: 360, easing: 'ease-in-out' });
  }
}

// 화면이 바뀔 때: 살짝 아래에서 떠오르며 나타난다
function enter(el) {
  if (!el?.animate || REDUCED_MOTION()) return;
  el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: 'cubic-bezier(.22,.8,.24,1)' });
}

// 처음 화면: ← → 는 같은 줄 안에서, ↓ 카드 → 설정 줄, ↑ 설정 줄 → 카드
function moveMenu(dx, dy) {
  const n = MENU.length;
  const m = settingItems().length;
  const sel = state.menuSel;
  let next = sel;
  if (dy > 0 && sel < n) next = n;
  else if (dy < 0 && sel >= n) next = 0;
  else if (dx && sel < n) next = Math.min(n - 1, Math.max(0, sel + dx));
  else if (dx) next = Math.min(n + m - 1, Math.max(n, sel + dx));
  if (next === sel) return;
  state.menuSel = next;
  sound.play('move');
  renderHome();
}

function moveSel(delta) {
  if (state.page === 'menu') return moveMenu(Math.abs(delta) === 1 ? delta : 0, Math.abs(delta) === 1 ? 0 : delta);
  const [key, n] = {
    menu: ['menuSel', MENU.length], practice: ['sel', STAGES.length], games: ['gameSel', GAMES.length],
    levels: ['levelSel', GAMES[state.gameSel].levels.length],
  }[state.page];
  const next = state[key] + delta;
  if (next < 0 || next >= n) return;
  state[key] = next;
  sound.play('move');
  renderHome();
}

// 카드를 Enter(또는 톡)로 고름
function chooseHome(i) {
  if (state.page === 'menu' && i >= MENU.length) return chooseSetting(settingItems()[i - MENU.length].id);
  if (state.page === 'games') {
    state.gameSel = i;
    if (!isGameOpen(GAMES[i], allGoguma())) return lockedShake(i);
    state.levelSel = suggestLevel(GAMES[i], state.records) - 1;
    sound.play('select');
    return goHome('levels');
  }
  if (state.page === 'levels') {
    state.levelSel = i;
    if (!isLevelOpen(GAMES[state.gameSel], i + 1, state.records)) return lockedShake(i);
    sound.play('select');
    return startGame(state.gameSel, i + 1);
  }
  sound.play('select');
  if (state.page === 'menu') {
    state.menuSel = i;
    goHome(MENU[i].page);
  } else startStage(i);
}

$('stageMap').addEventListener('click', (e) => {
  const card = e.target.closest('.stage-card');
  if (card && state.screen === 'home') chooseHome(Number(card.dataset.idx));
});
$('homeSettings').addEventListener('click', (e) => {
  const chip = e.target.closest('.set-chip');
  if (!chip || state.screen !== 'home') return;
  state.menuSel = MENU.length + settingItems().findIndex((it) => it.id === chip.dataset.set);
  chooseSetting(chip.dataset.set);
});
$('navBtn').addEventListener('click', () => {
  const kind = $('navBtn').dataset.kind;
  if (kind === 'back') goBack();
  else if (kind === 'pause') pause();
  else if (kind === 'resume') choosePause('resume');
});

// ───── 연습 ─────

function startStage(i) {
  state.level = null;
  state.stageIdx = i;
  state.sel = i;
  state.stage = STAGES[i];
  state.roundIdx = 0;
  state.results = [];
  const type = state.stage.type;
  // 긴 글은 이야기 순서 그대로, 낱말은 덜 본 것 먼저, 짧은 글·검정은 새로 조립한 문장 + 덜 본 문장
  state.story = type === 'long' ? pickStory(state.stage, state.seen) : null;
  state.itemOrder = type === 'long' ? [...state.story.lines]
    : type === 'words' ? freshOrder(stageItems(state.stage), state.seen)
      : type === 'sentences' || type === 'test' ? sentenceOrder(state.stage, state.seen) : [];
  state.testStart = 0;
  bridge.focus();
  startRound();
}

function startRound() {
  const { stage, roundIdx } = state;
  const round = stage.rounds[roundIdx];
  const isWords = stage.type === 'words';
  const isLines = isLineType(stage.type);
  if (isWords) state.items = itemsForRound(state.itemOrder, stage, roundIdx).map((w) => `${w} `); // 낱말 뒤 스페이스까지 쳐야 다음 낱말
  else if (isLines) state.items = itemsForRound(state.itemOrder, stage, roundIdx);
  else state.items = [buildKeysRound(round).join('')];
  state.itemIdx = 0;
  state.roundAcc = { correct: 0, mistakes: 0, missByKey: {}, ms: 0 };
  state.streak = 0;
  startItem();
  playCs.pose('stand');
  playCs.say(round.hello || '춘춘! (같이 해 보자!)');
  $('track').classList.remove('done');
  $('trackRunner').querySelector('img').src = 'img/chunsik.png?v=202610030859';

  $('stageLabel').textContent = stageTitle(state.stageIdx);
  $('roundLabel').textContent = `${stageNum(state.stageIdx)} · ${round.title} (${roundIdx + 1}/${stage.rounds.length})`;
  $('tiles').hidden = isWords || isLines;
  $('words').hidden = !isWords;
  $('sentence').hidden = !(stage.type === 'sentences' || stage.type === 'test');
  $('story').hidden = stage.type !== 'long';
  $('tiles').innerHTML = isWords || isLines ? '' : tileRows(state.judge.units.length)
    .map(([a, b]) => `<div class="tile-row">${state.judge.units.slice(a, b).map((u) => `<div class="tile">${escapeHtml(u.ch)}</div>`).join('')}</div>`)
    .join('');
  const focus = new Set(['Backspace', 'CapsLock']);
  for (const ch of stageChars(stage)) for (const code of codesFor(ch)) focus.add(code);
  keyboard.setFocusSet([...focus]);
  show('play');
  render();
  checkFocusSoon();
  resetIdle();
}

// 목표 글 하나 시작 (낱말 연습은 낱말마다 새 판정기, 입력칸도 비운다)
function startItem() {
  state.awaitNext = false;
  state.judge = new Judge(state.items[state.itemIdx]);
  bridge.rebase();
  state.input = { raw: '', base: 0, composing: false };
}

// 목표 글 하나 끝: 합계에 더하고 다음 글로, 마지막이면 판 끝
function finishItem() {
  if (state.stage.type !== 'long') markSeen(state.seen, state.items[state.itemIdx].trim());
  const r = state.judge.result();
  const acc = state.roundAcc;
  acc.correct += r.correct;
  acc.mistakes += r.mistakes;
  acc.ms += state.judge.elapsed();
  for (const [k, n] of Object.entries(r.missByKey)) acc.missByKey[k] = (acc.missByKey[k] || 0) + n;
  if (state.itemIdx < state.items.length - 1) {
    state.itemIdx++;
    sound.play('word');
    startItem();
    render();
  } else {
    finishRound();
  }
}

function finishRound() {
  stopTestTimer();
  const { stage, roundAcc } = state;
  const total = roundAcc.correct + roundAcc.mistakes;
  state.results.push({
    round: stage.rounds[state.roundIdx].title,
    ...roundAcc,
    accuracy: total ? roundAcc.correct / total : null,
    cpm: cpmOf(roundAcc.correct, roundAcc.ms),
  });
  const last = state.roundIdx === stage.rounds.length - 1;
  state.screen = last ? 'stageDone' : 'roundDone'; // 입력은 바로 막고, 화면은 잠깐 뒤에
  sound.play('round');
  keyboard.setNext([]);
  hands.setTargets([]);
  clearTimeout(state.idleTimer);
  playCs.pose('goguma');
  playCs.act('cheer');
  playCs.say('츈츈츈!! (고구마 도착!)', 'good');
  $('track').classList.add('done');
  $('trackRunner').querySelector('img').src = 'img/chunsik-goguma.png?v=202610030859';
  setTimeout(() => (last ? showStageResult() : showRoundResult()), 1100);
}

// 결과 화면의 춘식이: 고구마를 많이 받으면 고구마 먹으며 신나고, 못 받으면 응원
function resultChunsik(goguma, doneText) {
  resultCs.pose(goguma > 0 ? 'goguma' : 'stand');
  resultCs.mood(goguma >= 2 ? 'party' : null);
  if (goguma >= 3) resultCs.say(`춘춘춘~!! (${doneText} 고구마 냠냠!)`, 'good');
  else if (goguma === 2) resultCs.say('츈츈! (맛있다! 잘했어!)', 'good');
  else if (goguma === 1) resultCs.say('춘! 춘춘! (고구마 하나 받았어!)', 'good');
  else resultCs.say('춘... 춘춘! (괜찮아, 한 번 더 해 보자!)');
}

function showRoundResult() {
  const r = state.results[state.results.length - 1];
  show('roundDone');
  $('resultAccLabel').textContent = '정확도';
  $('resultTitle').textContent = `${r.round} 끝! ${cheer(gogumaFor(r.accuracy))}`;
  $('resultAcc').textContent = pct(r.accuracy);
  $('resultGoguma').hidden = true;
  $('resultNote').hidden = true;
  $('resultRounds').innerHTML = hasSpeed() && r.cpm ? `타수 <b>${r.cpm}</b>타` : '';
  $('resultMiss').innerHTML = missText(r.missByKey);
  $('resultNext').textContent = '다음 판';
  resultChunsik(gogumaFor(r.accuracy), '완벽해!');
  keyboard.setNext(['Enter']);
}

function showStageResult() {
  const rs = state.results;
  const correct = rs.reduce((s, r) => s + r.correct, 0);
  const mistakes = rs.reduce((s, r) => s + r.mistakes, 0);
  const acc = correct + mistakes ? correct / (correct + mistakes) : null;
  const miss = {};
  for (const r of rs) for (const [k, n] of Object.entries(r.missByKey)) miss[k] = (miss[k] || 0) + n;
  const cpm = hasSpeed() ? cpmOf(correct, rs.reduce((s, r) => s + r.ms, 0)) : null;
  const isTest = state.stage.type === 'test';
  if (state.story) markSeen(state.seen, storyKey(state.story)); // 이 이야기는 다 읽음 → 다음엔 다른 이야기
  const saved = save(acc, cpm, isTest ? gogumaForTest(acc, cpm) : gogumaFor(acc));

  show('stageDone');
  $('resultAccLabel').textContent = '정확도';
  $('resultTitle').textContent = `${stageTitle(state.stageIdx)} 끝! ${cheer(saved.goguma)}`;
  $('resultAcc').textContent = pct(acc);
  $('resultGoguma').hidden = false;
  $('resultGoguma').innerHTML = gogumaIcons(saved.goguma);
  showNotes(saved, isTest ? '30타 넘게, 70% 넘게 정확하면 고구마를 받아요' : '정확도 70%를 넘으면 고구마를 받아요');
  $('resultRounds').innerHTML = rs.map((r) => `${escapeHtml(r.round)} <b>${pct(r.accuracy)}</b>`).join(' · ')
    + (cpm ? `<br>평균 타수 <b>${cpm}</b>타 · 최고 <b>${saved.bestCpm}</b>타` : '');
  if (state.stage.type === 'test') {
    // 검정은 타수가 주인공
    $('resultAccLabel').textContent = '타수';
    $('resultAcc').textContent = `${cpm ?? 0}타`;
    $('resultRounds').innerHTML = `정확도 <b>${pct(acc)}</b> · 친 문장 <b>${state.itemIdx}</b>개 · 최고 <b>${saved.bestCpm ?? 0}</b>타`;
  }
  $('resultMiss').innerHTML = missText(miss);
  $('resultNext').textContent = '단계 고르기';
  resultChunsik(saved.goguma, `${stageNum(state.stageIdx)} 끝!`);
  sound.play(saved.goguma > 0 ? 'fanfare' : 'cheer');
  $('accuracy').textContent = pct(acc);
  if (isTest) $('progress').textContent = '끝';
  keyboard.setNext(['Enter']);
}

// 기록 저장. 단계 지도로 돌아가면 다음에 할 만한 단계(고구마를 받았으면 다음 단계)를 골라 둔다
// 기록 저장. 새로 열린 게임·레벨 이름도 돌려준다 (연습으로 고구마를 모아도 게임이 열린다)
function save(acc, cpm = null, goguma = gogumaFor(acc)) {
  const before = unlockSnapshot();
  const id = state.level ? levelId(state.stage, state.level.n) : state.stage.id;
  const saved = saveStageResult(state.records, id, acc, cpm, goguma);
  if (!state.level) state.sel = suggestStage(STAGES, state.records);
  saved.opened = openedSince(before);
  return saved;
}

// 지금 열려 있는 게임·레벨 (게임id, 게임id:레벨)
function unlockSnapshot() {
  const total = allGoguma();
  const open = new Set();
  for (const g of GAMES) {
    if (!isGameOpen(g, total)) continue;
    open.add(g.id);
    g.levels.forEach((_, k) => isLevelOpen(g, k + 1, state.records) && open.add(levelId(g, k + 1)));
  }
  return open;
}

function openedSince(before) {
  const now = unlockSnapshot();
  const names = [];
  for (const g of GAMES) {
    if (now.has(g.id) && !before.has(g.id)) names.push(`게임 ${g.name}`);
    else g.levels.forEach((_, k) => {
      const id = levelId(g, k + 1);
      if (now.has(id) && !before.has(id)) names.push(`${g.name} 레벨 ${k + 1}`);
    });
  }
  return names;
}

function showNotes(saved, failText) {
  const notes = [];
  if (saved.opened?.length) notes.push(`🔓 ${saved.opened.join(' · ')} 열렸어요!`);
  if (saved.newBest) notes.push('🎉 새 기록!');
  if (saved.newBestCpm) notes.push('⚡ 타수 새 기록!');
  if (!saved.goguma) notes.push(failText);
  $('resultNote').hidden = !notes.length;
  $('resultNote').textContent = notes.join('  ');
}

// ───── 일시정지: Esc(또는 ⏸ 단추) → 계속하기 / 처음부터 다시 / 나가기 ─────

const PAUSE_ITEMS = [
  { act: 'resume', label: '▶ 계속하기' },
  { act: 'restart', label: '🔄 처음부터 다시' },
  { act: 'exit', label: '🏠 나가기' },
];

function pause() {
  if (state.paused || !(state.screen === 'play' || state.screen === 'game')) return;
  bridge.hold();
  if (state.screen !== 'play' && state.screen !== 'game') { bridge.release(); return; } // 멈추기 직전에 친 키로 판이 끝났으면 멈추지 않는다
  state.paused = { at: Date.now(), sel: 0 };
  sound.play('pause');
  clearTimeout(state.idleTimer);
  stopTestTimer();
  state.game?.pause();
  $('pauseSub').textContent = $('roundLabel').textContent;
  $('pauseLayer').hidden = false;
  setNav('resume');
  keyboard.setNext(['Enter']);
  hands.setTargets([]);
  renderPause();
}

function renderPause() {
  const exitTo = state.level ? '레벨 고르기' : '단계 고르기';
  $('pauseMenu').innerHTML = PAUSE_ITEMS.map((it, i) =>
    `<button type="button" class="pause-item ${i === state.paused.sel ? 'selected' : ''}" data-act="${it.act}">${it.label}${it.act === 'exit' ? ` <small>(${exitTo})</small>` : ''}</button>`).join('');
}

function movePause(delta) {
  const next = state.paused.sel + delta;
  if (next < 0 || next >= PAUSE_ITEMS.length) return;
  state.paused.sel = next;
  sound.play('move');
  renderPause();
}

// 창만 닫는다 (화면이 바뀔 때도 부른다)
function closePause() {
  if (!state.paused) return;
  state.paused = null;
  $('pauseLayer').hidden = true;
}

function choosePause(act) {
  const p = state.paused;
  if (!p) return;
  closePause();
  if (act === 'restart') {
    if (state.level) startGame(state.gameSel, state.level.n);
    else startStage(state.stageIdx);
    return;
  }
  if (act === 'exit') {
    bridge.rebase();
    goHome();
    return;
  }
  // 계속하기: 멈춘 시간은 타수·검정 시간에서 뺀다 (입력칸을 풀기 전에: 풀 때 들어온 키로 시계가 새로 시작될 수 있다)
  const gap = Date.now() - p.at;
  setNav('pause');
  if (state.screen === 'play') {
    const { judge } = state;
    if (judge.startedAt && !judge.finishedAt) judge.startedAt += gap;
    if (state.testStart) { state.testStart += gap; runTestTimer(); }
    resetIdle();
  } else if (state.screen === 'game' && !state.warn && !document.hidden) {
    state.game.resume();
  }
  bridge.release();
  if (state.screen === 'play') render();
  else if (state.screen === 'game') renderGame();
}

$('pauseMenu').addEventListener('click', (e) => {
  const item = e.target.closest('.pause-item');
  if (item) choosePause(item.dataset.act);
});

// ───── 게임 (공통): 레벨로 시작, 종류별(GAME_KINDS)로 그리기·입력, 끝나면 결과 ─────

function startGame(gi, n) {
  state.game?.stop(); // 처음부터 다시: 하던 게임 치우기
  state.game = null;
  state.gameSel = gi;
  state.levelSel = n - 1;
  const game = state.stage = GAMES[gi];
  state.level = gameLevel(game, n);
  state.combo = 0;
  state.bestCombo = 0;
  const focus = new Set(['Backspace', 'CapsLock', 'Space']);
  for (const ch of levelKeys(n)) for (const code of codesFor(ch)) focus.add(code);
  keyboard.setFocusSet([...focus]);

  bridge.rebase();
  state.input = { raw: '', base: 0, composing: false };
  const title = `${gameTitle(game)} · 레벨 ${n}`;
  $('roundLabel').textContent = title;
  $('stageLabel').textContent = title;
  $('track').classList.remove('done');
  $('trackRunner').querySelector('img').src = 'img/chunsik.png?v=202610030859';
  $('gameScreen').dataset.kind = game.type;
  $('gameCombo').hidden = true;
  show('game');
  gameCs.pose('stand');
  GAME_KINDS[game.type].start(state.level);
  state.game.start();
  checkFocusSoon();
  renderGame();
}

function renderGame() {
  if (state.game) GAME_KINDS[state.stage.type].render();
}

// 게임 끝: 잠깐 뒤 결과
function endGame(stats) {
  state.screen = 'stageDone';
  keyboard.setNext([]);
  hands.setTargets([]);
  $('track').classList.add('done');
  setTimeout(() => showGameResult(stats), 800);
}

// 콤보: 연달아 맞히면 커지고, 놓치거나 틀리면 0
function comboUp() {
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const c = $('gameCombo');
  c.hidden = state.combo < 2;
  c.textContent = `🔥 ${state.combo} 콤보!`;
  c.classList.remove('pop');
  void c.offsetWidth;
  c.classList.add('pop');
  if (state.combo >= 3 && state.combo % 3 === 0) gameCs.say(`춘춘춘!! (${state.combo} 콤보! 대단해!)`, 'good');
}

function comboBreak() {
  state.combo = 0;
  $('gameCombo').hidden = true;
}

// 결과: 보통은 hits/total로 고구마. 달리기처럼 따로 정하면 acc·goguma·value를 넘긴다. lines: 아래에 덧붙일 기록들
function showGameResult({
  hits, total, acc = total ? hits / total : 0, goguma = gogumaFor(acc), cpm = null,
  label = '잡은 고구마', value = `${hits} / ${total}`, lines = [], failText = '70% 넘게 해내면 고구마를 받아요',
}) {
  const saved = save(acc, cpm, goguma);
  const { n } = state.level;
  const game = state.stage;
  if (n < game.levels.length && isLevelOpen(game, n + 1, state.records) && saved.goguma > 0) state.levelSel = n; // 다음 레벨을 골라 둔다
  show('stageDone');
  $('resultTitle').textContent = `${gameTitle(game)} 레벨 ${n} 끝! ${cheer(saved.goguma)}`;
  $('resultAccLabel').textContent = label;
  $('resultAcc').textContent = value;
  $('resultGoguma').hidden = false;
  $('resultGoguma').innerHTML = gogumaIcons(saved.goguma);
  showNotes(saved, failText);
  if (state.bestCombo >= 2) lines.push(`최고 콤보 <b>${state.bestCombo}</b>`);
  $('resultRounds').innerHTML = lines.join(' · ');
  $('resultMiss').innerHTML = '';
  $('resultNext').textContent = '레벨 고르기';
  resultChunsik(saved.goguma, '게임 끝!');
  sound.play(saved.goguma > 0 ? 'fanfare' : 'cheer');
  keyboard.setNext(['Enter']);
}

// ───── 게임: 고구마 비 (떨어지는 낱말을 치고 스페이스바) ─────

function startRain(level) {
  gameCs.say('츈츈! (떨어지는 고구마를 잡아 줘!)');
  $('gameHint').textContent = '고구마에 적힌 낱말을 치고 스페이스바!';
  state.game = new RainGame($('rain'), {
    words: levelWords(level.n),
    total: level.total,
    maxActive: level.max,
    fall: level.fall,
    gap: level.gap,
    onSpawn: renderGame,
    onCatch: () => {
      sound.play('catch');
      gameCs.pose('goguma');
      gameCs.act('hop');
      gameCs.say(pick(['츈츈! (냠냠 맛있다!)', '춘춘춘!! (하나 더!)', '춘! (고구마 최고!)', '츈~ (배불러~)']), 'good');
      comboUp();
      hopRunner();
      setTimeout(() => state.screen === 'game' && gameCs.pose('stand'), 900);
      renderGame();
    },
    onMiss: (d) => {
      sound.play('drop');
      comboBreak();
      gameCs.pose('sad');
      gameCs.act('oops');
      gameCs.say(`츄... (${d.word} 고구마를 놓쳤어...)`, 'bad');
      setTimeout(() => state.screen === 'game' && gameCs.pose('stand'), 1200);
      renderGame();
    },
    onEnd: ({ caught, missed, wrong, total }) => endGame({
      hits: caught, total, lines: [`놓친 고구마 <b>${missed}</b>개`, `없는 낱말 <b>${wrong}</b>번`],
    }),
  });
}

// 게임 입력: 스페이스(또는 Enter)가 오면 친 낱말을 낸다
function onRainInput({ raw, base, keys, composing }) {
  const prevLen = toKeys(state.input.raw).length - state.input.base;
  state.input = { raw, base, composing };
  // 새로 친 키가 한글이면 영어 모드 경고를 걷고 게임을 다시 움직인다
  if (state.warn === 'english' && keys.length > prevLen && isHangul(keys.at(-1))) setWarn(null);
  if (keys.length > prevLen && isHangul(keys.at(-1))) sound.play('key');
  if (keys.at(-1) === ' ') return submitGameWord();
  renderGame();
}

function typedText() {
  const { raw, base } = state.input;
  return toUnits(raw).filter((u) => u.end > base).map((u) => u.ch).join('').trim();
}

function submitGameWord() {
  if (state.screen !== 'game' || state.stage.type !== 'rain') return;
  const word = typedText();
  bridge.rebase();
  state.input = { raw: '', base: 0, composing: false };
  if (word && state.game && !state.game.submit(word)) {
    sound.play('miss');
    comboBreak();
    gameCs.pose('sad');
    gameCs.act('oops');
    gameCs.say(`춘? ('${word}' 고구마는 없어!)`, 'bad');
    setTimeout(() => state.screen === 'game' && gameCs.pose('stand'), 900);
    shake($('gameBar'));
  }
  renderGame();
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function renderRain() {
  const game = state.game;
  const { raw, base, composing } = state.input;
  const typed = toKeys(raw).slice(base).filter((k) => k !== ' ');
  const target = game.pickFocus(typed);
  const bad = typed.length > 0 && !target;

  // 친 글자 막대
  const units = toUnits(raw).filter((u) => u.end > base && u.ch !== ' ');
  $('gameText').innerHTML = units.map((u, i) =>
    `<span class="${bad ? 'bad' : 'ok'} ${composing && i === units.length - 1 ? 'composing' : ''}">${escapeHtml(u.ch)}</span>`).join('');
  $('gameHint').hidden = units.length > 0;
  $('gameBar').classList.toggle('bad', bad);

  // 다음에 칠 키: 가장 아래 고구마(또는 치고 있는 고구마)의 다음 글자, 다 쳤으면 스페이스
  let codes = [];
  if (state.warn === 'english') codes = ['CapsLock'];
  else if (bad) codes = ['Backspace'];
  else if (target) {
    const next = target.keys[typed.length] ?? ' ';
    codes = next === ' ' ? ['Space'] : codesFor(next);
  }
  keyboard.setNext(codes, state.warn === 'english' ? 'warn' : 'finger');
  hands.setTargets(codes);

  $('progress').textContent = `${game.caught}/${game.total}`;
  $('accuracy').textContent = pct(game.resolved ? game.caught / game.resolved : null);
  $('track').style.setProperty('--p', game.resolved / game.total);
}

// ───── 게임: 고구마 캐기 (쏙 나온 고구마의 글자 키를 하나씩) ─────

function startDig(level) {
  gameCs.say('춘춘! (고구마가 나오면 그 글자 키를 눌러 줘!)');
  state.digLen = 0;
  state.game = new DigGame($('rain'), {
    keys: levelKeys(level.n),
    total: level.total,
    stay: level.stay,
    every: level.every,
    max: level.max,
    onSpawn: renderGame,
    onHit: () => {
      sound.play('catch');
      gameCs.pose('goguma');
      gameCs.act('hop');
      gameCs.say(pick(['츈츈! (쏙! 캤다!)', '춘춘! (맛있겠다!)', '춘! (하나 더!)', '츈~ (고구마 부자!)']), 'good');
      comboUp();
      hopRunner();
      setTimeout(() => state.screen === 'game' && gameCs.pose('stand'), 700);
      renderGame();
    },
    onMiss: (g) => {
      sound.play('drop');
      comboBreak();
      gameCs.pose('sad');
      gameCs.say(`츄... (${g.key} 고구마가 들어가 버렸어...)`, 'bad');
      setTimeout(() => state.screen === 'game' && gameCs.pose('stand'), 900);
      renderGame();
    },
    onEnd: ({ hits, missed, wrong, total }) => endGame({
      hits, total, label: '캔 고구마', lines: [`놓친 고구마 <b>${missed}</b>개`, `틀린 키 <b>${wrong}</b>번`],
    }),
  });
}

// 새로 눌린 키만 하나씩 낸다. 입력기가 ㅁ+ㅏ → 마로 묶어도 키 순서는 그대로라 마지막 키만 보면 된다
function onDigInput({ keys }) {
  const fresh = keys.slice(state.digLen);
  state.digLen = keys.length;
  for (const k of fresh) {
    if (k === ' ' || !isHangul(k)) continue;
    if (state.warn === 'english') setWarn(null);
    const code = keyFor(k)?.code;
    if (state.game.press(k)) {
      if (code) keyboard.flash(code, 'ok');
    } else {
      sound.play('miss');
      comboBreak();
      if (code) keyboard.flash(code, 'bad');
      gameCs.say(`춘? (${k} 고구마는 없어!)`, 'bad');
    }
  }
  bridge.rebase(); // 입력칸이 길어지지 않게 (조합 중이면 시작 위치만 옮김)
  state.digLen = 0;
  renderGame();
}

function renderDig() {
  const game = state.game;
  const target = state.level.hint ? game.oldest() : null;
  const codes = state.warn === 'english' ? ['CapsLock'] : target ? codesFor(target.key) : [];
  keyboard.setNext(codes, state.warn === 'english' ? 'warn' : 'finger');
  hands.setTargets(codes);
  $('progress').textContent = `${game.hits}/${game.total}`;
  $('accuracy').textContent = pct(game.resolved ? game.hits / game.resolved : null);
  $('track').style.setProperty('--p', game.resolved / game.total);
}

// ───── 게임: 춘식이 달리기 (낱말 + 스페이스바, 동물 친구와 경주) ─────

function startRace(level) {
  const items = freshOrder(levelWords(level.n), state.seen).slice(0, level.words).map((w) => `${w} `);
  const totalKeys = items.reduce((n, w) => n + toKeys(w).length, 0);
  state.race = { items, idx: 0, judge: new Judge(items[0]), doneKeys: 0, totalKeys, correct: 0, mistakes: 0, over: false };
  $('gameHint').textContent = '첫 글자를 치면 출발!';
  state.game = new RaceGame($('rain'), {
    rival: level.rival,
    rivalName: level.rivalName,
    totalKeys,
    cpm: level.cpm,
    onRivalWin: () => finishRace(false),
  });
}

// 낱말 연습과 같은 판정: 틀리면 Backspace로 지워야 넘어간다. 첫 키에 동물도 출발
function onRaceInput({ raw, base, keys, composing }) {
  const race = state.race;
  if (!race || race.over) return;
  state.input = { raw, base, composing };
  const { judge } = race;
  const events = judge.update(keys);
  if (events.length && !state.game.started) state.game.go();
  for (const ev of events) {
    if (ev.kind === 'latin') continue;
    if (isHangul(ev.key) && state.warn === 'english') setWarn(null);
    const code = keyFor(ev.key)?.code;
    if (ev.kind === 'ok' || ev.kind === 'retype') {
      sound.play('key');
      if (code) keyboard.flash(code, 'ok');
    } else {
      sound.play('miss');
      if (code) keyboard.flash(code, 'bad');
      shake($('gameBar'));
    }
  }
  if (judge.done) {
    race.correct += judge.correct;
    race.mistakes += judge.mistakes;
    race.doneKeys += judge.target.length;
    race.idx++;
    if (race.idx >= race.items.length) return finishRace(true);
    sound.play('word');
    race.judge = new Judge(race.items[race.idx]);
    bridge.rebase();
    state.input = { raw: '', base: 0, composing: false };
  }
  renderGame();
}

// 끝: 춘식이가 먼저(win) 또는 동물이 먼저. 이겼을 때만 정확도로 고구마
function finishRace(win) {
  const race = state.race;
  if (race.over) return;
  race.over = true;
  const game = state.game;
  if (win) {
    game.finish();
    game.setMe(1);
    $('progress').textContent = `${race.idx}/${race.items.length}`;
    $('track').style.setProperty('--p', 1);
  } else {
    race.correct += race.judge.correct;
    race.mistakes += race.judge.mistakes;
  }
  const typed = race.correct + race.mistakes;
  const acc = typed ? race.correct / typed : 0;
  const cpm = game.t >= 2000 ? Math.round(race.correct / (game.t / 60000)) : null;
  const { rivalName, cpm: rivalCpm } = state.level;
  sound.play(win ? 'round' : 'drop');
  endGame({
    acc, cpm, goguma: win ? gogumaFor(acc) : 0,
    label: '달리기', value: win ? '🏁 이겼어요!' : '아쉽게 졌어요',
    lines: [`정확도 <b>${pct(acc)}</b>`, `춘식이 <b>${cpm ?? '–'}</b>타`, `${rivalName} <b>${rivalCpm}</b>타`],
    failText: win ? '정확도 70%를 넘으면 고구마를 받아요' : `${rivalName}보다 먼저 들어오면 고구마를 받아요`,
  });
}

function renderRace() {
  const race = state.race;
  const game = state.game;
  const { judge } = race;
  // 지금 낱말: 글자마다 색, 다 치면 스페이스 표시
  const states = judge.unitStates();
  const chars = judge.units.slice(0, -1).map((u, i) => `<span class="${states[i]}">${escapeHtml(u.ch)}</span>`).join('');
  const spaceNext = judge.nextKey === ' ' && !judge.hasError;
  game.wordEl.innerHTML = `${chars}<span class="race-space ${spaceNext ? 'next' : ''}">스페이스 ⎵</span>`;
  game.nextEl.textContent = race.items.slice(race.idx + 1).map((w) => w.trim()).join(' · ') || '마지막 낱말!';
  // 친 글자 막대
  const { raw, base, composing } = state.input;
  const units = toUnits(raw).filter((u) => u.end > base && u.ch !== ' ');
  $('gameText').innerHTML = units.map((u, i) =>
    `<span class="${judge.hasError ? 'bad' : 'ok'} ${composing && i === units.length - 1 ? 'composing' : ''}">${escapeHtml(u.ch)}</span>`).join('');
  $('gameHint').hidden = units.length > 0;
  $('gameBar').classList.toggle('bad', judge.hasError);
  // 다음 키
  let codes;
  if (state.warn === 'english') codes = ['CapsLock'];
  else if (judge.hasError) codes = ['Backspace'];
  else if (judge.nextKey === ' ') codes = ['Space'];
  else codes = judge.nextKey ? codesFor(judge.nextKey) : [];
  keyboard.setNext(codes, state.warn === 'english' ? 'warn' : 'finger');
  hands.setTargets(codes);
  // 춘식이 자리: 맞게 친 키만큼
  const me = (race.doneKeys + judge.okLen) / race.totalKeys;
  game.setMe(me);
  const c = race.correct + judge.correct;
  const m = race.mistakes + judge.mistakes;
  $('progress').textContent = `${race.idx}/${race.items.length}`;
  $('accuracy').textContent = pct(c + m ? c / (c + m) : null);
  $('track').style.setProperty('--p', me);
}

// 게임 종류별: 시작 · 입력 · 그리기
const GAME_KINDS = {
  race: { start: startRace, input: onRaceInput, render: renderRace },
  dig: { start: startDig, input: onDigInput, render: renderDig },
  rain: { start: startRain, input: onRainInput, render: renderRain },
};

// ───── 입력 처리 ─────

function onChange({ raw, base, keys, composing }) {
  if (state.screen === 'game') return GAME_KINDS[state.stage.type].input({ raw, base, keys, composing });
  if (state.screen !== 'play') return;
  state.input = { raw, base, composing };
  const { judge } = state;
  if (state.awaitNext) {
    // 짧은 글·긴 글·검정: 문장을 다 친 뒤에는 판정하지 않고 스페이스바(또는 Enter)만 기다린다
    if (keys.length > judge.target.length && keys.at(-1) === ' ') finishItem();
    else renderTyped();
    return;
  }
  const hadError = judge.hasError;
  const events = judge.update(keys);
  resetIdle();
  if (state.stage.type === 'test' && !state.testStart && events.length) startTestTimer();
  for (const ev of events) {
    if (ev.kind === 'latin') continue;
    if (isHangul(ev.key) && state.warn === 'english') setWarn(null);
    const code = keyFor(ev.key)?.code;
    if (ev.kind === 'ok' || ev.kind === 'retype') {
      sound.play('key');
      if (code) keyboard.flash(code, 'ok');
      playCs.act('hop');
      hopRunner();
      if (ev.kind === 'ok' && ++state.streak % 5 === 0) playCs.say(pick(CHEERS), 'good');
    } else if (ev.kind === 'miss') {
      sound.play('miss');
      if (code) keyboard.flash(code, 'bad');
      state.streak = 0;
      shakeCurrentTile();
      playCs.pose('sad'); // 틀리면 베개 안고 우는 춘식이
      playCs.act('oops');
      playCs.say(`${pick(SAD)} (${missLine(ev)} ⌫ Backspace로 지우자)`, 'bad');
    } else if (ev.kind === 'extra') {
      sound.play('miss');
      if (code) keyboard.flash(code, 'bad');
      playCs.say('춘!! 춘춘!! (⌫ Backspace를 먼저 눌러 줘!)', 'bad');
    }
  }
  if (hadError && !judge.hasError) {
    playCs.pose('stand');
    playCs.say('춘! (좋아, 다시!)');
  }
  render();
  if (judge.done) {
    if (isLineType(state.stage.type)) {
      state.awaitNext = true;
      playCs.say('춘춘! (Enter를 누르면 다음 문장!)', 'good');
      render();
    } else {
      finishItem();
    }
  }
}

// 틀렸을 때 무엇을 쳤는지 말로 (Shift를 빼먹은 경우는 따로 알려 준다)
function missLine({ key, expect }) {
  const want = keyFor(expect);
  const got = keyFor(key);
  if (want?.shift && got && !got.shift && got.code === want.code) {
    return `앗! ${charName(expect)}${josa(expect, '은', '는')} Shift를 누른 채 쳐야 해.`;
  }
  const typed = got ? `${charName(key)}${josa(key, '을', '를')}` : '다른 키를';
  return `앗! ${charName(expect)} 대신 ${typed} 쳤어.`;
}

function onLatin() {
  if (state.screen === 'play' || state.screen === 'game') setWarn('english');
}

document.addEventListener('keydown', (e) => {
  // 입력칸이 포커스를 잃었으면 되찾는다 (키보드만으로 진행)
  if (!bridge.focused) {
    bridge.focus();
    if (state.screen === 'play') checkFocusSoon();
  }
  if (NAV_KEYS.has(e.key)) e.preventDefault(); // 커서 이동·포커스 이동 막기

  if (state.paused) {
    // 일시정지 창: ↑↓로 고르고 Enter, Esc는 계속하기 (멈춘 동안 친 글자는 bridge가 판정에 안 넘긴다)
    if (e.repeat) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') movePause(-1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') movePause(1);
    else if (e.key === 'Enter') choosePause(PAUSE_ITEMS[state.paused.sel].act);
    else if (e.key === 'Escape') choosePause('resume');
    return;
  }

  if (state.screen === 'home') {
    if (e.key === 'ArrowLeft') moveSel(-1);
    else if (e.key === 'ArrowRight') moveSel(1);
    else if (e.key === 'ArrowUp') moveSel(-MAP_COLS);
    else if (e.key === 'ArrowDown') moveSel(MAP_COLS);
    else if (e.key === 'Enter' && !e.repeat) chooseHome({ menu: state.menuSel, practice: state.sel, games: state.gameSel, levels: state.levelSel }[state.page]);
    else if (e.key === 'Escape') goBack();
  } else if (state.screen === 'play') {
    resetIdle();
    if (e.key === 'Enter' && state.awaitNext && !e.repeat) finishItem();
    if (e.key === 'Escape' && !e.repeat) pause();
  } else if (state.screen === 'game') {
    if (e.key === 'Enter' && !e.repeat) setTimeout(submitGameWord, 30); // 조합이 확정된 뒤 읽는다
    if (e.key === 'Escape' && !e.repeat) pause();
  } else if (!$('resultScreen').hidden) {
    if (e.key === 'Enter' && !e.repeat) {
      if (state.screen === 'roundDone') { state.roundIdx++; startRound(); }
      else goHome();
    } else if (e.key === 'Escape') goHome();
  }

  if (e.code && !keyFor(e.key)) keyboard.flash(e.code, 'press'); // Backspace·Enter 등 눌림 표시
});

// 화면을 톡 눌러도 입력칸 포커스 (iOS는 click 쪽에서만 포커스를 허용하기도 해서 둘 다)
for (const type of ['pointerdown', 'click']) {
  document.addEventListener(type, () => {
    bridge.focus();
    if (state.warn === 'focus' && bridge.focused) setWarn(null);
  });
}
$('ime').addEventListener('focus', () => { if (state.warn === 'focus') setWarn(null); });
$('ime').addEventListener('blur', () => { if (state.screen === 'play' || state.screen === 'game') checkFocusSoon(); });

function checkFocusSoon() {
  setTimeout(() => {
    if ((state.screen === 'play' || state.screen === 'game') && !bridge.focused) setWarn('focus');
  }, 300);
}

// 다른 앱으로 갔다 오면 게임을 멈춘다
document.addEventListener('visibilitychange', () => {
  if (!state.game) return;
  if (document.hidden) state.game.pause();
  else if (!state.warn && !state.paused) state.game.resume();
});

// ───── 그리기 ─────

const WARNINGS = {
  english: { icon: '🔤', text: '지금 영어로 입력돼요. Caps Lock을 눌러 한글로 바꿔요', chunsik: '춘?! (어? 영어가 나와!)' },
  focus: { icon: '👆', text: '화면을 한 번 톡 눌러 주세요', chunsik: '춘춘~ (나를 톡 눌러 줘!)' },
};

function setWarn(kind) {
  if (state.warn === kind) return;
  state.warn = kind;
  const b = $('banner');
  b.hidden = !kind;
  $('gameBanner').hidden = !kind;
  $('playScreen').classList.toggle('warning', !!kind && kind !== 'focus');
  if (kind) {
    sound.play('warn');
    $('bannerIcon').textContent = WARNINGS[kind].icon;
    $('bannerText').textContent = WARNINGS[kind].text;
    $('gameBanner').textContent = `${WARNINGS[kind].icon} ${WARNINGS[kind].text}`;
    playCs.act('oops');
    playCs.say(WARNINGS[kind].chunsik, 'warn');
    gameCs.say(WARNINGS[kind].chunsik, 'warn');
  } else if (state.screen === 'play') {
    playCs.say('');
  }
  // 게임은 경고가 떠 있는 동안 멈춘다 (고구마가 억울하게 떨어지지 않게)
  if (state.game) kind || state.paused ? state.game.pause() : state.game.resume();
  if (state.screen === 'play') render();
  if (state.screen === 'game') renderGame();
}

function render() {
  const { judge } = state;
  if (!judge) return;

  const isWords = state.stage.type === 'words';
  const isLines = isLineType(state.stage.type);
  if (isWords) renderWords();
  if (state.stage.type === 'long') renderStory();
  else if (isLines) renderSentence();
  // 글자 타일 (자리 연습)
  const tiles = isWords || isLines ? [] : $('tiles').querySelectorAll('.tile');
  if (!isWords && !isLines) judge.units.forEach((u, i) => {
    const t = tiles[i];
    const cur = i === currentUnit(judge);
    t.className = 'tile';
    if (u.end <= judge.okLen) t.classList.add('done');
    if (cur) {
      t.classList.add('current', `tone-${fingerTone(FINGER_BY_CODE[keyFor(judge.nextKey)?.code])}`);
      if (judge.hasError) t.classList.add('error');
    }
  });

  renderTyped();
  const n = state.items.length;
  const part = judge.okLen / judge.target.length; // 지금 글을 친 비율
  $('progress').textContent = isWords || isLines ? `${state.itemIdx + (judge.done ? 1 : 0)}/${n}` : `${judge.okLen}/${judge.target.length}`;
  $('track').style.setProperty('--p', (state.itemIdx + part) / n);
  if (state.stage.type === 'test') renderTestClock();
  const c = state.roundAcc.correct + judge.correct;
  const m = state.roundAcc.mistakes + judge.mistakes;
  $('accuracy').textContent = pct(c + m ? c / (c + m) : null);
  if (hasSpeed()) {
    const cpm = cpmOf(c, state.roundAcc.ms + judge.elapsed());
    $('speed').textContent = cpm ? `${cpm}타` : '–';
  }

  // 다음에 칠 키 / 손가락 안내
  //   경고 중이면 고치는 키(Caps Lock)를, 틀렸으면 Backspace를, 아니면 목표 키를 가리킨다
  let codes;
  let guide;
  if (state.warn === 'english') {
    codes = ['CapsLock'];
    guide = { big: '한/영', small: 'Caps Lock', finger: 'L5' };
  } else if (judge.hasError) {
    codes = ['Backspace'];
    guide = { big: '⌫', small: 'Backspace', finger: 'R5' };
  } else if (state.awaitNext) {
    codes = ['Enter'];
    guide = { big: '⏎', small: 'Enter', finger: 'R5', fingerText: '다음 문장!' };
  } else if (judge.done) {
    codes = [];
    guide = { big: '✓', small: '끝!', finger: null };
  } else if (judge.nextKey === ' ') {
    codes = ['Space'];
    guide = { big: '⎵', small: '스페이스바', finger: 'T', fingerText: isWords ? '엄지로 다음 낱말!' : '엄지손가락' };
  } else {
    const key = keyFor(judge.nextKey);
    codes = codesFor(judge.nextKey);
    const main = codes[codes.length - 1];
    guide = key?.shift
      ? { big: judge.nextKey, small: `Shift + ${KEY_LABEL[main]}`, finger: FINGER_BY_CODE[main], fingerText: `${FINGER_NAMES[FINGER_BY_CODE[main]]} + Shift` }
      : { big: judge.nextKey, small: `${KEY_LABEL[main] ?? ''} 자리`, finger: FINGER_BY_CODE[main] };
  }
  keyboard.setNext(codes, state.warn === 'english' ? 'warn' : 'finger');
  hands.setTargets(guide.finger ? codes : []);

  const tone = `tone-${fingerTone(guide.finger)}`;
  $('guideCard').className = `guide-card ${tone}${guide.big.length > 1 ? ' wide-text' : ''}`;
  $('guideFinger').className = `guide-finger ${tone}`;
  $('guideJamo').textContent = guide.big;
  $('guideKey').textContent = guide.small;
  $('guideFinger').textContent = guide.fingerText || FINGER_NAMES[guide.finger] || '';
}

// 낱말 연습 화면: 이번 판 낱말 줄 + 지금 낱말(글자마다 색, 다 치면 스페이스 표시)
function renderWords() {
  const { judge, items, itemIdx } = state;
  $('wordQueue').innerHTML = items.map((w, i) =>
    `<span class="wq ${i < itemIdx ? 'done' : i === itemIdx ? 'current' : ''}">${escapeHtml(w.trim())}</span>`).join('');
  const word = items[itemIdx].trim();
  const states = judge.unitStates();
  const chars = judge.units.slice(0, -1).map((u, i) => `<span class="${states[i]}">${escapeHtml(u.ch)}</span>`).join('');
  const spaceState = states[states.length - 1];
  const spaceCls = spaceState === 'done' ? 'done' : judge.nextKey === ' ' && !judge.hasError ? 'next' : '';
  $('wordBig').innerHTML = `<span class="wb-emoji">${state.stage.words[word] || ''}</span>
    <span class="wb-chars">${chars}</span><span class="wb-space ${spaceCls}">스페이스 ⎵</span>`;
}

// 문장 한 줄: 글자마다 색, 띄어쓰기 자리 표시, 다 쳤으면 Enter 표시
function lineHtml() {
  const { judge } = state;
  const states = judge.unitStates();
  const html = judge.units.map((u, i) => {
    if (u.ch === ' ') {
      const next = !judge.hasError && judge.okLen === u.start;
      return `<span class="sp ${states[i]} ${next ? 'next' : ''}"></span>`;
    }
    return `<span class="${states[i]}">${escapeHtml(u.ch)}</span>`;
  }).join('');
  return html + (state.awaitNext ? '<span class="sent-enter">Enter ⏎</span>' : '');
}

// 짧은 글·검정 화면: 지금 문장 + 다음 문장
function renderSentence() {
  const { items, itemIdx } = state;
  $('sentBig').innerHTML = lineHtml();
  const next = items[itemIdx + 1];
  $('sentNext').textContent = next ? `다음: ${next}` : '마지막 문장이에요';
}

// 긴 글 화면: 이야기 전체에서 앞 줄 · 지금 줄 · 다음 두 줄 (판이 바뀌어도 이어서)
function renderStory() {
  const { stage, roundIdx, itemIdx } = state;
  const at = stage.rounds.slice(0, roundIdx).reduce((n, r) => n + r.count, 0) + itemIdx;
  const { lines } = state.story;
  $('storyPrev').textContent = at > 0 ? lines[at - 1] : `📖 ${state.story.title}`;
  $('storyCur').innerHTML = lineHtml();
  $('storyNext').innerHTML = lines.slice(at + 1, at + 3).map(escapeHtml).join('<br>') || '이야기의 마지막 줄이에요';
}

function isLineType(type) {
  return type === 'sentences' || type === 'long' || type === 'test';
}

// ───── 타자 검정: 첫 키부터 시간 재기 ─────

function startTestTimer() {
  state.testStart = Date.now();
  runTestTimer();
}

function runTestTimer() {
  stopTestTimer();
  state.testTimer = setInterval(() => {
    if (Date.now() - state.testStart >= state.stage.duration) endTest();
    else renderTestClock();
  }, 200);
}

function stopTestTimer() {
  clearInterval(state.testTimer);
  state.testTimer = 0;
}

function renderTestClock() {
  const left = state.testStart ? Math.max(0, state.stage.duration - (Date.now() - state.testStart)) : state.stage.duration;
  const sec = Math.ceil(left / 1000);
  $('progress').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  $('track').style.setProperty('--p', 1 - left / state.stage.duration);
  const c = state.roundAcc.correct + state.judge.correct;
  const cpm = state.testStart ? cpmOf(c, Math.min(state.stage.duration, Date.now() - state.testStart)) : null;
  $('speed').textContent = cpm ? `${cpm}타` : '–';
}

// 시간이 다 되면: 치던 문장까지 더하고 끝 (타수는 정확히 검정 시간으로 나눈다)
function endTest() {
  if (state.screen !== 'play') return;
  const r = state.judge.result();
  const acc = state.roundAcc;
  acc.correct += r.correct;
  acc.mistakes += r.mistakes;
  for (const [k, n] of Object.entries(r.missByKey)) acc.missByKey[k] = (acc.missByKey[k] || 0) + n;
  acc.ms = state.stage.duration;
  finishRound();
}

// 타수: 1분에 맞게 친 키 수 (첫 키부터 문장·낱말을 끝낼 때까지만 잰다)
function cpmOf(correct, ms) {
  return ms >= 2000 && correct ? Math.round(correct / (ms / 60000)) : null;
}

function hasSpeed() {
  return state.stage.type === 'words' || isLineType(state.stage.type);
}

// 친 글자 막대: 이번 판에 친 글자를 입력기가 보여 주는 그대로 (ㅁ+ㅏ → 마).
// 틀린 키가 섞인 글자는 빨갛게, 아직 조합 중인 마지막 글자는 밑줄.
const TYPED_MAX = 20;
function renderTyped() {
  const { judge, input } = state;
  const units = toUnits(input.raw).filter((u) => u.end > input.base && u.keys.length);
  const html = units.map((u, i) => {
    const end = u.end - input.base;
    const cls = [end <= judge.okLen ? 'ok' : 'bad'];
    if (input.composing && i === units.length - 1) cls.push('composing');
    return `<span class="${cls.join(' ')}">${u.ch === ' ' ? '&nbsp;' : escapeHtml(u.ch)}</span>`;
  });
  const shown = html.length > TYPED_MAX ? ['<span class="more">…</span>', ...html.slice(-TYPED_MAX + 1)] : html;
  $('typedText').innerHTML = shown.join('');
  $('typedHint').hidden = units.length > 0;
  $('typedBar').classList.toggle('has-error', judge.hasError);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// 한 줄에 12개 이하로, 줄마다 개수를 고르게 (20개 → 10+10, 24개 → 12+12)
function tileRows(n, max = 12) {
  const lines = Math.ceil(n / max);
  const per = Math.ceil(n / lines);
  const rows = [];
  for (let a = 0; a < n; a += per) rows.push([a, Math.min(n, a + per)]);
  return rows;
}

// 한동안 안 치면 춘식이가 어느 손가락인지 알려 준다
function resetIdle() {
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    const { judge } = state;
    if (state.screen !== 'play' || state.paused || state.warn || !judge || judge.hasError || judge.done) return;
    const key = keyFor(judge.nextKey);
    const finger = FINGER_NAMES[FINGER_BY_CODE[key?.code]];
    if (!finger) return;
    const shift = key.shift ? 'Shift 누른 채 ' : '';
    playCs.say(`춘춘? (${shift}${withRo(finger)} ${charName(judge.nextKey)}!)`);
  }, IDLE_MS);
}

// 받침에 따라 로/으로 (ㄹ 받침은 '로')
function withRo(word) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = c >= 0 && c < 11172 ? c % 28 : 0;
  return word + (jong === 0 || jong === 8 ? '로' : '으로');
}

function hopRunner() {
  const r = $('trackRunner');
  r.classList.remove('hop');
  void r.offsetWidth;
  r.classList.add('hop');
}

function currentUnit(judge) {
  return judge.units.findIndex((u) => u.end > judge.okLen);
}

function shakeCurrentTile() {
  const t = $('tiles').querySelectorAll('.tile')[currentUnit(state.judge)];
  if (!t) return;
  t.classList.remove('shake');
  void t.offsetWidth;
  t.classList.add('shake');
  setTimeout(() => t.classList.remove('shake'), 400);
}

function pct(acc) {
  return acc == null ? '–' : `${Math.round(acc * 100)}%`;
}

// 결과 제목 한마디 (받은 고구마 개수로)
function cheer(goguma) {
  return ['조금만 더 연습해요!', '좋아요!', '잘했어요!', '완벽해요!'][goguma] ?? '';
}

function missText(miss) {
  const list = Object.entries(miss).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '하나도 안 틀렸어요 👏';
  return '자주 틀린 키: ' + list.slice(0, 4).map(([k, n]) => `<b>${escapeHtml(charName(k))}</b> ${n}번`).join(', ');
}

// 구석에는 'N차 (날짜)'만 (설명까지 쓰면 길어져 아래쪽 안내 글과 겹친다)
$('version').textContent = VERSION.split(' · ')[0];
$('version').title = VERSION;
// 처음엔 갈래 고르기. 단계 지도에는 지난번에 하던 단계(고구마를 받았으면 다음 단계)를 골라 둔다
state.sel = suggestStage(STAGES, state.records);
goHome('menu');
checkForUpdate();
