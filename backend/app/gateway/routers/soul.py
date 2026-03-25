"""SOUL API — read/write the default agent's SOUL.md personality file."""

import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from deerflow.config.paths import get_paths

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/soul", tags=["soul"])

SOUL_FILENAME = "SOUL.md"


class SoulResponse(BaseModel):
    exists: bool
    content: str


class SoulUpdateRequest(BaseModel):
    content: str


@router.get("", response_model=SoulResponse, summary="Get SOUL")
async def get_soul() -> SoulResponse:
    soul_path = get_paths().base_dir / SOUL_FILENAME
    if not soul_path.exists():
        return SoulResponse(exists=False, content="")
    content = soul_path.read_text(encoding="utf-8").strip()
    return SoulResponse(exists=bool(content), content=content)


@router.put("", response_model=SoulResponse, summary="Update SOUL")
async def update_soul(request: SoulUpdateRequest) -> SoulResponse:
    base_dir = get_paths().base_dir
    base_dir.mkdir(parents=True, exist_ok=True)
    soul_path = base_dir / SOUL_FILENAME
    soul_path.write_text(request.content, encoding="utf-8")
    logger.info("SOUL.md updated (%d chars) at %s", len(request.content), soul_path)
    return SoulResponse(exists=bool(request.content.strip()), content=request.content)
