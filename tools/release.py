# 올리기 전에 실행: python3 tools/release.py "4차 (2026-09-27) · 설명"
# 1) js/version.js의 버전 글자를 바꾸고
# 2) HTML·JS 안의 내부 파일 주소(js/, css/, img/, ./*.js)에 ?v=빌드번호를 붙인다.
# 사파리는 파일마다 따로 캐시해서 옛 파일과 새 파일이 섞일 수 있다. 주소가 바뀌면 새로 받는다.
import pathlib
import re
import sys
import time

root = pathlib.Path(__file__).resolve().parent.parent
label = sys.argv[1]
build = time.strftime('%Y%m%d%H%M')

(root / 'js/version.js').write_text(
    '// 화면 구석에 보이는 버전. tools/release.py가 바꾼다. 아이패드가 옛 파일(캐시)을 보는지 확인용.\n'
    f"export const VERSION = '{label}';\n"
    f"export const BUILD = '{build}';\n",
    encoding='utf-8',
)

(root / 'version.json').write_text(f'{{"build": "{build}", "version": "{label}"}}\n', encoding='utf-8')

V = r'(\?v=\w+)?'
rules = [
    (re.compile(r"""((?:from|import)\s*\(?\s*['"]\./[\w-]+\.js)""" + V + r"""(['"])"""), rf'\1?v={build}\3'),
    (re.compile(r"""((?:href|src)=["'](?:css|js|img)/[\w./-]+?\.(?:css|js|png))""" + V + r"""(["'])"""), rf'\1?v={build}\3'),
    (re.compile(r"""(['"`]img/[\w-]+\.png)""" + V + r"""(['"`])"""), rf'\1?v={build}\3'),
]
changed = []
for path in sorted(list(root.glob('*.html')) + list((root / 'js').glob('*.js'))):
    s = path.read_text(encoding='utf-8')
    new = s
    for pat, rep in rules:
        new = pat.sub(rep, new)
    if new != s:
        path.write_text(new, encoding='utf-8')
        changed.append(path.name)
print(f'{label} / build {build}:', ', '.join(changed))
