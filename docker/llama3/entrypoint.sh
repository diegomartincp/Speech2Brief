#!/bin/bash
MODEL="${LLAMA_MODEL:-llama3:8b}"
ollama serve &
until ollama list &>/dev/null; do sleep 1; done
ollama pull "$MODEL"
pkill ollama
exec ollama serve
