# Technical Requirements Document (TRD)

---

## 1. High-Level Architecture Diagram
The system follows a decoupled Client-Server architecture utilizing a local-first persistent file storage strategy for indexing and analytics data, and an asynchronous worker queue setup driven by FastAPI background processes.

```
+-------------------------------------------------------------------------------------------------+
|                                        FRONTEND (React + Vite)                                  |
|  - Landing (URL/File Ingestion)                                                                 |
|  - Processing Screen (Status tracker / polling)                                                 |
|  - Results Dashboard (Interactive Timeline, RAG Chat Panel, Social/Summary Content Tabs)        |
+------------------------------------+------------------------------------+-----------------------+
                                     |                                    ^
                  POST /api/process  |                                    | GET /api/job/{id}
                  POST /api/query    |                                    | GET /api/content/{id}
                                     v                                    |
+------------------------------------+------------------------------------+-----------------------+
|                                        BACKEND (FastAPI API layer)                              |
|  - Endpoints orchestration (main.py)                                                            |
|  - Pydantic verification layers                                                                 |
|  - CORS Config & API security middlewares                                                       |
+------------------------------------+------------------------------------------------------------+
                                     |
                                     | Dispatches Asynchronous Background Tasks
                                     v
+------------------------------------+------------------------------------------------------------+
|                                  BACKGROUND PIPELINE (FastAPI Worker Context)                   |
|                                                                                                 |
|   1. yt-dlp Downloader  ==> Extracts high-quality mono MP3 streams from YouTube                 |
|   2. Whisper Processor  ==> Transcribes MP3 to JSON chunks with accurate [start, end] stamps     |
|   3. LangChain Indexer  ==> Audio chunking (RecursiveCharacterTextSplitter)                     |
|                         ==> Local FAISS vector index creation via Embeddings                    |
|   4. RAG engine         ==> Vector retrieval QA combined with OpenAI GPT / Groq Llama           |
|   5. Content Generator  ==> LLM summarizer and social media content engine                      |
+------------------------------------+------------------------------------------------------------+
                                     |
                                     | Writes outputs and index files locally
                                     v
+------------------------------------+------------------------------------------------------------+
|                                    PERSISTENCE & STORAGE (Local Disk MVP)                       |
|  - /downloads/   ==> Staging location for downloaded MP3 audio files                            |
|  - /indexes/     ==> FAISS serialized indices named after podcast_id                            |
|  - /data/        ==> Full JSON dumps containing transcription segments & generated documents    |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Technology Choices & Rationale

| Layer | Technology | Choice Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React + Vite** | Extremely fast hot-module-reloading (HMR) for development, high-performance static bundle compilation, and standard components architecture. |
| **Styling** | **Tailwind CSS** | Premium style designs using utility classes, responsive grids, and standard theme extensions. |
| **API Server** | **FastAPI (Python)** | Asynchronous operation loop, native Pydantic schema validation, automatically generated Swagger docs, and simple background task runners. |
| **Downloader** | **yt-dlp** | The industry standard for downloading audio/video streams from YouTube, highly maintained, handles rate-limits and cipher changes. |
| **Transcription** | **OpenAI Whisper** | High-fidelity open-source automatic speech recognition (ASR) mapping. Supports local running (CPU/GPU) and simple API wrappers. |
| **Orchestration**| **LangChain** | Integrates splitting logic (RecursiveCharacterTextSplitter), local FAISS vector stores, and custom QA prompt chains easily. |
| **Vector Store** | **FAISS (Facebook AI)** | Extremely fast, lightweight local-first database that serializes vector representations and matching records directly to files, removing DB hosting costs. |
| **LLM Inference** | **Groq Llama-3 / OpenAI**| Groq provides incredibly low response latency (up to 800 tokens/sec) and has a free API tier, giving the app high responsiveness. OpenAI GPT-3.5-turbo provides a robust fallback. |
| **Embeddings** | **sentence-transformers** | Using local `all-MiniLM-L6-v2` embeddings provides free, unlimited vector representations without requiring OpenAI API tokens or internet roundtrips for embedding. |

---

## 3. Data Processing Pipeline & Flow

The lifecycle of an ingestion job operates as a unidirectional state pipeline:

```
[User Paste Link] ==> Validation Middleware ==> Create job_id & Set status "queued"
                           ||
                           v (Async Dispatch)
                  [State: downloading] ==> Run yt-dlp -> save to /downloads/{podcast_id}.mp3
                           ||
                           v
                  [State: transcribing] ==> Run Whisper -> generate transcript segments with start/end
                           ||
                           v
                  [State: indexing] ==> Split segments into chunks -> Embed using sentence-transformers -> Store in FAISS
                           ||
                           v
                  [State: generating] ==> Call LLM (Llama-3/GPT-3.5) with full transcript to write Summary & Social posts
                           ||
                           v
                  [State: done] ==> Write metadata, segments, and content to /data/{podcast_id}.json -> Clear MP3 file
