import os
import uuid
import json
import logging
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from app.config import settings
from app.downloader import download_youtube_audio, DownloadError
from app.transcriber import transcribe_audio, TranscriptionError
from app.indexer import build_and_save_vector_index, IndexingError
from app.rag import query_podcast_index, RAGError
from app.generator import generate_podcast_analytics, GenerationError

# Configure structured server-side logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("app.main")

app = FastAPI(
    title="PodcastIQ API",
    description="The YouTube & Podcast Intelligence Layer Ingestion Engine.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory jobs tracking fallback cache
jobs_db = {}

# Ensure folders exist
os.makedirs(settings.DOWNLOADS_DIR, exist_ok=True)
os.makedirs(settings.INDEXES_DIR, exist_ok=True)
os.makedirs(settings.DATA_DIR, exist_ok=True)

# Pydantic schemas for request/response
class IngestionRequest(BaseModel):
    youtube_url: str
    custom_title: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    status: str
    youtube_url: Optional[str] = None
    title: Optional[str] = None
    created_at: str
    error_message: Optional[str] = None

class QueryRequestSchema(BaseModel):
    podcast_id: str
    question: str

# Helper: Save job state to local file
def save_job_state(job_id: str, state_data: dict):
    jobs_db[job_id] = state_data
    file_path = os.path.join(settings.DATA_DIR, f"{job_id}.json")
    try:
        # Merge existing segments or content if they exist on disk
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                existing_data.update(state_data)
                state_data = existing_data
                
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(state_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to write job state to disk for {job_id}: {str(e)}")

# Helper: Load job state from disk/RAM
def load_job_state(job_id: str) -> Optional[dict]:
    if job_id in jobs_db:
        return jobs_db[job_id]
        
    file_path = os.path.join(settings.DATA_DIR, f"{job_id}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                jobs_db[job_id] = data
                return data
        except Exception as e:
            logger.error(f"Failed to read job state for {job_id}: {str(e)}")
    return None

# --- ASYNCHRONOUS BACKGROUND PIPELINE WORKER ---
async def run_ingestion_pipeline(job_id: str, youtube_url: str, custom_title: Optional[str]):
    """
    Executes the ingestion pipeline concurrently:
    Download -> Transcribe -> (Index & Generate in parallel) -> Done
    """
    job = load_job_state(job_id)
    if not job:
        logger.error(f"Ingestion aborted. Job ID {job_id} not found in cache.")
        return

    audio_path = None
    try:
        # 1. DOWNLOADING
        logger.info(f"[{job_id}] Entering DOWNLOADING phase.")
        job["status"] = "downloading"
        save_job_state(job_id, job)
        
        audio_path = await asyncio.to_thread(
            download_youtube_audio,
            youtube_url=youtube_url, 
            output_dir=settings.DOWNLOADS_DIR, 
            podcast_id=job_id
        )
        
        # Approximate duration check or title assignment
        job = load_job_state(job_id) or job
        job["title"] = custom_title or f"Podcast Segment ({job_id[:8]})"
        save_job_state(job_id, job)

        # 2. TRANSCRIBING
        logger.info(f"[{job_id}] Entering TRANSCRIBING phase.")
        job["status"] = "transcribing"
        save_job_state(job_id, job)
        
        segments = await asyncio.to_thread(transcribe_audio, audio_path)
        job = load_job_state(job_id) or job
        job["segments"] = segments
        save_job_state(job_id, job)

        # 3 & 4. INDEXING AND GENERATING (Parallel)
        logger.info(f"[{job_id}] Initiating parallel INDEXING and GENERATING phases.")
        job = load_job_state(job_id) or job
        job["status"] = "indexing"
        save_job_state(job_id, job)

        async def run_indexing_task():
            logger.info(f"[{job_id}] Started parallel FAISS indexing task...")
            await asyncio.to_thread(build_and_save_vector_index, segments, job_id)
            logger.info(f"[{job_id}] FAISS indexing completed. Transitioning status to generating.")
            current_job = load_job_state(job_id)
            if current_job:
                current_job["status"] = "generating"
                save_job_state(job_id, current_job)

        async def run_generating_task():
            logger.info(f"[{job_id}] Started parallel LLM content generation task...")
            content = await asyncio.to_thread(generate_podcast_analytics, segments)
            logger.info(f"[{job_id}] LLM content generation completed.")
            current_job = load_job_state(job_id)
            if current_job:
                current_job["content"] = content
                save_job_state(job_id, current_job)

        # Run both tasks concurrently
        await asyncio.gather(run_indexing_task(), run_generating_task())

        # 5. DONE
        logger.info(f"[{job_id}] Ingestion pipeline completed successfully!")
        job = load_job_state(job_id) or job
        job["status"] = "done"
        save_job_state(job_id, job)

    except (DownloadError, TranscriptionError, IndexingError, GenerationError) as pipeline_err:
        logger.error(f"[{job_id}] Ingestion failed with known error: {str(pipeline_err)}")
        job = load_job_state(job_id) or job
        job["status"] = "error"
        job["error_message"] = str(pipeline_err)
        save_job_state(job_id, job)
    except Exception as e:
        logger.error(f"[{job_id}] Ingestion failed with unexpected error: {str(e)}")
        job = load_job_state(job_id) or job
        job["status"] = "error"
        job["error_message"] = f"An unexpected error occurred during processing: {str(e)}"
        save_job_state(job_id, job)
    finally:
        # Secure cleanup: Delete raw temporary MP3 audio staging file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"[{job_id}] Cleaned up raw audio staging file: {audio_path}")
            except Exception as e:
                logger.warning(f"[{job_id}] Failed to delete raw audio staging file: {str(e)}")

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "PodcastIQ API service is online and running."}

@app.post("/api/process", response_model=JobResponse)
def process_podcast(request: IngestionRequest, background_tasks: BackgroundTasks):
    """
    Submits a YouTube URL to be downloaded, transcribed, and indexed in the background.
    """
    url_str = str(request.youtube_url).strip()
    if not url_str:
        raise HTTPException(status_code=400, detail="A valid YouTube URL must be provided.")
        
    job_id = str(uuid.uuid4())
    
    job_state = {
        "job_id": job_id,
        "status": "queued",
        "youtube_url": url_str,
        "title": request.custom_title or "Fetching details...",
        "created_at": datetime.utcnow().isoformat(),
        "error_message": None,
        "segments": [],
        "content": {}
    }
    
    save_job_state(job_id, job_state)
    
    # Delegate job processing to async worker queue
    background_tasks.add_task(
        run_ingestion_pipeline, 
        job_id=job_id, 
        youtube_url=url_str, 
        custom_title=request.custom_title
    )
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        youtube_url=url_str,
        title=job_state["title"],
        created_at=job_state["created_at"]
    )

@app.get("/api/job/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str):
    """
    Polls the real-time processing status of a background job.
    """
    job = load_job_state(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    return JobResponse(
        job_id=job_id,
        status=job["status"],
        youtube_url=job.get("youtube_url"),
        title=job.get("title"),
        created_at=job.get("created_at"),
        error_message=job.get("error_message")
    )

@app.post("/api/query")
def query_podcast(request: QueryRequestSchema):
    """
    Retrieves top matched segments from FAISS and prompts LLM to generate the answer.
    """
    podcast_id = request.podcast_id
    question = request.question.strip()
    
    if not podcast_id or not question:
        raise HTTPException(status_code=400, detail="podcast_id and question parameters are required.")
        
    try:
        result = query_podcast_index(podcast_id, question)
        return result
    except RAGError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query index: {str(e)}")

@app.get("/api/content/{podcast_id}")
def get_podcast_content(podcast_id: str):
    """
    Returns full transcripts, timeline segments, show notes, and social media deliverables.
    """
    job = load_job_state(podcast_id)
    if not job or job["status"] != "done":
        raise HTTPException(
            status_code=404, 
            detail="Analytics content not found. Verify if the job is completed."
        )
        
    return {
        "podcast_id": podcast_id,
        "title": job.get("title"),
        "youtube_url": job.get("youtube_url"),
        "segments": job.get("segments", []),
        "show_notes": job.get("content", {}).get("show_notes", ""),
        "key_quotes": job.get("content", {}).get("key_quotes", []),
        "social_posts": job.get("content", {}).get("social_posts", {})
    }
