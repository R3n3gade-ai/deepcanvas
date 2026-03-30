"""HeartbeatRunner — simple background loop that keeps the agent working.

When enabled, after the user stops chatting for a configurable idle period,
the runner sends a "continue" message to the agent in the active thread.
The agent keeps working until it says it's done or the user sends a new message.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_LANGGRAPH_URL = os.environ.get("LANGGRAPH_URL", "http://localhost:2024")
DEFAULT_ASSISTANT_ID = "lead_agent"
DEFAULT_IDLE_SECONDS = 10  # wait 10s after last user message before continuing
DEFAULT_TICK_INTERVAL = 15  # seconds between continue messages

CONTINUE_PROMPT = (
    "Continue working on the current task. "
    "If the task is complete, respond with [DONE]. "
    "If you need user input, respond with [WAITING] and explain what you need. "
    "Otherwise, execute the next step."
)


class HeartbeatRunner:
    """Simple heartbeat that auto-continues the agent's work in a thread."""

    def __init__(
        self,
        langgraph_url: str = DEFAULT_LANGGRAPH_URL,
        assistant_id: str = DEFAULT_ASSISTANT_ID,
        idle_seconds: int = DEFAULT_IDLE_SECONDS,
        tick_interval: int = DEFAULT_TICK_INTERVAL,
    ):
        self._langgraph_url = langgraph_url
        self._assistant_id = assistant_id
        self._idle_seconds = idle_seconds
        self._tick_interval = tick_interval
        self._enabled = True  # heartbeat is ON by default
        self._running = False
        self._task: asyncio.Task | None = None
        self._active_thread_id: str | None = None
        self._last_user_activity: float = 0
        self._tick_count = 0
        self._client = None

    def _get_client(self):
        if self._client is None:
            from langgraph_sdk import get_client
            self._client = get_client(url=self._langgraph_url)
        return self._client

    @property
    def enabled(self) -> bool:
        return self._enabled

    def enable(self) -> None:
        """Enable heartbeat mode."""
        self._enabled = True
        logger.info("Heartbeat mode enabled")

    def disable(self) -> None:
        """Disable heartbeat mode and stop any running loop."""
        self._enabled = False
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Heartbeat mode disabled")

    def notify_user_activity(self, thread_id: str | None = None) -> None:
        """Called when user sends a message — resets the idle timer and restarts watching."""
        self._last_user_activity = time.time()
        if thread_id:
            self._active_thread_id = thread_id
        # Stop any running heartbeat loop — user is active
        self._running = False
        # Re-start watching so the idle timer re-engages after the agent responds
        if self._enabled and thread_id:
            if self._task and not self._task.done():
                self._task.cancel()
            self._tick_count = 0
            self._task = asyncio.create_task(self._watch_loop())
            self._task.add_done_callback(self._on_done)
            logger.info("Heartbeat: re-engaged watching on thread %s", thread_id)

    def start_watching(self, thread_id: str) -> None:
        """Start watching a thread for idle timeout."""
        if not self._enabled:
            return
        self._active_thread_id = thread_id
        self._last_user_activity = time.time()
        self._tick_count = 0
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = asyncio.create_task(self._watch_loop())
        self._task.add_done_callback(self._on_done)

    async def _watch_loop(self) -> None:
        """Wait for idle timeout, then start sending continue messages."""
        while self._enabled:
            # Wait for idle period
            elapsed = time.time() - self._last_user_activity
            remaining = self._idle_seconds - elapsed
            if remaining > 0:
                try:
                    await asyncio.sleep(remaining)
                except asyncio.CancelledError:
                    return
                continue

            # User has been idle — start the heartbeat
            self._running = True
            logger.info("Heartbeat: user idle for %ds, starting auto-continue on thread %s",
                        self._idle_seconds, self._active_thread_id)

            consecutive_failures = 0
            while self._running and self._enabled:
                try:
                    done = await self._tick()
                    consecutive_failures = 0
                    if done:
                        self._running = False
                        break
                except asyncio.CancelledError:
                    return
                except Exception:
                    logger.exception("Heartbeat tick failed")
                    consecutive_failures += 1
                    if consecutive_failures >= 3:
                        logger.error("Heartbeat: 3 consecutive failures, stopping to avoid crash loop")
                        self._running = False
                        break

                try:
                    await asyncio.sleep(self._tick_interval)
                except asyncio.CancelledError:
                    return

            # If we stopped because user became active, go back to watching
            if not self._running and self._enabled:
                continue
            break

    async def _tick(self) -> bool:
        """Send a continue message. Returns True if task is done."""
        if not self._active_thread_id:
            return True

        self._tick_count += 1
        client = self._get_client()

        logger.info("Heartbeat tick #%d on thread %s", self._tick_count, self._active_thread_id)

        try:
            result = await client.runs.create(
                self._active_thread_id,
                self._assistant_id,
                input={"messages": [{"role": "human", "content": CONTINUE_PROMPT}]},
            )
        except Exception as e:
            logger.error("Heartbeat: failed to create run: %s", e)
            raise

        if result is None:
            logger.warning("Heartbeat tick #%d: runs.create returned None", self._tick_count)
            return False

        run_id = result.get("run_id") if isinstance(result, dict) else getattr(result, "run_id", None)
        logger.info("Heartbeat tick #%d: created run %s", self._tick_count, run_id)

        # Poll for completion
        import asyncio as _asyncio
        for _ in range(60):  # max 5 min polling
            try:
                await _asyncio.sleep(5)
                state = await client.threads.get_state(self._active_thread_id)
                values = state.values if hasattr(state, 'values') else (state.get('values', {}) if isinstance(state, dict) else {})
                messages = values.get('messages', []) if isinstance(values, dict) else []
                response = self._extract_response(messages)
                next_step = state.next if hasattr(state, 'next') else (state.get('next', []) if isinstance(state, dict) else [])
                if not next_step:  # agent has finished
                    logger.info("Heartbeat tick #%d response: %s", self._tick_count, response[:200] if response else '(empty)')
                    if "[DONE]" in response:
                        logger.info("Heartbeat: agent reported task complete")
                        return True
                    if "[WAITING]" in response:
                        logger.info("Heartbeat: agent waiting for user input")
                        return True
                    return False
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning("Heartbeat: poll error: %s", e)
                break

        return False

    @staticmethod
    def _extract_response(result: dict | list | None) -> str:
        if result is None:
            return ""
        if isinstance(result, dict):
            messages = result.get("messages", [])
        elif isinstance(result, list):
            messages = result
        else:
            return ""
        if not messages:
            return ""
        for msg in reversed(messages):
            if not isinstance(msg, dict):
                continue
            if msg.get("type") == "ai" or msg.get("role") == "assistant":
                content = msg.get("content", "")
                if isinstance(content, str) and content.strip():
                    return content.strip()
                elif isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            text = part.get("text", "").strip()
                            if text:
                                return text
        return ""

    def get_status(self) -> dict[str, Any]:
        return {
            "enabled": self._enabled,
            "running": self._running,
            "active_thread_id": self._active_thread_id,
            "tick_count": self._tick_count,
        }

    def _on_done(self, task: asyncio.Task) -> None:
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            logger.error("Heartbeat loop error: %s", exc)
            self._running = False


# Singleton
_runner: HeartbeatRunner | None = None


def get_heartbeat_runner() -> HeartbeatRunner:
    global _runner
    if _runner is None:
        _runner = HeartbeatRunner()
    return _runner
