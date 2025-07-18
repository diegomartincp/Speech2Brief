
# speech2brief - Transcriber & Chronological Summarizer 
Speech2Brief is a powerful and efficient HTTP API for automatically converting speech into structured, chronological meeting notes. It combines the speed of [WhisperX](https://github.com/m-bain/whisperx) neural ASR (automatic speech recognition) system optimized for fast and accurate transcription—with the summarization capabilities of large language models (LLMs) served locally using [Ollama](https://ollama.com).

## 🔍 What it does
- ⏱️ A precisely segmented transcription, time-aligned, using WhisperX on CPU or GPU
- ✍️ A chronologically structured summary, written by a locally served Llama 3 model
- 💡 All processed with minimum latency and no external dependencies

## 🧠 Built on advanced AI models
- ✅ **WhisperX** (based on OpenAI's Whisper neural model) delivers fast speech recognition with time alignment and multilingual capabilities.
- ✅ **Llama 3** (via Ollama) generates context-aware, concise summaries from transcripts, leveraging state-of-the-art LLMs running locally.

## 🚀 Why Speech2Brief?
- ⚡ **High speed:** Full transcription and summarization happen in seconds, thanks to optimized GPU or CPU execution.
- 💬 **Chronological structure:** Summaries retain the order of discussion, decisions, and speaker intent.
- 🔒 **100% local:** No external APIs. All inference runs inside your environment—with your hardware, your data.
- 🔧 **Flexible deployment:** Easily switch between CPU-only, GPU, and high-resource modes with Docker profiles.

## Requirements for GPU usage
- **NVIDIA GPU** with the required VRAM for your chosen profile
- Latest **NVIDIA drivers** installed on the host system

## Local installation
Instructions for installing and running the project locally (without Docker) are provided in [INSTALL.md](INSTALL.md).


### Dockerized installation (recommended)
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
  docker compose -f docker/docker-compose.yml --profile small --project-name speech2brief up --build -d
```

This project can be run entirely via Docker and Docker Compose to streamline GPU usage, model management, and service orchestration. The Compose setup offers three profiles, each tailored to different system resources and performance needs.

| Profile  | WhisperX Model  | Llama 3 Model | Batch Size |  Intended Usage |
| :------------ |:---------------| :---------------|:---------------|:-----|
| cpu     | small | llama3.2:1b | 1 | Laptops/entry-level PCs with NO GPU |
| basic     | small | llama3:8b | 2 | Entry-level PCs with GPU |
| medium     | medium | llama3:8b | 4 | Powerful desktops/workstations with GPU |
| large | medium | llama3:8b | 8 | Servers/high-throughput environments with GPU |

### Details
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

## API endpoint `POST /summarize`

### Send a request to the endpoint:
Example using curl:

```curl
curl -F "file=@yourmeeting.mp3" http://localhost:5000/summarize
```

### Request
multipart/form-data:
  - file: The audio file to be transcribed and summarized (required).

### Response (example)

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