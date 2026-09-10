# Speech2Brief - AI Assistant & Developer Context (`AGENTS.md`)

This document serves as the comprehensive architectural reference, runbook, and testing cheat sheet for AI assistants (Antigravity, Claude, Cursor, Copilot, etc.) and human developers working on **Speech2Brief**.

---

## 1. Project Overview & Architecture

**Speech2Brief** transforms audio and video recordings into speaker-identified transcripts and structured chronological summaries using 100% locally running AI models.

### Core Stack
* **Resumer Backend (`app.py`)**: Python 3.10 Flask API orchestrating audio extraction (FFmpeg), speech recognition (WhisperX via CTranslate2), phoneme alignment, speaker diarization (PyAnnote 3.1 via PyTorch), and Ollama API calls.
* **LLM Engine (`docker/llama3/`)**: Local Ollama container serving `llama3:8b` (or `llama3.2:1b` for lightweight CPU).
* **Frontend (`docker/front-end/`)**: Modern Single Page Application built with React 18, Vite, TypeScript, Tailwind CSS, and shadcn/ui.
* **Orchestration (`docker/docker-compose.yml`)**: Multi-profile Docker Compose environment (`speech2brief`).
* **Persistence (`transcriptions/`)**: Host-mounted local JSON directory saving all transcription records, metadata, speaker mappings, and summaries.

---

## 2. Docker Compose Deployment Profiles

All containers run under the Docker Compose project name `speech2brief`.

| Profile | Target Architecture | Backend Port (Host:Container) | Frontend Port | WhisperX Model / Compute | LLM Model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`hybrid`** | **macOS Apple Silicon (Native + LM Studio)** | **`5050`** *(Native Mac CPU)* | **`8081:80`** | `medium` / `int8` (Native Mac M-cores) | **LM Studio Metal GPU** (`1234`) |
| **`cpu-apple-silicon`** | **macOS Apple Silicon (M1–M5 in Docker)** | **`5050:5000`** *(Avoids AirPlay)* | **`8081:80`** | `medium` / `int8` (8 CPU threads) | `llama3.2:3b` (Ollama) |
| **`cpu`** | Generic x86_64 / ARM CPU | `5050:5000` | `8081:80` | `small` / `int8` | `llama3.2:1b` (Ollama) |
| **`basic`** | NVIDIA GPU (entry/laptop) | `5000:5000` | `8081:80` | `small` / `float16` | `llama3:8b` (Ollama) |
| **`medium`** | NVIDIA GPU (workstation) | `5000:5000` | `8081:80` | `medium` / `float16` | `llama3:8b` (Ollama) |
| **`large`** | NVIDIA GPU (high VRAM) | `5000:5000` | `8081:80` | `medium` / `float16` (batch=8) | `llama3:8b` (Ollama) |

### 2.1 Starting the Hybrid Profile (macOS Apple Silicon + LM Studio)
The **Hybrid Profile** provides maximum Apple Silicon performance:
1. **Frontend**: Runs in lightweight Docker Nginx container at `http://localhost:8081`.
2. **Backend**: Runs natively in Python on macOS at `http://localhost:5050` with direct access to all physical CPU cores and Unified Memory bandwidth (no Docker virtualization penalty).
3. **LLM Engine**: Offloads summarization to **LM Studio** at `http://localhost:1234/v1` running with Apple Metal GPU acceleration.

To configure and launch in one command:
```bash
./run_hybrid_mac.sh
```
The script automatically:
* Verifies `ffmpeg` and Python 3.11 via Homebrew (installs them if missing).
* Creates `.venv` and installs dependencies from `requirements.txt`.
* Probes LM Studio connectivity on port `1234`.
* Stops any conflicting Docker backend containers to release port `5050`.
* Spins up the frontend Docker container (`speech2brief-frontend-hybrid`) on port `8081`.
* Launches `python app.py` on port `5050` bound to all physical CPU cores.

### 2.2 Starting the Standard Docker Stack (Example: cpu-apple-silicon)
```bash
# In repo root:
docker compose --profile cpu-apple-silicon -f docker/docker-compose.yml up -d
```

### Stopping / Rebuilding Specific Services
```bash
# Rebuild frontend only:
docker compose --profile cpu-apple-silicon -f docker/docker-compose.yml build frontend-cpu-apple-silicon
docker rm -f speech2brief-frontend-cpu-apple-silicon
docker compose --profile cpu-apple-silicon -f docker/docker-compose.yml up -d --no-deps frontend-cpu-apple-silicon

# Rebuild resumer backend only:
docker compose --profile cpu-apple-silicon -f docker/docker-compose.yml build resumer-cpu-apple-silicon
docker rm -f speech2brief-resumer-cpu-apple-silicon
docker compose --profile cpu-apple-silicon -f docker/docker-compose.yml up -d --no-deps resumer-cpu-apple-silicon
```

