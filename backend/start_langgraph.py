"""Wrapper to start langgraph dev with the AppConfig.models bug patched.

langgraph-api 0.7.65 has a bug where AppConfig.models defaults to None
instead of [] (empty list). This wrapper injects a sitecustomize.py into
the Python site-packages so the patch is active in ALL processes, including
subprocesses spawned by 'langgraph dev'.
"""
import os
import site
import subprocess
import sys
import textwrap


def install_patch():
    """Write a sitecustomize.py that patches AppConfig on import."""
    # Find the site-packages directory
    sp_dirs = site.getsitepackages()
    if not sp_dirs:
        sp_dirs = [site.getusersitepackages()]

    patch_code = textwrap.dedent("""\
        # Auto-patch for langgraph-api 0.7.65 models bug
        import importlib
        _original_import = __builtins__.__import__ if hasattr(__builtins__, '__import__') else __import__

        def _patch_appconfig():
            try:
                from langgraph_api.config import AppConfig
                orig = AppConfig.model_validate.__func__
                def patched(cls, data, *a, **kw):
                    if isinstance(data, dict) and ('models' not in data or data.get('models') is None):
                        data = {**data, 'models': []}
                    return orig(cls, data, *a, **kw)
                AppConfig.model_validate = classmethod(patched)
            except Exception:
                pass

        _patch_appconfig()
    """)

    for sp in sp_dirs:
        target = os.path.join(sp, "sitecustomize.py")
        try:
            with open(target, "w") as f:
                f.write(patch_code)
            print(f"Installed AppConfig patch at {target}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Could not write to {sp}: {e}", file=sys.stderr)

    return False


if __name__ == "__main__":
    install_patch()

    # Now exec langgraph dev directly (same process, patch is in sitecustomize)
    os.execvp(
        sys.executable,
        [
            sys.executable, "-m", "langgraph_cli",
            "dev",
            "--no-browser",
            "--allow-blocking",
            "--no-reload",
            "--host", "0.0.0.0",
            "--port", "2024",
        ]
    )
