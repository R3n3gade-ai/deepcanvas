import logging
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["api-keys"])

# Known API key definitions grouped by category
API_KEY_DEFINITIONS = [
    # LLM Providers
    {
        "key": "GEMINI_API_KEY",
        "label": "Gemini API Key",
        "group": "LLM Providers",
        "required": True,
        "description": "Google Gemini API key for the main agent",
    },
    {
        "key": "OPENAI_API_KEY",
        "label": "OpenAI API Key",
        "group": "LLM Providers",
        "required": False,
        "description": "OpenAI API key (GPT models)",
    },
    {
        "key": "DEEPSEEK_API_KEY",
        "label": "DeepSeek API Key",
        "group": "LLM Providers",
        "required": False,
        "description": "DeepSeek API key",
    },
    {
        "key": "NOVITA_API_KEY",
        "label": "Novita API Key",
        "group": "LLM Providers",
        "required": False,
        "description": "Novita AI API key (OpenAI-compatible)",
    },
    {
        "key": "MINIMAX_API_KEY",
        "label": "MiniMax API Key",
        "group": "LLM Providers",
        "required": False,
        "description": "MiniMax API key (OpenAI-compatible)",
    },
    # Search & Tools
    {
        "key": "TAVILY_API_KEY",
        "label": "Tavily API Key",
        "group": "Search & Tools",
        "required": False,
        "description": "Tavily search API key for web research",
    },
    {
        "key": "JINA_API_KEY",
        "label": "Jina API Key",
        "group": "Search & Tools",
        "required": False,
        "description": "Jina API key for web content reading",
    },
    {
        "key": "FIRECRAWL_API_KEY",
        "label": "Firecrawl API Key",
        "group": "Search & Tools",
        "required": False,
        "description": "Firecrawl API key for web scraping",
    },
    # Skills
    {
        "key": "VOLCENGINE_API_KEY",
        "label": "Volcengine API Key",
        "group": "Skills",
        "required": False,
        "description": "Volcengine API key for image/video generation",
    },
    {
        "key": "VOLCENGINE_TTS_APPID",
        "label": "Volcengine TTS App ID",
        "group": "Skills",
        "required": False,
        "description": "Volcengine text-to-speech app ID (podcast generation)",
    },
    {
        "key": "VOLCENGINE_TTS_ACCESS_TOKEN",
        "label": "Volcengine TTS Token",
        "group": "Skills",
        "required": False,
        "description": "Volcengine text-to-speech access token (podcast generation)",
    },
    # Channels
    {
        "key": "TELEGRAM_BOT_TOKEN",
        "label": "Telegram Bot Token",
        "group": "Channels",
        "required": False,
        "description": "Telegram bot token from @BotFather — enables chat via Telegram",
    },
    {
        "key": "SLACK_BOT_TOKEN",
        "label": "Slack Bot Token",
        "group": "Channels",
        "required": False,
        "description": "Slack bot OAuth token (xoxb-...) for Slack integration",
    },
    {
        "key": "SLACK_APP_TOKEN",
        "label": "Slack App Token",
        "group": "Channels",
        "required": False,
        "description": "Slack app-level token (xapp-...) for Socket Mode",
    },
    {
        "key": "FEISHU_APP_ID",
        "label": "Feishu App ID",
        "group": "Channels",
        "required": False,
        "description": "Feishu/Lark application ID for enterprise messenger integration",
    },
    {
        "key": "FEISHU_APP_SECRET",
        "label": "Feishu App Secret",
        "group": "Channels",
        "required": False,
        "description": "Feishu/Lark app secret for authentication",
    },
]


def _get_env_file_path() -> Path:
    """Get the path to the .env file at the project root."""
    # Navigate up from backend/app/gateway/routers/ to project root
    return Path(__file__).resolve().parents[4] / ".env"


def _mask_value(value: str) -> str:
    """Mask an API key value for safe display."""
    if not value or value.startswith("your-"):
        return ""
    if len(value) <= 8:
        return "••••••••"
    return value[:4] + "••••" + value[-4:]


def _read_env_file() -> dict[str, str]:
    """Read key-value pairs from the .env file."""
    env_path = _get_env_file_path()
    result: dict[str, str] = {}
    if not env_path.exists():
        return result
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip()
    return result


