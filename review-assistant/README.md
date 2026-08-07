# 리뷰 초안 생성기

구매한 상품 사진 한 장을 올리면 **네이버 스마트스토어 · 쿠팡 · 무신사 · 오늘의집**에
맞는 리뷰 초안 3개(담백·친근·상세)를 만들어 줍니다.

옷이면 사이즈감과 소재를, 음식이면 양과 포장 상태를, 화장품이면 제형과 용량을 —
카테고리별로 독자가 실제로 궁금해하는 항목 위주로 씁니다.

두 가지 방식으로 쓸 수 있습니다.

| | 웹 페이지 (`docs/`) | 로컬 서버 (`app.py`) |
|---|---|---|
| 준비 | 없음. 주소만 열면 됨 | Python 설치 + `pip install` |
| API 키 | 페이지에 한 번 입력 → 브라우저에 저장 | `.env` 파일 |
| 폰에서 | 됨 | 안 됨 |
| 서버 | 없음 (브라우저 → Anthropic 직접) | 내 PC에서 실행 |

## 핵심 원칙: 초안이지 완성본이 아닙니다

사진으로 알 수 없는 것(맛, 착용감, 향, 지속력, 내구성, 배송 속도)은 **절대 지어내지
않고** `[대괄호]` 자리표시자로 남깁니다.

> 짜임이 굵고 도톰합니다. **[실제 입어보니 착용감은 어땠는지]** 색은 사진보다 살짝 어둡습니다.

이 부분을 본인 경험으로 채우고 검토한 뒤에 올리세요. 그래야 실제로 겪은 내용을 담은
정상적인 리뷰가 됩니다. 안 겪은 걸 지어내서 올리면 표시광고법상 문제가 될 수 있고,
무엇보다 다음 구매자에게 잘못된 정보를 줍니다.

`직접 겪은 것` 메모란에 "생각보다 얇음, 배송 하루 만에 옴" 처럼 적어두면 자리표시자
대신 그 내용이 문장으로 들어갑니다.

---

## 1. 웹 페이지로 쓰기

`docs/` 폴더가 통째로 정적 사이트입니다. 빌드 과정이 없습니다.

**GitHub Pages 배포**

1. GitHub에서 이 저장소의 **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main`, 폴더: `/docs` → Save
4. 1~2분 뒤 `https://<사용자명>.github.io/review-assistant/` 에서 열립니다

**로컬에서 확인만**

```bash
cd docs && python3 -m http.server 8000
# → http://127.0.0.1:8000
```

`file://` 로 직접 열면 ES 모듈이 CORS 정책에 막혀 동작하지 않습니다. 반드시 서버로 띄우세요.

### API 키는 어디에 저장되나요

페이지에 입력한 키는 **그 브라우저의 localStorage에만** 저장됩니다. 저장소에도, 어떤
서버에도 올라가지 않습니다. 요청은 브라우저에서 `api.anthropic.com` 으로 직접 나가고
중간 서버가 없습니다.

다만 키가 브라우저에 남아 있으므로:

