# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Kanban API – manage workspace-scoped Kanban boards.
Data is persisted as JSON files in ~/.deer-flow/kanban/
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/kanban", tags=["kanban"])

KANBAN_ROOT = Path(os.path.expanduser("~")) / ".deer-flow" / "kanban"
KANBAN_ROOT.mkdir(parents=True, exist_ok=True)

COLUMN_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#EF4444"]
SECTION_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0D9488", "#6366F1"]

DEFAULT_COLUMNS = [
    {"id": "todo", "title": "To Do", "accent": "#3B82F6", "order": 0},
    {"id": "in_progress", "title": "In Progress", "accent": "#F59E0B", "order": 1},
    {"id": "done", "title": "Done", "accent": "#10B981", "order": 2},
]


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def _board_path(workspace_id: str) -> Path:
    return KANBAN_ROOT / f"{workspace_id}.json"


def _load_board(workspace_id: str) -> dict:
    p = _board_path(workspace_id)
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        if not data.get("columns"):
            data["columns"] = list(DEFAULT_COLUMNS)
        if "sections" not in data:
            data["sections"] = []
        if "cards" not in data:
            data["cards"] = []
        return data
    return {"columns": list(DEFAULT_COLUMNS), "cards": [], "sections": []}


def _save_board(workspace_id: str, data: dict):
    _board_path(workspace_id).write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# ── Pydantic models ──

class AddColumnRequest(BaseModel):
    title: str

class RenameColumnRequest(BaseModel):
    title: str

class AddCardRequest(BaseModel):
    title: str
    column_id: str
    description: Optional[str] = None
    color: Optional[str] = None

class MoveCardRequest(BaseModel):
    column_id: str

class AddSectionRequest(BaseModel):
    name: str

class RenameSectionRequest(BaseModel):
    name: str

class AddSubtaskRequest(BaseModel):
    title: str
    due_date: Optional[str] = None


# ── Routes ──

@router.get("/{workspace_id}")
async def get_board(workspace_id: str):
    """Get full Kanban board state."""
    return _load_board(workspace_id)


# ── Columns ──

@router.post("/{workspace_id}/columns")
async def add_column(workspace_id: str, req: AddColumnRequest):
    board = _load_board(workspace_id)
    col_id = _gen_id()
    color_idx = len(board["columns"]) % len(COLUMN_COLORS)
    col = {
        "id": col_id,
        "title": req.title.strip(),
        "accent": COLUMN_COLORS[color_idx],
        "order": len(board["columns"]),
    }
    board["columns"].append(col)
    _save_board(workspace_id, board)
    return col


@router.put("/{workspace_id}/columns/{column_id}")
async def rename_column(workspace_id: str, column_id: str, req: RenameColumnRequest):
    board = _load_board(workspace_id)
    for col in board["columns"]:
        if col["id"] == column_id:
            col["title"] = req.title.strip()
            _save_board(workspace_id, board)
            return col
    raise HTTPException(status_code=404, detail="Column not found")


@router.delete("/{workspace_id}/columns/{column_id}")
async def delete_column(workspace_id: str, column_id: str):
    board = _load_board(workspace_id)
    board["columns"] = [c for c in board["columns"] if c["id"] != column_id]
    board["cards"] = [c for c in board["cards"] if c.get("columnId") != column_id]
    _save_board(workspace_id, board)
    return {"ok": True}


# ── Cards ──

@router.post("/{workspace_id}/cards")
async def add_card(workspace_id: str, req: AddCardRequest):
    board = _load_board(workspace_id)
    card_id = _gen_id()
    card = {
        "id": card_id,
        "title": req.title.strip(),
        "description": req.description,
        "columnId": req.column_id,
        "createdAt": datetime.now().isoformat(),
        "color": req.color or SECTION_COLORS[len(board["cards"]) % len(SECTION_COLORS)],
    }
    board["cards"].append(card)
    _save_board(workspace_id, board)
    return card


@router.put("/{workspace_id}/cards/{card_id}/move")
async def move_card(workspace_id: str, card_id: str, req: MoveCardRequest):
    board = _load_board(workspace_id)
    for card in board["cards"]:
        if card["id"] == card_id:
            card["columnId"] = req.column_id
            _save_board(workspace_id, board)
            return card
    raise HTTPException(status_code=404, detail="Card not found")


