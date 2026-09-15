"""Phase 2: export the mood model to ONNX (fp32, fp16, int8) in transformers.js layout.

  tools/mood-model/.venv/bin/python tools/mood-model/convert.py
Output: tools/mood-model/out/model/{config.json, tokenizer.json, ..., onnx/model.onnx, model_fp16.onnx, model_quantized.onnx}
"""
from pathlib import Path

import onnx
from onnxconverter_common import float16
from onnxruntime.quantization import QuantType, quantize_dynamic
from optimum.exporters.onnx import main_export

MODEL = "monologg/bert-base-cased-goemotions-original"
OUT = Path(__file__).parent / "out/model"
ONNX = OUT / "onnx"

if not (ONNX / "model.onnx").exists():
    try:
        main_export(MODEL, output=OUT, task="text-classification", opset=14)
    except FileNotFoundError:
        # ponytail: optimum 1.23 + torch 2.14 export fine, then crash cleaning up "model.onnx.data"
        # (torch now writes "model.onnx_data"). Upgrade optimum if this starts failing earlier.
        pass
    ONNX.mkdir(exist_ok=True)
    model = onnx.load(OUT / "model.onnx")
    # torch 2.14 leaves stale shape annotations that break quantize's shape inference.
    model.graph.ClearField("value_info")
    # One file (435 MB, under ONNX's 2 GB single-file limit) instead of model.onnx + model.onnx_data.
    onnx.save(model, ONNX / "model.onnx")
    (OUT / "model.onnx").unlink()
    (OUT / "model.onnx_data").unlink(missing_ok=True)

# fp16: the shipping model (Phase 2). Casts stay fp32 or ORT rejects the graph.
fp32 = onnx.load(ONNX / "model.onnx")
casts = [n.name for n in fp32.graph.node if n.op_type == "Cast"]
onnx.save(float16.convert_float_to_float16(fp32, keep_io_types=True, node_block_list=casts), ONNX / "model_fp16.onnx")

# uint8 weights (transformers.js dtype "q8"). Rejected in Phase 2: ~14% of moods drift.
quantize_dynamic(ONNX / "model.onnx", ONNX / "model_quantized.onnx", weight_type=QuantType.QUInt8)

for f in sorted(ONNX.iterdir()):
    print(f"{f.name}: {f.stat().st_size / 1e6:.0f} MB")
