// 브라우저 확인용 스크립트 (Chromium + Playwright).
//   npx http-server . -p 8080 -c-1   를 띄운 뒤   node tests/e2e.mjs [스크린샷 폴더]
// CDP의 IME 조합 기능으로 실제 composition 이벤트를 흉내 낸다. (iOS 사파리와 같다는 보장은 없음)

import { createRequire } from 'node:module';
import { ImeSim } from './ime-sim.mjs';
import { toKeys } from '../js/hangul.js';
import { STAGES } from '../js/lessons.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = process.argv[2] || '.';
const W = 1180, H = 740; // 아이패드 에어 가로 + 사파리 막대 정도

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);

// 두벌식 입력기처럼: 확정된 부분은 insertText, 조합 중인 부분은 imeSetComposition
const ime = new ImeSim();
async function press(k) {
  const before = ime.committed;
  ime.press(k);
  const cur = ime.text.slice(ime.committed.length);
  if (ime.committed.length > before.length) {
    await cdp.send('Input.insertText', { text: ime.committed.slice(before.length) });
  }
  if (cur || ime.committed.length === before.length) {
    await cdp.send('Input.imeSetComposition', { text: cur, selectionStart: cur.length, selectionEnd: cur.length });
  }
}
function resetIme() { ime.committed = ''; ime.cur = null; }
async function commit() {
  const cur = ime.text.slice(ime.committed.length);
  ime.commit();
  if (cur) await cdp.send('Input.insertText', { text: cur });
}

const text = (sel) => page.locator(sel).innerText();
const IDX = (id) => STAGES.findIndex((s) => s.id === id);
const pageOf = (p) => p.locator('#homeScreen').getAttribute('data-page');
// 처음 화면(갈래 고르기)에서 '타자 연습'(0)이나 '게임'(1)으로 들어간다
async function openPage(p, which) {
  if (which === 1) await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Enter');
}
// 일시정지 창(Esc)에서 ↓ ↓ Enter = 나가기
async function exitViaPause(p) {
  await p.keyboard.press('Escape');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
}
// 단계 지도에서 방향키(← →)로 idx번째 단계를 고른다
async function selectStage(p, idx) {
  for (let n = 0; n < STAGES.length; n++) {
    const cur = Number(await p.locator('.stage-card.selected').getAttribute('data-idx'));
    if (cur === idx) return;
    await p.keyboard.press(cur < idx ? 'ArrowRight' : 'ArrowLeft');
  }
}
const check = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) process.exitCode = 1; };

// ── 연습 앱 ──
await page.goto(`${BASE}/index.html`);
check(await page.locator('#homeChunsik .cs-img').evaluate((el) => el.complete && el.naturalWidth > 0), '처음 화면 춘식이 이미지 로드');
check(await pageOf(page) === 'menu' && await page.locator('.menu-card').count() === 2, '처음 화면: 타자 연습 / 게임 두 갈래');
check((await text('.menu-card.selected')).includes('타자 연습') && (await text('#homeChunsik .cs-bubble')).includes('게임할까'), '처음엔 타자 연습이 골라져 있고 춘식이가 물어봄');
check(await page.locator('#navBtn').isHidden() && await page.locator('#brand').isVisible(), '처음 화면: 왼쪽 위는 앱 이름');
check(await page.locator('.fn-row .key').count() === 15 && await page.locator('.key[data-code="Backquote"]').count() === 1
  && await page.locator('.key-stack .key').count() === 2 && await page.locator('.key[data-code="PageUp"]').count() === 0, '가상 키보드: K380 배열 (기능키 줄, ` 키, 반 칸 ↑↓, PgUp 없음)');
