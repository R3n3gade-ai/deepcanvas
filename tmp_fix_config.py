#!/usr/bin/env python3
"""Fix empty api_key fields in config.yaml"""
path = "/opt/deepcanvas/config.yaml"
with open(path) as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.rstrip()
    # Fix empty api_key lines
    if stripped == "    api_key:":
        # Look ahead to determine which key to use
        # Check if we're in a gpt model block
        in_gpt = False
        for j in range(i-1, max(i-10, -1), -1):
            if "name: gpt" in lines[j] or "ChatOpenAI" in lines[j]:
                in_gpt = True
                break
            if lines[j].strip().startswith("- name:"):
                break
        if in_gpt:
            new_lines.append("    api_key: $OPENAI_API_KEY\n")
        else:
            new_lines.append("    api_key: $GEMINI_API_KEY\n")
    else:
        new_lines.append(line)
    i += 1

with open(path, "w") as f:
    f.writelines(new_lines)
print("Fixed api_key fields")
