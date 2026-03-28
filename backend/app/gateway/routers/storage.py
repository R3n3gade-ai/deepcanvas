# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Storage API – upload, list, download, and delete files.
Files are persisted in .deer-flow/storage/ on the host filesystem.
"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/storage", tags=["storage"])

_app_deer_flow = Path(__file__).resolve().parents[4] / ".deer-flow"
_home_deer_flow = Path(os.path.expanduser("~")) / ".deer-flow"
STORAGE_ROOT = (_app_deer_flow if _app_deer_flow.exists() else _home_deer_flow) / "storage"
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


class StoredFile(BaseModel):
    id: str
    original_name: str
    stored_name: str
    mime_type: Optional[str] = None
    size: int
    created_at: str
    category: str  # image, video, document, other


def _categorize(mime: str | None, name: str) -> str:
    if mime:
        if mime.startswith("image/"):
            return "image"
        if mime.startswith("video/"):
            return "video"
        if mime.startswith("audio/"):
            return "audio"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in ("png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"):
        return "image"
    if ext in ("mp4", "webm", "mov", "avi", "mkv"):
        return "video"
    if ext in ("mp3", "wav", "ogg", "flac", "aac"):
        return "audio"
    if ext in ("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "json", "xml", "html"):
        return "document"
    return "other"


def _build_meta(path: Path, original_name: str, mime: str | None) -> StoredFile:
    stat = path.stat()
    return StoredFile(
        id=path.stem,
        original_name=original_name,
        stored_name=path.name,
        mime_type=mime,
        size=stat.st_size,
        created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
        category=_categorize(mime, original_name),
    )


# ── Metadata sidecar helpers ──
import json as _json

_META_DIR = STORAGE_ROOT / ".meta"
_META_DIR.mkdir(parents=True, exist_ok=True)


def _save_meta(file_id: str, original_name: str, mime: str | None):
    (_META_DIR / f"{file_id}.json").write_text(
        _json.dumps({"original_name": original_name, "mime_type": mime})
    )


def _load_meta(file_id: str) -> dict:
    p = _META_DIR / f"{file_id}.json"
    if p.exists():
        return _json.loads(p.read_text())
    return {}


# ── Routes ──


@router.post("/upload", response_model=StoredFile)
async def upload_file(file: UploadFile = File(...)):
    file_id = uuid.uuid4().hex[:12]
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else ""
    stored_name = f"{file_id}.{ext}" if ext else file_id
    dest = STORAGE_ROOT / stored_name

    content = await file.read()
    dest.write_bytes(content)
    _save_meta(file_id, file.filename or stored_name, file.content_type)
    return _build_meta(dest, file.filename or stored_name, file.content_type)


@router.get("/files", response_model=list[StoredFile])
async def list_files(category: Optional[str] = Query(None)):
    files: list[StoredFile] = []
    for p in STORAGE_ROOT.iterdir():
        if p.is_file() and not p.name.startswith("."):
            meta = _load_meta(p.stem)
            original = meta.get("original_name", p.name)
            mime = meta.get("mime_type")
            sf = _build_meta(p, original, mime)
            if category and sf.category != category:
                continue
            files.append(sf)
    files.sort(key=lambda f: f.created_at, reverse=True)
    return files


@router.get("/files/{file_id}")
async def download_file(file_id: str):
    for p in STORAGE_ROOT.iterdir():
        if p.is_file() and p.stem == file_id:
            meta = _load_meta(file_id)
            return FileResponse(
                p,
                filename=meta.get("original_name", p.name),
                media_type=meta.get("mime_type", "application/octet-stream"),
            )
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    for p in STORAGE_ROOT.iterdir():
        if p.is_file() and p.stem == file_id:
            p.unlink()
            meta_path = _META_DIR / f"{file_id}.json"
            if meta_path.exists():
                meta_path.unlink()
            return {"ok": True}
    raise HTTPException(status_code=404, detail="File not found")
