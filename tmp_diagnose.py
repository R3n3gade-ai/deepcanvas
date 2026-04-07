#!/usr/bin/env python3
"""Diagnose API key flow on VPS."""
import os
import sys

# 1. Check the .env file directly
env_path = "/app/.env"
print(f"=== Reading {env_path} ===")
env_vals = {}
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env_vals[k.strip()] = v.strip()
    gemini = env_vals.get("GEMINI_API_KEY", "<NOT IN FILE>")
    openai = env_vals.get("OPENAI_API_KEY", "<NOT IN FILE>")
    print(f"  GEMINI_API_KEY from file: {repr(gemini[:10])}..." if gemini and len(gemini) > 10 else f"  GEMINI_API_KEY from file: {repr(gemini)}")
    print(f"  OPENAI_API_KEY from file: {repr(openai[:10])}..." if openai and len(openai) > 10 else f"  OPENAI_API_KEY from file: {repr(openai)}")
else:
    print(f"  FILE NOT FOUND: {env_path}")

# 2. Check os.environ
print(f"\n=== os.environ ===")
print(f"  GEMINI_API_KEY: {repr(os.environ.get('GEMINI_API_KEY', '<NOT SET>'))[:30]}")
print(f"  OPENAI_API_KEY: {repr(os.environ.get('OPENAI_API_KEY', '<NOT SET>'))[:30]}")

# 3. Test load_dotenv with override
print(f"\n=== After load_dotenv(override=True) ===")
try:
    from dotenv import load_dotenv
    load_dotenv(env_path, override=True)
    print(f"  GEMINI_API_KEY: {repr(os.environ.get('GEMINI_API_KEY', '<NOT SET>'))[:30]}")
    print(f"  OPENAI_API_KEY: {repr(os.environ.get('OPENAI_API_KEY', '<NOT SET>'))[:30]}")
except Exception as e:
    print(f"  load_dotenv error: {e}")

# 4. Test config loading
print(f"\n=== Testing AppConfig.from_file() ===")
try:
    sys.path.insert(0, "/app/backend/packages/harness")
    os.environ["DEER_FLOW_CONFIG_PATH"] = "/app/config.yaml"
    from deerflow.config.app_config import AppConfig, reset_app_config
    reset_app_config()
    config = AppConfig.from_file()
    for m in config.models[:3]:
        gkey = getattr(m, "google_api_key", None)
        akey = getattr(m, "api_key", None)
        key_val = gkey or akey or "N/A"
        key_display = repr(key_val[:10]) + "..." if key_val and len(key_val) > 10 else repr(key_val)
        print(f"  Model: {m.name} -> key={key_display}")
    print(f"  Total models: {len(config.models)}")
except Exception as e:
    print(f"  Config error: {type(e).__name__}: {e}")
