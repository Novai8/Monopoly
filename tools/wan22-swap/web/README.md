# Character swap web UI

Upload two character images and one reference video (8 seconds or shorter). The app runs two
Wan 2.2 Animate replacement passes on deAPI, then matches the output to your video's length
and audio.

## Run on your computer
1. Put your deAPI key in `tools/wan22-swap/deapi_key.txt` (git-ignored), or set `DEAPI_API_KEY`.
2. Install `ffmpeg` and `ffprobe` and make sure they are on PATH (or set `FFPROBE` to the ffprobe path).
3. Run:
   ```
   cd tools/wan22-swap/web
   pip install -r requirements.txt
   python app.py
   ```
4. Open http://127.0.0.1:5000

The key is read on the server only and is never sent to the browser.
