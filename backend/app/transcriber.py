import os
import logging
import glob
import subprocess
import time
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Global cache for local Whisper model to prevent reloading on every task
_local_whisper_model = None

class TranscriptionError(Exception):
    """Custom exception raised when transcription processing fails."""
    pass

def transcribe_audio(audio_path: str) -> List[Dict[str, Any]]:
    """
    Transcribes an audio file into timestamped segments using the configured 
    WHISPER_MODE (local or api).
    
    Args:
        audio_path (str): Absolute file path to the audio source.
        
    Returns:
        List[Dict[str, Any]]: A list of segments with keys: 'start', 'end', 'text'.
    """
    if not os.path.exists(audio_path):
        raise TranscriptionError(f"Audio file not found at path: {audio_path}")
        
    if settings.WHISPER_MODE == "local":
        return _transcribe_locally(audio_path)
    elif settings.WHISPER_MODE == "api":
        return _transcribe_via_api(audio_path)
    else:
        raise TranscriptionError(f"Invalid WHISPER_MODE configured: '{settings.WHISPER_MODE}'")

def _transcribe_locally(audio_path: str) -> List[Dict[str, Any]]:
    """Runs speech-to-text locally using the faster-whisper library."""
    global _local_whisper_model
    
    logger.info("Initializing local faster-whisper transcription...")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise TranscriptionError(
            "faster-whisper package is not installed. Add 'faster-whisper' to requirements.txt."
        )
        
    try:
        # Lazy load model and cache it
        if _local_whisper_model is None:
            model_size = settings.WHISPER_LOCAL_MODEL
            logger.info(f"Loading local faster-whisper model: '{model_size}' (this may take a moment on first run)...")
            # CTranslate2 runs 4x faster on CPU with compute_type="int8", customized with cpu_threads & num_workers
            _local_whisper_model = WhisperModel(
                model_size, 
                device="cpu", 
                compute_type="int8", 
                cpu_threads=4, 
                num_workers=2
            )
            logger.info("faster-whisper model loaded successfully.")
            
        logger.info(f"Transcribing '{audio_path}' locally using faster-whisper...")
        segments_generator, info = _local_whisper_model.transcribe(audio_path, beam_size=5)
        
        segments = []
        for seg in segments_generator:
            segments.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "text": str(seg.text).strip()
            })
            
        logger.info(f"Local transcription complete. Generated {len(segments)} segments.")
        return segments
        
    except Exception as e:
        logger.error(f"Local transcription failed: {str(e)}")
        raise TranscriptionError(f"Local Whisper inference failed: {str(e)}")

