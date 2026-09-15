#!/bin/sh
# Copy the converted fp16 model + ONNX Runtime WASM files into the app's public folder.
# Run after convert.py and `pnpm install`. Output is git-ignored (model is 218 MB, too big for git).
set -e
here=$(dirname "$0")
dest="$here/../../apps/readest-app/public/mood-model"

mkdir -p "$dest/onnx" "$dest/ort"
cp "$here"/out/model/*.json "$dest/"
cp "$here/out/model/onnx/model_fp16.onnx" "$dest/onnx/"
# The exact onnxruntime-web build transformers.js imports (pnpm nests it).
ort=$(cd "$here/../../apps/readest-app" && node -p "require('path').dirname(require.resolve('onnxruntime-web', { paths: [require.resolve('@huggingface/transformers')] }))")
cp "$ort"/ort-wasm-simd-threaded.* "$dest/ort/"
printf '*\n!.gitignore\n' > "$dest/.gitignore"
du -sh "$dest"
