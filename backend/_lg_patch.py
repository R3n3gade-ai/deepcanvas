"""Patch Pydantic BaseModel.model_validate to fix langgraph-api 0.7.65 models=None bug.

This module is loaded at Python startup via a .pth file. It patches
BaseModel.model_validate so that when AppConfig is validated, if models
is None or missing, it defaults to [].
"""
import pydantic

_orig = pydantic.BaseModel.model_validate.__func__


@classmethod
def _patched_model_validate(cls, data, *args, **kwargs):
    if cls.__name__ == "AppConfig" and isinstance(data, dict):
        if "models" not in data or data.get("models") is None:
            data = {**data, "models": []}
    return _orig(cls, data, *args, **kwargs)


pydantic.BaseModel.model_validate = _patched_model_validate
