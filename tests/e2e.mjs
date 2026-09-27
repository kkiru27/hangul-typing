// 브라우저 확인용 스크립트 (Chromium + Playwright).
//   npx http-server . -p 8080 -c-1   를 띄운 뒤   node tests/e2e.mjs [스크린샷 폴더]
// CDP의 IME 조합 기능으로 실제 composition 이벤트를 흉내 낸다. (iOS 사파리와 같다는 보장은 없음)

import { createRequire } from 'node:module';
import { ImeSim } from './ime-sim.mjs';

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
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-play.png` });

// 틀린 키
const wrong = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ'].find((j) => j !== targets[3]);
await press(wrong);
check((await text('#playChunsik .cs-bubble')).includes('Backspace로 지우자'), '틀리면 춘식이가 Backspace 안내');
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
  if (r === 2) await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/07-round2.png` });
  for (const k of t) await press(k);
  await page.waitForTimeout(1400);
}
check((await text('#resultTitle')).includes('1단계'), '3판 끝 → 단계 결과');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08-stage-result.png` });

// ── 테스트 페이지 ──
await page.goto(`${BASE}/test.html`);
await commit();
ime.committed = '';
await page.locator('#presets button', { hasText: '하나' }).click();
for (const k of ['ㅎ', 'ㅏ', 'ㄴ', 'ㅏ']) await press(k);
check((await page.locator('#judgeStats').innerText()).includes('완료'), '테스트 페이지: 하나 완료');
check((await page.locator('#checks').innerText()).includes('compositionstart'), '테스트 페이지: composition 감지');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/09-test-page.png`, fullPage: true });

check(errors.length === 0, `콘솔 오류 없음 ${errors.join(' / ')}`);
await browser.close();
