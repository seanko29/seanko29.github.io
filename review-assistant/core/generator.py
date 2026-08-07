"""사진 → 카테고리 판별 → 플랫폼별 리뷰 초안 생성.

핵심 설계: 모델은 '사진에서 보이는 것'과 '사진으로 알 수 없는 것'을 분리해서
다룬다. 후자는 절대 지어내지 않고 [대괄호] 자리표시자로 남겨 사용자가 채우게
한다. 이 덕분에 결과물이 '허위 리뷰'가 아니라 '내가 검토해서 완성할 초안'이 된다.
"""

from __future__ import annotations

import os
from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

from . import categories, images, platforms
from .profile import Profile

DEFAULT_MODEL = "claude-opus-5"

Tone = Literal["담백", "친근", "상세"]
CategoryKey = Literal[
    "clothing", "shoes", "bag_accessory", "food_delivery", "food_product",
    "beauty", "electronics", "home_living", "furniture_interior",
    "baby_kids", "pet", "sports_outdoor", "book_stationery", "other",
]

# 타입 리터럴과 카테고리 테이블이 어긋나면 즉시 터뜨린다(조용한 불일치 방지).
assert set(CategoryKey.__args__) == set(categories.CATEGORY_KEYS), (
    "CategoryKey 리터럴과 categories.CATEGORY_KEYS 가 불일치합니다."
)


class Draft(BaseModel):
    tone: Tone = Field(description="이 초안의 말투")
    text: str = Field(description="리뷰 본문. 그대로 복사해서 붙여넣을 수 있는 완성된 문장.")


class ReviewResult(BaseModel):
    category: CategoryKey = Field(description="사진에서 판별한 상품 카테고리")
    product_guess: str = Field(description="상품이 무엇으로 보이는지 한 줄 요약")
    observed: list[str] = Field(description="사진에서 실제로 확인되는 사실만 나열")
    caution: list[str] = Field(
        description="사용자가 올리기 전에 반드시 확인하거나 직접 채워야 하는 것"
    )
    drafts: list[Draft] = Field(description="말투가 다른 리뷰 초안 3개")


SYSTEM_PROMPT = """\
너는 한국 이커머스 리뷰 작성을 돕는 어시스턴트다. 사용자는 본인이 실제로 구매해서
받은 상품의 사진을 올린다. 너는 그 사진을 보고 사용자가 검토·수정한 뒤 올릴
'리뷰 초안'을 만든다.

절대 원칙:
1. 사진에서 실제로 보이는 것만 사실로 쓴다. 맛, 착용감, 향, 지속력, 내구성,
   배송 속도처럼 사진으로 알 수 없는 것은 절대 단정하지 않는다. 대신
   [맛은 어땠는지] 같은 대괄호 자리표시자를 문장 안에 자연스럽게 남긴다.
2. 사용자가 메모로 알려준 실제 경험은 사실로 취급해도 된다.
3. 최종 결과물은 초안이다. 사용자가 확인해야 할 것은 caution 에 빠짐없이 적는다.
4. 과장·광고성 표현, 다른 쇼핑몰이나 경쟁 브랜드 언급, 별점 숫자 언급,
   개인정보(이름/주소/연락처/택배 송장)는 쓰지 않는다.
5. 자연스러운 한국어 구어체로 쓴다. AI 티가 나는 표현은 피한다:
   과도한 접속사, "~인 것 같습니다만", 항목 나열식 문장, 마무리 상투구
   ("좋은 하루 되세요" 등), 문장마다 붙는 감탄사.
6. 이모지는 최대 1개, 해시태그는 쓰지 않는다.
7. 초안 3개는 말투와 길이가 서로 확실히 달라야 한다. 같은 문장을 살짝 바꾼
   3개를 내놓지 마라.
   - 담백: 짧고 사실 위주. 군더더기 없음.
   - 친근: 구어체, 실제 사람이 쓴 것 같은 리듬. 감상 한두 마디.
   - 상세: 가장 길고 구체적. 카테고리 축을 폭넓게 다룸.
"""