const kbdBox = await page.locator('#keyboard').boundingBox();
const rows = await page.locator('.kbd-row').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
check(rows.every((w) => Math.abs(w - rows[1]) <= 2) && kbdBox.x + kbdBox.width <= W, `키보드 줄 너비가 같고 화면 안 (${rows.join(',')})`);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/00-menu.png` });
// 소리: ↓ 로 설정 줄 → Enter로 끄고 켜기 (새로고침해도 남음)
const lastSound = (p = page) => p.evaluate(() => document.body.dataset.lastSound || '');
await page.keyboard.press('ArrowDown');
check((await text('.set-chip.selected')).includes('소리 켜짐') && await lastSound() === 'move', '↓ → 설정 줄 "소리 켜짐" (틱 소리)');
check(await page.evaluate(() => 'AudioContext' in window), 'Web Audio 있음');
await page.keyboard.press('Enter');
check((await text('.set-chip.selected')).includes('소리 꺼짐'), 'Enter → 소리 꺼짐');
await page.reload();
check((await text('#homeSettings')).includes('소리 꺼짐'), '새로고침해도 소리 꺼짐 유지');
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
check((await text('.set-chip.selected')).includes('소리 켜짐') && await lastSound() === 'select', '다시 켜기 (켜지면서 소리)');
await page.keyboard.press('ArrowUp');
check((await text('.menu-card.selected')).includes('타자 연습'), '↑ → 카드로 돌아감');
await page.keyboard.press('Enter');
check(await pageOf(page) === 'practice' && (await text('#stageLabel')).includes('타자 연습'), 'Enter → 타자 연습(단계 지도)');
check(await page.locator('#navBtn').isVisible() && (await text('#navBtn')).includes('처음으로'), '단계 지도: 왼쪽 위에 "처음으로" 단추');
check(await page.locator('.stage-card').count() === 6, '단계 지도 한 쪽에 6단계');
check(await page.locator('#mapPages span').count() === 2, '단계 지도 2쪽 (게임은 따로)');
check(!(await text('#stageMap')).includes('고구마 비'), '단계 지도에 게임 없음');
await page.keyboard.press('Escape');
check(await pageOf(page) === 'menu', 'Esc → 처음 화면');
await page.keyboard.press('Enter');
await page.locator('#navBtn').click();
check(await pageOf(page) === 'menu', '"처음으로" 단추를 눌러도 처음 화면');
await page.keyboard.press('Enter');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '0', '처음엔 1단계가 골라져 있음');
check(await page.locator('.stage-card.locked').count() === 0 && !(await text('#stageMap')).includes('🔒'), '처음부터 잠긴 단계 없음');
check((await text('#homeChunsik .cs-bubble')).includes('골라'), '처음: 춘식이가 단계를 고르라고 안내');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Enter');
check(await page.locator('#playScreen').isVisible() && (await text('#roundLabel')).startsWith('2단계'), '1단계를 안 해도 2단계 바로 시작');
check((await text('#navBtn')).includes('멈춤'), '연습 중: 왼쪽 위에 ⏸ 멈춤 단추');
await page.keyboard.press('Escape');
check(await page.locator('#pauseLayer').isVisible() && (await text('.pause-item.selected')).includes('계속하기'), 'Esc → 일시정지 창 (계속하기가 골라져 있음)');
check((await text('#navBtn')).includes('계속하기') && (await text('#pauseSub')).startsWith('2단계'), '멈춘 동안: 왼쪽 위는 "계속하기", 창에 단계 이름');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/20-pause.png` });
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
check((await text('.pause-item.selected')).includes('나가기'), '↓ 두 번 → 나가기');
await page.keyboard.press('Enter');
check(await pageOf(page) === 'practice' && await page.locator('#pauseLayer').isHidden(), '나가기 → 단계 지도');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/01-home.png` });
await page.keyboard.press('Enter');
check(await page.locator('#playScreen').isVisible(), 'Enter로 1단계 시작');
check(await page.evaluate(() => document.activeElement.id) === 'ime', '숨은 입력칸에 포커스');

const targets = await page.locator('#tiles .tile').allInnerTexts();
// 첫 3개 맞게 치기 (조합 이벤트로)
for (const k of targets.slice(0, 3)) await press(k);
check((await text('#progress')) === `3/${targets.length}`, `조합 중에도 진행 3/${targets.length}`);
check((await text('#accuracy')) === '100%', '정확도 100%');
check(await lastSound() === 'key', '맞게 치면 "톡" 소리');
check((await page.locator('#typedText').innerText()) === ime.text, `친 글자 막대에 입력기 글자 그대로 (${ime.text})`);
check(await page.locator('#typedText .composing').count() === 1, '조합 중인 글자는 밑줄');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-play.png` });

