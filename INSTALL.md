# Local Installation Guide
These steps are based on my own experience installing with specific CUDA and cuDNN versions.

### ✅ 1. Install Visual Studio (with C++ Tools)
- Download from: https://visualstudio.microsoft.com/downloads/
- During installation, select the workload: “Desktop development with C++”
  
###  ✅ 2. Install CUDA Toolkit 12.9
Download from:
https://developer.nvidia.com/cuda-downloads

Select:
- OS: Windows
- Version: CUDA 12.9
- Installer: exe (local) recomendado

Default path:
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9

### ✅ 3. Install cuDNN 8.9.7 (compatible with CUDA 12.9)
- Download from the cuDNN archive: https://developer.nvidia.com/rdp/cudnn-archive
- Select: “cuDNN v8.9.7 Library for Windows (x86_64) - ZIP”
- Extract the zip and manually copy the folders as follows:
  
| From zip subfolder  | To this location on your system Model |
| :------------ |---------------| 
| \bin     | C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin |
| \include     | C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\include |
| \lib\x64     | C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\lib\x64 |

### ✅ 4. Install FFmpeg
- Download a build from https://ffmpeg.org/download.html (e.g., from gyan.dev)
- Extract it to: C:\ffmpeg

### ✅ 5. Add to your PATH
Add the following folders to your Windows Path:
- C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin
- C:\ffmpeg_x.x.x_\bin

### ✅ 6. Create a Python Virtual Environment and Install Dependencies
- `python -m venv venv`
- `venv\Scripts\activate`
- `pip install --upgrade pip`

### ✅ 7. Install WhisperX
- `pip install whisperx`
This will install:
- WhisperX
- PyTorch
- Other required dependencies

### ✅ 8. Verify Installation

### ✅ 9. Troubleshooting

#### Please make sure cublasLt64_10.dll is in your library path!
- Downloading the appropriate CUDA installer: `cuBLAS.and.cuDNN_CUDA12_win_v2.7z` from https://github.com/Purfview/whisper-standalone-win/releases/tag/libs
- Add to /bin folder on your CUDA installation in `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin`
