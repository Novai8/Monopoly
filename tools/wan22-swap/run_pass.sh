#!/usr/bin/env bash
# One Wan-Animate replacement pass: preprocess, then generate.
# Run from the root of a Wan2.2 checkout (where generate.py lives).
# Usage: bash run_pass.sh <input_video> <character_image> <work_dir>
# Env: CKPT (default ./Wan2.2-Animate-14B)
set -euo pipefail
VIDEO="${1:?input video}"
REF_IMG="${2:?character image}"
WORK="${3:?work dir}"
CKPT="${CKPT:-./Wan2.2-Animate-14B}"

mkdir -p "$WORK"

# Preprocessing for replacement (same flags as the official Wan2.2 README).
python ./wan/modules/animate/preprocess/preprocess_data.py \
  --ckpt_path "$CKPT/process_checkpoint" \
  --video_path "$VIDEO" \
  --refer_path "$REF_IMG" \
  --save_path "$WORK/process_results" \
  --resolution_area 1280 720 \
  --iterations 3 --k 7 --w_len 1 --h_len 1 \
  --replace_flag

# Generation in replacement mode (single GPU; see README for multi-GPU).
python generate.py --task animate-14B --ckpt_dir "$CKPT" \
  --src_root_path "$WORK/process_results" \
  --refert_num 1 --replace_flag --use_relighting_lora

echo "Generation finished. Find the output .mp4 (newest first):"
find . -name '*.mp4' -newer "$WORK" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -5 | cut -d' ' -f2-
