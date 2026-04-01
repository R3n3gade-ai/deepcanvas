"""Simple wrapper to ensure langgraph.json has models=[] before starting langgraph dev."""
import json
import os
import sys


def main():
    config_path = "langgraph.json"
    with open(config_path) as f:
        data = json.load(f)

    if "models" not in data or data["models"] is None:
        data["models"] = []
        with open(config_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Patched {config_path}: added models=[]", file=sys.stderr)

    # Run langgraph dev (the Dockerfile patches cli.py to pass LANGGRAPH_MODELS)
    os.execvp(
        "langgraph",
        [
            "langgraph", "dev",
            "--no-browser",
            "--allow-blocking",
            "--no-reload",
            "--host", "0.0.0.0",
            "--port", "2024",
        ],
    )


if __name__ == "__main__":
    main()
