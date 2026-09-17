#!/bin/sh
# Download the mood model + built-in music into apps/readest-app/public/.
# They are too big for git (~410 MB), so they live on the "assets-v1" GitHub release.
#
#   sh tools/assets/fetch.sh            # both, skipped if already there
#   sh tools/assets/fetch.sh --force    # re-download
#
# Run it after `pnpm install`: the ONNX Runtime WASM files are copied out of node_modules.
# To rebuild the assets from source instead, see tools/mood-model/ and tools/mood-music/.
set -e

RELEASE=https://github.com/muq-s1d/reverie/releases/download/assets-v1
MODEL_SHA=bf72da5729bf26d9b5857302715edf8353500fb25b0e8518163776ee59241adc
MUSIC_SHA=6c382a5b6fe6975e54915bfac8d57c2f0fbdb82521a5dc8bc0eafd69fcd71f97

here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
app="$here/../../apps/readest-app"
pub="$app/public"
tmp=${TMPDIR:-/tmp}

[ "$1" = "--force" ] && rm -rf "$pub/mood-model" "$pub/music"

fetch() {
  name=$1 sha=$2
  tar="$tmp/$name.tar"
  if [ ! -f "$tar" ] || [ "$(sha256sum "$tar" | cut -d' ' -f1)" != "$sha" ]; then
    echo "Downloading $name..."
    curl -fL --retry 5 --retry-all-errors -o "$tar" "$RELEASE/$name.tar"
    [ "$(sha256sum "$tar" | cut -d' ' -f1)" = "$sha" ] || { echo "$name: checksum mismatch"; exit 1; }
  fi
}

if [ -f "$pub/mood-model/onnx/model_fp16.onnx" ]; then
  echo "mood model already present"
else
  fetch reverie-mood-model "$MODEL_SHA"
  mkdir -p "$pub/mood-model"
  tar -xf "$tmp/reverie-mood-model.tar" -C "$pub/mood-model"
fi

# The runtime comes from node_modules, not the release: it must match the installed transformers.js.
mkdir -p "$pub/mood-model/ort"
ort=$(cd "$app" && node -p "require('path').dirname(require.resolve('onnxruntime-web', { paths: [require.resolve('@huggingface/transformers')] }))")
cp "$ort"/ort-wasm-simd-threaded.wasm "$ort"/ort-wasm-simd-threaded.mjs \
   "$ort"/ort-wasm-simd-threaded.jsep.wasm "$ort"/ort-wasm-simd-threaded.jsep.mjs "$pub/mood-model/ort/"
printf '*\n!.gitignore\n' > "$pub/mood-model/.gitignore"

if [ -d "$pub/music/joy" ]; then
  echo "music already present"
else
  fetch reverie-music "$MUSIC_SHA"
  tar -xf "$tmp/reverie-music.tar" -C "$pub"
fi

du -sh "$pub/mood-model" "$pub/music"
