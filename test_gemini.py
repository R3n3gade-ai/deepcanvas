import urllib.request
import json

key = "AIzaSyAoTLS89iugpd7CaGiUFUUZaoneRQNkTU8"

# Test gemini-2.5-pro
for model in ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = json.dumps({"contents": [{"parts": [{"text": "say hi"}]}]}).encode()
    headers = {"Content-Type": "application/json"}
    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        resp = urllib.request.urlopen(req)
        print(f"{model}: SUCCESS")
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:150]
        print(f"{model}: HTTP {e.code} - {msg}")