```

---

## 4. API Endpoints Specification

### 4.1. POST `/api/process`
Submits a YouTube URL or direct audio upload to initialize the background pipeline.

*   **Method:** `POST`
*   **Request Schema (JSON):**
    ```json
    {
      "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "custom_title": "Optional Custom Name"
    }
    ```
    *(For audio uploads, the endpoint will support `multipart/form-data` incorporating an `audio_file` field)*
*   **Response Schema (JSON):**
    ```json
    {
      "job_id": "8f8b7b2a-1c5d-4f6e-a3b8-9be4bb48510c",
      "status": "queued",
      "message": "Podcast processing initialized successfully."
    }
    ```

### 4.2. GET `/api/job/{job_id}`
Retrieves the real-time processing status of the ingestion pipeline.

*   **Method:** `GET`
*   **Response Schema (JSON):**
    ```json
    {
      "job_id": "8f8b7b2a-1c5d-4f6e-a3b8-9be4bb48510c",
      "status": "transcribing", // queued | downloading | transcribing | indexing | generating | done | error
      "progress_step": 2, // 0 to 5 matching the states
      "error_message": null,
      "payload": {
        "title": "Rick Astley - Never Gonna Give You Up",
        "duration_seconds": 212,
        "created_at": "2026-06-01T15:00:00Z"
      }
    }
    ```

### 4.3. POST `/api/query`
Executes natural language queries against the FAISS index mapped to a specific podcast.

*   **Method:** `POST`
*   **Request Schema (JSON):**
    ```json
    {
      "podcast_id": "8f8b7b2a-1c5d-4f6e-a3b8-9be4bb48510c",
      "question": "What is the guest's main argument about AI regulations?"
    }
    ```
*   **Response Schema (JSON):**
    ```json
    {
      "answer": "The guest argues that AI regulations are currently too focused on model weights rather than deployment safety, which might restrict open-source developers unnecessarily...",
      "sources": [
        {
          "start_sec": 312.5,
          "end_sec": 328.0,
          "timestamp_str": "05:12",
          "text": "I think regulating open source model weights is a massive mistake. We should regulate application endpoints instead."
        },
        {
          "start_sec": 482.0,
          "end_sec": 501.5,
          "timestamp_str": "08:02",
          "text": "If you regulate model architectures, you only stop safety researchers and hobbyists from exploring them."
        }
      ]
    }
    ```

### 4.4. GET `/api/content/{podcast_id}`
Returns all auto-generated analytics, summaries, and social media deliverables once the job is marked `done`.

*   **Method:** `GET`
*   **Response Schema (JSON):**
    ```json
    {
      "podcast_id": "8f8b7b2a-1c5d-4f6e-a3b8-9be4bb48510c",
      "title": "Rick Astley - Never Gonna Give You Up",
      "show_notes": "### Show Notes \nIn this discussion, the key elements of...",
      "key_quotes": [
        {
          "timestamp": "01:23",
          "text": "Never gonna give you up, never gonna let you down."
        }
      ],
      "social_posts": {
        "twitter": "Here is a quick summary thread from today's episode: \n1/3...",
        "linkedin": "In today's podcast segment, we discussed commitment models...",
        "instagram": "Commitment is key. Read what our guests had to say! #podcast #insights"
      },
      "segments": [
        {
          "start": 0.0,
          "end": 5.0,
          "text": "We're no strangers to love..."
        }
      ]
    }
    ```

---

## 5. Environment Variables & Configurations
The backend server reads configuration values from a root `.env` file:

```ini
# Environment
ENV=development
PORT=8000
HOST=0.0.0.0