def _transcribe_via_api(audio_path: str) -> List[Dict[str, Any]]:
    """Runs speech-to-text via cloud transcription services (OpenAI or Groq)."""
    logger.info("Initializing API transcription...")
    
    # Select provider configs
    provider = settings.WHISPER_API_PROVIDER
    if provider == "openai":
        api_key = settings.OPENAI_API_KEY
        base_url = None
        model_name = "whisper-1"
    elif provider == "groq":
        api_key = settings.GROQ_API_KEY
        base_url = "https://api.groq.com/openai/v1"
        model_name = "whisper-large-v3"
    else:
        raise TranscriptionError(f"Unsupported WHISPER_API_PROVIDER: '{provider}'")
        
    if not api_key or api_key.strip() == "":
        raise TranscriptionError(
            f"API key is missing for transcription provider '{provider}'. "
            f"Please check your .env configurations."
        )
        
    try:
        from openai import OpenAI
    except ImportError:
        raise TranscriptionError("OpenAI python client package is missing. Add 'openai' to requirements.txt.")
        
    try:
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        logger.info(f"Audio file size is: {file_size_mb:.2f} MB")
        
        # Configure client with a generous 3-minute timeout for network uploads
        client = OpenAI(api_key=api_key, base_url=base_url, timeout=180.0)
        
        # If the file size is larger than 24MB, split it to comply with Groq/OpenAI 25MB limit
        if file_size_mb > 24.0:
            logger.info("File size exceeds 24MB. Splitting into 10-minute chunks...")
            dirname = os.path.dirname(audio_path)
            basename = os.path.splitext(os.path.basename(audio_path))[0]
            chunk_pattern = os.path.join(dirname, f"{basename}_chunk_%03d.mp3")
            
            split_cmd = [
                "ffmpeg", "-y", "-i", audio_path,
                "-f", "segment",
                "-segment_time", "600",
                "-c", "copy",
                chunk_pattern
            ]
            logger.info(f"Running ffmpeg split command: {' '.join(split_cmd)}")
            subprocess.run(split_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            chunk_files = sorted(glob.glob(os.path.join(dirname, f"{basename}_chunk_*.mp3")))
            logger.info(f"Generated {len(chunk_files)} chunk files for transcription.")
            
            if not chunk_files:
                raise TranscriptionError("Failed to generate chunk files using ffmpeg segment command.")
                
            # Compute offsets and durations of all chunk files chronologically first
            chunk_infos = []
            current_offset = 0.0
            for chunk_path in chunk_files:
                duration = 600.0
                try:
                    duration_cmd = [
                        "ffprobe", "-v", "error", 
                        "-show_entries", "format=duration", 
                        "-of", "default=noprint_wrappers=1:nokey=1", 
                        chunk_path
                    ]
                    res = subprocess.run(duration_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                    duration = float(res.stdout.strip())
                except Exception as e:
                    logger.warning(f"Could not get exact duration for {chunk_path}: {e}. Using 600.0s fallback.")
                
                chunk_infos.append((chunk_path, current_offset, duration))
                current_offset += duration
                
            combined_segments = []
            
            # Helper function for single chunk parallel transcription
            def transcribe_single_chunk(chunk_info):
                chunk_path, offset, duration = chunk_info
                logger.info(f"Transcribing chunk: {chunk_path} with offset {offset:.2f}s")
                
                transcript_response = None
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        logger.info(f"Uploading chunk {chunk_path} (Attempt {attempt+1}/{max_retries})...")
                        with open(chunk_path, "rb") as audio_file:
                            transcript_response = client.audio.transcriptions.create(
                                file=audio_file,
                                model=model_name,
                                response_format="verbose_json"
                            )
                        break  # Success!
                    except Exception as api_err:
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to transcribe chunk {chunk_path} after {max_retries} attempts: {api_err}")
                            raise api_err
                        logger.warning(f"Attempt {attempt+1} failed with error: {api_err}. Retrying in 3 seconds...")
                        time.sleep(3)
                        
                response_dict = transcript_response.model_dump() if hasattr(transcript_response, "model_dump") else transcript_response
                raw_segments = response_dict.get("segments", [])
                
                chunk_segments = []
                if not raw_segments:
                    text = response_dict.get("text", "")
                    if text:
                        chunk_segments.append({
                            "start": offset,
                            "end": offset + duration,
                            "text": text.strip()
                        })
                else:
                    for seg in raw_segments:
                        chunk_segments.append({
                            "start": offset + float(seg.get("start", 0.0)),
                            "end": offset + float(seg.get("end", 0.0)),
                            "text": str(seg.get("text", "")).strip()
                        })
                
                try:
                    os.remove(chunk_path)
                    logger.info(f"Deleted temporary chunk file: {chunk_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete temporary chunk file {chunk_path}: {e}")
                    
                return chunk_segments

            # Execute transcription requests concurrently in a thread pool
            from concurrent.futures import ThreadPoolExecutor
            logger.info(f"Dispatching transcription for {len(chunk_infos)} chunks in parallel...")
            with ThreadPoolExecutor(max_workers=min(len(chunk_infos), 10)) as executor:
                results = executor.map(transcribe_single_chunk, chunk_infos)
                
            for chunk_segments in results:
                combined_segments.extend(chunk_segments)
                
            logger.info(f"API transcription of all chunks complete. Generated {len(combined_segments)} total segments.")
            return combined_segments
            
        else:
            # Under 24MB, upload directly in one request with a retry mechanism
            transcript_response = None
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    logger.info(f"Dispatching API audio transcription request via {provider} (Attempt {attempt+1}/{max_retries})...")
                    with open(audio_path, "rb") as audio_file:
                        transcript_response = client.audio.transcriptions.create(
                            file=audio_file,
                            model=model_name,
                            response_format="verbose_json"
                        )
                    break  # Success!
                except Exception as api_err:
                    if attempt == max_retries - 1:
                        logger.error(f"Failed direct API transcription after {max_retries} attempts: {api_err}")
                        raise api_err
                    logger.warning(f"Attempt {attempt+1} failed with error: {api_err}. Retrying in 3 seconds...")
                    time.sleep(3)
                
            segments = []
            response_dict = transcript_response.model_dump() if hasattr(transcript_response, "model_dump") else transcript_response
            raw_segments = response_dict.get("segments", [])
            
            if not raw_segments:
                text = response_dict.get("text", "")
                if text:
                    segments.append({
                        "start": 0.0,
                        "end": 60.0,
                        "text": text.strip()
                    })
            else:
                for seg in raw_segments:
                    segments.append({
                        "start": float(seg.get("start", 0.0)),
                        "end": float(seg.get("end", 0.0)),
                        "text": str(seg.get("text", "")).strip()
                    })
                    
            logger.info(f"API transcription complete. Generated {len(segments)} segments.")
            return segments
            
    except Exception as e:
        logger.error(f"API transcription request failed: {str(e)}")
        # Cleanup any remaining chunks on error
        if 'basename' in locals() and 'dirname' in locals():
            for f in glob.glob(os.path.join(dirname, f"{basename}_chunk_*.mp3")):
                try:
                    os.remove(f)
                except:
                    pass
        raise TranscriptionError(f"Cloud transcription API error: {str(e)}")