@router.delete("/{workspace_id}/cards/{card_id}")
async def delete_card(workspace_id: str, card_id: str):
    board = _load_board(workspace_id)
    board["cards"] = [c for c in board["cards"] if c["id"] != card_id]
    # Unlink subtask
    for sec in board.get("sections", []):
        for st in sec.get("subtasks", []):
            if st.get("kanbanCardId") == card_id:
                st["addedToBoard"] = False
                st.pop("kanbanCardId", None)
    _save_board(workspace_id, board)
    return {"ok": True}


# ── Sections ──

@router.post("/{workspace_id}/sections")
async def add_section(workspace_id: str, req: AddSectionRequest):
    board = _load_board(workspace_id)
    sec_id = _gen_id()
    color_idx = len(board["sections"]) % len(SECTION_COLORS)
    section = {
        "id": sec_id,
        "name": req.name.strip(),
        "color": SECTION_COLORS[color_idx],
        "order": len(board["sections"]),
        "subtasks": [],
    }
    board["sections"].append(section)
    _save_board(workspace_id, board)
    return section


@router.put("/{workspace_id}/sections/{section_id}")
async def rename_section(workspace_id: str, section_id: str, req: RenameSectionRequest):
    board = _load_board(workspace_id)
    for sec in board["sections"]:
        if sec["id"] == section_id:
            sec["name"] = req.name.strip()
            _save_board(workspace_id, board)
            return sec
    raise HTTPException(status_code=404, detail="Section not found")


@router.delete("/{workspace_id}/sections/{section_id}")
async def delete_section(workspace_id: str, section_id: str):
    board = _load_board(workspace_id)
    # Find linked card IDs
    linked = []
    for sec in board["sections"]:
        if sec["id"] == section_id:
            for st in sec.get("subtasks", []):
                if st.get("kanbanCardId"):
                    linked.append(st["kanbanCardId"])
    board["sections"] = [s for s in board["sections"] if s["id"] != section_id]
    board["cards"] = [c for c in board["cards"] if c["id"] not in linked]
    _save_board(workspace_id, board)
    return {"ok": True}


# ── Subtasks ──

@router.post("/{workspace_id}/sections/{section_id}/subtasks")
async def add_subtask(workspace_id: str, section_id: str, req: AddSubtaskRequest):
    board = _load_board(workspace_id)
    for sec in board["sections"]:
        if sec["id"] == section_id:
            st_id = _gen_id()
            subtask = {
                "id": st_id,
                "title": req.title.strip(),
                "sectionId": section_id,
                "dueDate": req.due_date,
                "addedToBoard": False,
            }
            sec["subtasks"].append(subtask)
            _save_board(workspace_id, board)
            return subtask
    raise HTTPException(status_code=404, detail="Section not found")


@router.delete("/{workspace_id}/sections/{section_id}/subtasks/{subtask_id}")
async def delete_subtask(workspace_id: str, section_id: str, subtask_id: str):
    board = _load_board(workspace_id)
    for sec in board["sections"]:
        if sec["id"] == section_id:
            linked_card = None
            for st in sec.get("subtasks", []):
                if st["id"] == subtask_id and st.get("kanbanCardId"):
                    linked_card = st["kanbanCardId"]
            sec["subtasks"] = [st for st in sec["subtasks"] if st["id"] != subtask_id]
            if linked_card:
                board["cards"] = [c for c in board["cards"] if c["id"] != linked_card]
            _save_board(workspace_id, board)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Section not found")


@router.post("/{workspace_id}/sections/{section_id}/subtasks/{subtask_id}/push")
async def push_subtask_to_board(workspace_id: str, section_id: str, subtask_id: str):
    """Push a subtask to the first Kanban column as a card."""
    board = _load_board(workspace_id)
    if not board["columns"]:
        raise HTTPException(status_code=400, detail="No columns on board")

    first_col = board["columns"][0]
    for sec in board["sections"]:
        if sec["id"] == section_id:
            for st in sec.get("subtasks", []):
                if st["id"] == subtask_id:
                    if st.get("addedToBoard"):
                        return {"ok": True, "card_id": st.get("kanbanCardId"), "already_on_board": True}
                    card_id = _gen_id()
                    card = {
                        "id": card_id,
                        "title": st["title"],
                        "columnId": first_col["id"],
                        "createdAt": datetime.now().isoformat(),
                        "color": sec.get("color", "#0D9488"),
                        "linkedSubtaskId": subtask_id,
                    }
                    board["cards"].append(card)
                    st["addedToBoard"] = True
                    st["kanbanCardId"] = card_id
                    _save_board(workspace_id, board)
                    return {"ok": True, "card_id": card_id}
            raise HTTPException(status_code=404, detail="Subtask not found")
    raise HTTPException(status_code=404, detail="Section not found")
