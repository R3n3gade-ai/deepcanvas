"""Patch langgraph.json and start the langgraph dev server.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None.
This script:
1. Patches langgraph.json in-place to ensure models=[]
2. Sets LANGGRAPH_MODELS env var as a fallback
3. Starts the server directly via uvicorn (bypassing 'langgraph dev' subprocess spawn)
"""
import json
import os
import sys


def patch_config():
    """Ensure langgraph.json has models=[]."""
    config_path = "langgraph.json"
    with open(config_path) as f:
        data = json.load(f)

    if "models" not in data or data["models"] is None:
        data["models"] = []
        with open(config_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Patched {config_path}: added models=[]", file=sys.stderr)

    return data


def main():
    data = patch_config()

    # Set ALL required env vars that langgraph dev normally sets
    graphs = data.get("graphs", {})
    checkpointer = data.get("checkpointer")
    auth = data.get("auth")
    env_file = data.get("env")

    os.environ["LANGGRAPH_GRAPHS"] = json.dumps(graphs)
    os.environ["WITH_LANGGRAPH_API_VARIANT"] = "local_dev"
    os.environ["LANGGRAPH_ALLOW_BLOCKING"] = "true"

    if checkpointer:
        os.environ["LANGGRAPH_CHECKPOINTER"] = json.dumps(checkpointer)
    if auth:
        os.environ["LANGGRAPH_AUTH"] = json.dumps(auth)
    if env_file:
        os.environ["LANGGRAPH_ENV"] = env_file

    # The runtime edition for in-memory
    os.environ["LANGGRAPH_RUNTIME_EDITION"] = "inmem"

    # Ensure models env var is set
    os.environ["LANGGRAPH_MODELS"] = json.dumps(data.get("models", []))

    # Load env file if specified (langgraph dev does this)
    if env_file:
        try:
            from dotenv import dotenv_values
            env_vars = dotenv_values(env_file)
            for k, v in env_vars.items():
                if v is not None and k not in os.environ:
                    os.environ[k] = v
        except ImportError:
            pass

    print("Starting langgraph server directly via uvicorn...", file=sys.stderr)
    print(f"  Graphs: {list(graphs.keys())}", file=sys.stderr)
    print(f"  Checkpointer: {checkpointer}", file=sys.stderr)

    # Start uvicorn directly with the inmem runtime
    import uvicorn
    uvicorn.run(
        "langgraph_runtime_inmem.server:app",
        host="0.0.0.0",
        port=2024,
        reload=False,
    )


if __name__ == "__main__":
    main()
