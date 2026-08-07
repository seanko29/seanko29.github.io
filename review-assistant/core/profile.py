"""작성자 프로필. 무신사 사이즈 리뷰처럼 본인 신체 정보가 맥락으로 필요한 곳에 쓴다.

기본 저장 위치는 ~/.config/review-assistant/profile.json 이며,
REVIEW_PROFILE_PATH 환경변수로 바꿀 수 있다. 저장은 전적으로 로컬이다.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, fields
from pathlib import Path

from . import categories


def profile_path() -> Path:
    override = os.getenv("REVIEW_PROFILE_PATH")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".config" / "review-assistant" / "profile.json"


@dataclass
class Profile:
    nickname: str = ""
    height_cm: str = ""
    weight_kg: str = ""
    top_size: str = ""       # 평소 상의 사이즈 (예: M, 95)
    bottom_size: str = ""    # 평소 하의 사이즈 (예: 30, L)
    shoe_size: str = ""      # mm
    skin_type: str = ""      # 건성/지성/복합성/민감성
    age_range: str = ""      # 20대 / 30대 ...

    @classmethod
    def load(cls) -> "Profile":
        path = profile_path()
        if not path.exists():
            return cls()
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return cls()
        known = {f.name for f in fields(cls)}
        return cls(**{k: str(v) for k, v in raw.items() if k in known})

    def save(self) -> Path:
        path = profile_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(asdict(self), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return path

    def context_lines(self, category_key: str, needs_body: bool) -> list[str]:
        """카테고리에 실제로 관련 있는 항목만 골라서 프롬프트에 넣는다.

        화장품 리뷰에 키·몸무게를 넣으면 모델이 엉뚱하게 끌어다 쓴다.
        """
        cat = categories.get(category_key)
        out: list[str] = []

        wears = cat.key in {"clothing", "sports_outdoor", "baby_kids"}
        shoes = cat.key == "shoes"

        if (wears or needs_body) and self.height_cm:
            out.append(f"키: {self.height_cm}cm")
        if (wears or needs_body) and self.weight_kg:
            out.append(f"몸무게: {self.weight_kg}kg")
        if (wears or needs_body) and self.top_size:
            out.append(f"평소 상의 사이즈: {self.top_size}")
        if (wears or needs_body) and self.bottom_size:
            out.append(f"평소 하의 사이즈: {self.bottom_size}")
        if shoes and self.shoe_size:
            out.append(f"평소 신발 사이즈: {self.shoe_size}mm")
        if cat.key == "beauty" and self.skin_type:
            out.append(f"피부 타입: {self.skin_type}")
        if self.age_range:
            out.append(f"연령대: {self.age_range}")
        return out
