import os
import requests
import mimetypes
import subprocess
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

# Read environment variables for token and profile
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
PROFILE = os.getenv("PROFILE", "cpu")
SERVICE_HOST = f"http://resumer-{PROFILE}:5000/summarize"

print(f"[INFO] Starting Telegram bot with profile '{PROFILE}'")
print(f"[INFO] Using summarization endpoint: {SERVICE_HOST}")

# Optional: convert .opus or .ogg audio files to .wav if backend cannot handle them
def convert_to_wav(input_path):
    output_path = input_path.rsplit('.', 1)[0] + '.wav'
    subprocess.run(["ffmpeg", "-y", "-i", input_path, output_path], check=True)
    return output_path

# Handler for the /start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Send me an audio file (voice note or .mp3) and I'll return a summarized transcript.\n\n"
        "🌍 I can process audio in any language!"
    )

# Handler for audio messages
async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user.first_name or "User"
    file = await update.message.audio.get_file() if update.message.audio else await update.message.voice.get_file()
    file_path = await file.download_to_drive()

    mtype, _ = mimetypes.guess_type(str(file_path))
    if str(file_path).endswith('.opus') or mtype in ("audio/ogg", "audio/x-opus+ogg"):
        file_path = convert_to_wav(str(file_path))

    # Notify the user and log that processing has started
    await update.message.reply_text("⚙️ Processing your audio...")
    print(f"[INFO] {user} has uploaded an audio. Processing started...")

    # Send file to Speech2Brief summarizer API
    with open(file_path, 'rb') as f:
        files = {'file': f}
        try:
            r = requests.post(SERVICE_HOST, files=files, timeout=300)
            r.raise_for_status()
            result = r.json()
        except requests.exceptions.RequestException as e:
            await update.message.reply_text("❌ Failed to process the audio. Please try again later.")
            print(f"[ERROR] Failed to reach summarizer API: {e}")
            return

    # Extract summary from API response
    summary_text = result.get("resumen", "").strip()
    if not summary_text:
        summary_text = "No summary was generated."

    # Final reply format
    reply = f"📝 Summary:\n\n{summary_text}"
    await update.message.reply_text(reply)
    print(f"[INFO] Summary sent to {user}")

# Handle all other messages
async def handle_non_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📢 Please send an audio file (voice note or .mp3) to receive a summary.")

# Start the bot
if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.AUDIO | filters.VOICE, handle_audio))
    app.add_handler(MessageHandler(~(filters.AUDIO | filters.VOICE | filters.COMMAND), handle_non_audio))
    app.run_polling()
