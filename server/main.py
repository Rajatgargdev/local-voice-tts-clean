from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from TTS.api import TTS
import torch
from pydub import AudioSegment
import os
import uuid

# ----------------------------
# Load TTS model once
# ----------------------------
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
tts = TTS(MODEL_NAME, progress_bar=True, gpu=True)  # gpu=True enables GPU

# Optional: preload speaker voice if needed
SPEAKER_WAV = "sample.wav"

# Free GPU memory
torch.cuda.empty_cache()

# ----------------------------
# FastAPI app setup
# ----------------------------
app = FastAPI()

# Enable CORS so React (localhost:3000) can access FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Global job tracking dicts
# ----------------------------
job_progress = {}   # {job_id: {"processed": int, "total": int}}
job_status   = {}   # {job_id: "queued"|"running"|"done"|"error"}
job_result   = {}   # {job_id: "path/to/final.wav"}

# ----------------------------
# Root endpoint
# ----------------------------
@app.get("/")
def root():
    return {"message": "TTS API is running!"}

# ----------------------------
# Background TTS worker
# ----------------------------
def process_tts_job(job_id: str, text: str, language: str):
    try:
        CHUNK_SIZE = 500
        chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]

        job_progress[job_id] = {"processed": 0, "total": len(chunks)}
        job_status[job_id] = "running"

        temp_files = []
        speaker_wav = SPEAKER_WAV  # reference speaker voice

        for idx, chunk in enumerate(chunks):
            temp_path = f"chunk_{job_id}_{idx}.wav"
            tts.tts_to_file(
                text=chunk,
                file_path=temp_path,
                language=language,
                speaker_wav=speaker_wav
            )
            temp_files.append(temp_path)

            # Update progress
            job_progress[job_id]["processed"] = idx + 1

        # Merge audio
        final_audio = AudioSegment.empty()
        for f in temp_files:
            final_audio += AudioSegment.from_wav(f)

        output_path = f"final_{job_id}.wav"
        final_audio.export(output_path, format="wav")

        # Cleanup temp files
        for f in temp_files:
            if os.path.exists(f):
                os.remove(f)

        # Save final result
        job_result[job_id] = output_path
        job_status[job_id] = "done"

    except Exception as e:
        job_status[job_id] = "error"
        print(f"Job {job_id} failed: {e}")

# ----------------------------
# Start TTS job
# ----------------------------
@app.post("/start/")
async def start_job(
    file: UploadFile = File(...),
    language: str = "en",
    background_tasks: BackgroundTasks = None
):
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")

    contents = await file.read()
    text = contents.decode("utf-8").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Create job_id
    job_id = str(uuid.uuid4())
    job_status[job_id] = "queued"
    job_progress[job_id] = {"processed": 0, "total": 0}

    # Run processing in background
    background_tasks.add_task(process_tts_job, job_id, text, language)

    return {"job_id": job_id}

# ----------------------------
# Check job progress
# ----------------------------
@app.get("/progress/{job_id}")
def get_progress(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")

    progress = job_progress.get(job_id, {"processed": 0, "total": 0})
    return {
        "status": job_status[job_id],
        "processed": progress["processed"],
        "total": progress["total"],
        "percent": 0 if progress["total"] == 0 else int((progress["processed"] / progress["total"]) * 100)
    }

# ----------------------------
# Get final result
# ----------------------------
@app.get("/result/{job_id}")
def get_result(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")

    if job_status[job_id] != "done":
        raise HTTPException(status_code=202, detail="Job not finished yet")

    output_path = job_result[job_id]
    return FileResponse(output_path, media_type="audio/wav", filename="speech.wav")
