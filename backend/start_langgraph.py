"""Patch langgraph.json and set env vars before starting langgraph dev.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None.
This script:
1. Patches langgraph.json in-place to ensure models=[]
2. Sets LANGGRAPH_MODELS env var as a fallback
3. Runs langgraph dev via os.execvp (stays in same process tree)
"""
import json
import os
import sys


def main():
    config_path = "langgraph.json"

    # Read, patch, and overwrite langgraph.json
    with open(config_path) as f:
        data = json.load(f)

    if "models" not in data or data["models"] is None:
        data["models"] = []
        with open(config_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Patched {config_path}: added models=[]", file=sys.stderr)

    # Set env var so langgraph's subprocess AppConfig can pick it up
    os.environ["LANGGRAPH_MODELS"] = json.dumps(data.get("models", []))

    print(f"Starting langgraph dev (LANGGRAPH_MODELS set)...", file=sys.stderr)

    # Exec into langgraph dev (replaces this process)
    os.execvp(
        sys.executable,
        [
            sys.executable, "-m", "langgraph_cli.cli",
            "--config", config_path,
            "--host", "0.0.0.0",
            "--port", "2024",
            "--no-browser",
            "--no-reload",
            "--allow-blocking",
        ],
    )


if __name__ == "__main__":
    main()
