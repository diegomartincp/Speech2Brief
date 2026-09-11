# Installation & Deployment Guide

This guide covers all methods to install and run **Speech2Brief**:
1. 🚀 **Option 1: Hybrid Mode (macOS Apple Silicon — Most Optimized & Recommended)**
2. 🐳 **Option 2: Docker Compose (All Platforms: Apple Silicon, Generic CPU, NVIDIA GPU)**
3. 💻 **Option 3: Full Native Installation (NVIDIA CUDA on Windows/Linux)**

---

## 🚀 Option 1: Hybrid Mode (macOS Apple Silicon — Recommended)

The **Hybrid Mode** provides the highest performance on Apple Silicon (M1/M2/M3/M4/M5) by bypassing Docker virtualization penalties and leveraging native hardware acceleration:

* **Frontend UI**: Runs in a lightweight Docker container at `http://localhost:8081`.
* **Backend API**: Runs natively in Python on macOS at `http://localhost:5050`, with direct access to all physical CPU cores and Unified Memory bandwidth.
* **LLM Summarization Engine**: Offloaded to **[LM Studio](https://lmstudio.ai/)** (or local Ollama) at `http://localhost:1234/v1` utilizing native **Apple Metal GPU** acceleration for ultra-fast generation.

### Prerequisites
1. **Homebrew**: Installed on macOS (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`).
2. **LM Studio**: Download and install from [lmstudio.ai](https://lmstudio.ai/).
   - Open LM Studio, search and download your preferred model (e.g. `meta-llama-3-8b-instruct`, `mistral-7b-instruct`, etc.).
   - Go to the **Developer / Local Server** tab (port `1234`) and click **Start Server**.
3. **Docker Desktop**: Running on macOS.

### Quick Start (One Command)
Run the automated bootstrap script from the repository root:
```bash
./run_hybrid_mac.sh
```

The script automatically:
* Verifies/installs `ffmpeg` and Python 3.11 via Homebrew.
* Sets up `.venv` and installs all dependencies from `requirements.txt`.
* Detects LM Studio server on port `1234`.
* Stops any conflicting containers on port `5050`.
* Spins up the frontend Docker container (`speech2brief-frontend-hybrid`) on `http://localhost:8081`.
* Launches the backend natively on `http://localhost:5050`.

Open your browser at **`http://localhost:8081`** to start transcribing!

---

## 🐳 Option 2: Docker Compose Deployment

Run the complete stack inside Docker containers with a single command. Choose the profile matching your hardware:

### Available Profiles

| Profile | Target Hardware | WhisperX Model | LLM Engine / Model | Port (Backend) | Port (Frontend) | Recommended Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`hybrid`** | **macOS Apple Silicon** | `medium` (Native CPU) | **LM Studio Metal GPU** (`1234`) | `5050` (Native) | `8081` | **Fastest on Mac M-series** |
| **`cpu-apple-silicon`** | macOS Apple Silicon in Docker | `medium` / `int8` (8 threads) | Ollama `llama3.2:3b` | `5050` | `8081` | 100% Docker on Mac |
| **`cpu`** | Generic x86_64 / ARM CPU | `small` / `int8` | Ollama `llama3.2:1b` | `5050` | `8081` | Laptops / low-power CPUs |
| **`basic`** | NVIDIA GPU (4–6 GB VRAM) | `small` / `float16` | Ollama `llama3:8b` | `5000` | `8081` | Entry-level GPU |
| **`medium`** | NVIDIA GPU (6–8 GB VRAM) | `medium` / `float16` (batch 4) | Ollama `llama3:8b` | `5000` | `8081` | Workstations |
| **`large`** | NVIDIA GPU (≥ 8 GB VRAM) | `medium` / `float16` (batch 8) | Ollama `llama3:8b` | `5000` | `8081` | High-throughput GPU servers |

### Launch Commands

Make sure you have created `.env` with your `HF_TOKEN` (from `.env.example`). Always include `--env-file .env` when launching:

```bash
# 1. macOS Apple Silicon (100% Docker)
docker compose --env-file .env -f docker/docker-compose.yml --profile cpu-apple-silicon --project-name speech2brief up --build -d

# 2. Generic CPU (Low power / laptops)
docker compose --env-file .env -f docker/docker-compose.yml --profile cpu --project-name speech2brief up --build -d

# 3. NVIDIA GPU (Basic, Medium, or Large)
docker compose --env-file .env -f docker/docker-compose.yml --profile large --project-name speech2brief up --build -d
```

Once started, open **`http://localhost:8081`** in your browser.

> [!NOTE]
> **macOS Port 5000 Conflict**: macOS reserves port 5000 for AirPlay Receiver. All CPU and Apple Silicon profiles automatically expose the backend on port **5050** to avoid conflicts.

---

## 💻 Option 3: Full Native Installation (NVIDIA CUDA / Windows / Linux)

For systems with NVIDIA GPUs running Windows or Linux natively:

### 1. Install Visual Studio Build Tools (Windows only)
- Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)
- Select the workload: **"Desktop development with C++"**

### 2. Install CUDA Toolkit & cuDNN
- **CUDA 12.x**: Download and install from [developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads).
- **cuDNN**: Download matching cuDNN library from [developer.nvidia.com/rdp/cudnn-archive](https://developer.nvidia.com/rdp/cudnn-archive).
- Copy cuDNN `bin`, `include`, and `lib` files to your CUDA installation directory.

### 3. Install FFmpeg
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt update && sudo apt install -y ffmpeg`
- **Windows**: Download from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) and add the `bin` directory to your system `PATH`.

### 4. Create Virtual Environment & Install Python Packages
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Start Backend & Frontend
```bash
# Backend
python app.py

# Frontend (in docker/front-end)
cd docker/front-end
npm install
npm run dev
```

---

## 🔑 Speaker Diarization Setup (Hugging Face Token)

To enable **Speaker Diarization** (identifying who spoke when):
1. Create a free account at [Hugging Face](https://huggingface.co/).
2. Accept the user conditions on:
   - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
3. Create an Access Token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
4. Add your token to `.env` in the repository root:
   ```ini
   HF_TOKEN=hf_yourTokenHere
   ```
*(If `HF_TOKEN` is not set, Speech2Brief will transcribe in single-speaker Fast Mode).*
