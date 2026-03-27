# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Calendar API – manage workspace-scoped calendar events.
Events are persisted as JSON files in ~/.deer-flow/calendar/
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

CALENDAR_ROOT = Path(os.path.expanduser("~")) / ".deer-flow" / "calendar"
CALENDAR_ROOT.mkdir(parents=True, exist_ok=True)


# ── Pydantic models ──

class CalendarEvent(BaseModel):
    id: str
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM (optional)
    description: Optional[str] = None
    color: str = "#8B5CF6"
    source: str = "manual"

class AddEventRequest(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class UpdateEventRequest(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


# ── Persistence ──

def _events_path(workspace_id: str) -> Path:
    return CALENDAR_ROOT / f"{workspace_id}.json"


def _load_events(workspace_id: str) -> list[dict]:
    p = _events_path(workspace_id)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return []


def _save_events(workspace_id: str, events: list[dict]):
    _events_path(workspace_id).write_text(
        json.dumps(events, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# ── Routes ──

@router.get("/{workspace_id}", response_model=list[CalendarEvent])
async def get_events(workspace_id: str):
    """Get all calendar events for a workspace."""
    return _load_events(workspace_id)


@router.post("/{workspace_id}", response_model=CalendarEvent)
async def add_event(workspace_id: str, req: AddEventRequest):
    """Add a new calendar event."""
    events = _load_events(workspace_id)
    event = {
        "id": uuid.uuid4().hex[:12],
        "title": req.title.strip(),
        "date": req.date,
        "time": req.time,
        "description": req.description,
        "color": req.color or "#8B5CF6",
        "source": "manual",
    }
    events.append(event)
    _save_events(workspace_id, events)
    return event


@router.put("/{workspace_id}/{event_id}", response_model=CalendarEvent)
async def update_event(workspace_id: str, event_id: str, req: UpdateEventRequest):
    """Update a calendar event."""
    events = _load_events(workspace_id)
    for evt in events:
        if evt["id"] == event_id:
            if req.title is not None:
                evt["title"] = req.title.strip()
            if req.date is not None:
                evt["date"] = req.date
            if req.time is not None:
                evt["time"] = req.time
            if req.description is not None:
                evt["description"] = req.description
            if req.color is not None:
                evt["color"] = req.color
            _save_events(workspace_id, events)
            return evt
    raise HTTPException(status_code=404, detail="Event not found")


@router.delete("/{workspace_id}/{event_id}")
async def delete_event(workspace_id: str, event_id: str):
    """Delete a calendar event."""
    events = _load_events(workspace_id)
    new_events = [e for e in events if e["id"] != event_id]
    if len(new_events) == len(events):
        raise HTTPException(status_code=404, detail="Event not found")
    _save_events(workspace_id, new_events)
    return {"ok": True}
