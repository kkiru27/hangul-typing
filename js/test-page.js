// 입력 테스트 페이지: 아이패드 사파리가 한글 입력을 어떤 이벤트로 주는지 기록하고,
// 앱과 같은 판정기(Judge + InputBridge)가 제대로 도는지 확인한다.

import { Judge } from './judge.js?v=202610030921';
import { InputBridge } from './input-bridge.js?v=202610030921';
import { toKeys, isHangul } from './hangul.js?v=202610030921';
import { VERSION, BUILD } from './version.js?v=202610030921';
import { checkForUpdate } from './update-check.js?v=202610030921';

const $ = (id) => document.getElementById(id);
const input = $('ime');

const PRESETS = [
  { text: '한', note: 'ㅎ→하→한' },
  { text: '하나', note: '한+ㅏ→하나' },
  { text: '괜찮아', note: '겹모음·겹받침' },
  { text: '앉아요', note: '겹받침 넘어감' },
  { text: '빨리 써요.', note: 'Shift 쌍자음' },
  { text: '좋아, 고마워!', note: '쉼표·느낌표' },
  { text: 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', note: '1단계 자모' },
  { text: 'ㅏㅣㅓㅣㄹㅎ', note: '모음·자음 합쳐짐' },
];

let judge = null;
let preset = PRESETS[0];

const bridge = new InputBridge(input, {
  onChange: ({ raw, keys }) => {
    judge.update(keys);
    detectMerges(raw);
    renderJudge(raw);
  },
  onLatin: () => setCheck('latin', '감지됨 (영어 모드 입력이 들어옴)', 'good'),
});

// ───── 자동 점검 항목 ─────

const CHECKS = [
  ['version', '앱 버전'],
  ['env', '기기 정보'],
  ['focusKey', 'Enter(키)로 입력칸 포커스'],
  ['composition', 'composition 이벤트'],
  ['inputTypes', 'input 이벤트 종류'],
  ['code', 'keydown의 code 값'],
  ['koreanKey', '한글 칠 때 keydown key 값'],
  ['backspace', '조합 중 Backspace'],
  ['vowelMerge', 'ㅏ 다음 ㅣ'],
  ['consMerge', 'ㄹ 다음 ㅎ'],
  ['latin', '영어 모드 감지'],
  ['arrows', '방향키 keydown'],
  ['block', 'keydown 막기 실험'],
  ['judge', '판정 결과'],
];
const checkState = {};

function setCheck(id, text, cls = 'good') {
  checkState[id] = { text, cls };
  renderChecks();
}

function renderChecks() {
  $('checks').innerHTML = CHECKS.map(([id, label]) => {
    const c = checkState[id] || { text: '아직 확인 안 됨', cls: 'wait' };
    return `<tr><td>${label}</td><td class="${c.cls}">${escapeHtml(c.text)}</td></tr>`;
  }).join('');
}

setCheck('version', `${VERSION} · ${BUILD}`, '');
checkForUpdate();
setCheck('env', `${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')} · 화면 ${innerWidth}×${innerHeight} · 터치점 ${navigator.maxTouchPoints}`, '');

// ───── 이벤트 기록 ─────

const t0 = performance.now();
const logRows = [];
const inputTypes = new Set();
let lastKeydown = null;
let pendingBackspace = null;
let pendingBlock = null;

function log(e, extra = '') {
  const row = {
    t: Math.round(performance.now() - t0),
    type: e.type + extra,
    key: e.key ?? '',
    code: e.code ?? '',
    keyCode: e.keyCode ?? '',
    composing: e.isComposing ? 'Y' : bridge.composing ? 'y' : '',
    inputType: e.inputType ?? '',
    data: e.data ?? '',
    value: input.value,
  };
  logRows.unshift(row);
  if (logRows.length > 400) logRows.pop();
  const tr = document.createElement('tr');
  tr.className = e.type.startsWith('composition') ? 'comp' : e.type.startsWith('key') ? (extra ? 'doc' : 'key') : '';
  tr.innerHTML = [row.t, row.type, row.key, row.code, row.keyCode, row.composing, row.inputType, JSON.stringify(row.data), JSON.stringify(row.value)]
    .map((v) => `<td>${escapeHtml(String(v))}</td>`).join('');
  const body = $('log');
  body.insertBefore(tr, body.firstChild);
  while (body.children.length > 150) body.lastChild.remove();
}

for (const type of ['keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'focus', 'blur']) {
  input.addEventListener(type, (e) => log(e));
}

input.addEventListener('compositionstart', () => setCheck('composition', '있음 (compositionstart 받음)', 'good'));
input.addEventListener('input', (e) => {
  if (e.inputType) inputTypes.add(e.inputType);
  setCheck('inputTypes', [...inputTypes].join(', ') || '(inputType 없음)', '');
});

input.addEventListener('keydown', (e) => {
  lastKeydown = { key: e.key, code: e.code, keyCode: e.keyCode, at: performance.now() };
  if (/^Key[A-Z]$/.test(e.code)) setCheck('code', `있음 (예: ${e.code})`, 'good');
  else if (!e.code && !checkState.code) setCheck('code', 'code가 비어 있음', 'warn');

  if (e.key.startsWith('Arrow')) setCheck('arrows', `받음 (${e.key})`, 'good');

  if (e.key === 'Backspace') {
    const keys = toKeys(input.value);
    const last = [...input.value].pop();
    if (last && isHangul(last) && toKeys(last).length >= 2) pendingBackspace = { before: keys.length, char: last };
  }

  if ($('optBlock').checked && e.code === 'KeyA') {
    e.preventDefault();
    pendingBlock = { before: input.value };
    setTimeout(() => {
      if (!pendingBlock) return;
      const added = input.value !== pendingBlock.before && toKeys(input.value).at(-1) === 'ㅁ';
      setCheck('block', added ? '안 막힘 (preventDefault 해도 ㅁ이 들어옴)' : '막힘 (preventDefault로 입력 차단됨)', added ? 'warn' : 'good');
      pendingBlock = null;
    }, 400);
  }
});

// 입력칸 밖에서 키가 눌렸을 때: 키로 포커스를 옮길 수 있는지 시험
document.addEventListener('keydown', (e) => {
  if (e.target === input) return;
  log(e, '(문서)');
  input.focus();
  setTimeout(() => {
    const ok = document.activeElement === input;
    setCheck('focusKey', ok ? '됨 (키를 누르면 입력칸으로 포커스 이동)' : '안 됨 (화면을 눌러야 함)', ok ? 'good' : 'warn');
  }, 60);
});

let prevRaw = '';
function detectMerges(raw) {
  // 한글 칠 때 keydown key 값
  if (lastKeydown && performance.now() - lastKeydown.at < 300 && raw.length && isHangul([...raw].pop())) {
    const { key, code, keyCode } = lastKeydown;
    setCheck('koreanKey', `key="${key}" code="${code}" keyCode=${keyCode}`, '');
  }
  // Backspace가 자모 하나를 지우는지, 글자를 통째로 지우는지
  if (pendingBackspace) {
    const diff = pendingBackspace.before - toKeys(raw).length;
    if (diff === 1) setCheck('backspace', `자모 하나씩 지움 ('${pendingBackspace.char}' → 한 단계)`, 'good');
    else if (diff > 1) setCheck('backspace', `글자 통째로 지움 ('${pendingBackspace.char}' 전체, ${diff}키)`, 'warn');
    pendingBackspace = null;
  }
  const merges = [
    ['ㅏ', 'ㅣ', 'ㅐ', 'vowelMerge'], ['ㅓ', 'ㅣ', 'ㅔ', 'vowelMerge'], ['ㄹ', 'ㅎ', 'ㅀ', 'consMerge'],
  ];
  for (const [a, b, ab, id] of merges) {
    if (!prevRaw.endsWith(a)) continue;
    if (raw === prevRaw.slice(0, -1) + ab) setCheck(id, `${ab}로 합쳐짐 (${id === 'vowelMerge' ? '주의: 판정이 어긋남' : '판정엔 문제 없음'})`, id === 'vowelMerge' ? 'warn' : 'good');
    else if (raw === prevRaw + b) setCheck(id, `따로 남음 (${a}${b})`, 'good');
  }
  prevRaw = raw;
}

// ───── 판정 화면 ─────

function loadPreset(p) {
  preset = p;
  judge = new Judge(p.text);
  bridge.rebase();
  prevRaw = input.value;
  for (const b of $('presets').children) b.classList.toggle('on', b.dataset.text === p.text);
  renderJudge(input.value);
}

function renderJudge(raw) {
  const states = judge.unitStates();
  $('target').innerHTML = judge.units.map((u, i) => `<span class="${states[i]}">${u.ch === ' ' ? '&nbsp;' : escapeHtml(u.ch)}</span>`).join('');
  $('raw').textContent = `입력칸 값: ${JSON.stringify(raw)}  ·  코드: ${[...raw].slice(-4).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ')}`;
  $('kcTarget').innerHTML = judge.target.map((k, i) => `<span class="${i < judge.okLen ? 'ok' : i === judge.okLen ? 'next' : ''}">${k === ' ' ? '␣' : escapeHtml(k)}</span>`).join('');
  $('kcTyped').innerHTML = judge.typed.map((k, i) => `<span class="${i < judge.okLen ? 'ok' : 'bad'}">${k === ' ' ? '␣' : escapeHtml(k)}</span>`).join('');
  const acc = judge.accuracy == null ? '–' : Math.round(judge.accuracy * 100) + '%';
  $('judgeStats').innerHTML = `<b>맞음 ${judge.correct}</b><b>틀림 ${judge.mistakes}</b><b>정확도 ${acc}</b>`
    + `<span>${bridge.composing ? '조합 중' : '조합 끝'}</span>`
    + (judge.done ? ' · <b style="color:var(--ok)">완료!</b>' : judge.hasError ? ' · <b style="color:var(--bad)">Backspace로 지우기</b>' : '');
  if (judge.done) setCheck('judge', `'${preset.text}' 완료 · 맞음 ${judge.correct} 틀림 ${judge.mistakes}`, 'good');
}

$('presets').innerHTML = PRESETS.map((p) => `<button data-text="${p.text}">${p.text}<small>${p.note}</small></button>`).join('');
$('presets').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  loadPreset(PRESETS.find((p) => p.text === b.dataset.text));
  input.focus();
});

