import os
import uuid
import time
import requests
from flask import Flask, request, jsonify
from urllib3 import response
import whisperx
from flask_cors import CORS


print("--> Starting")

device = os.environ.get("DEVICE", "cuda")

TEMP_FOLDER = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(TEMP_FOLDER, exist_ok=True)

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 2))
WHISPERX_MODEL = str(os.environ.get("WHISPERX_MODEL", "medium"))
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://llama3:11434")
LLAMA_MODEL = os.environ.get("LLAMA_MODEL", "llama3:8b")


app = Flask(__name__)
CORS(app) # Enable CORS

if device == "cpu":
    model = whisperx.load_model(WHISPERX_MODEL, device="cpu", compute_type="float32")
    print("--> USING CPU ONLY")
else:
    model = whisperx.load_model(WHISPERX_MODEL, device)
    print("--> USING GPU")
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
        "You will receive a text transcript of an audio message. "
        "The message might be a personal voice note or a conversation between multiple people, like a meeting.\n\n"
        "In Spanish, the word 'tío' or 'tía' is often used as informal slang to address a friend or someone informally, not necessarily meaning 'uncle' or 'aunt'. "
        "Unless the context clearly refers to a family relationship, interpret 'tío' and 'tía' as slang forms of address (like 'dude', 'mate', or 'hey man' in English) and do not suggest a family relation if is not obvious.\n\n"
        "Determine what kind of message it is, and write a proper summary based on the content. "
        "Focus on the key points: what was said, decided, asked, or reflected.\n\n"
        "Be detailed about the specific things that are mentioned in the transcript.\n\n"
        "For example, if multiple ideas are shared about a specific topic, do not limit to mention the topic but also mention the specific ideas and how they were discussed.\n\n"
        "Always answer in the original language of the transcript. Do not translate it. If the transcript is in Spanish then answer in Spanish.\n\n"
        "Follow the order of the transcript in chronological order.\n\n"
        "Write the summary in natural, plain language, without headings, timestamps, or labels.\n\n"
        "Transcript:\n"
        f"{transcript_str}\n\n"
        "Summary:"
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
    print("\n📍 Summary generated:")
    print(resumen)
    return jsonify(response)

# Endpoints de salud (para Docker healthcheck)
@app.route('/health', methods=['GET'])
def health():
    return "ok", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
