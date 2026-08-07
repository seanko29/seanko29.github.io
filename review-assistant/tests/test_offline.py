"""네트워크 없이 도는 테스트. API 호출은 가짜 클라이언트로 대체한다."""

from __future__ import annotations

import io
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("REVIEW_PROFILE_PATH", tempfile.mktemp(suffix=".json"))

from PIL import Image  # noqa: E402

from core import categories, generator, images, platforms  # noqa: E402
from core.profile import Profile  # noqa: E402


def _png(size=(3000, 2000)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (180, 140, 110)).save(buf, "PNG")
    return buf.getvalue()


def _fake_client(result: generator.ReviewResult) -> MagicMock:
    client = MagicMock()
    client.messages.parse.return_value = MagicMock(
        parsed_output=result, stop_reason="end_turn"
    )
    return client


SAMPLE = generator.ReviewResult(
    category="clothing",
    product_guess="베이지색 니트 스웨터",
    observed=["짜임이 굵고 촘촘함", "소매 끝 마감 깔끔"],
    caution=["착용감은 사진으로 알 수 없으니 직접 채우세요"],
    drafts=[
        generator.Draft(tone="담백", text="짜임이 굵고 촘촘합니다. [착용감은 어땠는지]"),
        generator.Draft(tone="친근", text="색 예뻐요! [세탁 후에도 괜찮은지]"),
        generator.Draft(tone="상세", text="마감이 깔끔하고 [두께감]도 괜찮습니다."),
    ],
)


def test_category_platform_tables_are_consistent():
    assert set(generator.CategoryKey.__args__) == set(categories.CATEGORY_KEYS)
    assert categories.get("없는키").key == "other"
    assert platforms.get("없는키").key == "generic"


def test_image_is_downscaled_and_normalised():
    b64, media_type = images.prepare(_png())
    assert media_type == "image/jpeg"
    import base64
    out = Image.open(io.BytesIO(base64.b64decode(b64)))
    assert max(out.size) <= images.max_px()
    assert out.mode == "RGB"


def test_empty_image_rejected():
    try:
        images.prepare(b"")
    except ValueError:
        return
    raise AssertionError("빈 이미지는 ValueError 여야 합니다")


def test_profile_context_is_category_scoped():
    p = Profile(height_cm="176", weight_kg="68", top_size="M",
                shoe_size="270", skin_type="복합성")
    clothing = " ".join(p.context_lines("clothing", needs_body=True))
    beauty = " ".join(p.context_lines("beauty", needs_body=False))
    assert "176" in clothing and "피부" not in clothing
    assert "피부" in beauty and "176" not in beauty


def test_prompt_carries_platform_category_profile_and_note():
    content = generator._build_user_content(
        image_b64="x", media_type="image/jpeg", platform_key="musinsa",
        category_key="clothing", profile=Profile(height_cm="176", top_size="M"),
        note="배송 하루만에 옴",
    )
    assert content[0]["type"] == "image"
    text = content[1]["text"]
    assert "무신사" in text          # 플랫폼 규칙
    assert "사이즈감과 핏" in text    # 카테고리 축
    assert "176" in text             # 프로필
    assert "배송 하루만에 옴" in text  # 사용자 메모
    assert "착용감" in text          # 알 수 없는 항목 경고


def test_musinsa_without_profile_gets_placeholder_instruction():
    content = generator._build_user_content(
        image_b64="x", media_type="image/jpeg", platform_key="musinsa",
        category_key="clothing", profile=Profile(), note="",
    )
    assert "자리표시자" in content[1]["text"]


def test_auto_category_lists_full_catalog():
    content = generator._build_user_content(
        image_b64="x", media_type="image/jpeg", platform_key="naver",
        category_key=None, profile=Profile(), note="",
    )
    assert "food_delivery" in content[1]["text"]


def test_generate_returns_parsed_result():
    out = generator.generate(_png((800, 600)), platform_key="naver",
                             client=_fake_client(SAMPLE))
    assert out.category == "clothing"
    assert len(out.drafts) == 3


def test_refusal_and_unparsed_raise():
    for kwargs in ({"stop_reason": "refusal", "parsed_output": None},
                   {"stop_reason": "max_tokens", "parsed_output": None}):
        client = MagicMock()
        client.messages.parse.return_value = MagicMock(**kwargs)
        try:
            generator.generate(_png((400, 300)), client=client)
        except RuntimeError:
            continue
        raise AssertionError(f"{kwargs} 는 RuntimeError 여야 합니다")


def test_refine_does_not_send_an_image():
    client = _fake_client(SAMPLE)
    generator.refine(observed=["짜임이 굵음"], platform_key="coupang",
                     category_key="clothing", client=client)
    sent = client.messages.parse.call_args.kwargs["messages"][0]["content"]
    assert isinstance(sent, str)             # 이미지 블록 없음
    assert "짜임이 굵음" in sent
    assert "지어내지 마라" in sent


def test_system_prompt_forbids_fabrication():
    for phrase in ("절대 단정하지 않는다", "대괄호", "초안"):
        assert phrase in generator.SYSTEM_PROMPT


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
