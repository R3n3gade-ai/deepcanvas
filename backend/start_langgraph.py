"""Wrapper to start langgraph dev with a patched AppConfig.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None
instead of [] (empty list), causing a Pydantic validation error at startup.
This wrapper monkey-patches the default before invoking the CLI.
"""
import sys


def patch_models_default():
    """Patch AppConfig so 'models' defaults to [] instead of None."""
    try:
        from langgraph_api import config as cfg

        original_from_file = cfg.AppConfig.from_file

        @classmethod  # type: ignore[misc]
        def patched_from_file(cls, path, **kwargs):
            import json
            from pathlib import Path

            data = json.loads(Path(path).read_text())
            if "models" not in data:
                data["models"] = []
            # Write patched data to a temp file and load from that
            import tempfile

            tmp = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            )
            json.dump(data, tmp)
            tmp.close()
            return original_from_file.__func__(cls, tmp.name, **kwargs)

        cfg.AppConfig.from_file = patched_from_file
    except Exception as e:
        print(f"Warning: Could not patch AppConfig.models: {e}", file=sys.stderr)


if __name__ == "__main__":
    patch_models_default()

    # Now run the langgraph CLI as normal
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