def _write_env_updates(updates: dict[str, str]) -> None:
    """Update specific keys in the .env file, preserving structure and comments."""
    env_path = _get_env_file_path()
    if not env_path.exists():
        # Create a new .env with just the updates
        lines = [f"{k}={v}" for k, v in updates.items()]
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return

    content = env_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    updated_keys: set[str] = set()

    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                updated_keys.add(key)
                continue
        # Check if it's a commented-out key we need to uncomment
        if stripped.startswith("# ") and "=" in stripped:
            commented_key = stripped[2:].split("=", 1)[0].strip()
            if commented_key in updates:
                new_lines.append(f"{commented_key}={updates[commented_key]}")
                updated_keys.add(commented_key)
                continue
        new_lines.append(line)

    # Append any keys that weren't found in the file
    for key, value in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


class ApiKeyInfo(BaseModel):
    key: str = Field(description="Environment variable name")
    label: str = Field(description="Human-readable label")
    group: str = Field(description="Category group")
    required: bool = Field(description="Whether this key is required")
    description: str = Field(description="Description of what this key is for")
    is_set: bool = Field(description="Whether the key has a value")
    masked_value: str = Field(description="Masked display value")


class ApiKeysListResponse(BaseModel):
    keys: list[ApiKeyInfo]


class ApiKeysUpdateRequest(BaseModel):
    keys: dict[str, str] = Field(description="Map of key names to new values")


class ApiKeysUpdateResponse(BaseModel):
    success: bool
    updated: list[str]


@router.get(
    "/api-keys",
    response_model=ApiKeysListResponse,
    summary="List API Keys",
    description="List all known API keys with their masked values and status.",
)
async def list_api_keys() -> ApiKeysListResponse:
    env_values = _read_env_file()
    keys = []
    for defn in API_KEY_DEFINITIONS:
        raw = env_values.get(defn["key"], "") or os.environ.get(defn["key"], "")
        is_set = bool(raw) and not raw.startswith("your-")
        keys.append(
            ApiKeyInfo(
                key=defn["key"],
                label=defn["label"],
                group=defn["group"],
                required=defn["required"],
                description=defn["description"],
                is_set=is_set,
                masked_value=_mask_value(raw) if is_set else "",
            )
        )
    return ApiKeysListResponse(keys=keys)


@router.put(
    "/api-keys",
    response_model=ApiKeysUpdateResponse,
    summary="Update API Keys",
    description="Update one or more API keys. Empty values are ignored.",
)
async def update_api_keys(request: ApiKeysUpdateRequest) -> ApiKeysUpdateResponse:
    # Filter out empty values
    updates = {k: v for k, v in request.keys.items() if v.strip()}
    if not updates:
        return ApiKeysUpdateResponse(success=True, updated=[])

    # Validate that all keys are in our known list
    known_keys = {d["key"] for d in API_KEY_DEFINITIONS}
    for key in updates:
        if key not in known_keys:
            logger.warning(f"Unknown API key: {key}")

    # Write to .env file
    _write_env_updates(updates)

    # Also update os.environ for the current process
    for key, value in updates.items():
        os.environ[key] = value

    # Auto-restart langgraph container so it picks up the new keys
    # The Docker socket is mounted into this container
    _restart_langgraph()

    logger.info(f"Updated API keys: {list(updates.keys())}")
    return ApiKeysUpdateResponse(success=True, updated=list(updates.keys()))


def _restart_langgraph() -> None:
    """Recreate the langgraph container so it picks up new env vars from .env file."""
    import subprocess

    try:
        result = subprocess.run(
            [
                "docker", "compose", "-f", "/app/docker/docker-compose.yaml",
                "up", "-d", "--force-recreate", "langgraph",
            ],
            capture_output=True,
            text=True,
            timeout=30,
            cwd="/app/docker",
        )
        if result.returncode == 0:
            logger.info("Recreated deer-flow-langgraph to apply new API keys")
        else:
            logger.warning(f"Failed to recreate langgraph: {result.stderr}")
    except Exception as e:
        logger.warning(f"Could not recreate langgraph container: {e}")


