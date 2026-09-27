// 한글 타자 연습 앱 (1차: 자리 연습 1단계)

import { Judge } from './judge.js';
import { InputBridge } from './input-bridge.js';
import { KeyboardView } from './keyboard-view.js';
import { HandsView } from './hands-view.js';
import { STAGES, buildKeysRound } from './lessons.js';
import { codesFor, keyFor, FINGER_BY_CODE, FINGER_NAMES, fingerTone, WASD, ARROWS, ROWS } from './layout.js';
import { isHangul, objParticle } from './hangul.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);

const keyboard = new KeyboardView($('keyboard'));
const hands = new HandsView($('hands'));
const bridge = new InputBridge($('ime'), { onChange, onLatin });

const LATIN_BY_CODE = Object.fromEntries(ROWS.flat().filter((k) => k.jamo).map((k) => [k.code, k.label]));
const NAV_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);

const state = {
  screen: 'home',      // home | play | roundDone | stageDone
  stage: STAGES[0],
  roundIdx: 0,
  judge: null,
  results: [],
  warn: null,          // english | fnw | focus | null
  lastMiss: null,      // 방금 틀린 키 {key, expect}
  extraCount: 0,       // 틀린 뒤 지우지 않고 더 친 횟수
};

// ───── 화면 전환 ─────

function show(screen) {
  state.screen = screen;
  $('homeScreen').hidden = screen !== 'home';
  $('playScreen').hidden = screen !== 'play';
  $('resultScreen').hidden = !(screen === 'roundDone' || screen === 'stageDone');
  if (screen !== 'play') setWarn(null);
}

function goHome() {
  show('home');
  const { stage } = state;
  $('stageLabel').textContent = '';
  $('progress').textContent = '–';
  $('accuracy').textContent = '–';
  $('homeStageTitle').textContent = stage.title;
  $('homeTip').textContent = stage.tip;
  $('homeKeys').innerHTML = stage.keys
    .map((j, i) => {
      const code = keyFor(j).code;
      const gap = i > 0 && FINGER_BY_CODE[code][0] !== FINGER_BY_CODE[keyFor(stage.keys[i - 1]).code][0];
      return `${gap ? '<span class="gap"></span>' : ''}<span class="tone-${fingerTone(FINGER_BY_CODE[code])}">${j}</span>`;
    })
    .join('');
  keyboard.setFocusSet(null);
  keyboard.setNext(['Enter']);
}

function startStage() {
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
  state.lastMiss = null;
  state.extraCount = 0;
  bridge.rebase();

  $('stageLabel').textContent = stage.title;
  $('roundLabel').textContent = `${round.title} (${roundIdx + 1}/${stage.rounds.length})`;
  $('tiles').innerHTML = tileRows(state.judge.units.length)
    .map(([a, b]) => `<div class="tile-row">${state.judge.units.slice(a, b).map((u) => `<div class="tile">${u.ch}</div>`).join('')}</div>`)
    .join('');
  keyboard.setFocusSet(stage.keys.map((j) => keyFor(j).code).concat(['Backspace', 'CapsLock']));
  show('play');
  render();
  checkFocusSoon();
}

function finishRound() {
  const { judge, stage } = state;
  state.results.push({ round: stage.rounds[state.roundIdx].title, ...judge.result() });
  const last = state.roundIdx === stage.rounds.length - 1;
  state.screen = last ? 'stageDone' : 'roundDone'; // 입력은 바로 막고, 화면은 잠깐 뒤에
  keyboard.setNext([]);
  hands.setActive([]);
  setTimeout(() => (last ? showStageResult() : showRoundResult()), 450);
}

function showRoundResult() {
  const r = state.results[state.results.length - 1];
  show('roundDone');
  $('resultTitle').textContent = `${r.round} 끝! ${cheer(r.accuracy)}`;
  $('resultAcc').textContent = pct(r.accuracy);
  $('resultRounds').innerHTML = '';
  $('resultMiss').innerHTML = missText(r.missByKey);
  $('resultNext').textContent = '다음 판';
  keyboard.setNext(['Enter']);
}

function showStageResult() {
  const rs = state.results;
  const correct = rs.reduce((s, r) => s + r.correct, 0);
  const mistakes = rs.reduce((s, r) => s + r.mistakes, 0);
  const acc = correct + mistakes ? correct / (correct + mistakes) : null;
  const miss = {};
  for (const r of rs) for (const [k, n] of Object.entries(r.missByKey)) miss[k] = (miss[k] || 0) + n;
  show('stageDone');
  $('resultTitle').textContent = `${state.stage.title} 끝! ${cheer(acc)}`;
  $('resultAcc').textContent = pct(acc);
  $('resultRounds').innerHTML = rs.map((r) => `${r.round} <b>${pct(r.accuracy)}</b>`).join(' · ');
  $('resultMiss').innerHTML = missText(miss);
  $('resultNext').textContent = '한 번 더 하기';
  $('accuracy').textContent = pct(acc);
  keyboard.setNext(['Enter']);
}

