# Speech2Brief - Transcriber & Chronological Summarizer

Turn any audio or video recording—from team meetings and conferences to WhatsApp voice notes—into accurate, speaker-identified transcripts and structured chronological summaries, running **100% locally on your own machine**.

Speech2Brief combines the high-speed neural speech recognition and phoneme alignment of [WhisperX](https://github.com/m-bain/whisperx) with speaker diarization via [PyAnnote](https://github.com/pyannote/pyannote-audio) and local LLM summarization powered by [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.com).

![Speech2Brief frontend](/utils/frontend.png "Speech2Brief UI")

---

## 💡 Key Features

* 🔒 **100% Local & Private**: All audio processing, transcription, and LLM inference run strictly on your machine. No cloud APIs, no external telemetry.
* ⚡ **High-Speed Execution**: Powered by CTranslate2 int8 quantization and optional Apple Metal GPU or NVIDIA CUDA acceleration.
* 👥 **Speaker Identification (Diarization)**: Automatically distinguishes between different speakers (e.g. `SPEAKER_00`, `SPEAKER_01`) and allows you to rename them interactively.
* 📝 **Chronological Summaries**: Generates structured, time-anchored meeting notes highlighting key discussion points, decisions, and action items.
* 🎬 **Audio & Video Support**: Accepts `.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.mkv`, `.ogg`, `.opus`, and WhatsApp voice notes up to **1GB**.
* 🌐 **Modern Web Interface**: Built with React 18, Vite, Tailwind CSS, and shadcn/ui with live Server-Sent Events (SSE) progress tracking and persistent history.

---

## 🎯 How to Use Speech2Brief

### 1. Open the Web Application
Once launched (see deployment options below), navigate to:
👉 **`http://localhost:8081`**

### 2. Upload Your Audio or Video
Drag and drop your file into the upload zone or click to select from your file manager (supports files up to **1GB**).

### 3. Configure Processing Options
* **Fast Mode (Disable Diarization)**: Transcribes the entire file ~5x faster. Ideal when speaker identification is not needed or for single-speaker audio.
* **Speaker Diarization**: When enabled, PyAnnote segments audio by speaker. You can set minimum and maximum expected speakers to improve clustering accuracy.
* **AI Chronological Summary (Optional)**: Toggle local LLM summarization on or off. Disabling summarization runs in **Transcription Only** mode to finish much faster without querying the LLM.
* **Custom LLM Model**: When summary is enabled, select or specify your preferred local model (e.g. `llama3.2:3b`, `meta-llama-3-8b-instruct`, `mistral`, etc.).

### 4. Live Progress Tracking
Follow real-time progress as the pipeline executes:
`Uploaded` ➔ `Audio Extraction` (for video) ➔ `WhisperX Transcription` ➔ `Phoneme Alignment` ➔ `Speaker Diarization` ➔ `LLM Chronological Summarization`.

### 5. Review, Edit & Export
* **Rename Speakers**: Click on any speaker badge to assign real names (e.g. `Alice`, `Bob`). Changes instantly propagate across the transcript and save to disk.
* **Search & Copy**: Search keywords in the transcript or copy the generated summary with one click.
* **History**: Access the sidebar drawer to revisit or delete past transcription sessions stored in `transcriptions/`.

---

## 🚀 Deployment Profiles

Speech2Brief provides pre-configured profiles tailored for different hardware configurations:

| Profile | Target Hardware | WhisperX Model | LLM Model & Engine | Backend Port | Performance Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`hybrid`** ⭐ *(Recommended)* | **macOS Apple Silicon (M1–M5)** | `medium` (Native CPU) | **LM Studio Metal GPU** (`1234`) | `5050` *(Native)* | 🚀 **Highest (Metal GPU)** |
| **`cpu-apple-silicon`** | macOS Apple Silicon in Docker | `medium` / `int8` (8 threads) | `llama3.2:3b` (Ollama Docker) | `5050` | ⚡ Fast (100% Docker) |
| **`cpu`** | Generic x86_64 / ARM CPU | `small` / `int8` | `llama3.2:1b` (Ollama Docker) | `5050` | 💻 Lightweight / Laptops |
| **`basic`** | NVIDIA GPU (4–6 GB VRAM) | `small` / `float16` | `llama3:8b` (Ollama Docker) | `5000` | 🎮 Entry GPU |
| **`medium`** | NVIDIA GPU (6–8 GB VRAM) | `medium` / `float16` (batch 4) | `llama3:8b` (Ollama Docker) | `5000` | 🖥️ Workstation GPU |
| **`large`** | NVIDIA GPU (≥ 8 GB VRAM) | `medium` / `float16` (batch 8) | `llama3:8b` (Ollama Docker) | `5000` | 🏢 High-throughput Server |

---

## ⚡ Option 1: Hybrid Mode (macOS Apple Silicon — Most Optimized)

> [!TIP]
> **Why Hybrid Mode is the fastest on Mac**: Docker on macOS runs inside a Linux virtual machine without Apple Metal GPU pass-through. In Hybrid mode, the backend runs natively on macOS with direct access to physical M-cores and unified memory, while summarization runs on **LM Studio with native Metal GPU acceleration** (~30–60+ tokens/sec).

### Setup & Launch
1. Download and start [LM Studio](https://lmstudio.ai/).
2. Load any model (e.g. `meta-llama-3-8b-instruct`, `mistral-7b`, or `gemma-2-9b`) and click **Start Server** on port `1234`.
3. In the repository root, run:
   ```bash
   ./run_hybrid_mac.sh
   ```

The script automatically sets up the Python virtual environment, verifies dependencies, starts the frontend container at `http://localhost:8081`, and launches the native backend at `http://localhost:5050`.

---

## 🐳 Option 2: Docker Compose (All Platforms)

Run everything inside Docker containers without installing Python or local AI tools on your host:

### macOS Apple Silicon (100% Docker)
```bash
docker compose -f docker/docker-compose.yml --profile cpu-apple-silicon --project-name speech2brief up --build -d
```

### Generic CPU (Laptops / Systems without GPU)
```bash
docker compose -f docker/docker-compose.yml --profile cpu --project-name speech2brief up --build -d
```

### NVIDIA GPU Systems
```bash
# Basic (Entry GPU):
docker compose -f docker/docker-compose.yml --profile basic --project-name speech2brief up --build -d

# Medium (Workstation GPU):
docker compose -f docker/docker-compose.yml --profile medium --project-name speech2brief up --build -d

# Large (High-VRAM GPU Server):
docker compose -f docker/docker-compose.yml --profile large --project-name speech2brief up --build -d
```

Open **`http://localhost:8081`** in your browser.

> [!NOTE]
> On macOS, port `5000` is reserved for AirPlay Receiver (`ControlCenter`). The `hybrid`, `cpu-apple-silicon`, and `cpu` profiles map to port **`5050`** automatically.

---

## 🔑 Speaker Diarization Setup (Hugging Face)

Speaker diarization uses PyAnnote 3.1, which requires accepting user conditions on Hugging Face:
1. Accept the conditions for [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) and [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0).
2. Create a Hugging Face user token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
3. Add your token in `.env`:
   ```ini
   HF_TOKEN=hf_yourTokenHere
   ```
*(If omitted, Speech2Brief will automatically run in single-speaker Fast Mode without error).*

---

## 🌐 HTTP API Reference

The backend exposes a REST and Server-Sent Events (SSE) API at `http://localhost:5050` (or `http://localhost:5000` on GPU profiles):

### Transcribe & Summarize
```bash
# Fast mode (no diarization)
curl -X POST \
  -F "file=@meeting.mp3" \
  -F "diarization=false" \
  http://localhost:5050/summarize

# Transcription only (skip LLM summary)
curl -X POST \
  -F "file=@meeting.mp3" \
  -F "summarization=false" \
  http://localhost:5050/summarize

# With diarization and speaker bounds (real-time SSE stream)
curl -N -X POST \
  -F "file=@meeting.mp3" \
  -F "diarization=true" \
  -F "min_speakers=2" \
  -F "max_speakers=5" \
  "http://localhost:5050/summarize?stream=true"
```

### History Management
* `GET /transcriptions` — List all saved transcription sessions.
* `GET /transcriptions/<id>` — Retrieve full details, segments, speaker map, and summary for a session.
* `PATCH /transcriptions/<id>/speakers` — Update speaker names mapping.
* `DELETE /transcriptions/<id>` — Delete a saved transcription file.
* `GET /config` — Probe active profile, models loaded, and hardware settings.

---

## 💬 Optional Telegram Bot Microservice

To transcribe voice notes directly from Telegram:
```bash
docker build -f docker/telegram-bot/Dockerfile -t telegram-bot:latest docker/telegram-bot
docker run -d \
  --name speech2brief-telegram-bot \
  --network speech2brief_default \
  --label com.docker.compose.project=speech2brief \
  -e TELEGRAM_BOT_TOKEN=your_telegram_bot_token \
  -e PROFILE=cpu-apple-silicon \
  telegram-bot:latest
```

---

## 📖 Additional Documentation
* For native CUDA installation on Windows or Linux, see **[INSTALL.md](file:///Users/id05376/Documents/code/Speech2Brief/INSTALL.md)**.
* For internal architectural specs and developer runbooks, see **[AGENTS.md](file:///Users/id05376/Documents/code/Speech2Brief/AGENTS.md)**.
