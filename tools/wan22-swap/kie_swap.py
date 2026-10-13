#!/usr/bin/env python3
"""Run the two-character swap on Kie.ai (wan/2-2-animate-replace), then finalize and verify.

Runs on YOUR machine (the Arena sandbox cannot reach api.kie.ai).
Set your key as an environment variable. Do not paste it into code or chats:
    export KIE_API_KEY=...          (Linux/macOS)
    setx KIE_API_KEY "..."          (Windows; open a new terminal afterwards)

Pass 1: segment video + grey-coat image   (replaces the green-dress man)
Pass 2: pass-1 result + black-coat image  (replaces the yellow-dress man)

Progress is saved to state.json after each step, so a re-run never submits a
paid task twice. Each pass costs credits per video-second (480p: 6 credits/s).

Usage:
    python kie_swap.py --segment segment_6s.mp4 --grey firefly.jpg --black firefly_1.jpg \
        --workdir kie_run --resolution 480p --yes
Add --yes to confirm you accept the credit cost. Without it the script stops before paying.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import requests

BASE = "https://api.kie.ai"
UPLOAD_BASE = "https://kieai.redpandaai.co"
MODEL = "wan/2-2-animate-replace"


def headers(key):
    return {"Authorization": f"Bearer {key}"}


def upload(key, path, upload_path="monopoly-swap"):
    """Upload a local file via the File Stream Upload API. Returns a downloadUrl."""
    with open(path, "rb") as f:
        r = requests.post(
            f"{UPLOAD_BASE}/api/file-stream-upload",
            headers=headers(key),
            files={"file": (Path(path).name, f)},
            data={"uploadPath": upload_path},
            timeout=600,
        )
    r.raise_for_status()
    j = r.json()
    if not j.get("success") or j.get("code") != 200:
        raise RuntimeError(f"upload failed for {path}: {j.get('msg')}")
    return j["data"]["downloadUrl"]


def create_task(key, video_url, image_url, resolution):
    body = {
        "model": MODEL,
        "input": {
            "video_url": video_url,
            "image_url": image_url,
            "resolution": resolution,
            "nsfw_checker": False,
        },
    }
    r = requests.post(f"{BASE}/api/v1/jobs/createTask", headers=headers(key), json=body, timeout=120)
    r.raise_for_status()
    j = r.json()
    if j.get("code") != 200:
        raise RuntimeError(f"createTask failed: {j}")
    return j["data"]["taskId"]


def wait_task(key, task_id, poll_s=10, timeout_s=3600):
    """Poll Get Task Details until success or fail. Returns the result video URL."""
    start = time.time()
    while True:
        r = requests.get(f"{BASE}/api/v1/jobs/recordInfo", headers=headers(key),
                         params={"taskId": task_id}, timeout=60)
        r.raise_for_status()
        d = r.json()
        if d.get("code") != 200:
            raise RuntimeError(f"status check failed: {d}")
        data = d["data"]
        state = data.get("state")
        print(f"  task {task_id}: {state} ({data.get('progress', '?')}%)")
        if state == "success":
            urls = json.loads(data["resultJson"])["resultUrls"]
            return urls[0], data.get("creditsConsumed")
        if state == "fail":
            raise RuntimeError(f"task {task_id} failed: {data.get('failCode')} {data.get('failMsg')}")
        if time.time() - start > timeout_s:
            raise RuntimeError(f"task {task_id} timed out; not retrying automatically")
        time.sleep(poll_s)


def download(url, dest):
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return dest


def load_state(p):
    return json.loads(p.read_text()) if p.exists() else {}


def save_state(p, s):
    p.write_text(json.dumps(s, indent=2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--segment", required=True, help="reference segment (6.5 s, the clip being swapped)")
    ap.add_argument("--grey", required=True, help="grey-coat image (replaces green-dress man)")
    ap.add_argument("--black", required=True, help="black-coat image (replaces yellow-dress man)")
    ap.add_argument("--workdir", default="kie_run")
    ap.add_argument("--resolution", default="480p", choices=["480p", "580p", "720p"])
    ap.add_argument("--yes", action="store_true", help="confirm the paid run")
    a = ap.parse_args()

    key = os.environ.get("KIE_API_KEY")
    if not key:
        sys.exit("Set KIE_API_KEY in your environment first.")
    if not a.yes:
        sys.exit("This run spends credits. Re-run with --yes to confirm.")

    work = Path(a.workdir)
    work.mkdir(parents=True, exist_ok=True)
    sp = work / "state.json"
    st = load_state(sp)

    if "seg_url" not in st:
        st["seg_url"] = upload(key, a.segment); save_state(sp, st)
    if "grey_url" not in st:
        st["grey_url"] = upload(key, a.grey); save_state(sp, st)
    if "black_url" not in st:
        st["black_url"] = upload(key, a.black); save_state(sp, st)

    # Pass 1: green-dress -> grey-coat
    if "pass1_url" not in st:
        if "pass1_task" not in st:
            print("Pass 1: submitting (green-dress -> grey coat)")
            st["pass1_task"] = create_task(key, st["seg_url"], st["grey_url"], a.resolution)
            save_state(sp, st)
        st["pass1_url"], st["pass1_credits"] = wait_task(key, st["pass1_task"])
        save_state(sp, st)
    download(st["pass1_url"], work / "pass1.mp4")
    print(f"Pass 1 done, credits consumed: {st.get('pass1_credits')}")

    # Pass 2: yellow-dress -> black-coat, on the pass-1 result
    if "pass2_url" not in st:
        if "pass2_task" not in st:
            print("Pass 2: submitting (yellow-dress -> black coat)")
            st["pass2_task"] = create_task(key, st["pass1_url"], st["black_url"], a.resolution)
            save_state(sp, st)
        st["pass2_url"], st["pass2_credits"] = wait_task(key, st["pass2_task"])
        save_state(sp, st)
    download(st["pass2_url"], work / "pass2.mp4")
    print(f"Pass 2 done, credits consumed: {st.get('pass2_credits')}")

    # Make the output match the segment exactly (fps, frame count, length, audio), then verify.
    here = Path(__file__).resolve().parent
    final = work / "final_swapped.mp4"
    subprocess.check_call([sys.executable, str(here / "finalize.py"),
                           "--generated", str(work / "pass2.mp4"),
                           "--reference", a.segment, "--out", str(final)])
    subprocess.check_call([sys.executable, str(here / "verify.py"),
                           "--reference", a.segment, "--candidate", str(final)])
    print(f"\nDone: {final}")
    print("Check the lip sync and the swapped faces by watching the file before using it.")


if __name__ == "__main__":
    main()
