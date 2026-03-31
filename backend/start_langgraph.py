"""Start langgraph dev with a patched config that includes models=[].

langgraph-api 0.7.65 requires 'models' in the config but langgraph.json
doesn't include it. This script patches the JSON and passes it via --config.
"""
import json
import os
import shutil
import sys

CONFIG_SRC = "langgraph.json"
CONFIG_DST = "/tmp/langgraph_patched.json"


def main():
    # Read the original config
    with open(CONFIG_SRC) as f:
        data = json.load(f)

    # Ensure models is set
    if "models" not in data or data["models"] is None:
        data["models"] = []

    # Write patched config
    with open(CONFIG_DST, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Patched config: added models=[] -> {CONFIG_DST}", file=sys.stderr)

    # Exec langgraph dev with the patched config
    os.execvp(
        "uv",
        [
            "uv", "run", "langgraph", "dev",
            "--config", CONFIG_DST,
            "--no-browser",
            "--allow-blocking",
            "--no-reload",
            "--host", "0.0.0.0",
            "--port", "2024",
        ],
    )


if __name__ == "__main__":
    main()