$('btnReset').addEventListener('click', () => {
  if (bridge.composing) input.blur();
  input.value = '';
  bridge.rebase();
  bridge.sync();
  loadPreset(preset);
  input.focus();
});
$('optHide').addEventListener('change', (e) => { input.classList.toggle('ime-hidden', e.target.checked); input.focus(); });
$('optStrip').addEventListener('change', (e) => { bridge.stripLatin = e.target.checked; });

$('btnClear').addEventListener('click', () => { logRows.length = 0; $('log').innerHTML = ''; });
$('btnCopy').addEventListener('click', async () => {
  const lines = ['[자동 점검]'];
  for (const [id, label] of CHECKS) lines.push(`${label}: ${checkState[id]?.text ?? '아직 확인 안 됨'}`);
  lines.push('', '[이벤트 기록: ms | 이벤트 | key | code | keyCode | 조합중 | inputType | data | 값]');
  for (const r of logRows.slice(0, 200).reverse()) {
    lines.push([r.t, r.type, r.key, r.code, r.keyCode, r.composing, r.inputType, JSON.stringify(r.data), JSON.stringify(r.value)].join(' | '));
  }
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    $('copyMsg').textContent = '복사됐어요. 대화창에 붙여 넣어 주세요.';
  } catch {
    const ta = $('copyFallback');
    ta.hidden = false;
    ta.value = text;
    ta.select();
    $('copyMsg').textContent = '자동 복사가 안 돼서 아래 칸에 넣었어요. 길게 눌러 전체 선택 → 복사해 주세요.';
  }
});

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

renderChecks();
loadPreset(PRESETS[0]);
input.focus();