// ───── 입력 처리 ─────

function onChange({ keys }) {
  if (state.screen !== 'play') return;
  const { judge } = state;
  const events = judge.update(keys);
  for (const ev of events) {
    if (ev.kind === 'latin') continue;
    if (isHangul(ev.key) && (state.warn === 'english' || state.warn === 'fnw')) setWarn(null);
    const code = keyFor(ev.key)?.code;
    if (ev.kind === 'ok' || ev.kind === 'retype') {
      if (code) keyboard.flash(code, 'ok');
    } else if (ev.kind === 'miss') {
      if (code) keyboard.flash(code, 'bad');
      state.lastMiss = ev;
      state.extraCount = 0;
      shakeCurrentTile();
    } else if (ev.kind === 'extra') {
      if (code) keyboard.flash(code, 'bad');
      state.extraCount++;
    }
  }
  if (!judge.hasError) { state.lastMiss = null; state.extraCount = 0; }
  render();
  if (judge.done) finishRound();
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

  if (state.screen === 'play' && ARROWS.has(e.key) && !state.judge.hasError) {
    // F65에서 Fn+W가 켜지면 W A S D 자리가 방향키로 바뀐다
    const next = keyFor(state.judge.nextKey)?.code;
    if (WASD.has(next)) setWarn('fnw');
  }

  if (e.key === 'Enter' && !e.repeat) {
    if (state.screen === 'home') startStage();
    else if (state.screen === 'roundDone' && !$('resultScreen').hidden) { state.roundIdx++; startRound(); }
    else if (state.screen === 'stageDone' && !$('resultScreen').hidden) startStage();
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
  english: { icon: '🔤', text: '지금 영어로 입력돼요. Caps Lock을 눌러 한글로 바꿔요' },
  fnw: { icon: '⌨️', text: 'Fn+W가 눌린 것 같아요. Fn+W를 한 번 더 눌러주세요' },
  focus: { icon: '👆', text: '화면을 한 번 톡 눌러 주세요' },
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

  $('progress').textContent = `${judge.okLen}/${judge.target.length}`;
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
    codes = codesFor(judge.nextKey);
    const main = codes[codes.length - 1];
    guide = { big: judge.nextKey, small: `${LATIN_BY_CODE[main] || ''} 자리`, finger: FINGER_BY_CODE[main] };
  }
  keyboard.setNext(codes, state.warn === 'english' || state.warn === 'fnw' ? 'warn' : 'finger');
  hands.setActive(guide.finger ? codes.map((c) => FINGER_BY_CODE[c]).filter(Boolean) : []);

  const tone = `tone-${fingerTone(guide.finger)}`;
  $('guideCard').className = `guide-card ${tone}${guide.big.length > 1 ? ' wide-text' : ''}`;
  $('guideFinger').className = `guide-finger ${tone}`;
  $('guideJamo').textContent = guide.big;
  $('guideKey').textContent = guide.small;
  $('guideFinger').textContent = guide.fingerText || FINGER_NAMES[guide.finger] || '';

  // 한 줄 안내
  const msg = $('message');
  msg.classList.toggle('bad', judge.hasError);
  if (judge.hasError && state.lastMiss && state.extraCount === 0) {
    const { key, expect } = state.lastMiss;
    const typed = isHangul(key) ? `${key}${objParticle(key)}` : '다른 키를';
    msg.textContent = `앗, ${expect} 대신 ${typed} 쳤어요. ⌫ Backspace로 지워요`;
  } else if (judge.hasError) {
    msg.textContent = '⌫ Backspace를 눌러 틀린 글자를 먼저 지워요';
  } else {
    msg.textContent = '';
  }
}

// 한 줄에 12개 이하로, 줄마다 개수를 고르게 (20개 → 10+10, 24개 → 12+12)
function tileRows(n, max = 12) {
  const lines = Math.ceil(n / max);
  const per = Math.ceil(n / lines);
  const rows = [];
  for (let a = 0; a < n; a += per) rows.push([a, Math.min(n, a + per)]);
  return rows;
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
  return '자주 틀린 키: ' + list.slice(0, 4).map(([k, n]) => `<b>${k}</b> ${n}번`).join(', ');
}

$('version').textContent = VERSION;
goHome();
