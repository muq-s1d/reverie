"""Phase 2 reference: run betterReading's PyTorch classifier on its 600 test chunks.

Run with betterReading's venv (has torch + transformers):
  ~/Projects/Personal/betterReading/backend/.venv/bin/python tools/mood-model/reference.py
"""
import json
import sys
import time
from collections import Counter
from pathlib import Path

BR = Path.home() / "Projects/Personal/betterReading"
sys.path.insert(0, str(BR / "backend/services"))
import nlp  # noqa: E402  (betterReading's EMOTION_MAP, threshold, classifier)

OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)

chunks = json.loads((BR / "research/data/sample_chunks.json").read_text())
classifier = nlp.get_classifier()

start = time.time()
scores = [
    {s["label"]: s["score"] for s in out}
    for i in range(0, len(chunks), 16)
    for out in classifier(chunks[i:i + 16])
]
moods = [r["emotion"] for r in nlp.classify_chunks(chunks)]
elapsed = time.time() - start

neutral = Counter(moods)["Neutral"] / len(moods)
print(f"{len(chunks)} chunks, Neutral {neutral:.1%}, {elapsed:.0f}s (two passes)")
(OUT / "python_ref.json").write_text(json.dumps({"moods": moods, "scores": scores}))
