# 사용: python3 tools/cutout.py 원본.jpg img/새이름.png   (Pillow 필요)
# 흰 배경 제거: 이미지 가장자리에서 시작하는 flood fill로 "바깥과 이어진 흰색"만 지운다.
# 윤곽선 안에 갇힌 흰색(춘식이 코, 고구마 반짝이)은 바깥과 이어져 있지 않아 그대로 남는다.
import sys
from collections import deque
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
w, h = im.size
px = im.load()

def is_bg(p):
    return min(p) >= 215 and max(p) - min(p) <= 30

bg = bytearray(w * h)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if is_bg(px[x, y]) and not bg[y * w + x]:
            bg[y * w + x] = 1; q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if is_bg(px[x, y]) and not bg[y * w + x]:
            bg[y * w + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and is_bg(px[nx, ny]):
            bg[ny * w + nx] = 1; q.append((nx, ny))

out = Image.new('RGBA', (w, h))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if bg[y * w + x]:
            op[x, y] = (0, 0, 0, 0); continue
        edge = any(0 <= x + dx < w and 0 <= y + dy < h and bg[(y + dy) * w + x + dx]
                   for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        if not edge:
            op[x, y] = (r, g, b, 255); continue
        # 가장자리 한 줄: 흰 바탕과 섞인 만큼 투명하게 하고, 색은 흰색을 걷어낸 값으로
        lum = (r + g + b) / 3
        a = max(0.0, min(1.0, (255 - lum) / 225))
        if a < 0.04:
            op[x, y] = (0, 0, 0, 0); continue
        un = lambda c: max(0, min(255, round((c - (1 - a) * 255) / a)))
        op[x, y] = (un(r), un(g), un(b), round(a * 255))

bbox = out.getbbox()
pad = 4
box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
out.crop(box).save(dst, optimize=True)
print('saved', dst, out.crop(box).size, 'removed px', sum(bg))
