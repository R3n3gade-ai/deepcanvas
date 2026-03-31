"""Patch langgraph.json in-place to add models=[], then start langgraph dev.

langgraph-api 0.7.65 requires 'models' in the config but the langgraph.json
doesn't include it. This script patches the JSON file in-place before exec'ing
into langgraph dev.
"""
import json
import os
import sys

CONFIG = "langgraph.json"


def main():
    # Read, patch, and overwrite langgraph.json
    with open(CONFIG) as f:
        data = json.load(f)

    if "models" not in data or data["models"] is None:
        data["models"] = []
        with open(CONFIG, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Patched {CONFIG}: added models=[]", file=sys.stderr)

    # Exec langgraph dev
    os.execvp(
        "uv",
        [
            "uv", "run", "langgraph", "dev",
            "--no-browser",
            "--allow-blocking",
            "--no-reload",
            "--host", "0.0.0.0",
            "--port", "2024",
        ],
    )


if __name__ == "__main__":
    main()
