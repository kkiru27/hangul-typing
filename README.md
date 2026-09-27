# 한글 타자 연습 (아이패드용)

**바로 가기: https://kkiru27.github.io/hangul-typing/** (입력 테스트: [test.html](https://kkiru27.github.io/hangul-typing/test.html))

키보드를 처음 치는 사람을 위한 두벌식 한글 타자 연습. 아이패드 사파리 + 외장 키보드(AULA F65) 기준, 가로 화면, 키보드만으로 진행.

- `index.html` 연습 앱: 단계 지도 → 자리 연습 1~6단계(기본자리, 왼손 윗줄, 오른손 윗줄, 아랫줄, Shift, 숫자·문장부호)
  - 단계마다 판 3개. 정확도 70/85/95% 이상이면 고구마 1/2/3개, 1개라도 받으면 다음 단계가 열린다
  - 기록은 이 브라우저(localStorage)에만 저장. 주소 끝에 `?all`을 붙이면 모든 단계가 열린다(확인용)
  - 연습 중 Esc 두 번 → 단계 지도
- `test.html` 입력 판정 테스트 페이지 (기기마다 다른 한글 입력 이벤트를 기록하고 "결과 복사")

## 판정 방식

입력칸 값을 통째로 "누른 키 순서"로 풀어서 목표와 비교한다 (`js/hangul.js`, `js/judge.js`).

- `한` → ㅎ ㅏ ㄴ, `괜` → ㄱ ㅗ ㅐ ㄴ. 입력기가 ㅎ→하→한, 한+ㅏ→하나처럼 글자를 바꿔 묶어도 키 순서는 그대로라 조합 중인 글자가 오타로 잡히지 않는다.
- 틀린 키는 입력칸에 남고, Backspace로 지워야 넘어간다 (iOS에서 조합 중인 값을 코드로 고치면 글자가 겹치는 문제가 있어서).
- 영문(영어 모드)은 오타로 세지 않고 지운 뒤 Caps Lock 안내. W A S D 자리에서 방향키가 들어오면 Fn+W 안내.

## 파일

| 파일 | 역할 |
|---|---|
| `js/hangul.js` | 글자 → 키 순서 분해 |
| `js/judge.js` | 판정·정확도 (화면과 무관, 낱말·문장에도 그대로 씀) |
| `js/input-bridge.js` | 숨은 입력칸 ↔ 판정기 (composition/input/keyup 어느 쪽이 와도 값 전체를 다시 읽음) |
| `js/layout.js` | F65 배열, 두벌식 자모, 손가락 배정 |
| `js/keyboard-view.js`, `js/hands-view.js` | 가상 키보드, 손 그림 |
| `js/lessons.js` | 단계 데이터 (새 단계는 여기에 추가) |
| `js/records.js` | 단계별 기록·고구마·단계 열림 |
| `js/chunsik-view.js`, `css/chunsik.css` | 춘식이 말풍선·몸짓, 고구마까지 가는 길 |
| `js/app.js` | 화면 흐름 |

## 춘식이 그림

- `img/chunsik.png` 서 있는 모습 (처음 화면, 연습 화면)
- `img/chunsik-goguma.png` 고구마 먹는 모습 (판 끝, 잘했을 때 결과 화면)
- `img/chunsik-sad.png` 베개 안고 우는 모습 (틀렸을 때)
- 말투: `춘춘! (좋아!)`처럼 고양이 말 뒤 괄호 안에 해석
- 새 그림의 흰 배경은 `tools/cutout.py`로 지운다. 이미지 가장자리에서 시작하는 flood fill이라
  윤곽선 안에 갇힌 흰색(춘식이 코)은 지워지지 않는다.

## 올리기 (배포)

```bash
python3 tools/release.py "5차 (날짜) · 설명"   # 버전 글자 + 모든 파일 주소에 ?v=빌드번호
git commit -am "..." && git push                # main에 올리면 1분 안에 GitHub Pages 반영
```

사파리는 파일마다 따로 캐시해서 옛 파일이 섞일 수 있다. 주소에 빌드번호를 붙여 막고,
페이지가 열릴 때 `version.json`을 확인해 더 새 버전이 있으면 새 주소로 한 번 다시 연다.

## 확인

```bash
npm test                        # 판정 단위 테스트 (두벌식 입력기 흉내 포함)
npx http-server . -p 8080 -c-1  # 로컬 서버
node tests/e2e.mjs /tmp         # Chromium에서 조합 이벤트 흉내로 전체 흐름 확인 + 스크린샷
```

Chromium 확인은 실제 iOS 입력기와 같다는 보장이 없다. 아이패드에서는 `test.html`로 확인한다.
