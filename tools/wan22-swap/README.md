# Two-character swap with Wan 2.2 (Wan-Animate, replacement mode)

Replaces the green-dress man with the grey-coat man, and the yellow-dress man with the black-coat man, in the reference video. The original background and original audio are kept.

This pipeline needs a **GPU host** (about 80 GB VRAM for the official single-GPU command; use multi-GPU with FSDP and Ulysses if you have fewer). It cannot run in the Arena sandbox (no GPU, and model weights are not on the allowed download hosts).

## Inputs (already prepared)

| File | Role |
| --- | --- |
| `reference.mp4` | Original clip: 28.05 s, 960x720, 24 fps, AAC stereo |
| `firefly.jpg` | Grey-coat man, replaces the green-dress man |
| `firefly_1.jpg` | Black-coat man, replaces the yellow-dress man |

Expected output: **670 video frames at 24 fps, 28.049 s** (same as the reference; checked by `verify.py`), original audio, 960x720.

## Setup on the GPU host

```bash
git clone https://github.com/Wan-Video/Wan2.2.git && cd Wan2.2
pip install -r requirements.txt -r requirements_animate.txt
huggingface-cli download Wan-AI/Wan2.2-Animate-14B --local-dir ./Wan2.2-Animate-14B
# Also needs ffmpeg and ffprobe on PATH.
```

Copy this folder's scripts into the Wan2.2 checkout, then put the three input files in a `inputs/` folder there.

## Pipeline

```bash
# 0. Check the reference and record its exact frame count / duration
bash prepare.sh inputs/reference.mp4

# 1. Pass 1: green-dress man -> grey-coat man (replace mode)
bash run_pass.sh inputs/reference.mp4 inputs/firefly.jpg work/pass1
#    -> find the generated .mp4 (printed by generate.py / newest under work/pass1), then:
python finalize.py --generated <pass1_generated.mp4> --reference inputs/reference.mp4 --out work/pass1_final.mp4

# 2. Pass 2: yellow-dress man -> black-coat man, on the pass-1 result
bash run_pass.sh work/pass1_final.mp4 inputs/firefly_1.jpg work/pass2
python finalize.py --generated <pass2_generated.mp4> --reference inputs/reference.mp4 --out final/swapped.mp4

# 3. Verify length, fps, resolution, and audio match the reference
python verify.py --reference inputs/reference.mp4 --candidate final/swapped.mp4
```

## Notes and known limits

- **Audio:** Wan-Animate generates video only. `finalize.py` copies the original audio bit-for-bit from the reference, so the music is unchanged.
- **Mouth sync:** In replacement mode the new character's mouth follows the original performer's mouth movements in the reference. It does not re-time lips to the music. Strict audio-driven lip sync needs a speech-driven model such as Wan2.2-S2V (`--task s2v-14B`), which is a different pipeline and will change the motion. Confirm this result on the output before you accept it.
- **Two characters:** Each pass replaces one person. The preprocessing step must isolate the correct person in each pass. Check the masks in `wan/modules/animate/preprocess/UserGuider.md` and the preview output before running the full clip.
- **Frame timing:** Wan-Animate outputs at its own fps (30 in the examples). `finalize.py` resamples to 24 fps and trims or pads to the reference frame count, so the length matches exactly.
- **Consent:** These are real people's likenesses. Only use this where the people in the photos have agreed to appear in it.
- Nothing here has been run end to end yet.
