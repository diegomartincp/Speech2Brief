# Instalación en local
Estas instrucciones se basan únicamente en mi experiencia con el uso de versiones de CUDA y cuDNN.

### ✅ 1. Instalar Visual Studio (con C++)
- Descarga desde: https://visualstudio.microsoft.com/es/downloads/
- Selecciona el workload: "Desarrollo de escritorio con C++"
###  ✅ 2. Instalar CUDA Toolkit 12.9
Descarga desde:
https://developer.nvidia.com/cuda-downloads

Selecciona:
- OS: Windows
- Version: CUDA 12.9
- Instalador: exe (local) recomendado

Ruta por defecto:
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9


### ✅ 3. Instalar cuDNN 8.9.7 (compatible con CUDA 12.9)
- Descarga desde el archivo de versiones: https://developer.nvidia.com/rdp/cudnn-archive
- Selecciona: “cuDNN v8.9.7 Library for Windows (x86_64) - ZIP”
- Extrae el zip y copia manualmente las carpetas:

Carpeta origen del zip	Carpeta destino en tu máquina
- bin\*	C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin
- include\*	C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\include
- lib\x64\*	C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\lib\x64

### ✅ 4. Instala FFmpeg
- Descarga build desde https://ffmpeg.org/download.html (por ejemplo de gyan.dev).
- Descomprime en C:\ffmpeg

### ✅ 5. Añadir al path:
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin
C:\ffmpeg_x.x.x_\bin

### ✅ 6. Crear entorno virtual e instalar dependencias
- `python -m venv venv`
- `venv\Scripts\activate`
- `pip install --upgrade pip`

### ✅ 7. Instalar whisperx
- `pip install whisperx`
Esto instalará:
- WhisperX
- PyTorch (versión fijada por WhisperX)
- Otras dependencias necesarias

### ✅ 7. Verificar la instalación ejecutando 

### ✅ 8. Solución de errores

#### Please make sure cublasLt64_10.dll is in your library path!
- Descargar manualmente la librería `cuBLAS.and.cuDNN_CUDA12_win_v2.7z` desde https://github.com/Purfview/whisper-standalone-win/releases/tag/libs
- Añadir a la carpeta /bin de la instalación de cuda en `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin`


#### Error: Could not locate cudnn_ops_infer64_8.dll. Please make sure it is in your 


Hace falta:
Instalar dependencias para cuda:
instalar https://developer.nvidia.com/cuda-downloads?target_os=Windows&target_arch=x86_64&target_version=11&target_type=exe_network
Descargar https://developer.nvidia.com/rdp/cudnn-archive#a-collapse811-111 y extraer en la ruta de instalación de CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

Si es necerio Cublast, descargar el dll e introducir en /bin de la carpeta de instalación de CUDA:
https://github.com/Purfview/whisper-standalone-win/releases/tag/libs
`cuBLAS.and.cuDNN_CUDA12_win_v2.7z`
