"""플랫폼별 리뷰 톤·길이·금기 규칙.

각 쇼핑몰은 리뷰 문화가 다르다. 무신사에 네이버 말투를 쓰면 바로 티가 난다.
length_hint 는 프롬프트에 넣는 가이드일 뿐 하드 제한이 아니다(글자 수 강제는
문장 품질을 떨어뜨린다). 최소 글자 수만 적립금 조건 때문에 명시한다.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Platform:
    key: str
    label: str
    style: str
    length_hint: str
    min_chars: int
    avoid: tuple[str, ...]
    needs_body_profile: bool = False
    extras: tuple[str, ...] = field(default_factory=tuple)


_PLATFORM_LIST: tuple[Platform, ...] = (
    Platform(
        key="naver",
        label="네이버 스마트스토어",
        style="존댓말 구어체. 담백하고 사실 위주. 판매자가 읽는다는 걸 의식한 정중한 톤.",
        length_hint="100~200자",
        min_chars=20,
        avoid=("해시태그", "다른 쇼핑몰 언급", "별점 숫자 언급", "이벤트/적립금 언급"),
        extras=("포토리뷰 적립 조건상 너무 짧으면 안 된다.",),
    ),
    Platform(
        key="coupang",
        label="쿠팡",
        style="존댓말이지만 더 짧고 실용적. 결론부터. 배송에 관한 한 줄이 자연스럽다.",
        length_hint="60~150자",
        min_chars=20,
        avoid=("해시태그", "다른 쇼핑몰 언급", "판매자에게 말 거는 문장", "과장 표현"),
        extras=("배송 관련 언급은 사용자가 실제로 겪은 경우에만. 모르면 자리표시자로 남긴다.",),
    ),
    Platform(
        key="musinsa",
        label="무신사",
        style="반말 또는 음슴체 허용. 사이즈감과 핏이 본론. 스타일 코멘트가 붙으면 좋다.",
        length_hint="60~180자",
        min_chars=20,
        avoid=("해시태그", "과한 존댓말", "다른 쇼핑몰 언급"),
        needs_body_profile=True,
        extras=(
            "무신사 리뷰는 작성자 키/몸무게/평소 사이즈가 맥락으로 깔린다.",
            "'평소 M인데 이건 L이 맞음' 같은 사이즈 비교 문장이 가장 유용하다.",
        ),
    ),
    Platform(
        key="ohouse",
        label="오늘의집",
        style="존댓말 구어체. 공간에 놓았을 때의 느낌과 색감 위주. 따뜻한 톤.",
        length_hint="100~250자",
        min_chars=20,
        avoid=("해시태그 남발", "다른 쇼핑몰 언급"),
        extras=("어떤 공간에 어떻게 배치했는지가 핵심 정보다.",),
    ),
    Platform(
        key="generic",
        label="공통(플랫폼 미지정)",
        style="존댓말 구어체. 무난하고 어디에나 붙일 수 있는 톤.",
        length_hint="80~180자",
        min_chars=20,
        avoid=("해시태그", "특정 쇼핑몰 언급"),
    ),
)

PLATFORMS: dict[str, Platform] = {p.key: p for p in _PLATFORM_LIST}
PLATFORM_KEYS: tuple[str, ...] = tuple(PLATFORMS)


def get(key: str) -> Platform:
    return PLATFORMS.get(key, PLATFORMS["generic"])


def describe(key: str) -> str:
    p = get(key)
    lines = [
        f"플랫폼: {p.label}",
        f"- 말투: {p.style}",
        f"- 분량: {p.length_hint} (최소 {p.min_chars}자 이상)",
        f"- 쓰지 말 것: {', '.join(p.avoid)}",
    ]
    lines.extend(f"- {e}" for e in p.extras)
    return "\n".join(lines)
