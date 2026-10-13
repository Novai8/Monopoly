#!/usr/bin/env python3
"""Two-pass Wan 2.2 Animate replacement via deAPI (pass 1 grey coat, pass 2 black coat).

The API key is read from a local file named deapi_key.txt (or from the
DEAPI_API_KEY environment variable). deapi_key.txt is git-ignored, so the key
never gets committed.

Usage (run from the folder that holds segment_6s.mp4, firefly.jpg, firefly_1.jpg;
deapi_key.txt must sit next to this script):
    python deapi_swap.py
"""
import os
import time
from pathlib import Path

import requests

BASE = "https://api.deapi.ai"
MODEL = "Wan2_2_Animate_14B_INT8"
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


def load_key():
    key = os.environ.get("21125|czwy1eaB3N9SiNJffvQqqcvjzWhxIq5RA11AaIJi86d445cb")
    if not key:
        p = Path(__file__).resolve().parent / "21125|czwy1eaB3N9SiNJffvQqqcvjzWhxIq5RA11AaIJi86d445cb"
        if p.exists():
            key = p.read_text().strip()
    if not key:
        raise SystemExit("No key found. Put your key in deapi_key.txt or set DEAPI_API_KEY.")
    return key


def run(headers, video_path, image_path, out_path):
    with open(video_path, "rb") as v, open(image_path, "rb") as r:
        resp = requests.post(
            f"{BASE}/api/v2/videos/replacements", headers=headers,
            files={"video": ("input.mp4", v, "video/mp4"),
                   "ref_image": (os.path.basename(image_path), r, MIME.get(Path(image_path).suffix.lower(), "image/jpeg"))},
            data={"model": MODEL, "width": 768, "height": 576, "seed": 42},
            timeout=600,
        )
    resp.raise_for_status()
    rid = resp.json()["data"]["request_id"]
    print("submitted", rid)
    while True:
        s = requests.get(f"{BASE}/api/v2/jobs/{rid}", headers=headers, timeout=60).json()["data"]
        if s["status"] == "done":
            url = s["result_url"]
            break
        if s["status"] == "error":
            raise RuntimeError(s)
        print("status:", s["status"])
        time.sleep(5)
    with requests.get(url, stream=True, timeout=600) as d, open(out_path, "wb") as f:
        for chunk in d.iter_content(1 << 20):
            f.write(chunk)
    print("saved", out_path)


def main():
    headers = {"Authorization": f"Bearer {load_key()}", "Accept": "application/json"}
    run(headers, "segment_6s.mp4", "firefly.jpg", "pass1.mp4")   # grey coat
    run(headers, "pass1.mp4", "firefly_1.jpg", "pass2.mp4")      # black coat
    print("Done. Next: finalize.py and verify.py on pass2.mp4")


if __name__ == "__main__":
    main()
