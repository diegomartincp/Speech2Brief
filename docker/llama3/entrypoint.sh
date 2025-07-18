#!/bin/bash
MODEL="${LLAMA_MODEL:-llama3:8b}"

# Lanza Ollama en segundo plano
ollama serve &
# Espera a que el servidor esté listo
until ollama list &>/dev/null; do sleep 1; done

# Descarga el modelo definido en la variable de entorno
ollama pull "$MODEL"
# Mata el primer proceso, para lanzar Ollama “limpio”
pkill ollama

# Lanza el servidor Ollama “de verdad” (en foreground)
exec ollama serve