# LLM Providers (Configure at least one)
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Selected Active LLM Models
LLM_PROVIDER=groq # groq | openai
LLM_MODEL=llama3-70b-8192 # groq: llama3-70b-8192 or openai: gpt-3.5-turbo

# Transcription Configurations
WHISPER_MODE=local # local | api
WHISPER_LOCAL_MODEL=base # tiny | base | small | medium (ignored if mode is api)
WHISPER_API_PROVIDER=openai # openai | groq (used if mode is api)

# File Paths
DOWNLOADS_DIR=./downloads
INDEXES_DIR=./indexes
DATA_DIR=./data

# CORS Allowed Origin
CORS_ORIGINS=http://localhost:5173
```

---

## 6. Technical Constraints & Mitigations

### 6.1. Slow Transcription in Local Environments
*   **Constraint:** Standard OpenAI Whisper running locally on a CPU is slow and heavy, which can cause timeout issues or block the main thread.
*   **Mitigations:**
    1. **Asynchronous Background Processing:** Run the Whisper task in a background thread via FastAPI `BackgroundTasks`, releasing the main thread immediately.
    2. **Local Model Toggling:** Allow switching to a lighter model (`tiny` or `base`) via `.env` for ultra-fast local testing.
    3. **Cloud API Toggle:** Support cloud-based Whisper execution (via Groq/OpenAI transcriptions endpoints) which runs 10x faster and requires no local resources.

### 6.2. Large Audio Stream Handling
*   **Constraint:** Extracting and parsing audio from long videos (e.g. 2+ hour podcasts) uses significant disk space and RAM.
*   **Mitigations:**
    1. **Audio Extraction Filters:** Use `yt-dlp` arguments to only extract audio files, avoiding video streams entirely.
    2. **Compression Post-download:** Compress audio files to 16kHz mono MP3 or OGG formats, reducing disk footprint by up to 90% before transcription.
    3. **Temporary Staging Cleanups:** Automatically delete raw MP3 files from `/downloads/` as soon as transcription completes, retaining only the structured JSON transcript.

### 6.3. Local FAISS Index Scalability & Persistence
*   **Constraint:** Storing embeddings in RAM causes memory issues as more podcasts are ingested.
*   **Mitigations:**
    1. **File Serialization:** Save the FAISS index structure (index files and mapping data) to `/indexes/{podcast_id}/` immediately after compilation.
    2. **On-demand Loading:** Load the FAISS index into memory only when a query (`/api/query`) is received, and unload it immediately after returning the answer.

---

## 7. Deployment Roadmap
*   **Local Development Environment:**
    *   Backend runs via `uvicorn app.main:app --reload` on port `8000`.
    *   Frontend runs via Vite using `npm run dev` on port `5173`.
    *   Local directory caches (`/downloads`, `/indexes`, `/data`) initialized in the workspace.
*   **Production Hosting (Render/Railway):**
    *   **Backend Application:** Deployed as a python service. A persistent volume mount is configured on `/indexes` and `/data` to preserve indexed podcast data between restarts.
    *   **External Packages:** Deployments require installation of the `ffmpeg` system binary (essential for `yt-dlp` and Whisper audio conversion).
    *   **Frontend Dashboard:** Static site compiled via `npm run build` and deployed to Vercel, Netlify, or as static files served via the FastAPI backend.
