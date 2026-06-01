# Detailed Implementation Plan & Checklist

---

## 1. Project Directory Architecture
The workspace will be organized into isolated directories for the FastAPI backend and React frontend.

```
Podcast-YouTube-Intelligence-Layer/
├── docs/                      # Planning & Architecture Specifications
│   ├── phase1_prd.md
│   ├── phase2_trd.md
│   ├── phase3_app_flow.md
│   ├── phase4_ui_ux_design.md
│   ├── phase5_backend_schema.md
│   └── phase6_implementation_plan.md
├── backend/                   # FastAPI Python Application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # API routing & server startup
│   │   ├── config.py          # Environment settings
│   │   ├── downloader.py      # yt-dlp downloading module
│   │   ├── transcriber.py     # Whisper transcription logic
│   │   ├── indexer.py         # FAISS vector database builder
│   │   ├── rag.py             # Contextual QA RAG engine
│   │   └── generator.py       # Show notes, quotes, and social generators
│   ├── downloads/             # Temporary MP3 files storage
│   ├── indexes/               # Persistent FAISS indices
│   ├── data/                  # Segment transcription JSON dumps
│   ├── requirements.txt       # Python package list
│   └── .env.example
├── frontend/                  # React + Vite Client Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatUI.jsx
│   │   │   ├── Timeline.jsx
│   │   │   └── GeneratedContent.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ProcessingPage.jsx
│   │   │   └── ResultsPage.jsx
│   │   ├── App.jsx
│   │   ├── index.css          # Styling & Animations
│   │   └── main.jsx
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── .gitignore
```

---

## 2. Phase 6A — Environment & Project Setup Checklist
*   [ ] Create high-level folders (`backend/`, `frontend/`, `docs/`).
*   [ ] **Backend requirements.txt Setup:** Include following dependencies:
    *   `fastapi==0.110.0`
    *   `uvicorn==0.28.0`
    *   `pydantic==2.6.4`
    *   `pydantic-settings==2.2.1`
    *   `python-dotenv==1.0.1`
    *   `yt-dlp==2024.3.10`
    *   `openai-whisper==20231117`
    *   `langchain==0.1.12`
    *   `langchain-community==0.0.28`
    *   `langchain-openai==0.0.9`
    *   `sentence-transformers==2.5.1`
    *   `faiss-cpu==1.8.0`
    *   `python-multipart==0.0.9`
*   [ ] **Frontend package.json Setup:** Configure React with Vite + Tailwind:
    *   `react`, `react-dom`
    *   `react-router-dom`
    *   `lucide-react` (high-quality icons)
    *   `tailwindcss`, `autoprefixer`, `postcss`
*   [ ] **Root .gitignore Config:** Filter out `node_modules/`, Python virtual environments (`.venv/`), temporary `/downloads/*.mp3`, local search `/indexes/`, and `.env` credentials.

---

## 3. Phase 6B — Backend Implementation Roadmap
*   [ ] **1. Configuration (`app/config.py`):** Core settings mapped to Pydantic BaseSettings loading variables from `.env`.
*   [ ] **2. Downloader Wrapper (`app/downloader.py`):** Built with `yt-dlp` to extract mono MP3 files under `downloads/` with error management.
*   [ ] **3. Whisper Transcriber (`app/transcriber.py`):** Loads either local Whisper (e.g. `base` model) or dispatches API request, producing timestamped segments (`[{'start', 'end', 'text'}]`).
*   [ ] **4. Vector Indexer (`app/indexer.py`):** Uses LangChain's RecursiveTextSplitter, local HuggingFace embeddings (`all-MiniLM-L6-v2`), and writes index folders serialize to disk.
*   [ ] **5. RAG Engine (`app/rag.py`):** Configures vector retrieval and prompt templates to map LLM QA answers directly alongside segment source objects.
*   [ ] **6. Content Synthesizer (`app/generator.py`):** Formats structured prompts to compile Markdown show notes, quotes list, and Twitter, LinkedIn, and Instagram content drafts.
*   [ ] **7. Main Server Router (`app/main.py`):** Mounts routers, adds CORS configurations, initializes storage paths, and handles async background workers.

---

## 4. Phase 6C — Frontend Implementation Roadmap
*   [ ] **1. Global Setup (`App.jsx`, `index.css`):** Setup standard dark layout, Google Font link, page routing, and glowing transition frames.
*   [ ] **2. Landing Page (`pages/LandingPage.jsx`):** Elegant hero, paste control URL bar, direct file drag-and-drop tab wrappers.
*   [ ] **3. Processing View (`pages/ProcessingPage.jsx`):** SSE or polling loop querying endpoint `/api/job/{job_id}` every 2 seconds, displaying glowing circles and completed text ticks.
*   [ ] **4. Results Dashboard (`pages/ResultsPage.jsx`):** Two-pane display linking Timeline scrolling to active Chat bubbles and generated tabs.
*   [ ] **5. Interactive Scrubber Timeline (`components/Timeline.jsx`):** Scrollable segments list mapping active playback or focus highlights to click events.
*   [ ] **6. Natural Language Chat (`components/ChatUI.jsx`):** Bubbles thread mapping answers to click-focus source timings.
*   [ ] **7. Content Tab Components (`components/GeneratedContent.jsx`):** Markdown summaries grid, clickable quotes, and social share drafts with custom Copy actions.

---

## 5. Phase 6D — Integration & Ingestion Verification
*   [ ] Configure backend CORS parameters.
*   [ ] Connect frontend API service layers to matching endpoints.
*   [ ] Verify the full unified ingestion flow using sample YouTube URL.
*   [ ] Test audio file uploads (multipart request payloads).
*   [ ] Verify chat queries load precise citation chips.
*   [ ] Audit production checklist safeguards:
    *   [ ] Safe URL inputs regex sanitation.
    *   [ ] Strict environment variables segregation.
    *   [ ] Dynamic loading and unloading FAISS indexes in RAM.
    *   [ ] Elegant React Error boundaries preventing screen blackouts.

---

## 6. Phase 6E — Release & Deployment Planning
*   [ ] Add a highly professional `README.md` complete with visual system graphics, installation scripts, environment configuration files, and quickstart commands.
*   [ ] Initialize Railway / Render deployment parameters for the FastAPI Python server.
*   [ ] Initialize Vercel configurations for the compiled Vite dashboard.
