FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# Instala dependencias del sistema (Python, pip, ffmpeg, etc.)
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg git && \
    apt-get clean

# Configura variables de entorno recomendadas
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ENV PYTHONUNBUFFERED=1

# Copia los archivos del proyecto al contenedor
WORKDIR /workspace
COPY . /workspace

# Crea la carpeta temporal si no existe
RUN mkdir -p /workspace/temp

# Instala dependencias de Python a partir de requirements.txt
RUN pip3 install --upgrade pip \
    && pip3 install --no-cache-dir -r requirements.txt

# Expone el puerto usado por Flask
EXPOSE 5000

# Comando para ejecutar tu API Flask
CMD ["python3", "app.py"]