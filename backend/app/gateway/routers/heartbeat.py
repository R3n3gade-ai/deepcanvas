"""Heartbeat API — simple enable/disable toggle + status."""

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.heartbeat.heartbeat_runner import get_heartbeat_runner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/heartbeat", tags=["heartbeat"])


class HeartbeatStatusResponse(BaseModel):
    enabled: bool
    running: bool
    active_thread_id: str | None = None
    tick_count: int = 0


@router.get("/status", response_model=HeartbeatStatusResponse, summary="Heartbeat Status")
async def get_status() -> HeartbeatStatusResponse:
    return HeartbeatStatusResponse(**get_heartbeat_runner().get_status())


@router.post("/enable", response_model=HeartbeatStatusResponse, summary="Enable Heartbeat")
async def enable_heartbeat() -> HeartbeatStatusResponse:
    runner = get_heartbeat_runner()
    runner.enable()
    return HeartbeatStatusResponse(**runner.get_status())


@router.post("/disable", response_model=HeartbeatStatusResponse, summary="Disable Heartbeat")
async def disable_heartbeat() -> HeartbeatStatusResponse:
    runner = get_heartbeat_runner()
    runner.disable()
    return HeartbeatStatusResponse(**runner.get_status())
