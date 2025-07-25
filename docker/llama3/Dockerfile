FROM ollama/ollama:latest
COPY entrypoint.sh /entrypoint.sh
# Convert CRLF to LF to avoid Windows line ending issues
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 11434
ENTRYPOINT ["/entrypoint.sh"]