// 브라우저 확인용 스크립트 (Chromium + Playwright).
//   npx http-server . -p 8080 -c-1   를 띄운 뒤   node tests/e2e.mjs [스크린샷 폴더]
// CDP의 IME 조합 기능으로 실제 composition 이벤트를 흉내 낸다. (iOS 사파리와 같다는 보장은 없음)

import { createRequire } from 'node:module';
import { ImeSim } from './ime-sim.mjs';
import { toKeys } from '../js/hangul.js';

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
const check = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) process.exitCode = 1; };

// ── 연습 앱 ──
await page.goto(`${BASE}/index.html`);
check(await page.locator('#homeChunsik .cs-img').evaluate((el) => el.complete && el.naturalWidth > 0), '처음 화면 춘식이 이미지 로드');
check(await page.locator('.stage-card').count() === 6, '단계 지도 한 쪽에 6단계');
check(await page.locator('#mapPages span').count() === 2, '단계 지도 2쪽');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '0', '처음엔 1단계가 골라져 있음');
check(await page.locator('.stage-card.locked').count() === 5, '2~6단계는 잠김');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Enter');
check(await page.locator('#homeScreen').isVisible(), '잠긴 단계는 Enter로 시작 안 됨');
check((await text('#homeChunsik .cs-bubble')).includes('열려'), '잠긴 단계: 춘식이가 안내');
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
check((await page.locator('#typedText').innerText()) === ime.text, `친 글자 막대에 입력기 글자 그대로 (${ime.text})`);
check(await page.locator('#typedText .composing').count() === 1, '조합 중인 글자는 밑줄');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-play.png` });

// 틀린 키
const wrong = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ'].find((j) => j !== targets[3]);
await press(wrong);
check((await text('#playChunsik .cs-bubble')).includes('Backspace로 지우자'), '틀리면 춘식이가 Backspace 안내');
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

// Fn+W: WASD 자리를 쳐야 할 때 방향키
const idx = targets.findIndex((t, i) => i >= 5 && ['ㅁ', 'ㄴ', 'ㅇ'].includes(t));
for (const k of targets.slice(5, idx)) await press(k);
await page.keyboard.press('ArrowLeft');
check((await text('#bannerText')).includes('Fn+W'), 'WASD 자리에서 방향키 → Fn+W 안내');
check((await page.locator('#guideJamo').textContent()) === 'Fn+W', '안내 카드(숨김 상태)도 Fn+W로 바뀜');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-fnw.png` });

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
check((await text('#resultNote')).includes('2단계가 열렸어요'), '2단계가 열렸다는 안내');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/08-stage-result.png` });

// 단계 지도로 돌아가면 2단계가 골라져 있고 열려 있음
await page.keyboard.press('Enter');
check(await page.locator('#homeScreen').isVisible(), '결과에서 Enter → 단계 지도');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '1', '다음 단계(2단계)가 골라져 있음');
check(await page.locator('.stage-card[data-idx="0"] .goguma.earned').count() === 3, '1단계 카드에 고구마 3개');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/10-map.png` });
await page.reload();
check(await page.locator('.stage-card[data-idx="1"]').evaluate((el) => !el.classList.contains('locked')), '새로고침해도 기록 유지(2단계 열림)');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '1', '새로 열어도 가장 뒤 열린 단계가 골라짐');

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
await page.keyboard.press('Escape');
check((await text('#playChunsik .cs-bubble')).includes('Esc'), 'Esc 한 번 → 한 번 더 누르라는 안내');
check(await page.locator('#playScreen').isVisible(), 'Esc 한 번으로는 안 나감');
await page.keyboard.press('Escape');
check(await page.locator('#homeScreen').isVisible(), 'Esc 두 번 → 단계 지도');

// 5단계(Shift): 모든 단계 열기(?all)로 바로 가기
await page.goto(`${BASE}/index.html?all`);
resetIme();
check(await page.locator('.stage-card.locked').count() === 0, '?all → 모든 단계 열림');
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '8', '모두 열리면 마지막 단계(9단계)가 골라져 있음');
check(await page.locator('.stage-card').count() === 3, '2쪽에는 3단계');
await page.keyboard.press('ArrowUp');   // 9단계 → 6단계 (1쪽)
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '5', '위 방향키로 앞 쪽으로 넘어감');
await page.keyboard.press('ArrowDown'); // 6단계 → 9단계
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft'); // 9단계 → 7단계(Shift)
check(await page.locator('.stage-card.selected').getAttribute('data-idx') === '6', '방향키로 7단계(Shift) 고르기');
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
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
await commit(); resetIme(); // 같은 페이지: 실제 입력기처럼 조합 중 글자를 확정한 뒤 흉내 상태를 비운다
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

check(errors.length === 0, `콘솔 오류 없음 ${errors.join(' / ')}`);
await browser.close();