- 공용 PC에서는 쓰고 나서 **삭제** 버튼을 누르세요
- 이 페이지에는 외부 스크립트가 하나도 없지만, 그래도 키에는
  [사용량 한도](https://console.anthropic.com/settings/limits)를 걸어두는 편이 안전합니다

키를 브라우저에 두는 게 꺼려지면 아래 로컬 서버 방식을 쓰세요.

---

## 2. 로컬 서버로 쓰기

```bash
python3 -m venv .venv && source .venv/bin/activate   # 윈도우: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # ANTHROPIC_API_KEY 채우기
uvicorn app:app --port 8000 # → http://127.0.0.1:8000
```

터미널에서 바로:

```bash
python cli.py 사진.jpg --platform musinsa
python cli.py 사진.jpg -p naver -c food_product --note "배송 하루만에 옴"
```

---

## 내 정보 저장

무신사 리뷰는 키·몸무게·평소 사이즈가 맥락으로 깔려야 유용합니다
("평소 M인데 이건 L이 맞음"). 한 번 저장해 두면 이후 자동으로 반영됩니다.

카테고리에 맞는 항목만 골라서 씁니다 — 화장품 리뷰에는 피부 타입만 들어가고
키·몸무게는 들어가지 않습니다.

웹 페이지는 브라우저 localStorage에, 로컬 서버는
`~/.config/review-assistant/profile.json` 에 저장합니다. 둘 다 외부로 전송되지 않습니다.

## 사진 한 장으로 여러 플랫폼

결과 화면의 **다른 플랫폼용으로 다시 만들기**는 사진을 다시 보내지 않고, 이미 확인된
사실 목록만으로 재생성합니다. 같은 상품을 네이버용·쿠팡용으로 각각 뽑을 때
이미지 토큰을 다시 쓰지 않아 훨씬 쌉니다.

## 비용

사진 1장당 대략:

| 사진 축소 크기 | 이미지 토큰 | 회당 대략 |
|---|---|---|
| 1120px | ~800 | 약 1원 |
| 1568px (기본) | ~1,600 | 약 2원 |
| 2576px | ~4,800 | 약 5원 |

출력은 초안 3개 합쳐 400~600 토큰 정도입니다. 설정에서 축소 크기를 바꿀 수 있고,
원단 질감처럼 세밀한 디테일이 중요할 때만 올리면 됩니다.

## 구조

```
docs/                  GitHub Pages 정적 사이트 (백엔드 없음)
  index.html
  assets/data.js       카테고리 · 플랫폼 정의
  assets/api.js        프롬프트 조립 + Anthropic 직접 호출 + 이미지 처리
  assets/app.js        UI 배선
  assets/app.css
app.py                 FastAPI 서버 (로컬 실행용)
cli.py                 터미널 진입점
core/categories.py     카테고리별 '리뷰가 다뤄야 할 축' + '사진으로 알 수 없는 것'
core/platforms.py      플랫폼별 말투 · 분량 · 금기
core/profile.py        작성자 프로필 (카테고리별 선별 사용)
core/images.py         HEIC/EXIF 처리, 리사이즈
core/generator.py      프롬프트 조립 + Claude 호출
tests/test_offline.py  네트워크 없이 도는 테스트
```

카테고리·플랫폼 정의는 `core/*.py` 와 `docs/assets/data.js` 양쪽에 있습니다.
하나만 고치면 두 방식의 결과가 달라지므로 **함께 수정**하세요.

## 테스트

```bash
python tests/test_offline.py
```

API 키 없이 돕니다. 이미지 파이프라인, 카테고리별 프로필 선별, 프롬프트 조립,
오류 처리 경로를 검증합니다. 실제 응답 품질은 검증하지 않습니다.

## 지원 카테고리

의류 · 신발 · 가방/잡화 · 배달음식 · 식품 · 화장품 · 전자기기 · 생활용품 ·
가구/인테리어 · 유아동 · 반려동물 · 스포츠 · 도서/문구 · 기타

지정하지 않으면 사진을 보고 자동 판별합니다.

## 이 폴더를 독립 저장소로 옮기기

이미 옮겼다면 건너뛰세요. GitHub에서 빈 저장소를 먼저 만든 뒤(README 체크 해제):

```bash
# macOS / Linux / Git Bash
./publish.sh https://github.com/<사용자명>/review-assistant.git
```

```powershell
# Windows PowerShell
.\publish.ps1 https://github.com/<사용자명>/review-assistant.git
```

원본 이력, `.venv`, `__pycache__`, `.env`를 빼고 새 저장소로 푸시합니다.
`.env`가 섞이면 중단합니다.

## 하지 않는 것

- 리뷰 자동 등록 (각 쇼핑몰 이용약관 위반이고, 캡차·봇 탐지로 실질적으로도 어렵습니다)
- 구매하지 않은 상품의 리뷰 생성
- 계정 여러 개를 이용한 대량 리뷰 작성

이 도구는 **본인이 산 물건에 대해 본인이 쓸 리뷰의 초안**을 돕습니다.