// 틀린 키
const wrong = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ'].find((j) => j !== targets[3]);
await press(wrong);
check((await text('#playChunsik .cs-bubble')).includes('Backspace로 지우자'), '틀리면 춘식이가 Backspace 안내');
check(await lastSound() === 'miss', '틀리면 "뿌뿡" 소리');
check(await page.locator('#typedText .bad').count() >= 1, '틀린 키가 섞인 글자는 막대에서 빨갛게');
check(/[춘츈츄]/.test(await page.locator('#playChunsik .cs-meow').innerText()), '말투: 춘춘 + (해석)');
check((await page.locator('#playChunsik').getAttribute('data-pose')) === 'sad', '틀리면 우는 춘식이');
check(await page.locator('.key[data-code="Backspace"]').evaluate((el) => el.classList.contains('next')), 'Backspace 키 강조');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-miss.png` });
await press('Backspace');
check((await text('#playChunsik .cs-bubble')).includes('(좋아, 다시!)'), 'Backspace로 지우면 "춘! (좋아, 다시!)"');
check((await page.locator('#playChunsik').getAttribute('data-pose')) === 'stand', '지우면 다시 서 있는 춘식이');

// 영어 모드
await commit();
await page.keyboard.type('a');
check(await page.locator('#banner').isVisible() && (await text('#bannerText')).includes('Caps Lock'), '영어 입력 → Caps Lock 경고');
check(await page.locator('.key[data-code="CapsLock"]').evaluate((el) => el.classList.contains('next-warn')), 'Caps Lock 키 강조');
check((await page.inputValue('#ime')).match(/[a-z]/) === null, '영문은 입력칸에서 지워짐');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-english.png` });
for (const k of targets.slice(3, 5)) await press(k);
check(!(await page.locator('#banner').isVisible()), '한글 들어오면 경고 사라짐');

// K380: 방향키를 눌러도 경고 없음 (F65의 Fn+W 안내는 없앰)
const idx = targets.findIndex((t, i) => i >= 5 && ['ㅁ', 'ㄴ', 'ㅇ'].includes(t));
for (const k of targets.slice(5, idx)) await press(k);
await page.keyboard.press('ArrowLeft');
check(await page.locator('#banner').isHidden() && !(await text('#guideJamo')).includes('Fn'), '방향키를 눌러도 경고 없음');

