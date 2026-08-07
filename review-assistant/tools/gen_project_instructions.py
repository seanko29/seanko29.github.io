#!/usr/bin/env python3
"""claude.ai 프로젝트 지침을 core/ 정의에서 생성한다.

카테고리·플랫폼 규칙이 코드와 어긋나지 않도록 손으로 쓰지 않고 뽑아낸다.

    python tools/gen_project_instructions.py > PROJECT_INSTRUCTIONS.md
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.categories import CATEGORIES  # noqa: E402
from core.generator import SYSTEM_PROMPT  # noqa: E402
from core.platforms import PLATFORMS  # noqa: E402


def main() -> None:
    # SYSTEM_PROMPT 는 JSON 스키마를 쓰는 API용이라 필드명이 섞여 있다.
    # 대화형(claude.ai)에서는 그 표현을 자연어로 바꾼다.
    prompt = SYSTEM_PROMPT.rstrip().replace(
        "사용자가 확인해야 할 것은 caution 에 빠짐없이 적는다.",
        "사용자가 확인해야 할 것은 빠짐없이 따로 적는다.",
    )
    assert "caution" not in prompt, "치환 실패 — SYSTEM_PROMPT 가 바뀌었는지 확인하세요"

    out = [prompt, "", "---", "", "## 플랫폼별 규칙", ""]

    for p in PLATFORMS.values():
        if p.key == "generic":
            continue
        out.append(f"**{p.label}**")
        out.append(f"- 말투: {p.style}")
        out.append(f"- 분량: {p.length_hint} (최소 {p.min_chars}자)")
        out.append(f"- 쓰지 말 것: {', '.join(p.avoid)}")
        out.extend(f"- {e}" for e in p.extras)
        out.append("")

    out += ["---", "", "## 카테고리별로 다뤄야 할 것", "",
            "사진을 보고 아래에서 카테고리를 판별한 뒤, 그 줄의 항목 위주로 쓴다.",
            "'사진으로 알 수 없는 것'은 절대 단정하지 말고 [대괄호]로 남긴다.", ""]

    for c in CATEGORIES.values():
        out.append(f"**{c.label}**")
        out.append(f"- 다룰 것: {', '.join(c.axes)}")
        out.append(f"- 알 수 없는 것: {', '.join(c.unknowable)}")
        out.append("")

    out += [
        "---", "",
        "## 응답 형식", "",
        "1. **사진에서 확인된 것** — 사진에 실제로 보이는 사실만 목록으로",
        "2. **올리기 전에 확인할 것** — 사용자가 직접 채우거나 검토해야 하는 것",
        "3. **초안 3개** — 담백 / 친근 / 상세. 각각 글자 수를 괄호로 표시",
        "",
        "사용자가 플랫폼을 말하지 않으면 어디에 올릴지 먼저 물어본다.",
        "키·몸무게·평소 사이즈를 알려주면 의류/신발 리뷰에 반영한다.",
        "",
    ]
    print("\n".join(out))


if __name__ == "__main__":
    main()
