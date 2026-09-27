// 한글 타자 연습 앱: 단계 지도 → 자리 연습(판 3개) → 결과(고구마) → 단계 지도

import { Judge } from './judge.js?v=202609270844';
import { InputBridge } from './input-bridge.js?v=202609270844';
import { KeyboardView } from './keyboard-view.js?v=202609270844';
import { HandsView } from './hands-view.js?v=202609270844';
import { STAGES, buildKeysRound, stageChars } from './lessons.js?v=202609270844';
import { codesFor, keyFor, FINGER_BY_CODE, FINGER_NAMES, KEY_LABEL, fingerTone, WASD, ARROWS } from './layout.js?v=202609270844';
import { isHangul, charName, josa, toUnits } from './hangul.js?v=202609270844';
import { loadRecords, saveStageResult, isUnlocked, totalGoguma, GOGUMA_MAX } from './records.js?v=202609270844';
import { VERSION } from './version.js?v=202609270844';
import { Chunsik, GOGUMA_SVG } from './chunsik-view.js?v=202609270844';
import { checkForUpdate } from './update-check.js?v=202609270844';

const $ = (id) => document.getElementById(id);

const keyboard = new KeyboardView($('keyboard'));
const hands = new HandsView($('hands'));
const bridge = new InputBridge($('ime'), { onChange, onLatin });
const homeCs = new Chunsik($('homeChunsik'), { size: 'l' });
const playCs = new Chunsik($('playChunsik'));
const resultCs = new Chunsik($('resultChunsik'), { size: 'l' });
$('trackGoal').innerHTML = GOGUMA_SVG;

// 주소 끝에 ?all 을 붙이면 모든 단계가 열린다 (확인용)
const UNLOCK_ALL = new URLSearchParams(location.search).has('all');