---

## 3. Environment Variables & Secrets

Environment variables are loaded from `.env` in the project root:

```ini
# Hugging Face Token (required for Pyannote speaker diarization)
HF_TOKEN=hf_yourTokenHere

# LLM Provider Configuration (Optional, defaults to "ollama" in Docker, "lmstudio" in hybrid script)
LLM_PROVIDER=lmstudio
LMSTUDIO_HOST=http://localhost:1234/v1
LMSTUDIO_MODEL=llama3:8b
LLAMA_MODEL=llama3:8b
PORT=5050
```

* **`HF_TOKEN`**: A Hugging Face access token that has accepted the user terms on HuggingFace Hub for:
  1. `pyannote/speaker-diarization-3.1`
  2. `pyannote/segmentation-3.0`
  *If `HF_TOKEN` is missing, the backend automatically skips speaker identification and runs in single-speaker mode.*
* **`OMP_NUM_THREADS`**: Controls PyTorch intra-op threads on CPU (defaults to `8` in `cpu-apple-silicon`).
* **`PROFILE_NAME`**: Set to `cpu-apple-silicon`, `cpu`, `basic`, etc. for UI auto-detection.

---

## 4. API Endpoints Reference & Testing Commands

Assuming the backend is listening at `http://localhost:5050` (or `http://localhost:5000` on GPU profiles):

### 4.1 System & Health

#### `GET /health`
* **Purpose**: Basic health probe.
* **Curl**:
  ```bash
  curl -s http://localhost:5050/health
  ```
* **Response**: `ok` (HTTP 200)

#### `GET /config`
* **Purpose**: Returns active deployment profile, loaded models, hardware allocation, and Hugging Face availability.
* **Curl**:
  ```bash
  curl -s http://localhost:5050/config
  ```
* **Sample Response**:
  ```json
  {
    "batch_size": 4,
    "compute_type": "int8",
    "device": "cpu",
    "diarization_available": true,
    "llama_model": "llama3:8b",
    "profile": "cpu-apple-silicon",
    "threads": 8,
    "whisperx_model": "medium"
  }
  ```

---

### 4.2 Transcription & Summarization Pipeline

