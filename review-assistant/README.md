# 리뷰 초안 생성기

구매한 상품 사진 한 장을 올리면 **네이버 스마트스토어 / 쿠팡 / 무신사 / 오늘의집**에
맞는 리뷰 초안 3개(담백·친근·상세)를 만들어 줍니다.

옷이면 사이즈감과 소재를, 음식이면 양과 포장 상태를, 화장품이면 제형과 용량을 —
카테고리별로 독자가 실제로 궁금해하는 항목 위주로 씁니다.

## 핵심 원칙: 초안이지 완성본이 아닙니다

사진으로 알 수 없는 것(맛, 착용감, 향, 지속력, 내구성, 배송 속도)은 **절대 지어내지
않고** `[대괄호]` 자리표시자로 남깁니다.

> 짜임이 굵고 도톰해서 겨울에도 괜찮을 것 같아요. [실제 입어보니 착용감은 어땠는지]
> 색은 사진보다 살짝 어둡습니다.

이 부분을 본인 경험으로 채우고 검토한 뒤에 올리세요. 그래야 실제로 겪은 내용을 담은
정상적인 리뷰가 됩니다. 안 겪은 걸 지어내서 올리면 표시광고법상 문제가 될 수 있고,
무엇보다 다음 구매자에게 잘못된 정보를 줍니다.

`직접 겪은 것` 메모란에 "생각보다 얇음, 배송 하루 만에 옴" 처럼 적어두면 자리표시자
대신 그 내용이 문장으로 들어갑니다.

## 설치

```bash
cd review-assistant
python3 -m venv .venv && source .venv/bin/activate   # 윈도우: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env 를 열어 ANTHROPIC_API_KEY 를 채웁니다 (https://console.anthropic.com)
```

## 실행

**웹 UI**

```bash
uvicorn app:app --reload --port 8000
# → http://127.0.0.1:8000
```

**터미널**

```bash
python cli.py 사진.jpg --platform musinsa
python cli.py 사진.jpg -p naver -c food_product --note "배송 하루만에 옴"
```

## 내 정보 저장

무신사 리뷰는 키·몸무게·평소 사이즈가 맥락으로 깔려야 유용합니다
("평소 M인데 이건 L이 맞음"). 웹 UI의 **내 정보**에 한 번 저장해 두면 이후 자동으로
반영됩니다. 저장 위치는 `~/.config/review-assistant/profile.json` — 이 컴퓨터에만
저장되고 어디로도 전송되지 않습니다.

카테고리에 맞는 항목만 골라서 씁니다. 화장품 리뷰에는 피부 타입만 들어가고 키·몸무게는
들어가지 않습니다.

## 설정 (`.env`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (필수) | API 키 |
| `REVIEW_MODEL` | `claude-opus-5` | 사용할 모델 |
| `REVIEW_MAX_IMAGE_PX` | `1568` | 사진 긴 변을 이 픽셀로 줄여 전송. 최대 2576 |
| `REVIEW_PROFILE_PATH` | `~/.config/...` | 프로필 저장 위치 |

`REVIEW_MAX_IMAGE_PX`는 비용에 직접 영향을 줍니다. 기본값 1568이면 사진 1장당 대략
1,600 토큰, 2576으로 올리면 최대 4,784 토큰까지 늘어납니다. 원단 질감처럼 세밀한
디테일이 중요하면 올리고, 아니면 기본값을 쓰세요.

## 구조

```
app.py              FastAPI 서버 (/api/generate, /api/refine, /api/profile)
cli.py              터미널 진입점
core/categories.py  카테고리별 '리뷰가 다뤄야 할 축' + '사진으로 알 수 없는 것'
core/platforms.py   플랫폼별 말투·분량·금기
core/profile.py     작성자 프로필 (로컬 저장, 카테고리별 선별 사용)
core/images.py      HEIC/EXIF 처리, 리사이즈, base64 변환
core/generator.py   프롬프트 조립 + Claude 호출 (structured outputs)
static/index.html   웹 UI
tests/test_offline.py  네트워크 없이 도는 테스트
```

`/api/refine`은 사진 없이 "확인된 사실" 목록만으로 다시 생성합니다. 사실을 고쳤거나
같은 상품을 다른 플랫폼용으로 다시 뽑을 때 쓰면 사진을 재전송하지 않아 더 싸고 빠릅니다.

## 테스트

```bash
python tests/test_offline.py
```

API 키 없이 도는 테스트입니다. 이미지 파이프라인, 카테고리별 프로필 선별, 프롬프트
조립, 오류 처리 경로를 검증합니다. 실제 API 응답 품질은 검증하지 않습니다.

## 지원 카테고리

의류 · 신발 · 가방/잡화 · 배달음식 · 식품 · 화장품 · 전자기기 · 생활용품 ·
가구/인테리어 · 유아동 · 반려동물 · 스포츠 · 도서/문구 · 기타

카테고리를 지정하지 않으면 사진을 보고 자동 판별합니다.

## 하지 않는 것

- 리뷰 자동 등록 (각 쇼핑몰 이용약관 위반이고 캡차·봇 탐지로 실질적으로도 어렵습니다)
- 구매하지 않은 상품의 리뷰 생성
- 계정 여러 개를 이용한 대량 리뷰 작성

이 도구는 **본인이 산 물건에 대해 본인이 쓸 리뷰의 초안**을 돕습니다.
