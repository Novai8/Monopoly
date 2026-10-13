#!/usr/bin/env python3
"""Make a generated clip match the reference exactly.

- Resamples to the reference fps (24) and resolution.
- Pads (last frame cloned) or trims to the reference frame count.
- Copies the reference audio bit-for-bit (music is never re-encoded).
- Cuts to the reference duration.

Usage:
  python finalize.py --generated gen.mp4 --reference reference.mp4 --out final.mp4
"""
import argparse
import json
import subprocess
import sys


def probe(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate",
        "-show_entries", "format=duration", "-of", "json", path,
    ])
    d = json.loads(out)
    s = d["streams"][0]
    num, den = (int(x) for x in s["r_frame_rate"].split("/"))
    return {
        "width": s["width"], "height": s["height"],
        "fps": num / den, "duration": float(d["format"]["duration"]),
    }


def count_frames(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
        "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", path,
    ])
    return int(out.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--generated", required=True)
    ap.add_argument("--reference", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    ref = probe(a.reference)
    ref_frames = count_frames(a.reference)
    gen_frames = count_frames(a.generated)
    print(f"reference: {ref_frames} frames, {ref['duration']:.3f}s, "
          f"{ref['width']}x{ref['height']}@{ref['fps']}")
    print(f"generated: {gen_frames} frames")

    vf = (
        f"fps={ref['fps']},"
        f"scale={ref['width']}:{ref['height']}:flags=lanczos,setsar=1,"
        f"tpad=stop_mode=clone:stop=-1,"
        f"trim=end_frame={ref_frames},setpts=PTS-STARTPTS"
    )
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-i", a.generated, "-i", a.reference,
        "-filter_complex", f"[0:v]{vf}[v]",
        "-map", "[v]", "-map", "1:a?",
        "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
        "-c:a", "copy", "-r", f"{ref['fps']}", "-t", f"{ref['duration']:.6f}",
        "-movflags", "+faststart", a.out,
    ]
    subprocess.check_call(cmd)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    sys.exit(main())
