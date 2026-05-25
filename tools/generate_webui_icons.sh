#!/usr/bin/env bash
# Generate themed module icons from webroot/logo.svg.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SVG="$ROOT_DIR/webroot/logo.svg"
OUTPUT_DIR="$ROOT_DIR/icons"
DEFAULT_ICON="$ROOT_DIR/webroot/icon.png"
SIZE="${ICON_SIZE:-512}"

if [ ! -f "$SOURCE_SVG" ]; then
    echo "Missing source SVG: $SOURCE_SVG" >&2
    exit 1
fi

if command -v magick >/dev/null 2>&1; then
    RENDER=(magick)
elif command -v convert >/dev/null 2>&1; then
    RENDER=(convert)
else
    echo "ImageMagick is required. Install 'magick' or 'convert' and try again." >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LOGO_INNER="$(awk '
    /<svg[[:space:]>]/ { inside = 1; next }
    /<\/svg>/ { inside = 0; next }
    inside { print }
' "$SOURCE_SVG")"

make_icon() {
    local name="$1"
    local bg="$2"
    local primary="$3"
    local outline="$4"
    local svg_file="$TMP_DIR/icon-$name.svg"
    local png_file="$OUTPUT_DIR/icon-$name.png"

    cat > "$svg_file" <<EOF
<svg width="$SIZE" height="$SIZE" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/">
  <rect width="512" height="512" rx="72" ry="72" fill="$bg"/>
  <g transform="translate(87.04 91) scale(0.66)" fill="$primary" stroke="$outline" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
$LOGO_INNER
  </g>
</svg>
EOF

    "${RENDER[@]}" -background none "$svg_file" -resize "${SIZE}x${SIZE}" -depth 8 "PNG32:$png_file"
    echo "Generated ${png_file#$ROOT_DIR/}"
}

make_icon "default" "#171b18" "#c7cacf" "#e1e3e0"
make_icon "trinket" "#1d1714" "#ffb68f" "#f0dfd9"
make_icon "1280" "#151822" "#b6c4ff" "#e1e2f3"
make_icon "2100" "#16131f" "#cec0ff" "#e8e0f0"

cp "$OUTPUT_DIR/icon-default.png" "$DEFAULT_ICON"
echo "Updated ${DEFAULT_ICON#$ROOT_DIR/}"
