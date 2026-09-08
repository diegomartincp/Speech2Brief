import os
import uuid
import time
import json
import requests
from flask import Flask, request, jsonify, Response, stream_with_context
import huggingface_hub

# Compatibility patch for Pyannote / HuggingFace Hub (maps use_auth_token to token)
_orig_hf_hub_download = huggingface_hub.hf_hub_download
def _patched_hf_hub_download(*args, **kwargs):
    if "use_auth_token" in kwargs:
        kwargs["token"] = kwargs.pop("use_auth_token")
    return _orig_hf_hub_download(*args, **kwargs)
huggingface_hub.hf_hub_download = _patched_hf_hub_download

import torch
import whisperx
from whisperx.diarize import DiarizationPipeline, assign_word_speakers
from flask_cors import CORS
from audio_extract import extract_audio

print("--> Starting Speech2Brief Backend", flush=True)

# Automatically load .env if present (useful for host/native execution without Docker)
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    try:
        with open(env_path, 'r', encoding='utf-8') as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    _k, _v = _k.strip(), _v.strip().strip('"').strip("'")
                    if _k not in os.environ:
                        os.environ[_k] = _v
    except Exception:
        pass

device = os.environ.get("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
OMP_NUM_THREADS = int(os.environ.get("OMP_NUM_THREADS", 8 if device == "cpu" else 4))
if device == "cpu":
    torch.set_num_threads(OMP_NUM_THREADS)
    print(f"--> [INIT] PyTorch intra-op threads set to {OMP_NUM_THREADS}", flush=True)

PROFILE_NAME = os.environ.get("PROFILE_NAME", "cpu-apple-silicon" if device == "cpu" else "gpu")

TEMP_FOLDER = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(TEMP_FOLDER, exist_ok=True)

TRANSCRIPTIONS_DIR = os.path.join(os.path.dirname(__file__), 'transcriptions')
os.makedirs(TRANSCRIPTIONS_DIR, exist_ok=True)

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 2))
WHISPERX_MODEL = str(os.environ.get("WHISPERX_MODEL", "medium"))
COMPUTE_TYPE = str(os.environ.get("COMPUTE_TYPE", "int8" if device == "cpu" else "float16"))
HF_TOKEN = os.environ.get("HF_TOKEN")

# LLM Provider Configuration (ollama or lmstudio)
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama").lower()
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://llama3:11434")
LMSTUDIO_HOST = os.environ.get("LMSTUDIO_HOST", "http://localhost:1234/v1")
LLAMA_MODEL = os.environ.get("LLAMA_MODEL", "llama3:8b")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

if device == "cpu":
    model = whisperx.load_model(WHISPERX_MODEL, device="cpu", compute_type=COMPUTE_TYPE, threads=OMP_NUM_THREADS)
    print(f"--> [INIT] WhisperX loaded on CPU (compute_type={COMPUTE_TYPE}, threads={OMP_NUM_THREADS})", flush=True)
else:
    model = whisperx.load_model(WHISPERX_MODEL, device, compute_type=COMPUTE_TYPE)
    print(f"--> [INIT] WhisperX loaded on GPU ({device}, compute_type={COMPUTE_TYPE})", flush=True)

diarize_pipeline = None

def get_diarization_pipeline():
    """Lazily load the Pyannote Diarization pipeline if HF_TOKEN is provided."""
    global diarize_pipeline
    token = os.environ.get("HF_TOKEN") or HF_TOKEN
    if not token:
        print("ℹ️ [INFO] HF_TOKEN not set. Speaker diarization will be skipped.", flush=True)
        return None
    if diarize_pipeline is None:
        try:
            print(f"--> [INIT] Loading Pyannote diarization pipeline on device={device}...", flush=True)
            diarize_pipeline = DiarizationPipeline(use_auth_token=token, device=device)
            print("--> [INIT] Diarization pipeline initialized successfully", flush=True)
        except Exception as e:
            print(f"⚠️ [WARN] Could not initialize DiarizationPipeline: {str(e)}", flush=True)
            return None
    return diarize_pipeline


@app.route('/config', methods=['GET'])
def get_config():
    """Returns active profile and model configuration."""
    token = os.environ.get("HF_TOKEN") or HF_TOKEN
    is_lmstudio = (LLM_PROVIDER == "lmstudio") or ("1234" in LMSTUDIO_HOST) or ("1234" in OLLAMA_HOST)
    llm_display = f"LM Studio ({LLAMA_MODEL})" if is_lmstudio else LLAMA_MODEL
    return jsonify({
        "profile": PROFILE_NAME,
        "device": device,
        "whisperx_model": WHISPERX_MODEL,
        "compute_type": COMPUTE_TYPE,
        "batch_size": BATCH_SIZE,
        "llama_model": llm_display,
        "llm_provider": "lmstudio" if is_lmstudio else "ollama",
        "threads": OMP_NUM_THREADS,
        "diarization_available": bool(token)
    })


