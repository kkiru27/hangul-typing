# 사용: python3 tools/webp.py   (Pillow 필요)
# img/*.png(원본, 배경을 지운 것) → img/*.webp. 화면에 보이는 크기에 맞춰 긴 쪽을 400px까지 줄인다
# (춘식이는 화면에서 가장 커도 약 200px, 아이패드는 2배로 그린다). 앱은 .webp만 받는다.
import pathlib
from PIL import Image

MAX = 400
root = pathlib.Path(__file__).resolve().parent.parent / 'img'
for src in sorted(root.glob('chunsik*.png')):
    im = Image.open(src).convert('RGBA')
    scale = min(1, MAX / max(im.size))
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    dst = src.with_suffix('.webp')
    im.save(dst, 'WEBP', quality=88, method=6, exact=False)
    print(f'{src.name} {src.stat().st_size // 1024}KB → {dst.name} {im.size[0]}×{im.size[1]} {dst.stat().st_size // 1024}KB')