// 나머지 끝까지
for (const k of targets.slice(idx)) await press(k);
await page.waitForTimeout(1400);
check(await page.locator('#resultScreen').isVisible(), '1판 끝 → 결과 화면');
check(await page.locator('#track').evaluate((el) => el.classList.contains('done')), '고구마 길 끝까지 감');
check(await page.locator('#resultChunsik .cs-img').evaluate((el) => el.naturalWidth > 0), '결과 화면 춘식이 이미지 로드');
console.log('   결과:', (await text('#resultTitle')), (await text('#resultAcc')), (await text('#resultMiss')));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-round-result.png` });

// 2판, 3판
for (let r = 2; r <= 3; r++) {
  await page.keyboard.press('Enter');
  await commit();
  const t = await page.locator('#tiles .tile').allInnerTexts();
  if (r === 2) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/07-round2.png` }); }
  for (const k of t) await press(k);
  await page.waitForTimeout(1400);
}
check((await text('#resultTitle')).includes('1단계'), '3판 끝 → 단계 결과');
check(await page.locator('#resultGoguma .goguma.earned').count() === 3, '정확도 95% 이상 → 고구마 3개');
check(await lastSound() === 'fanfare', '고구마 받으면 빠밤 소리');
check(!(await text('.result-card')).includes('열렸'), '"단계가 열렸어요" 안내 없음');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/08-stage-result.png` });

// 단계 지도로 돌아가면 2단계가 골라져 있고 열려 있음
await page.keyboard.press('Enter');
check(await page.locator('#homeScreen').isVisible(), '결과에서 Enter → 단계 지도');
check(await pageOf(page) === 'practice' && await page.locator('.stage-card.selected').getAttribute('data-idx') === '1', '단계 지도로 돌아오고 다음 단계(2단계)가 골라져 있음');
check(await page.locator('.stage-card[data-idx="0"] .goguma.earned').count() === 3, '1단계 카드에 고구마 3개');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/10-map.png` });
await page.reload();
check((await text('.menu-card.selected')).includes('이어서: 2단계'), '새로 열면 처음 화면, 타자 연습 카드에 "이어서: 2단계"');
await openPage(page, 0);
check(await page.locator('.stage-card[data-idx="0"] .goguma.earned').count() === 3, '새로고침해도 기록 유지(1단계 고구마 3개)');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '1', '새로 열어도 다음 단계(2단계)가 골라짐');

// 2단계: 낱말 연습 (낱말 + 스페이스), Esc 두 번으로 나가기
await page.keyboard.press('Enter');
resetIme();
check(await page.locator('#words').isVisible() && !(await page.locator('#tiles').isVisible()), '2단계는 낱말 화면');
check(await page.locator('.wq').count() === 8, '한 판에 낱말 8개');
const w1 = await text('.wq.current');
for (const k of toKeys(w1)) await press(k);
check(await page.locator('.wb-space.next').count() === 1, `낱말(${w1})을 다 치면 스페이스 표시`);
check((await text('#guideJamo')) === '⎵' && await page.locator('.key[data-code="Space"]').evaluate((el) => el.classList.contains('next')), '안내: 스페이스바');
check(await page.locator('.hands .finger.active[data-finger="T"]').count() === 2, '손 그림: 두 엄지');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/13-words.png` });
await press(' ');
check((await text('#progress')) === '1/8' && await page.locator('.wq.done').count() === 1, '스페이스 → 다음 낱말 (1/8)');
check((await page.inputValue('#ime')) === '', '다음 낱말에서 입력칸 비움');
const w2 = await text('.wq.current');
const k2 = toKeys(w2);
await press(k2[0] === 'ㅎ' ? 'ㅁ' : 'ㅎ');
check((await text('#playChunsik .cs-bubble')).includes('대신'), '낱말에서 틀리면 안내');
check(await page.locator('.wb-chars .error').count() === 1, '틀린 글자 빨갛게');
await press('Backspace');
for (const k of [...k2, ' ']) await press(k);
check((await text('#progress')) === '2/8', `두 번째 낱말(${w2}) 끝`);
check(!(await text('#accuracy')).startsWith('100'), '낱말 판 정확도에 실수 반영');
// 일시정지: 멈춘 동안 친 글자는 세지 않고, 계속하면 그대로 이어서
const accBefore = await text('#accuracy');
await page.locator('#navBtn').click();
check(await page.locator('#pauseLayer').isVisible(), '⏸ 단추를 톡 눌러도 일시정지');
await press('ㅋ'); await commit(); // 멈춘 동안 친 글자
await page.keyboard.press('Escape');
resetIme();
check(await page.locator('#pauseLayer').isHidden() && (await text('#progress')) === '2/8', 'Esc → 계속하기, 진행 그대로 (2/8)');
check((await page.inputValue('#ime')) === '' && (await text('#accuracy')) === accBefore && await page.locator('.wb-chars .error').count() === 0, '멈춘 동안 친 글자는 지워지고 정확도에 안 들어감');
const w3 = await text('.wq.current');
for (const k of [...toKeys(w3), ' ']) await press(k);
check((await text('#progress')) === '3/8', `계속한 뒤 세 번째 낱말(${w3}) 끝`);
await page.keyboard.press('Escape'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
check((await text('#progress')) === '0/8' && (await text('#roundLabel')).includes('(1/3)'), '처음부터 다시 → 첫 판 0/8');
await exitViaPause(page);
check(await pageOf(page) === 'practice', '나가기 → 단계 지도');

// 7단계(Shift): 방향키로 쪽을 넘겨 가며 고르기
await page.goto(`${BASE}/index.html`);
resetIme();
await openPage(page, 0);
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '1', '2단계를 중간에 나가면 기록 없음 → 그대로 2단계');
for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(k); // 1 → 4 → 7 → 10 (13은 없음)
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '10' && (await text('#stageMap')).includes('검정'), '아래 방향키로 다음 쪽(검정이 있는 쪽)으로 넘어감');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(k); // 10 → 7 → 4 → 1 (1쪽)
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '1' && (await text('#stageMap')).includes('기본자리'), '위 방향키로 앞 쪽으로 넘어감');
await selectStage(page, IDX('keys-shift'));
check((await text('.stage-card.selected')).includes('7단계'), '방향키로 7단계(Shift) 고르기');
await page.keyboard.press('Enter');
const t5 = await page.locator('#tiles .tile').allInnerTexts();
check(t5[0] === 'ㄲ', `5단계 첫 글자 ㄲ (${t5[0]})`);
check(await page.locator('.key[data-code="ShiftRight"]').evaluate((el) => el.classList.contains('next'))
  && await page.locator('.key[data-code="KeyR"]').evaluate((el) => el.classList.contains('next')), 'ㄲ → 오른쪽 Shift + R 강조');
check((await text('#guideKey')) === 'Shift + R', '안내 카드: Shift + R');
await press('ㄱ');
check((await text('#playChunsik .cs-bubble')).includes('Shift를 누른 채'), 'Shift 빼먹으면 Shift 안내');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/11-shift.png` });
await press('Backspace');
for (const k of t5.slice(0, 4)) await press(k);
check((await text('#progress')) === `4/${t5.length}`, '5단계 Shift 글자 진행');