def format_speaker_name(speaker_id):
    """Formats SPEAKER_00 to Speaker 1 for cleaner prompt representation."""
    if not speaker_id:
        return ""
    if speaker_id.startswith("SPEAKER_"):
        try:
            num = int(speaker_id.replace("SPEAKER_", "")) + 1
            return f"Speaker {num}"
        except ValueError:
            return speaker_id
    return speaker_id


def make_summary_prompt(segments):
    """Generate a prompt for Llama 3 to summarize a meeting chronologically."""
    transcript = []
    for i, seg in enumerate(segments, 1):
        start = int(seg['start'])
        end = int(seg['end'])
        m1, s1 = divmod(start, 60)
        m2, s2 = divmod(end, 60)
        speaker = format_speaker_name(seg.get('speaker'))
        speaker_tag = f"[{speaker}]: " if speaker else ""
        transcript.append(f"[{m1:02d}:{s1:02d}–{m2:02d}:{s2:02d}] {speaker_tag}{seg['text']}".strip())
    transcript_str = "\n".join(transcript)

    prompt = (
        "You will receive a text transcript of an audio recording. "
        "The message might be a personal voice note, an interview, or a conversation between multiple people "
        "(speakers may be labeled like [Speaker 1], [Speaker 2], etc.).\n\n"
        "Determine the context of the conversation and write a structured, detailed chronological summary based on the content.\n"
        "When distinct speakers are identified, clearly state who said, proposed, agreed to, or questioned what.\n\n"
        "Focus on key takeaways: what was discussed, decided, assigned as action items, or questioned.\n\n"
        "Be specific about details, ideas, and arguments discussed rather than just high-level themes.\n\n"
        "Always respond in the primary language of the transcript. Do not translate it. If the transcript is in Spanish, answer in Spanish.\n\n"
        "Follow the chronological order of the discussion.\n\n"
        "Write the summary in clean, natural prose, without raw timestamps, tables, or markdown headers.\n\n"
        "Transcript:\n"
        f"{transcript_str}\n\n"
        "Summary:"
    )
    return prompt


def summarize_with_llama3(prompt):
    """Calls Ollama endpoint and returns the response as a string."""
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": LLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    try:
        r = requests.post(url, json=payload, timeout=300)
        r.raise_for_status()
        data = r.json()
        return data['response'].strip()
    except Exception as e:
        print(f"\n❌ [ERROR] Exception during Ollama request: {str(e)}\n", flush=True)
        raise RuntimeError(f"Error calling Ollama: {str(e)}")


