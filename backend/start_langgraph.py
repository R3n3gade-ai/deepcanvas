"""Wrapper to start langgraph dev with a patched AppConfig.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None
instead of [] (empty list), causing a Pydantic validation error at startup.
This patches model_validate to inject models=[] before validation.
"""
import sys

# Patch BEFORE anything else imports langgraph
from langgraph_api.config import AppConfig

_original_model_validate = AppConfig.model_validate.__func__


@classmethod
def _patched_model_validate(cls, data, *args, **kwargs):
    if isinstance(data, dict):
        if "models" not in data or data.get("models") is None:
            data = {**data, "models": []}
    return _original_model_validate(cls, data, *args, **kwargs)


AppConfig.model_validate = _patched_model_validate
print("Patched AppConfig.model_validate to inject models=[]", file=sys.stderr)

# Now run the langgraph CLI
if __name__ == "__main__":
    from langgraph_cli.cli import cli

    sys.argv = [
        "langgraph",
        "dev",
        "--no-browser",
        "--allow-blocking",
        "--no-reload",
        "--host",
        "0.0.0.0",
        "--port",
        "2024",
    ]
    cli()
