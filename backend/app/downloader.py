import os
import yt_dlp
import logging

logger = logging.getLogger(__name__)

class DownloadError(Exception):
    """Custom exception raised when yt-dlp downloading fails."""
    pass

def download_youtube_audio(youtube_url: str, output_dir: str, podcast_id: str) -> str:
    """
    Downloads the audio stream from a YouTube URL using yt-dlp, 
    converts it to a lightweight 16kHz mono MP3, and saves it.
    
    Args:
        youtube_url (str): The public YouTube link.
        output_dir (str): Folder where the audio will be saved.
        podcast_id (str): Unique identifier for the podcast.
        
    Returns:
        str: Absolute file path to the downloaded MP3.
    """
    os.makedirs(output_dir, exist_ok=True)
    output_template = os.path.join(output_dir, f"{podcast_id}.%(ext)s")
    final_output_path = os.path.join(output_dir, f"{podcast_id}.mp3")

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cookies_path = os.path.join(backend_dir, 'cookies.txt')

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '128',
        }],
        # Resample to 16000Hz and mono for optimal speech recognition
        'postprocessor_args': [
            '-ar', '16000',
            '-ac', '1'
        ],
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},  # Resolve JavaScript anti-bot challenges using local Node.js
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-Fetch-Mode': 'navigate',
        }
    }

    logger.info(f"Initiating yt-dlp audio extraction for: {youtube_url}")
    
    # 1. Try manual cookies.txt file first (most reliable on Windows to bypass locked browser file)
    if os.path.exists(cookies_path):
        logger.info(f"Found manual cookies.txt at: {cookies_path}. Using it for download.")
        temp_opts = ydl_opts.copy()
        temp_opts['cookiefile'] = cookies_path
        try:
            with yt_dlp.YoutubeDL(temp_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                duration = info.get('duration', 0)
                if duration > 28800:
                    raise DownloadError("The video duration exceeds our maximum limit of 8 hours.")
                title = info.get('title', 'Unknown Podcast')
                logger.info(f"Successfully downloaded audio with manual cookies.txt: '{title}' ({duration}s)")
                
                if os.path.exists(final_output_path):
                    return final_output_path
                else:
                    potential_path = os.path.join(output_dir, f"{podcast_id}.mp3")
                    if os.path.exists(potential_path):
                        return potential_path
                    raise DownloadError("Audio file was downloaded but post-processing failed to write final MP3.")
        except Exception as e:
            err_str = str(e).lower()
            if "exceeds our maximum limit" in err_str:
                raise DownloadError(str(e))
            logger.warning(f"Failed download using manual cookies.txt: {e}. Trying browser cookies fallback...")

    # 2. Try Chrome/Edge cookies fallback (might fail if Chrome is open due to Windows file lock)
    for browser in ['chrome', 'edge']:
        try:
            logger.info(f"Attempting to download using cookies from browser: {browser}...")
            temp_opts = ydl_opts.copy()
            temp_opts['cookiesfrombrowser'] = (browser,)
            with yt_dlp.YoutubeDL(temp_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                duration = info.get('duration', 0)
                if duration > 28800:
                    raise DownloadError("The video duration exceeds our maximum limit of 8 hours.")
                title = info.get('title', 'Unknown Podcast')
                logger.info(f"Successfully downloaded audio with {browser} cookies: '{title}' ({duration}s)")
                
                if os.path.exists(final_output_path):
                    return final_output_path
                else:
                    potential_path = os.path.join(output_dir, f"{podcast_id}.mp3")
                    if os.path.exists(potential_path):
                        return potential_path
                    raise DownloadError("Audio file was downloaded but post-processing failed to write final MP3.")
        except Exception as e:
            err_str = str(e).lower()
            if "exceeds our maximum limit" in err_str:
                raise DownloadError(str(e))
            logger.warning(f"Failed download using {browser} cookies: {e}. Trying next option...")
            continue

    # 3. Final fallback: Run without cookies
    try:
        logger.info("Falling back to downloading without cookies...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            duration = info.get('duration', 0)
            if duration > 28800:
                raise DownloadError("The video duration exceeds our maximum limit of 8 hours.")
            title = info.get('title', 'Unknown Podcast')
            logger.info(f"Successfully downloaded audio without cookies: '{title}' ({duration}s)")
            
            if os.path.exists(final_output_path):
                return final_output_path
            else:
                potential_path = os.path.join(output_dir, f"{podcast_id}.mp3")
                if os.path.exists(potential_path):
                    return potential_path
                raise DownloadError("Audio file was downloaded but post-processing failed to write final MP3.")
    except yt_dlp.utils.DownloadError as de:
        error_msg = str(de)
        logger.error(f"yt-dlp download failed: {error_msg}")
        if "private" in error_msg.lower():
            raise DownloadError("This YouTube video is private or unavailable.")
        elif "sign in" in error_msg.lower():
            raise DownloadError("This video requires sign-in (age-restricted or private).")
        elif "country" in error_msg.lower() or "geo" in error_msg.lower():
            raise DownloadError("This video is geoblocked/region-locked.")
        else:
            raise DownloadError(f"Failed to fetch YouTube media: {error_msg.split(';')[0]}")
    except Exception as e:
        logger.error(f"Unexpected download error: {str(e)}")
        raise DownloadError(f"Ingestion pipeline failed during audio download: {str(e)}")
