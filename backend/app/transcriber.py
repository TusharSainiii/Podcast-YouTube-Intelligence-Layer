import os
import logging
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
    """Runs speech-to-text locally using the openai-whisper library."""
    global _local_whisper_model
    
    logger.info("Initializing local Whisper transcription...")
    try:
        import whisper
    except ImportError:
        raise TranscriptionError(
            "Local whisper package is not installed. Add 'openai-whisper' to requirements.txt."
        )
        
    try:
        # Lazy load model and cache it
        if _local_whisper_model is None:
            model_size = settings.WHISPER_LOCAL_MODEL
            logger.info(f"Loading local Whisper model: '{model_size}' (this may take a moment on first run)...")
            _local_whisper_model = whisper.load_model(model_size)
            logger.info("Whisper model loaded successfully.")
            
        logger.info(f"Transcribing '{audio_path}' locally...")
        result = _local_whisper_model.transcribe(audio_path, verbose=False)
        
        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "start": float(seg.get("start", 0.0)),
                "end": float(seg.get("end", 0.0)),
                "text": str(seg.get("text", "")).strip()
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
        logger.info(f"Dispatching API audio transcription request via {provider}...")
        client = OpenAI(api_key=api_key, base_url=base_url)
        
        with open(audio_path, "rb") as audio_file:
            # We request verbose_json response format to get detailed word/segment timestamps
            transcript_response = client.audio.transcriptions.create(
                file=audio_file,
                model=model_name,
                response_format="verbose_json"
            )
            
        # Parse standard OpenAI verbose_json segments
        segments = []
        # API returns data in transcript_response.segments
        response_dict = transcript_response.model_dump() if hasattr(transcript_response, "model_dump") else transcript_response
        raw_segments = response_dict.get("segments", [])
        
        if not raw_segments:
            # Fallback if segments list is empty but text is present
            text = response_dict.get("text", "")
            if text:
                segments.append({
                    "start": 0.0,
                    "end": 60.0,  # Arbitrary timing fallback
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
        raise TranscriptionError(f"Cloud transcription API error: {str(e)}")
