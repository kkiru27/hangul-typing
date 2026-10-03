# 사용: python3 tools/app-icon.py   (Pillow 필요)
# 홈 화면 아이콘: 보라 그라데이션 바탕(앱 로고와 같은 색) 위에 춘식이(img/chunsik.png).
# 아이패드·안드로이드가 모서리를 둥글게/동그랗게 잘라도 춘식이가 다 보이게 가운데 70% 안에 둔다.
# → img/icon-180.png (apple-touch-icon), img/icon-192.png, img/icon-512.png (manifest.webmanifest)
import pathlib
from PIL import Image, ImageDraw, ImageFilter

root = pathlib.Path(__file__).resolve().parent.parent / 'img'
S = 1024
TOP, BOTTOM = (0xA6, 0x8D, 0xFF), (0x6A, 0x3D, 0xE0)

bg = Image.new('RGB', (S, S))
draw = ImageDraw.Draw(bg)
for y in range(S):
    t = y / (S - 1)
    draw.line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))
icon = bg.convert('RGBA')

# 위쪽에 은은한 빛
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([S * .1, -S * .35, S * .9, S * .35], fill=(255, 255, 255, 40))
icon.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * .06)))

cs = Image.open(root / 'chunsik.png').convert('RGBA')
cs = cs.crop(cs.getchannel('A').getbbox())
h = round(S * .66)
cs = cs.resize((round(cs.width * h / cs.height), h), Image.LANCZOS)
x = (S - cs.width) // 2
y = round(S * .52 - h / 2)

# 춘식이 발밑 그림자
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(shadow).ellipse([S * .3, y + h - S * .04, S * .7, y + h + S * .03], fill=(40, 10, 90, 90))
icon.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(S * .02)))
icon.alpha_composite(cs, (x, y))

out = icon.convert('RGB')
for size in (180, 192, 512):
    dst = root / f'icon-{size}.png'
    out.resize((size, size), Image.LANCZOS).save(dst, optimize=True)
    print(dst.name, f'{dst.stat().st_size // 1024}KB')
