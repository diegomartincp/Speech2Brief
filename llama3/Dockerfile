FROM ollama/ollama:latest

# Inicia Ollama en segundo plano, espera que arranque y descarga el modelo
RUN nohup ollama serve & sleep 10 && ollama pull llama3 && pkill ollama

EXPOSE 11434
CMD ["ollama", "serve"]
