#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/michael/proj/dcgame"
HANDOUT_DIR="$ROOT/docs/marketing/handouts"
OUT_DIR="$HANDOUT_DIR/pdf"
CHROME="/usr/bin/google-chrome"

mkdir -p "$OUT_DIR"

render_one() {
  local html_file="$1"
  local pdf_file="$2"
  "$CHROME" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --print-to-pdf="$pdf_file" \
    "file://$html_file"
}

render_one "$HANDOUT_DIR/uganda-christian-schools-handout.html" "$OUT_DIR/uganda-christian-schools-handout.pdf"
render_one "$HANDOUT_DIR/uganda-head-teachers-handout.html" "$OUT_DIR/uganda-head-teachers-handout.pdf"
render_one "$HANDOUT_DIR/uganda-chaplains-bible-teachers-handout.html" "$OUT_DIR/uganda-chaplains-bible-teachers-handout.pdf"
render_one "$HANDOUT_DIR/uganda-owners-board-sponsors-handout.html" "$OUT_DIR/uganda-owners-board-sponsors-handout.pdf"

echo "Rendered PDFs into $OUT_DIR"
