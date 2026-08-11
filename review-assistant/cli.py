#!/usr/bin/env python3
"""터미널에서 바로 쓰기.

    python cli.py 사진.jpg --platform musinsa
    python cli.py 사진.jpg -p naver -c food_product --note "배송 하루만에 옴"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from core import categories, generator, platforms  # noqa: E402
from core.profile import Profile  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="사진에서 리뷰 초안 만들기")
    ap.add_argument("image", type=Path, help="상품 사진 경로")
    ap.add_argument("-p", "--platform", default="generic",
                    choices=platforms.PLATFORM_KEYS, help="올릴 플랫폼")
    ap.add_argument("-c", "--category", default="",
                    choices=("",) + categories.CATEGORY_KEYS,
                    help="카테고리 (비우면 사진 보고 자동 판별)")
    ap.add_argument("-n", "--note", default="", help="직접 겪은 것 (실제 경험으로 반영됨)")
    args = ap.parse_args()

    if not args.image.is_file():
        print(f"파일을 찾을 수 없습니다: {args.image}", file=sys.stderr)
        return 1

    try:
        result = generator.generate(
            image_bytes=args.image.read_bytes(),
            platform_key=args.platform,
            category_key=args.category or None,
            profile=Profile.load(),
            note=args.note,
        )
    except Exception as exc:
        print(f"실패: {exc}", file=sys.stderr)
        return 1

    cat = categories.get(result.category)
    print(f"\n[{cat.label}] {result.product_guess}")
    print("\n사진에서 확인된 것:")
    for o in result.observed:
        print(f"  - {o}")
    if result.caution:
        print("\n올리기 전에 확인할 것:")
        for c in result.caution:
            print(f"  ! {c}")
    for d in result.drafts:
        print(f"\n{'─' * 60}\n[{d.tone}] {len(d.text)}자\n{'─' * 60}\n{d.text}")
    print("\n※ 초안입니다. [대괄호] 부분을 본인 경험으로 채우고 검토한 뒤 올리세요.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
