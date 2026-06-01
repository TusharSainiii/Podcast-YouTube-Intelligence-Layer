import os
import logging
from typing import List, Dict, Any
from langchain_community.vectorstores import FAISS
from app.config import settings
from app.indexer import get_embeddings_model

logger = logging.getLogger(__name__)

class RAGError(Exception):
    """Custom exception raised when RAG query execution fails."""
    pass

def get_llm_model():
    """
    Initializes and returns the configured Chat LLM model 
    (either Groq or OpenAI).
    """
    provider = settings.LLM_PROVIDER
    
    if provider == "groq":
        api_key = settings.GROQ_API_KEY
        if not api_key or api_key.strip() == "":
            raise RAGError("Groq API key is missing. Please configure GROQ_API_KEY in .env.")
            
        try:
            from langchain_openai import ChatOpenAI
            logger.info(f"Initializing ChatGroq (via OpenAI base URL) with model: '{settings.LLM_MODEL}'...")
            return ChatOpenAI(
                openai_api_key=api_key,
                openai_api_base="https://api.groq.com/openai/v1",
                model_name=settings.LLM_MODEL,
                temperature=0.2
            )
        except Exception as e:
            raise RAGError(f"Failed to initialize Groq client wrapper: {str(e)}")
            
    elif provider == "openai":
        api_key = settings.OPENAI_API_KEY
        if not api_key or api_key.strip() == "":
            raise RAGError("OpenAI API key is missing. Please configure OPENAI_API_KEY in .env.")
            
        try:
            from langchain_openai import ChatOpenAI
            logger.info(f"Initializing OpenAI ChatOpenAI with model: '{settings.LLM_MODEL}'...")
            return ChatOpenAI(
                openai_api_key=api_key,
                model_name=settings.LLM_MODEL,
                temperature=0.2
            )
        except Exception as e:
            raise RAGError(f"Failed to initialize OpenAI client wrapper: {str(e)}")
            
    else:
        raise RAGError(f"Unsupported LLM_PROVIDER configured: '{provider}'")

def query_podcast_index(podcast_id: str, question: str) -> Dict[str, Any]:
    """
    Loads the local FAISS index for a specific podcast, retrieves similar text chunks,
    queries the selected LLM with context, and returns the answer alongside citations.
    
    Args:
        podcast_id (str): The target podcast to query.
        question (str): The natural language query.
        
    Returns:
        Dict[str, Any]: Contains 'answer' and 'sources' list.
    """
    index_path = os.path.join(settings.INDEXES_DIR, podcast_id)
    if not os.path.exists(index_path):
        raise RAGError(
            f"Podcast index not found. The podcast must be processed successfully "
            f"before running queries."
        )
        
    try:
        # 1. Load embeddings & vector store
        embeddings = get_embeddings_model()
        logger.info(f"Loading local FAISS vector store from: {index_path}...")
        vector_store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        
        # 2. Retrieve top matching segments
        logger.info(f"Retrieving top documents for query: '{question}'...")
        docs = vector_store.similarity_search(question, k=4)
        logger.info(f"Retrieved {len(docs)} matching documents.")
        
        if not docs:
            return {
                "answer": "I couldn't find any relevant discussion regarding that topic in this podcast episode.",
                "sources": []
            }
            
        # 3. Compile context and extract sources
        context_str = ""
        sources = []
        seen_timestamps = set()
        
        for doc in docs:
            start_sec = doc.metadata.get("start_sec", 0.0)
            end_sec = doc.metadata.get("end_sec", 0.0)
            timestamp_str = doc.metadata.get("timestamp_str", "00:00")
            content = doc.page_content.strip()
            
            # Formulate full context blocks for LLM
            context_str += f"[{timestamp_str}] {content}\n\n"
            
            # Deduplicate sources based on start timestamp
            if timestamp_str not in seen_timestamps:
                seen_timestamps.add(timestamp_str)
                sources.append({
                    "start_sec": start_sec,
                    "end_sec": end_sec,
                    "timestamp_str": timestamp_str,
                    "text": content
                })
                
        # Sort sources chronologically
        sources = sorted(sources, key=lambda x: x["start_sec"])
        
        # 4. Generate Answer using LLM
        llm = get_llm_model()
        
        system_prompt = (
            "You are a helpful, precise podcast intelligence assistant named PodcastIQ.\n"
            "You are provided with several transcribed segments of a podcast interview, labeled with their start timestamps.\n"
            "Your task is to answer the user's question about the podcast relying ONLY on the provided context.\n\n"
            "Rules:\n"
            "1. Ground your answer strictly in the provided context transcripts. Do NOT make up facts or use outside knowledge.\n"
            "2. Be concise, clear, and direct.\n"
            "3. If the context does not contain enough information to answer the question, state that you cannot answer based on the transcript.\n"
            "4. When referencing an insight or topic, please explicitly use the timestamp brackets like [MM:SS] or [HH:MM:SS] in your sentences "
            "so the user knows exactly when it was discussed.\n\n"
            f"--- PODCAST CONTEXT ---\n{context_str}\n"
        )
        
        logger.info("Calling LLM to generate RAG response...")
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=question)
        ]
        
        response = llm.invoke(messages)
        answer = response.content.strip()
        logger.info("RAG answer successfully compiled.")
        
        return {
            "answer": answer,
            "sources": sources
        }
        
    except Exception as e:
        logger.error(f"RAG query execution failed: {str(e)}")
        raise RAGError(f"RAG execution failed: {str(e)}")
