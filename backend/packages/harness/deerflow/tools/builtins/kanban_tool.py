"""Kanban board management tool for the AI agent.

Allows the agent to read and manage the workspace Kanban board:
sections, subtasks, columns, and cards.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Literal

from langchain.tools import tool

logger = logging.getLogger(__name__)

# The gateway API base URL
GATEWAY_URL = "http://127.0.0.1:8001"


def _api(method: str, path: str, body: dict | None = None) -> dict:
    """Call the gateway Kanban API."""
    url = f"{GATEWAY_URL}/api/kanban{path}"
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
        logger.error(f"Kanban API error {e.code}: {body_text}")
        return {"error": f"HTTP {e.code}: {body_text}"}
    except Exception as e:
        logger.error(f"Kanban API error: {e}")
        return {"error": str(e)}


@tool
def manage_kanban(
    workspace_id: str,
    action: Literal[
        "read_board",
        "add_section",
        "add_subtask",
        "push_subtask",
        "add_column",
        "add_card",
        "move_card",
        "delete_card",
        "delete_section",
        "delete_subtask",
    ],
    title: str = "",
    section_id: str = "",
    subtask_id: str = "",
    column_id: str = "",
    card_id: str = "",
    due_date: str = "",
    description: str = "",
) -> str:
    """Manage the workspace Kanban board. Use this to read, create, move, or delete items on the board.

    Args:
        workspace_id: The workspace ID to operate on. Use "General" workspace ID by default.
        action: The action to perform:
            - read_board: Read the full board state (columns, cards, sections, subtasks).
            - add_section: Create a new task section. Requires `title`.
            - add_subtask: Add a subtask to a section. Requires `section_id` and `title`. Optional `due_date` (YYYY-MM-DD).
            - push_subtask: Push a subtask onto the Kanban board (creates a card). Requires `section_id` and `subtask_id`.
            - add_column: Add a new column. Requires `title`.
            - add_card: Add a card to a column. Requires `title` and `column_id`. Optional `description`.
            - move_card: Move a card to a different column. Requires `card_id` and `column_id`.
            - delete_card: Delete a card. Requires `card_id`.
            - delete_section: Delete a section and its subtasks. Requires `section_id`.
            - delete_subtask: Delete a subtask. Requires `section_id` and `subtask_id`.
        title: Name/title for sections, subtasks, columns, or cards.
        section_id: ID of the section (from read_board).
        subtask_id: ID of the subtask (from read_board).
        column_id: ID of the column (from read_board).
        card_id: ID of the card (from read_board).
        due_date: Due date for subtasks in YYYY-MM-DD format.
        description: Optional description for cards.

    Returns:
        JSON string with the result.
    """
    wid = workspace_id

    if action == "read_board":
        result = _api("GET", f"/{wid}")

    elif action == "add_section":
        if not title:
            return json.dumps({"error": "title is required for add_section"})
        result = _api("POST", f"/{wid}/sections", {"name": title})

    elif action == "add_subtask":
        if not section_id or not title:
            return json.dumps({"error": "section_id and title are required for add_subtask"})
        req_body: dict = {"title": title}
        if due_date:
            req_body["due_date"] = due_date
        result = _api("POST", f"/{wid}/sections/{section_id}/subtasks", req_body)

    elif action == "push_subtask":
        if not section_id or not subtask_id:
            return json.dumps({"error": "section_id and subtask_id are required for push_subtask"})
        result = _api("POST", f"/{wid}/sections/{section_id}/subtasks/{subtask_id}/push")

    elif action == "add_column":
        if not title:
            return json.dumps({"error": "title is required for add_column"})
        result = _api("POST", f"/{wid}/columns", {"title": title})

    elif action == "add_card":
        if not title or not column_id:
            return json.dumps({"error": "title and column_id are required for add_card"})
        card_body: dict = {"title": title, "column_id": column_id}
        if description:
            card_body["description"] = description
        result = _api("POST", f"/{wid}/cards", card_body)

    elif action == "move_card":
        if not card_id or not column_id:
            return json.dumps({"error": "card_id and column_id are required for move_card"})
        result = _api("PUT", f"/{wid}/cards/{card_id}/move", {"column_id": column_id})

    elif action == "delete_card":
        if not card_id:
            return json.dumps({"error": "card_id is required for delete_card"})
        result = _api("DELETE", f"/{wid}/cards/{card_id}")

    elif action == "delete_section":
        if not section_id:
            return json.dumps({"error": "section_id is required for delete_section"})
        result = _api("DELETE", f"/{wid}/sections/{section_id}")

    elif action == "delete_subtask":
        if not section_id or not subtask_id:
            return json.dumps({"error": "section_id and subtask_id are required for delete_subtask"})
        result = _api("DELETE", f"/{wid}/sections/{section_id}/subtasks/{subtask_id}")

    else:
        return json.dumps({"error": f"Unknown action: {action}"})

    return json.dumps(result, indent=2)
