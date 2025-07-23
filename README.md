# Speech2Brief - Transcriber & Chronological Summarizer 
I'm excited to announce Speech2Brief v1.0.0, the first stable release of our automatic meeting/audio summarization API & bot!
Turn any audio—from business meetings to WhatsApp voice notes—into clear, chronological summaries, all with your own hardware and total privacy.

Speech2Brief is a powerful, self-hosted and efficient HTTP API for automatically converting speech into structured, chronological meeting notes. It combines the speed of [WhisperX](https://github.com/m-bain/whisperx) neural ASR (automatic speech recognition) system optimized for fast and accurate transcription—with the summarization capabilities of large language models (LLMs) served locally using [Ollama](https://ollama.com).

- [🧠 Built on advanced AI models](#-built-on-advanced-ai-models)
- [💡 Key Features](#-key-features)
- [🛠️ What is Included](#-what-is-included)
- [🤔 Why Speech2Brief?](#-why-speech2brief)
- [⚡ Requirements for GPU usage](#-requirements-for-gpu-usage)
- [🖥️ Local installation](#-local-installation)
   * [⚙️ Manual installation (Not recommended)](#-manual-installation-not-recommended)
   * [⚙️ Dockerized installation (Recommended)](#-dockerized-installation-recommended)
   * [💬 Deploy Telegram Bot (optional)](#-deploy-telegram-bot-optional)
   * [📑 Details](#-details)
- [🌐 API endpoint `POST /summarize`](#-api-endpoint-post-summarize)
   * [🌐 Send a request to the endpoint:](#-send-a-request-to-the-endpoint)
   * [🌐 Request](#request)
   * [🌐 Response (example)](#-response-example)

## 🧠 Built on advanced AI models
- ✅ **WhisperX** (based on OpenAI's Whisper neural model) delivers fast speech recognition with time alignment and multilingual capabilities.
- ✅ **Llama 3** (via Ollama) generates context-aware, concise summaries from transcripts, leveraging state-of-the-art LLMs running locally.

## 💡 Key Features
- 100% Local Processing: All transcription and summarization runs on your own hardware. No data ever leaves your machine.
- High-speed transcription & summarization: Processes audio in seconds
- Chronological structure: Captures discussion flow, agreements, and major decisions
- Telegram Bot Integration: Interact with Speech2Brief from any device—send a voice message or audio file to the Telegram bot and receive back a structured summary instantly.
- Multi-Language: Accurately transcribes and summarizes input in the original language of the audio, supporting meetings, interviews, and personal voice notes.
- Broad Audio Support: Works with standard audio file formats such as .mp3, .wav, .ogg, .opus, as well as voice messages from apps like WhatsApp and Telegram. (Yes, also works with Whatsapp audio message files)
- Docker & Local Installation: Flexible deployment options—choose between quick Docker Compose profiles (for GPU or CPU) or native installation. 

## 🛠️ What is Included
- Full HTTP API for fast speech-to-summary processing
- Accurate, segmented transcriptions via WhisperX (supports CPU and GPU, multi-language)
- Chronological, clean summaries powered by locally run Llama 3 models (Ollama backend)
- Supports any audio source: meetings, interviews, or personal voice notes (e.g., WhatsApp audios)
- Multiple deployment profiles: cpu, basic, medium, large—optimizing for any machine
- 100% local inference: your data never leaves your environment
- Easy integration with Telegram bot (optional microservice)

## 🤔 Why Speech2Brief?
- ⚡ **High speed:** Full transcription and summarization happen in seconds, thanks to optimized GPU or CPU execution.
- 💬 **Chronological structure:** Summaries retain the order of discussion, decisions, and speaker intent.
- 🔒 **100% local:** No external APIs. All inference runs inside your environment—with your hardware, your data.
- 🔧 **Flexible deployment:** Easily switch between CPU-only, GPU, and high-resource modes with Docker profiles.

## ⚡ Requirements for GPU usage
- **NVIDIA GPU** with the required VRAM for your chosen profile
- Latest **NVIDIA drivers** installed on the host system

## 🖥️ Local installation
### ⚙️ Manual installation (Not recommended)
Instructions for installing and running the project locally (without Docker) are provided in [INSTALL.md](INSTALL.md).


### ⚙️ Dockerized installation (Recommended)
```bash
docker compose -f docker/docker-compose.yml --profile cpu --project-name speech2brief up --build -d
```
or
```bash
docker compose -f docker/docker-compose.yml --profile large --project-name speech2brief up --build -d
```
or
```bash
docker compose -f docker/docker-compose.yml --profile medium --project-name speech2brief up --build -d
```
or
```bash
docker compose -f docker/docker-compose.yml --profile basic --project-name speech2brief up --build -d
```
### 💬 Deploy Telegram Bot (optional)
```bash
docker build -f docker/telegram-bot/Dockerfile -t telegram-bot:latest docker/telegram-bot

```
and then
```bash
docker run -d \
  --name speech2brief-telegram-bot \
  --network speech2brief_default \
  --label com.docker.compose.project=speech2brief \
  -e TELEGRAM_BOT_TOKEN=your_real_token \
  -e PROFILE=cpu \
  telegram-bot:latest
```
Profile should be one of the following:
- cpu
- basic
- medium
- large

This project can be run entirely via Docker and Docker Compose to streamline GPU usage, model management, and service orchestration. The Compose setup offers three profiles, each tailored to different system resources and performance needs.

| Profile  | WhisperX Model  | Llama 3 Model | Batch Size |  Intended Usage |
| :------------ |:---------------| :---------------|:---------------|:-----|
| cpu     | small | llama3.2:1b | 1 | Laptops/entry-level PCs with NO GPU |
| basic     | small | llama3:8b | 2 | Entry-level PCs with GPU |
| medium     | medium | llama3:8b | 4 | Powerful desktops/workstations with GPU |
| large | medium | llama3:8b | 8 | Servers/high-throughput environments with GPU |

### 📑 Details
**cpu**
- Slow transcription (WhisperX small model).
- Efficient batch size (2).
- llama3.2:1b, very lightweight model for quick results using CPU only.
- Suitable for laptops and less powerful PCs with no GPU.

**basic**
- Fast, lightweight transcription (WhisperX small model).
-  Efficient batch size (2).
- Llama 3 8B, ideal for quick summaries.
- Suitable for laptops and less powerful GPUs.

**medium**
- High-accuracy transcription (WhisperX medium model).
- Balanced batch size (4) for increased performance.
- For powerful desktops and most workstations.

**large**
- Maximum throughput (batch size 8) and WhisperX medium.
- Llama 3 8B, ultra-fast.
- Designed for GPU servers with 8 or more VRAM GB.

## 🌐 API endpoint `POST /summarize`

### 🌐 Send a request to the endpoint:
Example using curl:

```curl
curl -F "file=@yourmeeting.mp3" http://localhost:5000/summarize
```

### 🌐 Request
multipart/form-data:
  - file: The audio file to be transcribed and summarized (required).

### 🌐 Response (example)

```javascript
{
  "processing_time_seconds": 6.04,
  "resumen": "Chronological summary of the meeting: ...",
  "transcription": [
    {
      "start": 7.118,
      "end": 28.55,
      "text": "A person is not just tired, but exhausted. ..."
    },
    {
      "start": 32.515,
      "end": 62.367,
      "text": "Communication. No, to court women. Today we'll talk about William Shakespeare. ..."
    }
    // ...more transcript segments...
  ]
}`
```