def _build_user_content(
    image_b64: str,
    media_type: str,
    platform_key: str,
    category_key: Optional[str],
    profile: Profile,
    note: str,
) -> list[dict]:
    platform = platforms.get(platform_key)

    if category_key:
        category_block = (
            f"{categories.describe(category_key)}\n"
            "(사용자가 카테고리를 지정했으므로 이 값을 그대로 사용하라.)"
        )
    else:
        category_block = (
            "카테고리는 네가 사진을 보고 아래 목록에서 판별하라:\n"
            f"{categories.catalog_for_prompt()}\n"
            "판별한 카테고리에서 독자가 궁금해할 항목 위주로 리뷰를 구성하라."
        )

    profile_lines = profile.context_lines(
        category_key or "other", platform.needs_body_profile
    )
    profile_block = (
        "작성자 정보(리뷰에 자연스럽게 녹일 것. 관련 없으면 쓰지 마라):\n"
        + "\n".join(f"- {line}" for line in profile_lines)
        if profile_lines
        else "작성자 정보: 없음"
    )

    if platform.needs_body_profile and not profile_lines:
        profile_block += (
            "\n※ 이 플랫폼은 키/몸무게/평소 사이즈 맥락이 중요한데 정보가 없다. "
            "해당 부분은 [키 000cm / 평소 M] 형태의 자리표시자로 남겨라."
        )

    note_block = (
        f"사용자가 직접 남긴 메모(실제 경험이므로 사실로 취급):\n{note.strip()}"
        if note.strip()
        else "사용자 메모: 없음"
    )

    text_prompt = "\n\n".join(
        [
            "아래 사진의 상품에 대한 리뷰 초안을 만들어줘.",
            category_block,
            platforms.describe(platform_key),
            profile_block,
            note_block,
            "말투가 다른 초안 3개(담백/친근/상세)를 만들어라.",
        ]
    )

    return [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": image_b64},
        },
        {"type": "text", "text": text_prompt},
    ]


def _model_name() -> str:
    return os.getenv("REVIEW_MODEL") or DEFAULT_MODEL


def make_client() -> anthropic.Anthropic:
    """ANTHROPIC_API_KEY 또는 `ant auth login` 프로필에서 자격증명을 해석한다."""
    return anthropic.Anthropic()


def generate(
    image_bytes: bytes,
    platform_key: str = "generic",
    category_key: Optional[str] = None,
    profile: Optional[Profile] = None,
    note: str = "",
    client: Optional[anthropic.Anthropic] = None,
) -> ReviewResult:
    image_b64, media_type = images.prepare(image_bytes)
    profile = profile or Profile()
    client = client or make_client()

    response = client.messages.parse(
        model=_model_name(),
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": _build_user_content(
                    image_b64, media_type, platform_key, category_key, profile, note
                ),
            }
        ],
        output_format=ReviewResult,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError(
            "모델이 이 요청을 거절했습니다. 사진이나 메모 내용을 확인해 주세요."
        )
    if response.parsed_output is None:
        raise RuntimeError(
            f"응답을 해석하지 못했습니다 (stop_reason={response.stop_reason})."
        )
    return response.parsed_output


def refine(
    observed: list[str],
    platform_key: str,
    category_key: str,
    profile: Optional[Profile] = None,
    note: str = "",
    client: Optional[anthropic.Anthropic] = None,
) -> ReviewResult:
    """사진 없이 다시 생성한다. 사용자가 사실을 고쳤거나 다른 플랫폼용이 필요할 때.

    사진을 재전송하지 않아 훨씬 싸고 빠르다.
    """
    profile = profile or Profile()
    client = client or make_client()
    platform = platforms.get(platform_key)

    profile_lines = profile.context_lines(category_key, platform.needs_body_profile)
    profile_block = (
        "작성자 정보:\n" + "\n".join(f"- {line}" for line in profile_lines)
        if profile_lines
        else "작성자 정보: 없음"
    )

    text_prompt = "\n\n".join(
        [
            "아래 사실만 근거로 리뷰 초안을 만들어줘. 사진은 없다.",
            "확인된 사실(사용자가 검토·수정한 내용이므로 그대로 신뢰할 것):\n"
            + "\n".join(f"- {o}" for o in observed),
            categories.describe(category_key),
            platforms.describe(platform_key),
            profile_block,
            (
                f"사용자 메모(사실로 취급):\n{note.strip()}"
                if note.strip()
                else "사용자 메모: 없음"
            ),
            "여기 적힌 것 외의 사실을 새로 지어내지 마라. "
            "부족한 정보는 [대괄호] 자리표시자로 남겨라.",
            "말투가 다른 초안 3개(담백/친근/상세)를 만들어라.",
        ]
    )

    response = client.messages.parse(
        model=_model_name(),
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text_prompt}],
        output_format=ReviewResult,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("모델이 이 요청을 거절했습니다.")
    if response.parsed_output is None:
        raise RuntimeError(f"응답 해석 실패 (stop_reason={response.stop_reason}).")
    return response.parsed_output
