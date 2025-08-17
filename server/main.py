from fastapi import FastAPI
from fastapi.responses import FileResponse
from TTS.api import TTS
import os

# Pick your model
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"

# Initialize TTS
tts = TTS(MODEL_NAME)

# FastAPI app
app = FastAPI()

@app.get("/")
def root():
    return {"message": "TTS API is running!"}

@app.get("/speak/")
def speak(text: str, language: str = "en"):
    output_path = "output.wav"

    # Use a default speaker (most multilingual models have speaker 0 as default)
    speaker_wav = "sample.wav"
    tts.tts_to_file(
        text=text,
        file_path=output_path,
        language=language,
        speaker_wav=speaker_wav
    )

    return FileResponse(output_path, media_type="audio/wav", filename="speech.wav")
