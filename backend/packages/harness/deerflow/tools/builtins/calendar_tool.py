"""Calendar event management tool for the AI agent.

Allows the agent to list, add, edit, and delete calendar events.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Literal

from langchain.tools import tool

logger = logging.getLogger(__name__)

GATEWAY_URL = "http://127.0.0.1:8001"


def _api(method: str, path: str, body: dict | None = None) -> dict | list:
    """Call the gateway Calendar API."""
    url = f"{GATEWAY_URL}/api/calendar{path}"
    try:
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"} if data else {},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        logger.error(f"Calendar API error {e.code}: {body_text}")
        return {"error": f"HTTP {e.code}: {body_text}"}
    except Exception as e:
        logger.error(f"Calendar API error: {e}")
        return {"error": str(e)}


@tool
def manage_calendar(
    workspace_id: str,
    action: Literal[
        "list_events",
        "add_event",
        "edit_event",
        "delete_event",
    ],
    event_id: str = "",
    title: str = "",
    date: str = "",
    time: str = "",
    description: str = "",
    color: str = "",
) -> str:
    """Manage the workspace calendar. Use this to list, add, edit, or delete calendar events.

    Note: Kanban subtasks with due dates automatically appear on the calendar.
    This tool manages additional manual calendar events.

    Args:
        workspace_id: The workspace ID. Use "General" by default.
        action: The action to perform:
            - list_events: List all manual calendar events for the workspace.
            - add_event: Add a new event. Requires `title` and `date` (YYYY-MM-DD). Optional: `time` (HH:MM), `description`, `color`.
            - edit_event: Edit an existing event. Requires `event_id`. Optional: `title`, `date`, `time`, `description`, `color`.
            - delete_event: Delete an event. Requires `event_id`.
        event_id: The event ID (from list_events results).
        title: Event title.
        date: Event date in YYYY-MM-DD format.
        time: Optional event time in HH:MM format.
        description: Optional event description.
        color: Optional event color (hex, e.g. "#3B82F6").

    Returns:
        JSON string with the result.
    """
    wid = workspace_id

    if action == "list_events":
        result = _api("GET", f"/{wid}")

    elif action == "add_event":
        if not title or not date:
            return json.dumps({"error": "title and date are required for add_event"})
        body: dict = {"title": title, "date": date}
        if time:
            body["time"] = time
        if description:
            body["description"] = description
        if color:
            body["color"] = color
        result = _api("POST", f"/{wid}", body)

    elif action == "edit_event":
        if not event_id:
            return json.dumps({"error": "event_id is required for edit_event"})
        body = {}
        if title:
            body["title"] = title
        if date:
            body["date"] = date
        if time:
            body["time"] = time
        if description:
            body["description"] = description
        if color:
            body["color"] = color
        if not body:
            return json.dumps({"error": "At least one field to update is required"})
        result = _api("PUT", f"/{wid}/{event_id}", body)

    elif action == "delete_event":
        if not event_id:
            return json.dumps({"error": "event_id is required for delete_event"})
        result = _api("DELETE", f"/{wid}/{event_id}")

    else:
        return json.dumps({"error": f"Unknown action: {action}"})

    return json.dumps(result, indent=2)