// 6단계(숫자·문장부호)
await commit(); resetIme(); // 같은 페이지: 실제 입력기처럼 조합 중 글자를 확정한 뒤 흉내 상태를 비운다
await exitViaPause(page);
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Enter');
check((await text('#roundLabel')).startsWith('9단계'), '9단계(숫자) 시작');
const t6 = await page.locator('#tiles .tile').allInnerTexts();
check(t6.slice(0, 10).join('') === '1234554321', `6단계 첫 판 숫자 (${t6.slice(0, 10).join('')})`);
check((await text('#guideKey')) === '1 자리', '안내 카드: 1 자리');
for (const k of t6.slice(0, 5)) await press(k);
await press('9');
check((await text('#playChunsik .cs-bubble')).includes('5 대신 9를'), `숫자 틀림 안내 (${await text('#playChunsik .cs-bubble')})`);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/12-number.png` });

// ── 테스트 페이지 ──
await page.goto(`${BASE}/test.html`);
resetIme();
await page.locator('#presets button', { hasText: '하나' }).click();
for (const k of ['ㅎ', 'ㅏ', 'ㄴ', 'ㅏ']) await press(k);
check((await page.locator('#judgeStats').innerText()).includes('완료'), '테스트 페이지: 하나 완료');
check((await page.locator('#checks').innerText()).includes('compositionstart'), '테스트 페이지: composition 감지');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/09-test-page.png`, fullPage: true });

