"""Agent Activity API — track active runs, heartbeat status, and sub-agents."""

import asyncio
import logging
import os
import time
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.heartbeat.heartbeat_runner import get_heartbeat_runner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent-activity", tags=["agent-activity"])

LANGGRAPH_URL = os.environ.get("LANGGRAPH_URL", "http://localhost:2024")


# ── In-memory activity tracker ──

class _ActivityTracker:
    """Tracks agent runs, tool calls, and sub-agent activity in-memory."""

    def __init__(self):
        self._active_runs: dict[str, dict[str, Any]] = {}  # run_id -> run info
        self._recent_events: list[dict[str, Any]] = []  # last N events
        self._max_events = 50

    def record_run_start(self, thread_id: str, run_id: str, assistant_id: str = "agent"):
        self._active_runs[run_id] = {
            "run_id": run_id,
            "thread_id": thread_id,
            "assistant_id": assistant_id,
            "status": "running",
            "started_at": time.time(),
            "tool_calls": [],
            "sub_agents": [],
        }
        self._add_event("run_start", {
            "run_id": run_id,
            "thread_id": thread_id,
            "assistant_id": assistant_id,
        })

    def record_tool_call(self, run_id: str, tool_name: str, description: str = ""):
        if run_id in self._active_runs:
            self._active_runs[run_id]["tool_calls"].append({
                "tool": tool_name,
                "description": description,
                "timestamp": time.time(),
            })
        self._add_event("tool_call", {
            "run_id": run_id,
            "tool": tool_name,
            "description": description,
        })

    def record_sub_agent(self, run_id: str, sub_id: str, description: str, status: str = "running"):
        if run_id in self._active_runs:
            # Update or add sub-agent
            subs = self._active_runs[run_id]["sub_agents"]
            existing = next((s for s in subs if s["sub_id"] == sub_id), None)
            if existing:
                existing["status"] = status
            else:
                subs.append({
                    "sub_id": sub_id,
                    "description": description,
                    "status": status,
                    "started_at": time.time(),
                })
        self._add_event("sub_agent", {
            "run_id": run_id,
            "sub_id": sub_id,
            "description": description,
            "status": status,
        })

    def record_run_end(self, run_id: str, status: str = "completed"):
        if run_id in self._active_runs:
            self._active_runs[run_id]["status"] = status
            # Move to completed after a delay so frontend can see final state
            asyncio.get_event_loop().call_later(10, lambda: self._active_runs.pop(run_id, None))
        self._add_event("run_end", {"run_id": run_id, "status": status})

    def _add_event(self, event_type: str, data: dict):
        self._recent_events.append({
            "type": event_type,
            "timestamp": time.time(),
            **data,
        })
        if len(self._recent_events) > self._max_events:
            self._recent_events = self._recent_events[-self._max_events:]

    def get_status(self) -> dict:
        return {
            "active_runs": list(self._active_runs.values()),
            "recent_events": self._recent_events[-20:],
        }


_tracker: _ActivityTracker | None = None


def get_tracker() -> _ActivityTracker:
    global _tracker
    if _tracker is None:
        _tracker = _ActivityTracker()
    return _tracker


# ── Pydantic models ──

class HeartbeatInfo(BaseModel):
    enabled: bool
    running: bool
    active_thread_id: str | None = None
    tick_count: int = 0


class SubAgentInfo(BaseModel):
    sub_id: str
    description: str
    status: str = "running"
    started_at: float = 0


class ActiveRun(BaseModel):
    run_id: str
    thread_id: str
    assistant_id: str = "agent"
    status: str = "running"
    started_at: float = 0
    tool_calls: list[dict] = []
    sub_agents: list[SubAgentInfo] = []


class ActivityEvent(BaseModel):
    type: str
    timestamp: float = 0


class AgentActivityResponse(BaseModel):
    heartbeat: HeartbeatInfo
    active_runs: list[ActiveRun] = []
    recent_events: list[dict] = []
    langgraph_connected: bool = False


class NotifyRequest(BaseModel):
    thread_id: str
    event: str = "user_message"  # user_message, run_start, run_end, tool_call, sub_agent
    run_id: str | None = None
    tool_name: str | None = None
    description: str | None = None
    sub_id: str | None = None
    status: str | None = None
    assistant_id: str | None = None


# ── Routes ──

@router.get("/status", response_model=AgentActivityResponse, summary="Get Agent Activity")
async def get_activity_status() -> AgentActivityResponse:
    """Get combined agent activity status including heartbeat, active runs, and recent events."""
    heartbeat = get_heartbeat_runner()
    tracker = get_tracker()
    tracker_status = tracker.get_status()

    # Try to get active runs from LangGraph
    langgraph_connected = False
    try:
        from langgraph_sdk import get_client
        client = get_client(url=LANGGRAPH_URL)
        # Quick connectivity check
        langgraph_connected = True
    except Exception:
        pass

    return AgentActivityResponse(
        heartbeat=HeartbeatInfo(**heartbeat.get_status()),
        active_runs=[ActiveRun(**r) for r in tracker_status["active_runs"]],
        recent_events=tracker_status["recent_events"],
        langgraph_connected=langgraph_connected,
    )


@router.post("/notify", summary="Notify Agent Activity")
async def notify_activity(req: NotifyRequest) -> dict:
    """Called by frontend to track agent activity events."""
    tracker = get_tracker()
    heartbeat = get_heartbeat_runner()

    if req.event == "user_message":
        heartbeat.notify_user_activity(req.thread_id)

    elif req.event == "run_start":
        run_id = req.run_id or f"run-{int(time.time())}"
        tracker.record_run_start(req.thread_id, run_id, req.assistant_id or "agent")
        heartbeat.start_watching(req.thread_id)

    elif req.event == "run_end":
        if req.run_id:
            tracker.record_run_end(req.run_id, req.status or "completed")
        # Re-engage heartbeat watching so it auto-continues after idle
        if heartbeat.enabled and req.thread_id:
            heartbeat.start_watching(req.thread_id)

    elif req.event == "tool_call":
        if req.run_id:
            tracker.record_tool_call(req.run_id, req.tool_name or "unknown", req.description or "")

    elif req.event == "sub_agent":
        if req.run_id and req.sub_id:
            tracker.record_sub_agent(req.run_id, req.sub_id, req.description or "", req.status or "running")

    return {"ok": True}
