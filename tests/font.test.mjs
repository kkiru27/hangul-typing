// 글꼴(fonts/app-sans.woff2)에 앱에 나오는 한글이 다 들어 있는지.
// 연습 글·안내 글에 새 글자를 넣으면 여기서 실패한다 → python3 tools/font-subset.py <PretendardVariable.woff2> 로 다시 만든다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf-8');

test('앱에 나오는 한글은 모두 글꼴에 있다', () => {
  const inFont = new Set(read('fonts/app-sans.chars.txt').trim());
  const files = [...readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`), 'index.html', 'test.html'];
  const missing = new Set();
  for (const f of files) for (const ch of read(f)) if (ch >= '가' && ch <= '힣' && !inFont.has(ch)) missing.add(ch);
  assert.deepEqual([...missing], [], `글꼴에 없는 글자: ${[...missing].join('')} (tools/font-subset.py로 다시 만들기)`);
});
