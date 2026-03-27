"""Storage file management tool for the AI agent.

Allows the agent to list, read, and delete files in the workspace storage.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Literal

from langchain.tools import tool

logger = logging.getLogger(__name__)

GATEWAY_URL = "http://127.0.0.1:8001"


def _api(method: str, path: str) -> dict | list:
    """Call the gateway Storage API."""
    url = f"{GATEWAY_URL}/api/storage{path}"
    try:
        req = urllib.request.Request(url, method=method)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        logger.error(f"Storage API error {e.code}: {body_text}")
        return {"error": f"HTTP {e.code}: {body_text}"}
    except Exception as e:
        logger.error(f"Storage API error: {e}")
        return {"error": str(e)}


@tool
def manage_storage(
    action: Literal[
        "list_files",
        "get_file_info",
        "delete_file",
    ],
    file_id: str = "",
    category: str = "",
) -> str:
    """Manage workspace file storage. Use this to list, inspect, or delete files that the user has uploaded.

    Args:
        action: The action to perform:
            - list_files: List all stored files. Optional `category` filter (image, video, audio, document, other).
            - get_file_info: Get metadata for a specific file. Requires `file_id`.
            - delete_file: Delete a file. Requires `file_id`.
        file_id: The file ID (from list_files results).
        category: Optional category filter for list_files (image, video, audio, document, other).

    Returns:
        JSON string with the result.
    """
    if action == "list_files":
        path = "/files"
        if category:
            path += f"?category={category}"
        result = _api("GET", path)

    elif action == "get_file_info":
        if not file_id:
            return json.dumps({"error": "file_id is required for get_file_info"})
        all_files = _api("GET", "/files")
        if isinstance(all_files, list):
            match = [f for f in all_files if f.get("id") == file_id]
            result = match[0] if match else {"error": f"File '{file_id}' not found"}
        else:
            result = all_files

    elif action == "delete_file":
        if not file_id:
            return json.dumps({"error": "file_id is required for delete_file"})
        result = _api("DELETE", f"/files/{file_id}")

    else:
        return json.dumps({"error": f"Unknown action: {action}"})

    return json.dumps(result, indent=2)
