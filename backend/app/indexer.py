import os
import logging
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from app.config import settings

logger = logging.getLogger(__name__)

class IndexingError(Exception):
    """Custom exception raised when indexing processing fails."""
    pass

def get_embeddings_model():
    """
    Initializes and returns the appropriate LangChain Embeddings model 
    based on configurations.
    """
    if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        try:
            from langchain_openai import OpenAIEmbeddings
            logger.info("Initializing OpenAIEmbeddings model...")
            return OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        except ImportError:
            logger.warning("langchain-openai package not installed. Falling back to HuggingFace embeddings.")
            
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        logger.info("Initializing HuggingFace sentence-transformers (all-MiniLM-L6-v2) embeddings model...")
        return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    except Exception as e:
        raise IndexingError(f"Failed to initialize embeddings model: {str(e)}")

def format_seconds_to_timestamp(seconds: float) -> str:
    """Helper to convert float seconds to 'HH:MM:SS' or 'MM:SS' format."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def chunk_segments(segments: List[Dict[str, Any]], chunk_size: int = 500, chunk_overlap: int = 100) -> List[Document]:
    """
    Groups and chunks short transcription segments into context-rich blocks.
    Preserves exact start and end timestamps in metadata.
    """
    documents = []
    
    current_text = ""
    current_start = 0.0
    current_end = 0.0
    
    for i, seg in enumerate(segments):
        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", 0.0))
        text = str(seg.get("text", "")).strip()
        
        if not text:
            continue
            
        if not current_text:
            current_start = start
            current_text = text
            current_end = end
        else:
            current_text += " " + text
            current_end = end
            
        # If chunk is large enough or it is the last segment, write it
        if len(current_text) >= chunk_size or i == len(segments) - 1:
            timestamp_str = format_seconds_to_timestamp(current_start)
            
            # Save the chunk as a LangChain Document with metadata
            doc = Document(
                page_content=current_text,
                metadata={
                    "start_sec": current_start,
                    "end_sec": current_end,
                    "timestamp_str": timestamp_str,
                }
            )
            documents.append(doc)
            
            # Start a new chunk with overlap from the last few words
            # To preserve simple overlap, we can reset current_text to include the current segment
            # so the next chunk starts with the tail of this chunk
            words = current_text.split()
            overlap_words = words[-15:] if len(words) > 15 else words
            current_text = " ".join(overlap_words)
            current_start = max(current_start, current_end - 10.0) # Approx timing offset
            
    logger.info(f"Chunked {len(segments)} transcript segments into {len(documents)} context blocks.")
    return documents

def build_and_save_vector_index(segments: List[Dict[str, Any]], podcast_id: str) -> str:
    """
    Ingests raw transcription segments, chunks them, computes embeddings, 
    builds a local FAISS index, and serializes it to the local filesystem.
    
    Args:
        segments (List[Dict[str, Any]]): Raw Whisper segments.
        podcast_id (str): Unique identifier of the podcast.
        
    Returns:
        str: Absolute path to the folder containing the saved FAISS index.
    """
    if not segments:
        raise IndexingError("No transcription segments available to index.")
        
    try:
        # 1. Chunk segments into documents
        documents = chunk_segments(segments)
        if not documents:
            raise IndexingError("No valid text documents could be chunked from segments.")
            
        # 2. Get embeddings model
        embeddings = get_embeddings_model()
        
        # 3. Create FAISS vector store
        logger.info(f"Compiling FAISS vector store for podcast_id: {podcast_id}...")
        vector_store = FAISS.from_documents(documents, embeddings)
        
        # 4. Serialize and save to disk
        output_dir = os.path.join(settings.INDEXES_DIR, podcast_id)
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Saving serialized FAISS files to: {output_dir}")
        vector_store.save_local(output_dir)
        
        logger.info("FAISS vector store built and saved successfully.")
        return output_dir
        
    except Exception as e:
        logger.error(f"Vector indexing failed: {str(e)}")
        raise IndexingError(f"Ingestion pipeline failed during FAISS indexing: {str(e)}")
