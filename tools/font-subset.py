#!/usr/bin/env python3
"""Pretendard 글꼴을 이 앱에 필요한 글자만 남겨 작게 만든다 (fonts/app-sans.woff2).

남기는 글자: 앱 파일(js·html)에 나오는 모든 글자 + 한글 자모 + 영문·숫자·부호 (--ks 를 붙이면 자주 쓰는 한글 2350자도).
앱에 없는 글자(틀리게 친 글자 등)는 아이패드 기본 글꼴로 보인다 (모양이 비슷해서 티가 거의 안 난다).
굵기는 400~800만 남긴다 (가변 글꼴 하나로 모든 굵기).

준비 (한 번만): pip install fonttools brotli, npm pack pretendard → 압축 풀기
쓰는 법: python3 tools/font-subset.py <PretendardVariable.woff2 경로> [--ks]
연습 글·안내 글에 새 글자를 넣었으면 다시 돌린다 (단위 테스트가 빠진 글자를 알려 준다).
"""
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'fonts' / 'app-sans.woff2'
CHARS = ROOT / 'fonts' / 'app-sans.chars.txt'  # 들어 있는 한글 (단위 테스트가 앱 글자와 비교)
EMOJI = re.compile('[\\U0001F000-\\U0001FFFF\\u2600-\\u27BF\\uFE0F]')


def ks_x_1001_hangul():
    chars = []
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                chars.append(bytes([hi, lo]).decode('euc-kr'))
            except UnicodeDecodeError:
                pass
    return chars


def app_chars():
    text = ''
    for path in [*ROOT.glob('js/*.js'), *ROOT.glob('*.html')]:
        text += path.read_text(encoding='utf-8')
    return set(text)


def main(src, ks=False):
    chars = app_chars() | (set(ks_x_1001_hangul()) if ks else set())
    chars |= {chr(c) for c in range(0x20, 0x7F)}       # 영문·숫자·부호
    chars |= {chr(c) for c in range(0x3131, 0x3164)}   # 한글 자모 ㄱ~ㅣ
    chars |= set('·…←→↑↓⏎⌫⎵“”‘’–—')
    chars = {c for c in chars if c.isprintable() and not EMOJI.match(c)}  # 그림 글자(이모지)는 빼기

    font = TTFont(src)
    font = instancer.instantiateVariableFont(font, {'wght': (400, 800)})
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'tnum']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    OUT.parent.mkdir(exist_ok=True)
    font.flavor = 'woff2'
    font.save(OUT)
    CHARS.write_text(''.join(sorted(c for c in chars if '\uac00' <= c <= '\ud7a3')) + '\n', encoding='utf-8')
    print(f'{OUT.relative_to(ROOT)}: 글자 {len(chars)}개, {OUT.stat().st_size // 1024}KB')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--ks']
    if len(args) != 1:
        sys.exit(__doc__)
    main(args[0], ks='--ks' in sys.argv)
