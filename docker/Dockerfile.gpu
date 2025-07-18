FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# Instala dependencias básicas del sistema
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg git && \
    apt-get clean

# Variables de entorno comunes
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /workspace

# Copia sólo requirements.txt y archivos de dependencias primero
COPY requirements.txt /workspace/

# Instala librerías Python
RUN pip3 install --upgrade pip 
RUN pip3 install -r requirements.txt

# Copia el resto del código fuente y archivos del proyecto
COPY . /workspace/

# Crea carpeta temporal si es necesario
RUN mkdir -p /workspace/temp

EXPOSE 5000

CMD ["python3", "app.py"]
