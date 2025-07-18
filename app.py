import os
import uuid
import time
import requests
from flask import Flask, request, jsonify
from urllib3 import response
import whisperx
print("holaaaa")

device = os.environ.get("DEVICE", "cuda")

TEMP_FOLDER = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(TEMP_FOLDER, exist_ok=True)

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 2))
WHISPERX_MODEL = str(os.environ.get("WHISPERX_MODEL", "medium"))
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://llama3:11434")
LLAMA_MODEL = os.environ.get("LLAMA_MODEL", "llama3:8b")


app = Flask(__name__)
if device == "cpu":
    model = whisperx.load_model(WHISPERX_MODEL, device="cpu", compute_type="float32")
    print("--> USING CPU ONLY")
else:
    model = whisperx.load_model(WHISPERX_MODEL, device)
"""
Generate a prompt for Llama 3 to summarize a meeting chronologically.
"""
def make_summary_prompt(segments):
    transcript = []
    for i, seg in enumerate(segments, 1):
        start = int(seg['start'])
        end = int(seg['end'])
        # Format is: “min:seg – min:seg” per segment, helps LLM to maintain order
        m1, s1 = divmod(start, 60)
        m2, s2 = divmod(end, 60)
        transcript.append(f"[{m1:02d}:{s1:02d}–{m2:02d}:{s2:02d}] {seg['text']}".strip())
    transcript_str = "\n".join(transcript)


    prompt = (
        "You are an assistant specialized in creating detailed and chronological summaries of transcribed meetings.\n\n"
        "Your task is to generate a summary that faithfully reflects the content, grouping information in chronological order and using clear and concise sentences.\n"
        "Omit unnecessary greetings and transcription errors, but include agreements, questions, decisions, and points of dispute.\n\n"
        "The transcription of the meeting is as follows (each line includes the segment and its timestamp):\n"
        f"{transcript_str}\n\n"
        "Now, write a structured summary following the chronology of the conversation, brief but covering all the important topics."
        "Always answer in the same languaje the transcription is"
    )
    return prompt
"""
Calls ollama endpoint and returns the response as a string.
"""
def summarize_with_llama3(prompt):
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": LLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    try:
        r = requests.post(url, json=payload, timeout=240)
        r.raise_for_status()
        data = r.json()
        return data['response'].strip()
    except Exception as e:
        print(f"\n--- EXCEPTION DURING OLLAMA CALL ---\n{str(e)}\n")
        raise RuntimeError(f"Error calling Llama3: {str(e)}")



@app.route('/summarize', methods=['POST'])
def summarize():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    temp_mp3_name = f"upload_{uuid.uuid4().hex}.mp3"
    temp_mp3_path = os.path.join(TEMP_FOLDER, temp_mp3_name)
    file.save(temp_mp3_path)

    segments = []
    start_time = time.time()

    # Try to transcribe the audio
    print(f"Transcribing audio from {temp_mp3_path}...")
    try:
        audio = whisperx.load_audio(temp_mp3_path)
        result = model.transcribe(audio, batch_size=BATCH_SIZE)
        segments = result['segments']
    finally:
        os.remove(temp_mp3_path)
    elapsed_seconds = time.time() - start_time

    prompt = make_summary_prompt(segments)
    # Try to call Ollama to get the summary
    try:
       resumen = summarize_with_llama3(prompt)
    except Exception as e:
        return jsonify({"Error": str(e)}), 502

    
        
    response = {
        "resumen": resumen,
        "transcription": [
            {"start": seg['start'], "end": seg['end'], "text": seg['text']}
            for seg in segments
        ],
        "processing_time_seconds": round(elapsed_seconds, 2)
    }
    return jsonify(response)

# Endpoints de salud (para Docker healthcheck)
@app.route('/health', methods=['GET'])
def health():
    return "ok", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
