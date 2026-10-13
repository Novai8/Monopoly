#!/usr/bin/env bash
# Probe the reference clip and write its exact timing to manifest.json.
# Usage: bash prepare.sh <reference.mp4>
set -euo pipefail
REF="${1:?usage: prepare.sh <reference.mp4>}"
OUT="$(dirname "$REF")/manifest.json"

PROBE=$(ffprobe -v error -count_frames -show_streams -show_format -of json "$REF")
python3 - "$REF" "$OUT" <<PY
import json, sys
d = json.loads('''$PROBE''')
v = next(s for s in d["streams"] if s["codec_type"] == "video")
a = [s for s in d["streams"] if s["codec_type"] == "audio"]
num, den = (int(x) for x in v["r_frame_rate"].split("/"))
m = {
    "reference": sys.argv[1],
    "width": v["width"], "height": v["height"],
    "fps": num / den,
    "frame_count": int(v["nb_read_frames"]),
    "duration_s": float(d["format"]["duration"]),
    "audio_codec": a[0]["codec_name"] if a else None,
}
json.dump(m, open(sys.argv[2], "w"), indent=2)
print(json.dumps(m, indent=2))
PY