// 춘식이 말투: 고양이 말 + (해석)
const CHEERS = ['춘춘!! (좋아!)', '츈츈춘~! (잘한다!)', '춘! 춘! (척척!)', '춘춘춘!! (최고야!)', '츈~ 춘춘! (멋져!)', '춘?! 춘춘! (우와!)'];
const SAD = ['츄... 춘...', '춘... 츈츈...', '츈... 춘...'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const IDLE_MS = 7000;
const ESC_MS = 2000; // Esc 두 번 사이 시간
const NAV_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
const MAP_COLS = 3;

const state = {
  screen: 'home',      // home | play | roundDone | stageDone
  records: loadRecords(),
  sel: 0,              // 단계 지도에서 고른 단계
  stageIdx: 0,
  stage: STAGES[0],
  roundIdx: 0,
  judge: null,
  results: [],
  warn: null,          // english | fnw | focus | null
  streak: 0,           // 연속으로 맞힌 키 (춘식이 칭찬용)
  input: { raw: '', base: 0, composing: false }, // 입력칸 값 (친 글자 막대용)
  idleTimer: 0,
  escAt: 0,
};

// ───── 화면 전환 ─────

function show(screen) {
  state.screen = screen;
  $('homeScreen').hidden = screen !== 'home';
  $('playScreen').hidden = screen !== 'play';
  $('resultScreen').hidden = !(screen === 'roundDone' || screen === 'stageDone');
  // 연습 중에는 위쪽 막대 가운데에 판 이름과 고구마 길
  $('roundHead').hidden = screen !== 'play';
  $('stageLabel').hidden = screen === 'play';
  if (screen !== 'play') setWarn(null);
}

// ───── 단계 지도 ─────

function goHome(sel = state.sel) {
  clearTimeout(state.idleTimer);
  state.sel = sel;
  show('home');
  $('stageLabel').textContent = '';
  $('progress').textContent = '–';
  $('accuracy').textContent = '–';
  keyboard.setFocusSet(null);
  keyboard.setNext(['Enter']);
  renderMap();
}

function unlocked(i) {
  return isUnlocked(STAGES, state.records, i, UNLOCK_ALL);
}

function gogumaIcons(n, cls = '') {
  return Array.from({ length: GOGUMA_MAX }, (_, i) =>
    GOGUMA_SVG.replace('class="goguma"', `class="goguma ${i < n ? 'earned' : 'off'} ${cls}"`)).join('');
}

function renderMap() {
  const total = totalGoguma(STAGES, state.records);
  $('mapTotal').innerHTML = `${GOGUMA_SVG} 모은 고구마 ${total} / ${STAGES.length * GOGUMA_MAX}`;
  $('stageMap').innerHTML = STAGES.map((s, i) => {
    const rec = state.records[s.id];
    const open = unlocked(i);
    const cls = ['stage-card', open ? '' : 'locked', i === state.sel ? 'selected' : ''].join(' ');
    return `<div class="${cls}" data-idx="${i}">
      <span class="sc-num">${s.title.split(' · ')[0]}</span>
      <span class="sc-name">${s.short}</span>
      <span class="sc-keys">${s.keys.join(' ')}</span>
      <span class="sc-goguma">${gogumaIcons(rec?.goguma ?? 0)}</span>
      ${open ? '' : '<span class="sc-lock">🔒</span>'}
    </div>`;
  }).join('');
  const s = STAGES[state.sel];
  $('mapTip').textContent = unlocked(state.sel) ? s.tip : '';

  const rec = state.records[s.id];
  if (!unlocked(state.sel)) homeCs.say('춘... (앞 단계에서 고구마를 받으면 열려!)');
  else if (!Object.keys(state.records).length) homeCs.say('츈츈! 춘춘춘~ (안녕! 나랑 타자 연습하자)');
  else if ((rec?.goguma ?? 0) >= GOGUMA_MAX) homeCs.say(`춘춘! (${s.short}${josa(s.short, '은', '는')} 고구마 다 모았어!)`);
  else homeCs.say(`춘춘? (${s.short} 해 볼까?)`);
}

function moveSel(delta) {
  const next = state.sel + delta;
  if (next < 0 || next >= STAGES.length) return;
  state.sel = next;
  renderMap();
}

function tryStart(i) {
  if (unlocked(i)) return startStage(i);
  state.sel = i;
  renderMap();
  const card = $('stageMap').children[i];
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

$('stageMap').addEventListener('click', (e) => {
  const card = e.target.closest('.stage-card');
  if (card && state.screen === 'home') tryStart(Number(card.dataset.idx));
});

// ───── 연습 ─────

function startStage(i) {
  state.stageIdx = i;
  state.sel = i;
  state.stage = STAGES[i];
  state.roundIdx = 0;
  state.results = [];
  bridge.focus();
  startRound();
}

function startRound() {
  const { stage, roundIdx } = state;
  const round = stage.rounds[roundIdx];
  const items = buildKeysRound(round);
  state.judge = new Judge(items.join(''));
  state.streak = 0;
  state.escAt = 0;
  bridge.rebase();
  state.input = { raw: '', base: 0, composing: false };
  playCs.pose('stand');
  playCs.say(round.hello || '춘춘! (같이 해 보자!)');
  $('track').classList.remove('done');
  $('trackRunner').querySelector('img').src = 'img/chunsik.png?v=202609270844';

  $('stageLabel').textContent = stage.title;
  $('roundLabel').textContent = `${stage.title.split(' · ')[0]} · ${round.title} (${roundIdx + 1}/${stage.rounds.length})`;
  $('tiles').innerHTML = tileRows(state.judge.units.length)
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

function finishRound() {
  const { judge, stage } = state;
  state.results.push({ round: stage.rounds[state.roundIdx].title, ...judge.result() });
  const last = state.roundIdx === stage.rounds.length - 1;
  state.screen = last ? 'stageDone' : 'roundDone'; // 입력은 바로 막고, 화면은 잠깐 뒤에
  keyboard.setNext([]);
  hands.setActive([]);
  clearTimeout(state.idleTimer);
  playCs.pose('goguma');
  playCs.act('cheer');
  playCs.say('츈츈츈!! (고구마 도착!)', 'good');
  $('track').classList.add('done');
  $('trackRunner').querySelector('img').src = 'img/chunsik-goguma.png?v=202609270844';
  setTimeout(() => (last ? showStageResult() : showRoundResult()), 1100);
}

// 결과 화면의 춘식이: 잘하면 고구마 먹으며 신나고, 아니면 응원
function resultChunsik(acc, doneText) {
  const good = acc != null && acc >= 0.85;
  resultCs.pose(good ? 'goguma' : 'stand');
  resultCs.mood(good ? 'party' : null);
  if (acc >= 0.95) resultCs.say(`춘춘춘~!! (${doneText} 고구마 냠냠!)`, 'good');
  else if (good) resultCs.say('츈츈! (맛있다! 잘했어!)', 'good');
  else if (acc >= 0.7) resultCs.say('춘! 춘춘! (고구마 하나 받았어!)', 'good');
  else resultCs.say('춘... 춘춘! (괜찮아, 한 번 더 해 보자!)');
}

function showRoundResult() {
  const r = state.results[state.results.length - 1];
  show('roundDone');
  $('resultTitle').textContent = `${r.round} 끝! ${cheer(r.accuracy)}`;
  $('resultAcc').textContent = pct(r.accuracy);
  $('resultGoguma').hidden = true;
  $('resultNote').hidden = true;
  $('resultRounds').innerHTML = '';
  $('resultMiss').innerHTML = missText(r.missByKey);
  $('resultNext').textContent = '다음 판';
  resultChunsik(r.accuracy, '완벽해!');
  keyboard.setNext(['Enter']);
}

function showStageResult() {
  const rs = state.results;
  const correct = rs.reduce((s, r) => s + r.correct, 0);
  const mistakes = rs.reduce((s, r) => s + r.mistakes, 0);
  const acc = correct + mistakes ? correct / (correct + mistakes) : null;
  const miss = {};
  for (const r of rs) for (const [k, n] of Object.entries(r.missByKey)) miss[k] = (miss[k] || 0) + n;
  const saved = saveStageResult(state.records, state.stage.id, acc);
  const next = STAGES[state.stageIdx + 1];

  show('stageDone');
  $('resultTitle').textContent = `${state.stage.title} 끝! ${cheer(acc)}`;
  $('resultAcc').textContent = pct(acc);
  $('resultGoguma').hidden = false;
  $('resultGoguma').innerHTML = gogumaIcons(saved.goguma);
  const notes = [];
  if (saved.firstClear && next) notes.push(`🔓 ${next.title.split(' · ')[0]}가 열렸어요!`);
  if (saved.newBest) notes.push('🎉 새 기록!');
  if (!saved.goguma) notes.push('정확도 70%를 넘으면 고구마를 받아요');
  $('resultNote').hidden = !notes.length;
  $('resultNote').textContent = notes.join('  ');
  $('resultRounds').innerHTML = rs.map((r) => `${escapeHtml(r.round)} <b>${pct(r.accuracy)}</b>`).join(' · ');
  $('resultMiss').innerHTML = missText(miss);
  $('resultNext').textContent = '단계 고르기';
  resultChunsik(acc, `${state.stage.title.split(' · ')[0]} 끝!`);
  $('accuracy').textContent = pct(acc);
  keyboard.setNext(['Enter']);
  // 다음 단계가 열렸으면 단계 지도에서 그 단계를 골라 둔다
  state.sel = saved.goguma && next && unlocked(state.stageIdx + 1) ? state.stageIdx + 1 : state.stageIdx;
}

// ───── 입력 처리 ─────

function onChange({ raw, base, keys, composing }) {
  if (state.screen !== 'play') return;
  state.input = { raw, base, composing };
  const { judge } = state;
  const hadError = judge.hasError;
  const events = judge.update(keys);
  resetIdle();
  for (const ev of events) {
    if (ev.kind === 'latin') continue;
    if (isHangul(ev.key) && (state.warn === 'english' || state.warn === 'fnw')) setWarn(null);
    const code = keyFor(ev.key)?.code;
    if (ev.kind === 'ok' || ev.kind === 'retype') {
      if (code) keyboard.flash(code, 'ok');
      playCs.act('hop');
      hopRunner();
      if (ev.kind === 'ok' && ++state.streak % 5 === 0) playCs.say(pick(CHEERS), 'good');
    } else if (ev.kind === 'miss') {
      if (code) keyboard.flash(code, 'bad');
      state.streak = 0;
      shakeCurrentTile();
      playCs.pose('sad'); // 틀리면 베개 안고 우는 춘식이
      playCs.act('oops');
      playCs.say(`${pick(SAD)} (${missLine(ev)} ⌫ Backspace로 지우자)`, 'bad');
    } else if (ev.kind === 'extra') {
      if (code) keyboard.flash(code, 'bad');
      playCs.say('춘!! 춘춘!! (⌫ Backspace를 먼저 눌러 줘!)', 'bad');
    }
  }
  if (hadError && !judge.hasError) {
    playCs.pose('stand');
    playCs.say('춘! (좋아, 다시!)');
  }
  render();
  if (judge.done) finishRound();
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
  if (state.screen === 'play') setWarn('english');
}

document.addEventListener('keydown', (e) => {
  // 입력칸이 포커스를 잃었으면 되찾는다 (키보드만으로 진행)
  if (!bridge.focused) {
    bridge.focus();
    if (state.screen === 'play') checkFocusSoon();
  }
  if (NAV_KEYS.has(e.key)) e.preventDefault(); // 커서 이동·포커스 이동 막기

  if (state.screen === 'home') {
    if (e.key === 'ArrowLeft') moveSel(-1);
    else if (e.key === 'ArrowRight') moveSel(1);
    else if (e.key === 'ArrowUp') moveSel(-MAP_COLS);
    else if (e.key === 'ArrowDown') moveSel(MAP_COLS);
    else if (e.key === 'Enter' && !e.repeat) tryStart(state.sel);
  } else if (state.screen === 'play') {
    resetIdle();
    if (ARROWS.has(e.key) && !state.judge.hasError) {
      // F65에서 Fn+W가 켜지면 W A S D 자리가 방향키로 바뀐다
      const next = keyFor(state.judge.nextKey)?.code;
      if (WASD.has(next)) setWarn('fnw');
    }
    if (e.key === 'Escape') {
      // 실수로 누를 수 있어서 두 번 눌러야 나간다
      if (Date.now() - state.escAt < ESC_MS) goHome(state.stageIdx);
      else {
        state.escAt = Date.now();
        playCs.say('춘? (Esc를 한 번 더 누르면 단계 고르기로 가요)', 'warn');
      }
    }
  } else if (!$('resultScreen').hidden) {
    if (e.key === 'Enter' && !e.repeat) {
      if (state.screen === 'roundDone') { state.roundIdx++; startRound(); }
      else goHome();
    } else if (e.key === 'Escape') goHome(state.stageIdx);
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
$('ime').addEventListener('blur', () => { if (state.screen === 'play') checkFocusSoon(); });

function checkFocusSoon() {
  setTimeout(() => {
    if (state.screen === 'play' && !bridge.focused) setWarn('focus');
  }, 300);
}

// ───── 그리기 ─────

const WARNINGS = {
  english: { icon: '🔤', text: '지금 영어로 입력돼요. Caps Lock을 눌러 한글로 바꿔요', chunsik: '춘?! (어? 영어가 나와!)' },
  fnw: { icon: '⌨️', text: 'Fn+W가 눌린 것 같아요. Fn+W를 한 번 더 눌러주세요', chunsik: '츈츈?! (어? 방향키가 나와!)' },
  focus: { icon: '👆', text: '화면을 한 번 톡 눌러 주세요', chunsik: '춘춘~ (나를 톡 눌러 줘!)' },
};

function setWarn(kind) {
  if (state.warn === kind) return;
  state.warn = kind;
  const b = $('banner');
  b.hidden = !kind;
  $('playScreen').classList.toggle('warning', !!kind && kind !== 'focus');
  if (kind) {
    $('bannerIcon').textContent = WARNINGS[kind].icon;
    $('bannerText').textContent = WARNINGS[kind].text;
    playCs.act('oops');
    playCs.say(WARNINGS[kind].chunsik, 'warn');
  } else if (state.screen === 'play') {
    playCs.say('');
  }
  if (state.screen === 'play') render();
}

function render() {
  const { judge } = state;
  if (!judge) return;

  // 글자 타일
  const tiles = $('tiles').querySelectorAll('.tile');
  judge.units.forEach((u, i) => {
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
  $('progress').textContent = `${judge.okLen}/${judge.target.length}`;
  $('track').style.setProperty('--p', judge.okLen / judge.target.length);
  $('accuracy').textContent = pct(judge.accuracy);

  // 다음에 칠 키 / 손가락 안내
  //   경고 중이면 고치는 키(Caps Lock, Fn+W)를, 틀렸으면 Backspace를, 아니면 목표 키를 가리킨다
  let codes;
  let guide;
  if (state.warn === 'english') {
    codes = ['CapsLock'];
    guide = { big: '한/영', small: 'Caps Lock', finger: 'L5' };
  } else if (state.warn === 'fnw') {
    codes = ['Fn', 'KeyW'];
    guide = { big: 'Fn+W', small: '한 번 더', finger: null, fingerText: 'Fn을 누른 채 W' };
  } else if (judge.hasError) {
    codes = ['Backspace'];
    guide = { big: '⌫', small: 'Backspace', finger: 'R5' };
  } else if (judge.done) {
    codes = [];
    guide = { big: '✓', small: '끝!', finger: null };
  } else {
    const key = keyFor(judge.nextKey);
    codes = codesFor(judge.nextKey);
    const main = codes[codes.length - 1];
    guide = key?.shift
      ? { big: judge.nextKey, small: `Shift + ${KEY_LABEL[main]}`, finger: FINGER_BY_CODE[main], fingerText: `${FINGER_NAMES[FINGER_BY_CODE[main]]} + Shift` }
      : { big: judge.nextKey, small: `${KEY_LABEL[main] ?? ''} 자리`, finger: FINGER_BY_CODE[main] };
  }
  keyboard.setNext(codes, state.warn === 'english' || state.warn === 'fnw' ? 'warn' : 'finger');
  hands.setActive(guide.finger ? codes.map((c) => FINGER_BY_CODE[c]).filter(Boolean) : []);

  const tone = `tone-${fingerTone(guide.finger)}`;
  $('guideCard').className = `guide-card ${tone}${guide.big.length > 1 ? ' wide-text' : ''}`;
  $('guideFinger').className = `guide-finger ${tone}`;
  $('guideJamo').textContent = guide.big;
  $('guideKey').textContent = guide.small;
  $('guideFinger').textContent = guide.fingerText || FINGER_NAMES[guide.finger] || '';
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
    if (state.screen !== 'play' || state.warn || !judge || judge.hasError || judge.done) return;
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

function cheer(acc) {
  if (acc == null) return '';
  if (acc >= 0.95) return '완벽해요!';
  if (acc >= 0.85) return '잘했어요!';
  return '조금만 더 연습해요!';
}

function missText(miss) {
  const list = Object.entries(miss).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '하나도 안 틀렸어요 👏';
  return '자주 틀린 키: ' + list.slice(0, 4).map(([k, n]) => `<b>${escapeHtml(charName(k))}</b> ${n}번`).join(', ');
}

$('version').textContent = VERSION;
// 처음엔 열린 단계 중 가장 뒤 단계를 골라 둔다
goHome(Math.max(0, ...STAGES.map((_, i) => (unlocked(i) ? i : 0))));
checkForUpdate();