def summarize_with_lmstudio(prompt):
    """Calls LM Studio / OpenAI-compatible endpoint."""
    url = f"{LMSTUDIO_HOST.rstrip('/')}/chat/completions"
    payload = {
        "model": LLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a professional assistant that generates detailed, structured chronological summaries of meeting and audio transcripts."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3
    }
    try:
        r = requests.post(url, json=payload, timeout=300)
        r.raise_for_status()
        data = r.json()
        return data['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"\n❌ [ERROR] Exception during LM Studio request: {str(e)}\n", flush=True)
        raise RuntimeError(f"Error calling LM Studio at {url}: {str(e)}")


def summarize_text(prompt):
    """Dispatches to the configured LLM provider (Ollama or LM Studio)."""
    if LLM_PROVIDER == "lmstudio" or "1234" in LMSTUDIO_HOST or "1234" in OLLAMA_HOST:
        return summarize_with_lmstudio(prompt)
    return summarize_with_llama3(prompt)


def sse_message(step, message, progress=0, data=None):
    """Helper to format Server-Sent Event messages."""
    payload = {
        "step": step,
        "message": message,
        "progress": progress
    }
    if data is not None:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"


@app.route('/summarize', methods=['POST'])
def summarize():
    request_start = time.time()
    is_stream = request.args.get("stream", "false").lower() in ("true", "1") or \
                "text/event-stream" in request.headers.get("Accept", "")

    if 'file' not in request.files:
        print("❌ [ERROR] Request missing file part", flush=True)
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        print("❌ [ERROR] Selected file name is empty", flush=True)
        return jsonify({"error": "No selected file"}), 400

    diarization_enabled = request.form.get("diarization", "true").lower() in ("true", "1", "yes")
    min_speakers = request.form.get("min_speakers", None)
    max_speakers = request.form.get("max_speakers", None)
    try:
        min_speakers = int(min_speakers) if min_speakers and str(min_speakers).strip() else None
    except (ValueError, TypeError):
        min_speakers = None
    try:
        max_speakers = int(max_speakers) if max_speakers and str(max_speakers).strip() else None
    except (ValueError, TypeError):
        max_speakers = None

    original_name = file.filename or "upload"
    _, ext = os.path.splitext(original_name.lower())
    if not ext:
        ext = ".bin"

    upload_name = f"upload_{uuid.uuid4().hex}{ext}"
    upload_path = os.path.join(TEMP_FOLDER, upload_name)
    file.save(upload_path)
    file_size_mb = os.path.getsize(upload_path) / (1024 * 1024)

    def process_pipeline():
        video_exts = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".wmv", ".m4v"}
        audio_path_for_whisper = upload_path
        extracted_mp3_path = None

        print("\n" + "="*65, flush=True)
        print(f"📥 [NEW REQUEST] Processing: '{original_name}' ({file_size_mb:.2f} MB)", flush=True)
        print(f"⚙️ [OPTIONS] Diarization: {diarization_enabled} (min={min_speakers}, max={max_speakers})", flush=True)
        print("="*65, flush=True)

        if is_stream:
            yield sse_message("uploaded", f"Loaded '{original_name}' ({file_size_mb:.1f} MB)", 10)

        # 1. Extract audio if video
        if ext in video_exts:
            print(f"🎬 [EXTRACTING AUDIO] Video format detected ({ext}). Extracting to MP3...", flush=True)
            if is_stream:
                yield sse_message("extracting_audio", "Extracting audio track from video with FFmpeg...", 20)

            extracted_mp3_name = f"audio_{uuid.uuid4().hex}.mp3"
            extracted_mp3_path = os.path.join(TEMP_FOLDER, extracted_mp3_name)

            try:
                t_extract_start = time.time()
                extract_audio(input_path=upload_path, output_path=extracted_mp3_path)
                audio_path_for_whisper = extracted_mp3_path
                print(f"✅ [AUDIO EXTRACTED] Completed in {time.time() - t_extract_start:.2f}s", flush=True)
                if is_stream:
                    yield sse_message("audio_extracted", "Audio track successfully extracted", 30)
            except Exception as e:
                print(f"❌ [ERROR] Audio extraction failed: {str(e)}", flush=True)
                try:
                    os.remove(upload_path)
                except:
                    pass
                if is_stream:
                    yield sse_message("error", f"Audio extraction failed: {str(e)}", 0)
                return

        # 2. Transcription with WhisperX
        t_transcribe_start = time.time()
        print(f"🎙️ [TRANSCRIBING] WhisperX {WHISPERX_MODEL} (compute_type={COMPUTE_TYPE}, batch_size={BATCH_SIZE})...", flush=True)
        if is_stream:
            yield sse_message("transcribing", f"Transcribing audio with WhisperX ({WHISPERX_MODEL}, {COMPUTE_TYPE})...", 45)

        try:
            audio = whisperx.load_audio(audio_path_for_whisper)
            result = model.transcribe(audio, batch_size=BATCH_SIZE)
            detected_lang = result.get('language', 'en')
            t_transcribe = time.time() - t_transcribe_start
            print(f"✅ [TRANSCRIBED] Detected language: '{detected_lang}', segments: {len(result.get('segments', []))} in {t_transcribe:.2f}s", flush=True)
            if is_stream:
                yield sse_message("language_detected", f"Detected language: {detected_lang.upper()} ({len(result.get('segments', []))} segments)", 60)
        except Exception as e:
            print(f"❌ [ERROR] Transcription failed: {str(e)}", flush=True)
            if is_stream:
                yield sse_message("error", f"Transcription failed: {str(e)}", 0)
            return

        # 3. Phoneme Alignment (for precise timestamps & diarization alignment)
        print(f"📐 [ALIGNING] Aligning phoneme timestamps for language '{detected_lang}'...", flush=True)
        if is_stream:
            yield sse_message("aligning", f"Aligning word timestamps for language '{detected_lang}'...", 70)

        try:
            align_model, align_metadata = whisperx.load_align_model(language_code=detected_lang, device=device)
            result = whisperx.align(
                result["segments"],
                align_model,
                align_metadata,
                audio,
                device,
                return_char_alignments=False
            )
            print("✅ [ALIGNED] Phoneme alignment completed", flush=True)
        except Exception as e:
            print(f"⚠️ [WARN] Phoneme alignment skipped: {str(e)}", flush=True)

        # 4. Speaker Diarization
        if diarization_enabled:
            speaker_range_info = []
            if min_speakers is not None: speaker_range_info.append(f"min={min_speakers}")
            if max_speakers is not None: speaker_range_info.append(f"max={max_speakers}")
            range_str = f" ({', '.join(speaker_range_info)})" if speaker_range_info else ""

            print(f"👥 [DIARIZATION] Checking speaker identification pipeline{range_str}...", flush=True)
            if is_stream:
                yield sse_message("diarizing", f"Identifying speakers with Pyannote diarization{range_str}...", 80)

            try:
                diarize_pipe = get_diarization_pipeline()
                if diarize_pipe:
                    t_diarize_start = time.time()
                    diarize_segments = diarize_pipe(audio, min_speakers=min_speakers, max_speakers=max_speakers)
                    result = assign_word_speakers(diarize_segments, result)
                    print(f"✅ [DIARIZATION COMPLETED] Finished in {time.time() - t_diarize_start:.2f}s", flush=True)
                else:
                    print("ℹ️ [INFO] Diarization skipped (no HF_TOKEN or pipeline not initialized)", flush=True)
            except Exception as e:
                print(f"⚠️ [WARN] Speaker diarization failed: {str(e)}", flush=True)
        else:
            print("ℹ️ [INFO] Speaker diarization skipped by user option", flush=True)
            if is_stream:
                yield sse_message("diarizing_skipped", "Speaker identification skipped (disabled by user)", 80)

        # Cleanup temporary files
        try:
            os.remove(upload_path)
        except:
            pass
        if extracted_mp3_path:
            try:
                os.remove(extracted_mp3_path)
            except:
                pass

        # Parse segments and extract speakers
        raw_segments = result.get('segments', [])
        segments_output = []
        speakers_set = set()

        for seg in raw_segments:
            spk = seg.get('speaker')
            if spk:
                speakers_set.add(spk)
            segments_output.append({
                "start": seg['start'],
                "end": seg['end'],
                "text": seg['text'],
                "speaker": spk
            })

        print(f"👥 [SPEAKERS DETECTED] Found {len(speakers_set)} speaker(s): {sorted(list(speakers_set))}", flush=True)

        # 5. Summarization with LLM (Ollama or LM Studio)
        is_lmstudio = (LLM_PROVIDER == "lmstudio") or ("1234" in LMSTUDIO_HOST) or ("1234" in OLLAMA_HOST)
        llm_label = f"LM Studio ({LLAMA_MODEL})" if is_lmstudio else f"Ollama ({LLAMA_MODEL})"

        prompt = make_summary_prompt(segments_output)
        print(f"🧠 [SUMMARIZING] Generating chronological summary with {llm_label}...", flush=True)
        if is_stream:
            yield sse_message("summarizing", f"Generating chronological summary with {llm_label}...", 90)

        try:
            t_sum_start = time.time()
            resumen = summarize_text(prompt)
            print(f"✅ [SUMMARY GENERATED] Completed in {time.time() - t_sum_start:.2f}s", flush=True)
        except Exception as e:
            print(f"❌ [ERROR] Summarization failed: {str(e)}", flush=True)
            if is_stream:
                yield sse_message("error", f"Summarization failed: {str(e)}", 0)
            return

        total_time = time.time() - request_start
        transcription_id = f"{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        created_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        # Build initial speaker map (SPEAKER_00 -> Speaker 1)
        speaker_map = {}
        for spk in sorted(list(speakers_set)):
            speaker_map[spk] = format_speaker_name(spk)

        final_response = {
            "id": transcription_id,
            "created_at": created_at,
            "filename": original_name,
            "resumen": resumen,
            "transcription": segments_output,
            "speakers": sorted(list(speakers_set)),
            "speaker_map": speaker_map,
            "detected_language": detected_lang,
            "processing_time_seconds": round(total_time, 2),
            "config": {
                "profile": PROFILE_NAME,
                "whisperx_model": WHISPERX_MODEL,
                "compute_type": COMPUTE_TYPE,
                "llama_model": LLAMA_MODEL,
                "diarization_enabled": diarization_enabled,
                "speakers_detected": len(speakers_set)
            }
        }

        # Save result locally to persistent JSON storage
        json_path = os.path.join(TRANSCRIPTIONS_DIR, f"{transcription_id}.json")
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(final_response, f, ensure_ascii=False, indent=2)
            print(f"💾 [SAVED] Transcription saved to '{json_path}'", flush=True)
        except Exception as e:
            print(f"⚠️ [WARN] Could not save transcription JSON: {str(e)}", flush=True)

        print("\n📍 Summary Generated:")
        print(resumen, flush=True)
        print(f"\n🎉 [PIPELINE COMPLETED] Total processing time: {total_time:.2f}s", flush=True)
        print("="*65 + "\n", flush=True)

        if is_stream:
            yield sse_message("completed", "Processing completed successfully!", 100, data=final_response)
        else:
            yield final_response

    if is_stream:
        return Response(stream_with_context(process_pipeline()), mimetype='text/event-stream')
    else:
        # Non-streaming response: run pipeline generator to the end
        gen = process_pipeline()
        result_data = None
        for item in gen:
            result_data = item
        if result_data:
            return jsonify(result_data)
        return jsonify({"error": "Processing failed"}), 500


