import logging
import json
from typing import List, Dict, Any
from app.config import settings
from app.rag import get_llm_model

logger = logging.getLogger(__name__)

class GenerationError(Exception):
    """Custom exception raised when content synthesis fails."""
    pass

def generate_podcast_analytics(segments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarizes and synthesizes a full podcast transcript to generate show notes, 
    notable quotes, and multi-platform social media posts.
    
    Args:
        segments (List[Dict[str, Any]]): Raw transcription segments.
        
    Returns:
        Dict[str, Any]: Formatted data containing show_notes, key_quotes, and social_posts.
    """
    if not segments:
        raise GenerationError("No transcription segments available to summarize.")
        
    try:
        # 1. Prepare condensed transcript with timestamps for context
        transcript_blocks = []
        for seg in segments:
            start = float(seg.get("start", 0.0))
            mins = int((start % 3600) // 60)
            secs = int(start % 60)
            timestamp = f"{mins:02d}:{secs:02d}"
            
            transcript_blocks.append(f"[{timestamp}] {seg.get('text', '')}")
            
        full_transcript_str = "\n".join(transcript_blocks)
        
        # If the transcript is extremely long, limit it to avoid exceeding LLM context limits
        # Slicing to ~15,000 words keeps it safe for standard model contexts (approx 60,000 chars)
        if len(full_transcript_str) > 70000:
            logger.warning("Transcript is extremely long, truncating middle segments to fit LLM window.")
            full_transcript_str = (
                full_transcript_str[:35000] + 
                "\n\n... [TRUNCATED FOR CONTEXT LIMITS] ...\n\n" + 
                full_transcript_str[-35000:]
            )
            
        # 2. Get LLM client
        llm = get_llm_model()
        
        # 3. Create system prompts
        # We request the output in a strict, clean JSON structure so the backend can parse and serialize it easily.
        system_prompt = (
            "You are a professional digital content marketer and podcast producer.\n"
            "Your task is to analyze the provided podcast transcript (complete with timestamps) and generate "
            "a comprehensive content bundle in a structured JSON format.\n\n"
            "Required Outputs in the JSON structure:\n"
            "1. 'show_notes': A beautifully styled, highly professional Markdown outline summarizing the episode. "
            "Include an Executive Summary, Key Takeaways (bullet points), and a Detailed Timeline breakdown. "
            "Use clear headings (H2, H3), blockquotes, and professional spacing. Include clickable timestamp notes "
            "like '[05:12]' in the timeline breakdown.\n"
            "2. 'key_quotes': A list of exactly 3-5 notable, high-impact quotes extracted word-for-word from "
            "the transcript, including their exact timestamp. Format each as a JSON object: {'timestamp': 'MM:SS', 'text': '...'}.\n"
            "3. 'social_posts': A dictionary containing platform-specific drafts:\n"
            "   - 'twitter': A professional, highly engaging, structured Twitter thread (3-5 tweets) with emojis and key summaries.\n"
            "   - 'linkedin': A professional, insights-oriented narrative post outlining business lessons, frameworks, or metrics.\n"
            "   - 'instagram': Catchy visual hook description, caption body, and relevant hashtags.\n\n"
            "--- IMPORTANT RULES ---\n"
            "Your entire output must be valid, parseable JSON only. Do not wrap the JSON in Markdown ticks or add conversational preambles/postambles. "
            "Escape all internal quotes correctly in the JSON string fields.\n\n"
            "Output JSON Structure:\n"
            "{\n"
            "  \"show_notes\": \"(Markdown string here)\",\n"
            "  \"key_quotes\": [ {\"timestamp\": \"MM:SS\", \"text\": \"...\"} ],\n"
            "  \"social_posts\": {\n"
            "    \"twitter\": \"(Twitter post text)\",\n"
            "    \"linkedin\": \"(LinkedIn post text)\",\n"
            "    \"instagram\": \"(Instagram post text)\"\n"
            "  }\n"
            "}"
        )
        
        logger.info("Calling LLM to generate podcast deliverables...")
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Here is the timestamped podcast transcript:\n\n{full_transcript_str}")
        ]
        
        response = llm.invoke(messages)
        raw_output = response.content.strip()
        
        # Clean markdown wrappers if any were generated (e.g. ```json ... ```)
        if raw_output.startswith("```"):
            lines = raw_output.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_output = "\n".join(lines).strip()
            
        # Parse the compiled JSON deliverables
        try:
            deliverables = json.loads(raw_output)
            logger.info("Content synthesis and JSON extraction complete.")
            return {
                "show_notes": deliverables.get("show_notes", ""),
                "key_quotes": deliverables.get("key_quotes", []),
                "social_posts": deliverables.get("social_posts", {})
            }
        except json.JSONDecodeError as jde:
            logger.error(f"Failed to parse LLM JSON deliverables. Output was:\n{raw_output}")
            # Fallback parsing/wrapping in case LLM outputs plain text or broken JSON
            return _generate_fallback_deliverables(raw_output)
            
    except Exception as e:
        logger.error(f"Content generation failed: {str(e)}")
        raise GenerationError(f"Ingestion pipeline failed during content generation: {str(e)}")

def _generate_fallback_deliverables(raw_text: str) -> Dict[str, Any]:
    """Fallback compiler in case LLM yields a markdown/text output instead of structured JSON."""
    logger.warning("Executing fallback content parsing logic...")
    return {
        "show_notes": f"### Show Notes\n\n{raw_text}",
        "key_quotes": [
            {"timestamp": "00:00", "text": "Refer to show notes for insights."}
        ],
        "social_posts": {
            "twitter": "New podcast episode processed! Check the dashboard show notes for full insights.",
            "linkedin": "We just finished indexing our latest interview. Explore key quotes and show notes in our new workspace.",
            "instagram": "Podcast processed successfully! Check link in bio for details. #podcast"
        }
    }