// ── 짧은 글 + 타수 ──
await page.goto(`${BASE}/index.html`);
resetIme();
await openPage(page, 0);
await selectStage(page, STAGES.findIndex((s) => s.type === 'sentences')); // 10단계 짧은 글
await page.keyboard.press('Enter');
check(await page.locator('#sentence').isVisible() && await page.locator('#speedStat').isVisible(), '짧은 글 화면 + 타수 표시');
const headH = (await page.locator('.topbar').boundingBox()).height;
const labelH = Math.max(...await page.locator('.stat span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height)));
check(headH <= 64 && labelH <= 20, `위쪽 막대 한 줄 (높이 ${Math.round(headH)}px, 이름표 ${Math.round(labelH)}px)`);
const sentenceNow = () => page.locator('#sentBig > span:not(.sent-enter)').evaluateAll((els) => els.map((el) => (el.classList.contains('sp') ? ' ' : el.textContent)).join(''));
const s1 = await sentenceNow();
check(/[.!?]$/.test(s1), `문장 (${s1})`);
const k1 = toKeys(s1);
await press(k1[0]);
await page.waitForTimeout(2100); // 타수는 2초 넘게 친 뒤부터 보인다
for (const k of k1.slice(1)) await press(k);
check(await page.locator('.sent-enter').isVisible() && await page.locator('.key[data-code="Enter"]').evaluate((el) => el.classList.contains('next')), '문장을 다 치면 Enter 안내');
check(/^\d+타$/.test(await text('#speed')), `타수 표시 (${await text('#speed')})`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/16-sentence.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
check((await text('#progress')) === '1/5' && (await sentenceNow()) !== s1, 'Enter → 다음 문장 (1/5)');
resetIme();
const s2 = await sentenceNow();
for (const k of toKeys(s2)) await press(k);
await press(' ');
await page.waitForTimeout(100);
check((await text('#progress')) === '2/5', '스페이스바로도 다음 문장 (2/5)');
check((await page.inputValue('#ime')) === '', '다음 문장에서 입력칸 비움');
await exitViaPause(page);

// ── 긴 글: 이야기 차례대로 ──
await page.goto(`${BASE}/index.html`);
resetIme();
await openPage(page, 0);
await selectStage(page, STAGES.findIndex((s) => s.type === 'long')); // 11단계 긴 글
await page.keyboard.press('Enter');
check(await page.locator('#story').isVisible() && (await text('#roundLabel')).startsWith('11단계'), '긴 글 화면');
check((await text('#storyPrev')).includes('고구마 밭'), '첫 줄 위에 이야기 제목');
const storyNow = () => page.locator('#storyCur > span:not(.sent-enter)').evaluateAll((els) => els.map((el) => (el.classList.contains('sp') ? ' ' : el.textContent)).join(''));
const l1 = await storyNow();
check(l1 === '춘식이는 고구마를 아주 좋아하는 고양이예요.', `이야기 첫 줄 (${l1})`);
for (const k of toKeys(l1)) await press(k);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/17-story.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
check((await text('#storyPrev')) === l1 && (await storyNow()).startsWith('어느 날 아침'), 'Enter → 다음 줄, 앞 줄은 위로');
await exitViaPause(page);

// ── 1분 타자 검정: 시계를 빨리 돌려 끝까지 ──
const page3 = await browser.newPage({ viewport: { width: W, height: H } });
page3.on('pageerror', (e) => errors.push(String(e)));
const cdp3 = await page3.context().newCDPSession(page3);
await page3.clock.install();
await page3.goto(`${BASE}/index.html`);
await openPage(page3, 0);
await selectStage(page3, STAGES.findIndex((s) => s.type === 'test')); // 처음 온 사람도 검정을 바로 고를 수 있음
await page3.keyboard.press('Enter');
check((await page3.locator('#progressLabel').innerText()) === '남은 시간' && (await page3.locator('#progress').innerText()) === '1:00', '검정: 남은 시간 1:00 (치기 전에는 멈춤)');
await page3.clock.runFor(5000);
check((await page3.locator('#progress').innerText()) === '1:00', '첫 키 전에는 시간이 안 감');
const t3 = await page3.locator('#sentBig > span:not(.sent-enter)').evaluateAll((els) => els.map((el) => (el.classList.contains('sp') ? ' ' : el.textContent)).join(''));
for (const k of toKeys(t3).slice(0, 6)) { await cdp3.send('Input.insertText', { text: k }); await page3.clock.runFor(1000); }
check(/^0:5\d$/.test(await page3.locator('#progress').innerText()), `첫 키부터 시간이 감 (${await page3.locator('#progress').innerText()})`);
const leftBefore = await page3.locator('#progress').innerText();
await page3.keyboard.press('Escape');
await page3.clock.runFor(30000);
check(await page3.locator('#pauseLayer').isVisible() && (await page3.locator('#progress').innerText()) === leftBefore, `검정: 멈춘 동안 시간이 안 감 (${leftBefore})`);
await page3.keyboard.press('Escape');
await page3.clock.runFor(1000);
check((await page3.locator('#progress').innerText()) !== leftBefore && await page3.locator('#playScreen').isVisible(), `계속하면 남은 시간부터 다시 감 (${await page3.locator('#progress').innerText()})`);
await page3.clock.runFor(60000);
await page3.clock.runFor(1500);
check(await page3.locator('#resultScreen').isVisible(), '1분 지나면 결과');
check((await page3.locator('#resultAccLabel').innerText()) === '타수' && /^\d+타$/.test(await page3.locator('#resultAcc').innerText()), `검정 결과: 타수 (${await page3.locator('#resultAcc').innerText()})`);
check((await page3.locator('#resultRounds').innerText()).includes('정확도'), '검정 결과: 정확도');
check(await page3.locator('#resultGoguma .goguma.earned').count() === 0 && (await page3.locator('#resultNote').innerText()).includes('30타'), '너무 느리면 검정 고구마 0개 + 기준 안내');
check((await page3.locator('#progress').innerText()) === '끝', '검정 끝나면 위쪽에 "끝"');
await page3.waitForTimeout(800);
await page3.screenshot({ path: `${OUT}/18-test-result.png` });
await page3.close();

// ── 게임: 고구마 비 ──
await page.goto(`${BASE}/index.html`);
resetIme();
await page.keyboard.press('ArrowRight');
check((await text('.menu-card.selected')).includes('게임') && (await text('#homeChunsik .cs-bubble')).includes('게임 하러'), '처음 화면에서 → 로 게임 고르기');
await page.keyboard.press('Enter');
check(await pageOf(page) === 'games' && (await text('#stageLabel')).includes('게임'), 'Enter → 게임 목록');
check(await page.locator('.stage-card').count() === 1 && (await text('.stage-card.selected')).includes('고구마 비'), '게임 목록: 고구마 비');
check((await text('.stage-card.selected')).includes('기본자리 낱말까지'), '카드에 떨어지는 낱말 범위 (1단계만 했으면 기본자리 낱말까지)');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/19-games.png` });
await page.keyboard.press('Enter');
check(await page.locator('#gameScreen').isVisible(), '게임 화면');
await page.waitForTimeout(900);
check(await page.locator('.drop').count() >= 1, '고구마가 떨어지기 시작');
const homeWords = Object.keys(STAGES.find((s) => s.type === 'words').words);
const dropWords = await page.locator('.drop .drop-word').allInnerTexts();
check(dropWords.every((w) => homeWords.includes(w)), `1단계만 해 봤으면 기본자리 낱말만 떨어짐 (${dropWords.join(',')})`);
const cs = await page.locator('#gameChunsik').boundingBox();
const field = await page.locator('#rain').boundingBox();
check(cs.y + cs.height > field.y + field.height - 40, '게임 춘식이는 땅 위(아래쪽)에');
const g1 = await text('.drop.focus .drop-word');
for (const k of toKeys(g1)) await press(k);
await press(' ');
await page.waitForTimeout(100);
check((await text('#progress')) === '1/12', `낱말(${g1}) + 스페이스 → 고구마 잡음`);
check((await page.locator('#gameChunsik').getAttribute('data-pose')) === 'goguma', '잡으면 고구마 먹는 춘식이');
check(await lastSound() === 'catch', '잡으면 "뿅" 소리');
await press('ㅋ'); await press(' ');
check((await text('#gameChunsik .cs-bubble')).includes('없어'), '없는 낱말 → 춘식이 안내');
await page.waitForTimeout(4500);
const g2 = await text('.drop.focus .drop-word');
for (const k of toKeys(g2)) await press(k);
await commit();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check((await text('#progress')) === '2/12', `Enter로도 잡음 (${g2})`);
const live = page.locator('.drop:not(.caught):not(.missed)').first();
await live.waitFor({ timeout: 10000 }); // 경고 중에는 새 고구마도 안 나오므로, 고구마가 있을 때 시험
await page.keyboard.type('a');
check(await page.locator('#gameBanner').isVisible(), '게임 중 영어 경고');
const yBefore = await live.evaluate((el) => el.style.transform);
await page.waitForTimeout(600);
const yAfter = await live.evaluate((el) => el.style.transform);
check(yBefore === yAfter, '경고 중에는 고구마가 멈춤');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/14-game.png` });
resetIme();
await press('ㅁ'); await press('Backspace');
check(!(await page.locator('#gameBanner').isVisible()), '한글 치면 경고 사라지고 다시 움직임');
// 게임 일시정지: 고구마가 멈추고, 처음부터 다시 / 나가기
const live2 = page.locator('.drop:not(.caught):not(.missed)').first();
await live2.waitFor({ timeout: 10000 });
await page.keyboard.press('Escape');
const y1 = await live2.evaluate((el) => el.style.transform);
await page.waitForTimeout(600);
check(await page.locator('#pauseLayer').isVisible() && y1 === await live2.evaluate((el) => el.style.transform), '게임 일시정지 → 고구마가 멈춤');
check((await text('.pause-item[data-act="exit"]')).includes('게임 고르기'), '게임에서 나가기는 게임 고르기로');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/21-game-pause.png` });
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
check((await text('#progress')) === '0/12' && await page.locator('#pauseLayer').isHidden() && await page.locator('.drop.caught').count() === 0, '게임 처음부터 다시 → 0/12, 떨어지던 고구마 치움');
await exitViaPause(page);
check(await pageOf(page) === 'games' && await page.locator('.drop').count() === 0, '나가기 → 게임 끝내고 게임 목록');

// 게임 끝까지: 시계를 빨리 돌려 모두 놓치기 → 결과
const page2 = await browser.newPage({ viewport: { width: W, height: H } });
page2.on('pageerror', (e) => errors.push(String(e)));
await page2.clock.install();
await page2.goto(`${BASE}/index.html`);
await openPage(page2, 1);
await page2.keyboard.press('Enter');
await page2.clock.runFor(100000);
await page2.clock.runFor(2000);
check(await page2.locator('#resultScreen').isVisible(), '게임 끝 → 결과 화면');
check((await page2.locator('#resultAcc').innerText()) === '0 / 12' && (await page2.locator('#resultAccLabel').innerText()) === '잡은 고구마', '결과: 잡은 고구마 0 / 12');
check((await page2.locator('#resultNote').innerText()).includes('70%'), '못 잡으면 안내');
check((await page2.locator('#resultNext').innerText()) === '게임 고르기', '게임 결과: Enter → 게임 고르기');
await page2.waitForTimeout(800);
await page2.screenshot({ path: `${OUT}/15-game-result.png` });
await page2.keyboard.press('Enter');
check(await page2.locator('#homeScreen').getAttribute('data-page') === 'games', '게임 결과에서 Enter → 게임 목록');
await page2.close();

check(errors.length === 0, `콘솔 오류 없음 ${errors.join(' / ')}`);
await browser.close();