@app.route('/transcriptions', methods=['GET'])
def list_transcriptions():
    """List all saved transcriptions metadata sorted newest first."""
    items = []
    if os.path.exists(TRANSCRIPTIONS_DIR):
        for fname in os.listdir(TRANSCRIPTIONS_DIR):
            if fname.endswith('.json'):
                fpath = os.path.join(TRANSCRIPTIONS_DIR, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    tid = data.get("id", os.path.splitext(fname)[0])
                    res_text = data.get("resumen", "")
                    snippet = (res_text[:180] + "...") if len(res_text) > 180 else res_text
                    items.append({
                        "id": tid,
                        "created_at": data.get("created_at", ""),
                        "filename": data.get("filename", "audio"),
                        "detected_language": data.get("detected_language", "en"),
                        "processing_time_seconds": data.get("processing_time_seconds", 0),
                        "speakers_count": len(data.get("speakers", [])),
                        "speaker_map": data.get("speaker_map", {}),
                        "diarization_enabled": data.get("config", {}).get("diarization_enabled", len(data.get("speakers", [])) > 0),
                        "summary_snippet": snippet,
                        "segments_count": len(data.get("transcription", []))
                    })
                except Exception as e:
                    print(f"⚠️ [WARN] Error reading {fpath}: {str(e)}", flush=True)
    
    items.sort(key=lambda x: x.get("created_at") or x.get("id"), reverse=True)
    return jsonify(items)


@app.route('/transcriptions/<transcription_id>', methods=['GET'])
def get_transcription(transcription_id):
    """Get full transcription data by ID."""
    safe_id = os.path.basename(transcription_id)
    fpath = os.path.join(TRANSCRIPTIONS_DIR, f"{safe_id}.json")
    if not os.path.exists(fpath):
        return jsonify({"error": "Transcription not found"}), 404
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/transcriptions/<transcription_id>/speakers', methods=['PATCH'])
def update_speakers(transcription_id):
    """Update speaker names mapping for a transcription."""
    safe_id = os.path.basename(transcription_id)
    fpath = os.path.join(TRANSCRIPTIONS_DIR, f"{safe_id}.json")
    if not os.path.exists(fpath):
        return jsonify({"error": "Transcription not found"}), 404
    
    req_data = request.get_json(silent=True) or {}
    new_speaker_map = req_data.get("speaker_map", {})
    if not isinstance(new_speaker_map, dict):
        return jsonify({"error": "speaker_map must be a dictionary"}), 400

    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        existing_map = data.get("speaker_map", {})
        existing_map.update(new_speaker_map)
        data["speaker_map"] = existing_map

        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"👥 [SPEAKERS UPDATED] Updated speaker names for '{safe_id}': {new_speaker_map}", flush=True)
        return jsonify({"success": True, "speaker_map": existing_map, "id": safe_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/transcriptions/<transcription_id>', methods=['DELETE'])
def delete_transcription(transcription_id):
    """Delete a transcription by ID."""
    safe_id = os.path.basename(transcription_id)
    fpath = os.path.join(TRANSCRIPTIONS_DIR, f"{safe_id}.json")
    if os.path.exists(fpath):
        try:
            os.remove(fpath)
            print(f"🗑️ [DELETED] Deleted transcription '{safe_id}'", flush=True)
            return jsonify({"success": True, "id": safe_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Transcription not found"}), 404


@app.route('/health', methods=['GET'])
def health():
    return "ok", 200


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
