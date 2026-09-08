#!/usr/bin/env bash
# ==============================================================================
# Speech2Brief - Hybrid Mode Launcher (macOS Apple Silicon)
#
# Architecture:
# - Frontend: Docker container (http://localhost:8081)
# - Backend: Native Mac Host Python (http://localhost:5050)
#   * WhisperX + Pyannote diarization run with 10 physical M-series CPU cores
# - LLM Engine: LM Studio (http://localhost:1234/v1)
#   * Summarization runs with Apple Silicon Metal GPU acceleration
# ==============================================================================

set -e

# Ensure Homebrew is in PATH
if [ -d "/opt/homebrew/bin" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================================="
echo "  🚀 Speech2Brief - Hybrid Mode Launcher (macOS Apple Silicon)    "
echo "=================================================================="

# 1. Check Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Error: Docker is not found. Please install and start Docker Desktop."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running. Please launch Docker Desktop."
    exit 1
fi

# 2. Check Homebrew & Dependencies (ffmpeg, python)
if ! command -v brew >/dev/null 2>&1; then
    echo "⚠️  Homebrew not found in PATH. Please install Homebrew from https://brew.sh if needed."
fi

# Check ffmpeg (required for audio extraction from video/audio files)
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "📦 'ffmpeg' is required for audio extraction. Installing via Homebrew..."
    brew install ffmpeg
fi

# Locate suitable Python (3.10 or 3.11 preferred for WhisperX & PyTorch)
PYTHON_EXEC=""
for py in python3.11 python3.10 /opt/homebrew/opt/python@3.11/bin/python3.11 /opt/homebrew/opt/python@3.10/bin/python3.10; do
    if command -v "$py" >/dev/null 2>&1; then
        PYTHON_EXEC="$(command -v "$py")"
        break
    fi
done

if [ -z "$PYTHON_EXEC" ]; then
    echo "📦 Python 3.11 is required for WhisperX. Installing python@3.11 via Homebrew..."
    brew install python@3.11
    PYTHON_EXEC="/opt/homebrew/opt/python@3.11/bin/python3.11"
fi

echo "🐍 Using Python: $($PYTHON_EXEC --version) at $PYTHON_EXEC"

# 3. Setup Virtual Environment
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "⚙️  Creating Python virtual environment in .venv..."
    "$PYTHON_EXEC" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# 4. Install / Update Python Requirements
MARKER_FILE="$VENV_DIR/.requirements_installed"
if [ ! -f "$MARKER_FILE" ] || [ "$SCRIPT_DIR/requirements.txt" -nt "$MARKER_FILE" ]; then
    echo "📥 Installing / verifying Python dependencies from requirements.txt..."
    pip install --upgrade pip "setuptools<70"
    pip install -r requirements.txt
    touch "$MARKER_FILE"
    echo "✅ Python dependencies ready."
fi

# 5. Check LM Studio Connectivity
echo "🔍 Checking LM Studio status at http://localhost:1234/v1..."
LMSTUDIO_ONLINE=false
if curl -s --connect-timeout 2 http://localhost:1234/v1/models >/dev/null 2>&1; then
    LMSTUDIO_ONLINE=true
    echo "✅ LM Studio detected and ready on port 1234 (Metal GPU acceleration active)!"
else
    echo "------------------------------------------------------------------"
    echo "⚠️  [NOTICE] LM Studio server is NOT currently responding on port 1234."
    echo "   To enable ultra-fast Apple Silicon Metal GPU summarization:"
    echo "   1. Open LM Studio on your Mac."
    echo "   2. Load your model (e.g. Llama 3 8B Instruct with Apple Metal GPU)."
    echo "   3. Go to the '<->' (Developer/Local Server) tab and click 'Start Server'."
    echo "   (The backend will still start and wait for requests)."
    echo "------------------------------------------------------------------"
fi

# 6. Stop any conflicting Speech2Brief Docker containers on ports 5050 / 8081
CONFLICTING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E '^speech2brief-(resumer|frontend)' || true)
if [ -n "$CONFLICTING_CONTAINERS" ]; then
    echo "🔄 Stopping existing Speech2Brief Docker backend/frontend to free ports 5050 & 8081..."
    docker stop $CONFLICTING_CONTAINERS >/dev/null 2>&1 || true
fi

# 7. Start Frontend Container (Profile: hybrid)
echo "🌐 Starting Speech2Brief Frontend container on port 8081..."
docker compose --profile hybrid -f docker/docker-compose.yml up -d frontend-hybrid

# Set clean shutdown trap
cleanup() {
    echo ""
    echo "🛑 Shutting down Speech2Brief Hybrid..."
    docker compose --profile hybrid -f docker/docker-compose.yml stop frontend-hybrid >/dev/null 2>&1 || true
    echo "👋 Shutdown complete."
    exit 0
}
trap cleanup INT TERM

# 8. Configure Environment Variables for Native Execution
PHYS_CORES=$(sysctl -n hw.perflevel0.physicalcpu 2>/dev/null || sysctl -n hw.physicalcpu 2>/dev/null || echo 8)
export PROFILE_NAME="hybrid-mac"
export PORT=5050
export DEVICE="cpu"
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-$PHYS_CORES}"
export LLM_PROVIDER="lmstudio"
export LMSTUDIO_HOST="http://localhost:1234/v1"
export LLAMA_MODEL="${LLAMA_MODEL:-llama3:8b}"

echo "=================================================================="
echo "  🌟 Speech2Brief Hybrid is READY!                                "
echo "  - Frontend UI:  http://localhost:8081                           "
echo "  - Local API:    http://localhost:5050                           "
echo "  - CPU Threads:  $OMP_NUM_THREADS physical cores allocated       "
echo "  - LLM Provider: LM Studio ($LMSTUDIO_HOST)                      "
echo "=================================================================="
echo "Press Ctrl+C at any time to stop the application."
echo ""

# 9. Launch Native Backend
exec python app.py
