#!/usr/bin/env python3
"""Check that the final clip matches the reference. Exits non-zero on any mismatch.

Checks: resolution, fps, frame count, duration (within one frame), and that the
audio stream is bit-identical to the reference audio.

Usage: python verify.py --reference reference.mp4 --candidate final/swapped.mp4
"""
import argparse
import hashlib
import json
import subprocess
import sys


def ffprobe(path):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-count_frames", "-of", "json", path,
    ]))


def video_info(d):
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    return {
        "w": v["width"], "h": v["height"], "fps": num / den,
        "frames": int(v.get("nb_read_frames", 0)),
        "duration": float(d["format"]["duration"]),
    }


def audio_hash(path):
    # Decode audio to raw PCM and hash it, so the comparison is sample-exact.
    data = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "s16le", "-",
    ])
    return hashlib.sha256(data).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reference", required=True)
    ap.add_argument("--candidate", required=True)
    a = ap.parse_args()

    r = video_info(ffprobe(a.reference))
    c = video_info(ffprobe(a.candidate))
    frame_s = 1.0 / r["fps"]

    checks = {
        "resolution": (r["w"], r["h"]) == (c["w"], c["h"]),
        "fps": abs(r["fps"] - c["fps"]) < 1e-3,
        "frame_count": r["frames"] == c["frames"],
        "duration_within_1_frame": abs(r["duration"] - c["duration"]) <= frame_s,
        "audio_identical": audio_hash(a.reference) == audio_hash(a.candidate),
    }
    for k, ok in checks.items():
        print(f"{'PASS' if ok else 'FAIL'}  {k}")
    print(f"reference: {r}\ncandidate: {c}")
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
