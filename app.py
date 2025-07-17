import os
import uuid
import time
from flask import Flask, request, jsonify
import whisperx

device = "cuda"
MODEL_NAME = "medium"
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 8))

app = Flask(__name__)
model = whisperx.load_model(MODEL_NAME, device)

TEMP_FOLDER = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(TEMP_FOLDER, exist_ok=True)

@app.route('/transcribe', methods=['POST'])
def transcribe():
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
    try:
        audio = whisperx.load_audio(temp_mp3_path)
        result = model.transcribe(audio, batch_size=BATCH_SIZE)  # Sube batch_size si tu VRAM lo permite
        segments = result['segments']
    finally:
        os.remove(temp_mp3_path)
    elapsed_seconds = time.time() - start_time 

    response = {
        "transcription": [
            {"start": seg['start'], "end": seg['end'], "text": seg['text']}
            for seg in segments
        ],
        "processing_time_seconds": round(elapsed_seconds, 2)
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

