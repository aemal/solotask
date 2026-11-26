"""Local JSON-lines Whisper worker. Audio is PCM16 mono at 16 kHz; never written to disk."""
import base64
import contextlib
import json
import os
import sys


def reply(value):
    print(json.dumps(value), flush=True)


try:
    # Keep stdout exclusively for the protocol, including during model loading.
    with contextlib.redirect_stdout(sys.stderr):
        import numpy as np
        import whisper
        import runpy
        compatibility = runpy.run_path(os.path.join(os.path.dirname(__file__), "whisper-tokenizer-compat.py"))
        compatibility["configure"](whisper.tokenizer)
        import torch
        torch.set_num_threads(max(1, min(16, int(os.environ.get("VIBEBOARD_WHISPER_THREADS", "4")))))
        model = whisper.load_model(sys.argv[1] if len(sys.argv) > 1 else "base")
        # Validate all tokenizer dependencies before reporting readiness or recording.
        whisper.tokenizer.get_tokenizer(model.is_multilingual)
    reply({"ready": True})
except Exception as error:
    print(str(error), file=sys.stderr, flush=True)
    reply({"error": "Whisper setup failed (" + type(error).__name__ + "): " + str(error)[:300]})
    sys.exit(1)

for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        audio = np.frombuffer(base64.b64decode(request["audio"], validate=True), dtype="<i2").astype(np.float32) / 32768.0
        if len(audio) > 16_000 * 20:
            raise ValueError("Audio window too large")
        if len(audio) < 1600 or np.sqrt(np.mean(audio * audio)) < 0.003:
            text = ""
        else:
            with contextlib.redirect_stdout(sys.stderr):
                result = model.transcribe(audio, fp16=False, verbose=None, temperature=0, condition_on_previous_text=False)
            text = " ".join(segment["text"].strip() for segment in result.get("segments", [])
                            if segment.get("no_speech_prob", 0) < 0.6 and segment.get("avg_logprob", 0) > -1.0)
        reply({"id": request.get("id"), "text": text.strip()})
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        reply({"id": request.get("id"), "error": "Local transcription failed. Check Whisper setup and try again."})
