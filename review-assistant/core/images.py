"""업로드 사진을 Claude vision 입력으로 정규화한다.

- 아이폰 HEIC 지원(pillow-heif 설치 시)
- EXIF 회전 정보 반영 (안 하면 눕혀진 사진을 그대로 보내게 된다)
- 긴 변을 REVIEW_MAX_IMAGE_PX 로 축소해 이미지 토큰 비용을 억제
"""

from __future__ import annotations

import base64
import io
import os

from PIL import Image, ImageOps

try:  # HEIC는 선택 의존성
    import pillow_heif  # type: ignore

    pillow_heif.register_heif_opener()
    HEIC_SUPPORTED = True
except Exception:  # pragma: no cover - 환경에 따라 없을 수 있음
    HEIC_SUPPORTED = False

DEFAULT_MAX_PX = 1568
# Claude의 고해상도 상한. 이 이상 올려봐야 서버에서 다시 줄인다.
HARD_MAX_PX = 2576


def max_px() -> int:
    raw = os.getenv("REVIEW_MAX_IMAGE_PX", "")
    try:
        value = int(raw) if raw else DEFAULT_MAX_PX
    except ValueError:
        value = DEFAULT_MAX_PX
    return max(256, min(value, HARD_MAX_PX))


def prepare(data: bytes) -> tuple[str, str]:
    """원본 바이트를 (base64 JPEG, media_type) 으로 변환한다."""
    if not data:
        raise ValueError("빈 이미지입니다.")

    try:
        image = Image.open(io.BytesIO(data))
    except Exception as exc:
        hint = "" if HEIC_SUPPORTED else " (HEIC 사진이면 pillow-heif를 설치하세요)"
        raise ValueError(f"이미지를 읽을 수 없습니다{hint}: {exc}") from exc

    image = ImageOps.exif_transpose(image)

    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        canvas = Image.new("RGB", image.size, (255, 255, 255))
        canvas.paste(image, mask=image.split()[-1])
        image = canvas
    elif image.mode != "RGB":
        image = image.convert("RGB")

    limit = max_px()
    if max(image.size) > limit:
        image.thumbnail((limit, limit), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return base64.standard_b64encode(buffer.getvalue()).decode("ascii"), "image/jpeg"