#### `POST /summarize?stream=true`
* **Purpose**: Uploads media file, extracts audio, transcribes, aligns phonemes, performs optional diarization, generates chronological summary, and saves JSON record.
* **Form Parameters**:
  * `file` (Required): Audio or video binary file up to 1GB (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.mkv`, etc.).
  * `language` (Optional, string): Force language code (e.g. `es`, `en`, `fr`, `de`, `ca`). Skips auto-detection to prevent hallucinations on noisy audio. Default: auto-detect.
  * `diarization` (Optional, default `true`): Set to `false` for **Fast Mode** (~5x faster, skips PyAnnote clustering).
  * `summarization` (Optional, default `true`): Set to `false` for **Transcription Only Mode** (skips LLM summary generation).
  * `min_speakers` (Optional, integer): Minimum expected speakers (e.g. `1`).
  * `max_speakers` (Optional, integer): Maximum expected speakers (e.g. `6`).
* **Curl (Forced Language + Fast Mode)**:
  ```bash
  curl -s -X POST \
    -F "file=@utils/el-cub-de-los-poetas-muertos.mp3" \
    -F "language=es" \
    -F "diarization=false" \
    "http://localhost:5050/summarize?stream=true"
  ```
* **Curl (Transcription Only, no LLM summary)**:
  ```bash
  curl -s -X POST \
    -F "file=@utils/el-cub-de-los-poetas-muertos.mp3" \
    -F "summarization=false" \
    "http://localhost:5050/summarize?stream=true"
  ```
* **Curl (With Diarization & Speaker Bounds)**:
  ```bash
  curl -s -X POST \
    -F "file=@utils/el-cub-de-los-poetas-muertos.mp3" \
    -F "diarization=true" \
    -F "min_speakers=2" \
    -F "max_speakers=5" \
    "http://localhost:5050/summarize?stream=true"
  ```
* **Server-Sent Events (SSE) Sequence**:
  1. `{"step": "uploaded", "message": "Loaded 'file.mp3' (X MB)", "progress": 10}`
  2. `{"step": "extracting_audio", "message": "Extracting audio...", "progress": 20}` *(if video)*
  3. `{"step": "audio_extracted", "message": "Audio extracted", "progress": 30}` *(if video)*
  4. `{"step": "transcribing", "message": "Transcribing with WhisperX...", "progress": 45}`
  5. `{"step": "language_detected", "message": "Detected language: ES (N segments)", "progress": 60}`
  6. `{"step": "aligning", "message": "Aligning word timestamps...", "progress": 70}`
  7. `{"step": "diarizing", "message": "Identifying speakers...", "progress": 80}` *(or `diarizing_skipped`)*
  8. `{"step": "summarizing", "message": "Generating chronological summary...", "progress": 90}` *(or `summarizing_skipped`)*
  9. `{"step": "completed", "message": "Processing completed successfully!", "progress": 100, "data": { ... }}`

---

### 4.3 History & Local JSON Persistence

#### `GET /transcriptions`
* **Purpose**: List all saved past transcriptions (sorted newest first).
* **Curl**:
  ```bash
  curl -s http://localhost:5050/transcriptions
  ```
* **Sample Response**:
  ```json
  [
    {
      "id": "20260908_112115_d4de5a",
      "created_at": "2026-09-08T11:21:15Z",
      "filename": "el-cub-de-los-poetas-muertos.mp3",
      "detected_language": "es",
      "diarization_enabled": false,
      "processing_time_seconds": 187.04,
      "segments_count": 56,
      "speakers_count": 0,
      "speaker_map": {},
      "summary_snippet": "The conversation appears to be a discussion..."
    }
  ]
  ```

#### `GET /transcriptions/<id>`
* **Purpose**: Retrieve full JSON payload for a single session (includes transcript segments, speaker map, summary, and configuration).
* **Curl**:
  ```bash
  curl -s http://localhost:5050/transcriptions/20260908_112115_d4de5a
  ```

#### `PATCH /transcriptions/<id>/speakers`
* **Purpose**: Updates speaker name mapping for a past or active transcript and persists to disk.
* **Curl**:
  ```bash
  curl -s -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"speaker_map": {"SPEAKER_00": "Profesor Keating", "SPEAKER_01": "Todd Anderson"}}' \
    http://localhost:5050/transcriptions/20260908_112115_d4de5a/speakers
  ```
* **Sample Response**:
  ```json
  {
    "id": "20260908_112115_d4de5a",
    "speaker_map": {
      "SPEAKER_00": "Profesor Keating",
      "SPEAKER_01": "Todd Anderson"
    },
    "success": true
  }
  ```

#### `DELETE /transcriptions/<id>`
* **Purpose**: Permanently deletes a saved transcription file from `transcriptions/<id>.json`.
* **Curl**:
  ```bash
  curl -s -X DELETE http://localhost:5050/transcriptions/20260908_112115_d4de5a
  ```
* **Sample Response**:
  ```json
  {"id": "20260908_112115_d4de5a", "success": true}
  ```

---

## 5. Critical Technical Gotchas & Conventions

1. **macOS Port 5000 Conflict**:
   * macOS Monterey, Ventura, Sonoma, and Sequoia reserve port `5000` for **AirPlay Receiver (`ControlCenter`)**.
   * Therefore, the `cpu-apple-silicon` profile maps container port 5000 to host port **`5050:5000`**. The Vite frontend connects to `http://localhost:5050`.
2. **PyAnnote / Hugging Face Hub Patch**:
   * `huggingface_hub` >= 0.26 deprecated the keyword `use_auth_token` in favor of `token`.
   * `app.py` includes a monkey-patch on `huggingface_hub.hf_hub_download` to map `use_auth_token` to `token` dynamically so `Pyannote.audio` pipelines initialize without crashing.
3. **Flask Reloader / Speechbrain Conflict**:
   * Werkzeug's file-watcher reloader with `debug=True` scans imported modules and crashes on unhandled lazy imports inside speechbrain (`speechbrain.integrations.k2_fsa`).
   * `app.py` must run with `debug=False`.
4. **PyTorch OpenMP Threading on CPU**:
   * To prevent thread thrashing and maximize Docker VM CPU usage on Apple Silicon, `OMP_NUM_THREADS=8` is paired with `torch.set_num_threads(8)` at the start of `app.py`.
5. **Diarization vs ASR Performance**:
   * WhisperX transcription uses CTranslate2 with `int8` quantization, running at **~4x-6x faster than real-time**.
   * PyAnnote diarization runs float32 neural clustering on CPU and takes **~0.8x-1x of real-time audio length** (~20-25 min for a 30 min audio). Always advise users to disable diarization for single-speaker audio when speed matters.
6. **Strict English Logging & UI Rule**:
   * All server terminal logs (`print(..., flush=True)`) and UI error/status messages must remain in **English**.
