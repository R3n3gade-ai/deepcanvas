"""Wrapper to start langgraph dev with a patched AppConfig.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None
instead of [] (empty list), causing a Pydantic validation error at startup.
This wrapper patches the Pydantic field before invoking the CLI.
"""
import sys


def patch_models_default():
    """Patch AppConfig so 'models' field defaults to [] instead of None."""
    try:
        from langgraph_api.config import AppConfig

        if "models" in AppConfig.model_fields:
            field = AppConfig.model_fields["models"]
            if field.default is None:
                from pydantic.fields import PydanticUndefined

                # Set default to empty list
                field.default = []
                field.default_factory = None
                # Rebuild the model so Pydantic picks up the new default
                AppConfig.model_rebuild(force=True)
                print("Patched AppConfig.models default to []", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Could not patch AppConfig.models: {e}", file=sys.stderr)


if __name__ == "__main__":
    patch_models_default()

    # Now run the langgraph CLI
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
