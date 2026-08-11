"""로컬에서 띄우는 리뷰 초안 생성기.

    uvicorn app:app --reload --port 8000
    → http://127.0.0.1:8000
"""

from __future__ import annotations

import os
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from core import categories, generator, images, platforms  # noqa: E402
from core.profile import Profile, profile_path  # noqa: E402

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

app = FastAPI(title="리뷰 초안 생성기")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
def get_config() -> dict:
    return {
        "categories": [
            {"key": c.key, "label": c.label} for c in categories.CATEGORIES.values()
        ],
        "platforms": [
            {
                "key": p.key,
                "label": p.label,
                "needs_body_profile": p.needs_body_profile,
            }
            for p in platforms.PLATFORMS.values()
        ],
        "profile": asdict(Profile.load()),
        "profile_path": str(profile_path()),
        "model": os.getenv("REVIEW_MODEL") or generator.DEFAULT_MODEL,
        "max_image_px": images.max_px(),
        "heic_supported": images.HEIC_SUPPORTED,
        "api_key_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
    }


@app.post("/api/profile")
def save_profile(payload: dict) -> dict:
    known = set(asdict(Profile()))
    profile = Profile(**{k: str(v) for k, v in payload.items() if k in known})
    path = profile.save()
    return {"ok": True, "path": str(path)}


def _fail(exc: Exception) -> HTTPException:
    import anthropic

    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, anthropic.AuthenticationError):
        return HTTPException(
            status_code=401,
            detail="API 키가 없거나 잘못됐습니다. .env 의 ANTHROPIC_API_KEY 를 확인하세요.",
        )
    if isinstance(exc, anthropic.RateLimitError):
        return HTTPException(status_code=429, detail="요청이 몰렸습니다. 잠시 후 다시 시도하세요.")
    if isinstance(exc, anthropic.APIConnectionError):
        return HTTPException(status_code=503, detail="네트워크 연결에 실패했습니다.")
    if isinstance(exc, anthropic.APIStatusError):
        return HTTPException(status_code=502, detail=f"API 오류: {exc.message}")
    return HTTPException(status_code=500, detail=str(exc))


@app.post("/api/generate")
async def api_generate(
    image: UploadFile = File(...),
    platform: str = Form("generic"),
    category: str = Form(""),
    note: str = Form(""),
) -> JSONResponse:
    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="사진이 너무 큽니다(25MB 초과).")

    try:
        result = generator.generate(
            image_bytes=data,
            platform_key=platform,
            category_key=category or None,
            profile=Profile.load(),
            note=note,
        )
    except Exception as exc:
        raise _fail(exc) from exc

    return JSONResponse(result.model_dump())


class RefineRequest(BaseModel):
    observed: list[str]
    platform: str = "generic"
    category: str = "other"
    note: str = ""


@app.post("/api/refine")
def api_refine(req: RefineRequest) -> JSONResponse:
    facts = [o.strip() for o in req.observed if o.strip()]
    if not facts:
        raise HTTPException(status_code=400, detail="확인된 사실이 최소 1개는 필요합니다.")
    try:
        result = generator.refine(
            observed=facts,
            platform_key=req.platform,
            category_key=req.category,
            profile=Profile.load(),
            note=req.note,
        )
    except Exception as exc:
        raise _fail(exc) from exc
    return JSONResponse(result.model_dump())
