#!/usr/bin/env python3
"""Local web UI: upload 2 character images + 1 reference video, get the swapped video back.

Runs two Wan 2.2 Animate replacement passes via deAPI (see ../deapi_swap.py), then matches
the output to your video's length and audio (finalize.py) and checks it (verify.py).

The API key is read on the server only (deapi_key.txt next to deapi_swap.py, or the
DEAPI_API_KEY environment variable). It is never sent to the browser.

Run on your own computer:
    pip install -r requirements.txt
    python app.py          # then open http://127.0.0.1:5000
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_file

HERE = Path(__file__).resolve().parent            # tools/wan22-swap/web
SWAP_DIR = HERE.parent                            # tools/wan22-swap
sys.path.insert(0, str(SWAP_DIR))
import deapi_swap  # noqa: E402  (reuses run() and load_key())

JOBS_DIR = HERE / "jobs"
JOBS_DIR.mkdir(exist_ok=True)
MAX_VIDEO_SECONDS = 8.0                           # deAPI replacement limit
VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024                # deAPI ref_image limit

app = Flask(__name__)
jobs = {}                                         # job_id -> dict(state, log, error, ...)
lock = threading.Lock()


PAGE = """<!doctype html><html><head><meta charset="utf-8">
<title>Character Swap</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#222}
label{display:block;margin:14px 0 6px;font-weight:600}
input{width:100%}button{margin-top:20px;padding:10px 18px;font-size:16px;cursor:pointer}
#log{white-space:pre-wrap;background:#f4f4f4;padding:12px;border-radius:6px;min-height:60px;margin-top:20px}
video{width:100%;margin-top:16px}.note{color:#666;font-size:14px}
</style></head><body>
<h2>Character Swap</h2>
<p class="note">Upload two character images and one reference video (8 seconds or shorter). The
first character replaces the first person in the video, the second replaces the second.</p>
<form id="f">
<label>Character 1 image (jpg/png/webp, max 10 MB)</label><input type="file" name="char1" accept="image/*" required>
<label>Character 2 image (jpg/png/webp, max 10 MB)</label><input type="file" name="char2" accept="image/*" required>
<label>Reference video (mp4/mov/webm, 8 seconds or shorter)</label><input type="file" name="video" accept="video/*" required>
<button id="go" type="submit">Generate</button>
</form>
<div id="log">Waiting for files…</div>
<div id="out"></div>
<script>
const f=document.getElementById('f'), log=document.getElementById('log'), out=document.getElementById('out');
f.onsubmit=async(e)=>{
  e.preventDefault(); document.getElementById('go').disabled=true; out.innerHTML='';
  log.textContent='Uploading…';
  const r=await fetch('/api/jobs',{method:'POST',body:new FormData(f)});
  const j=await r.json();
  if(!r.ok){log.textContent='Error: '+j.error; document.getElementById('go').disabled=false; return;}
  poll(j.job_id);
};
async function poll(id){
  const r=await fetch('/api/jobs/'+id); const j=await r.json();
  log.textContent=j.log.join('\\n')||j.state;
  if(j.state==='done'){
    out.innerHTML='<video controls src="/api/jobs/'+id+'/result"></video><p><a href="/api/jobs/'+id+'/result" download>Download video</a></p>';
    document.getElementById('go').disabled=false; return;
  }
  if(j.state==='error'){log.textContent+='\\nError: '+j.error; document.getElementById('go').disabled=false; return;}
  setTimeout(()=>poll(id),5000);
}
</script></body></html>"""


def probe_seconds(path):
    out = subprocess.check_output(
        [os.environ.get("FFPROBE", "ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
    return float(json.loads(out)["format"]["duration"])


def log(job_id, msg):
    with lock:
        jobs[job_id]["log"].append(msg)


def run_job(job_id, video, char1, char2):
    job_dir = JOBS_DIR / job_id
    try:
        headers = {"Authorization": f"Bearer {deapi_swap.load_key()}", "Accept": "application/json"}
        with lock:
            jobs[job_id]["state"] = "running"
        log(job_id, "Pass 1/2: replacing person 1 with character 1 …")
        p1 = job_dir / "pass1.mp4"
        deapi_swap.run(headers, str(video), str(char1), str(p1))
        log(job_id, "Pass 2/2: replacing person 2 with character 2 …")
        p2 = job_dir / "pass2.mp4"
        deapi_swap.run(headers, str(p1), str(char2), str(p2))
        log(job_id, "Matching length and audio to your video …")
        final = job_dir / "final.mp4"
        subprocess.check_call([sys.executable, str(SWAP_DIR / "finalize.py"),
                               "--generated", str(p2), "--reference", str(video), "--out", str(final)])
        subprocess.check_call([sys.executable, str(SWAP_DIR / "verify.py"),
                               "--reference", str(video), "--candidate", str(final)])
        with lock:
            jobs[job_id]["state"] = "done"
        log(job_id, "Done. Watch the result before using it.")
    except BaseException as e:  # report any failure to the page (incl. SystemExit from load_key)
        with lock:
            jobs[job_id]["state"] = "error"
            jobs[job_id]["error"] = str(e)


@app.get("/")
def index():
    return PAGE


@app.post("/api/jobs")
def create_job():
    try:
        deapi_swap.load_key()          # fail early if no key is configured
    except SystemExit as e:
        return jsonify(error=str(e)), 400

    files = {k: request.files.get(k) for k in ("char1", "char2", "video")}
    if any(v is None or v.filename == "" for v in files.values()):
        return jsonify(error="Please upload both character images and the video."), 400

    ext_ok = (Path(files["video"].filename).suffix.lower() in VIDEO_EXT
              and Path(files["char1"].filename).suffix.lower() in IMAGE_EXT
              and Path(files["char2"].filename).suffix.lower() in IMAGE_EXT)
    if not ext_ok:
        return jsonify(error="Wrong file type. Use an image for each character and a video."), 400

    job_id = uuid.uuid4().hex[:12]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True)
    video = job_dir / ("input" + Path(files["video"].filename).suffix.lower())
    char1 = job_dir / ("char1" + Path(files["char1"].filename).suffix.lower())
    char2 = job_dir / ("char2" + Path(files["char2"].filename).suffix.lower())
    files["video"].save(video)
    files["char1"].save(char1)
    files["char2"].save(char2)

    for img in (char1, char2):
        if img.stat().st_size > MAX_IMAGE_BYTES:
            shutil.rmtree(job_dir, ignore_errors=True)
            return jsonify(error=f"{img.name} is over 10 MB."), 400

    try:
        seconds = probe_seconds(video)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        return jsonify(error="Could not read the video. Is ffprobe installed?"), 400
    if seconds > MAX_VIDEO_SECONDS:
        shutil.rmtree(job_dir, ignore_errors=True)
        return jsonify(error=f"Video is {seconds:.1f}s. Please use {MAX_VIDEO_SECONDS:.0f} seconds or less."), 400

    with lock:
        jobs[job_id] = {"state": "queued", "log": [f"Video length: {seconds:.1f}s"], "error": None}
    threading.Thread(target=run_job, args=(job_id, video, char1, char2), daemon=True).start()
    return jsonify(job_id=job_id)


@app.get("/api/jobs/<job_id>")
def job_status(job_id):
    with lock:
        j = jobs.get(job_id)
        if j is None:
            abort(404)
        return jsonify(state=j["state"], log=list(j["log"]), error=j["error"])


@app.get("/api/jobs/<job_id>/result")
def job_result(job_id):
    final = JOBS_DIR / job_id / "final.mp4"
    if not final.exists():
        abort(404)
    return send_file(final, mimetype="video/mp4", as_attachment=False)


if __name__ == "__main__":
    # Default is local-only. Set HOST=0.0.0.0 to expose it on the network/preview.
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "5000")), debug=False)
