# App Flow & Navigation Document

---

## 1. High-Level Navigation Flow Diagram

The application is structured as a dynamic Single Page Application (SPA) driven by state routing. Transitioning between pages is animated to feel smooth and fast.

```
       +------------------------------------+
       |         1. LANDING PAGE            |  <---+ (Click Brand Logo)
       |  - Brand Hero & Visual Intro       |      |
       |  - CTA "Get Started"               |      |
       +-----------------+------------------+      |
                         |                         |
                         v (Click CTA)             |
       +-----------------+------------------+      |
       |       2. INPUT / UPLOAD PAGE       |      |
       |  - YouTube URL input bar           |      |
       |  - Direct MP3/WAV upload zone      |      |
       +-----------------+------------------+      |
                         |                         |
                         v (Submit Valid URL/File) |
       +-----------------+------------------+      |
       |       3. PROCESSING SCREEN         |  ----+ (If user hits "Cancel")
       |  - Real-time step tracker (SSE)    |      |
       |  - Glowing micro-animations        |      |
       +--------+------------------+--------+      |
                |                  |               |
                | (On Success)     | (On Error)    |
                v                  v               |
       +--------+---------+   +----+--------+      |
       | 4. RESULTS VIEW  |   | 5. ERROR    | -----+ (Click "Back to Home")
       | - Timeline       |   |   PAGE      |
       | - Chat Panel     |   +-------------+
       | - Generated Tabs |
       +------------------+
```

---

## 2. Page Specifications & Actions

### 2.1. Screen 1: Landing Page
A premium, highly interactive introduction screen highlighting the application's speed and capability.

*   **What the User Sees:**
    *   Dark, glassmorphic header containing the **PodcastIQ** logo and a link to the GitHub repository.
    *   High-impact hero headline: *"Read. Search. Repurpose. Extract intelligence from any podcast in seconds."*
    *   A preview visual displaying mock transcripts and high-fidelity timeline scrubbers.
    *   Glowing, centered CTA button: `Start Analyzing Free ->`.
*   **User Actions & Transitions:**
    *   **Click `Start Analyzing Free`:** Triggers a smooth opacity transition, sliding down the Landing Page and fading in the **Input Page**.
    *   **Click GitHub Link:** Opens the repository in a new tab.

---

### 2.2. Screen 2: Ingestion / Input Page
The primary intake dashboard. Simple, elegant, and highly functional.

*   **What the User Sees:**
    *   A centered glass card containing two distinct tabs: `YouTube URL` and `Audio File Upload`.
    *   **Tab 1 (YouTube URL):** A sleek input field with a placeholder (`"https://www.youtube.com/watch?v=..."`) and an integrated `Process Podcast` button.
    *   **Tab 2 (Audio Upload):** A dashed, drag-and-drop zone reading *"Drag and drop your MP3/WAV files here, or click to browse (Max 100MB)"*.
*   **User Actions & Transitions:**
    *   **Toggle Tabs:** Smoothly transitions between the text input and file upload components.
    *   **Paste URL and Click `Process`:**
        *   *Validation:* Checks if the URL matches standard YouTube patterns.
        *   *Transition:* If valid, executes `POST /api/process`, receives a `job_id`, and transitions to the **Processing Screen**.
    *   **Drag & Drop/Select File:**
        *   *Validation:* Assesses file size ($< 100\text{MB}$) and file format.
        *   *Transition:* Uploads file via multi-part request and navigates to the **Processing Screen**.

---

### 2.3. Screen 3: Processing Page
A live status tracker that keeps the user engaged during the download, transcription, and indexing processes.

*   **What the User Sees:**
    *   A centered glass card showing the active podcast title (or filename).
    *   An animated circular progress indicator showing overall pipeline completion.
    *   A vertical list of active status checkpoints:
        1.  `Downloading Audio Stream...` (Active with spinner)
        2.  `Transcribing Audio (Whisper ASR)...` (Waiting)
        3.  `Chunking & Indexing Text...` (Waiting)
        4.  `Generating Summaries & Deliverables...` (Waiting)
    *   A `Cancel Processing` button at the bottom.
*   **User Actions & Network Actions:**
    *   **Cancel Processing:** Aborts the active pipeline, deletes temporary files, and returns the user to the **Input Page**.
    *   **Automatic Polling:** The frontend polls `GET /api/job/{job_id}` every 2.0 seconds. As the state changes in the API response (`downloading` $\to$ `transcribing` $\to$ `indexing` $\to$ `generating` $\to$ `done`), the stepper highlights the active item with glowing green/purple checkmarks.
    *   **Success Transition:** Once the status reads `done`, the dashboard transitions to the **Results Page** with a custom fade-in effect.
    *   **Error Transition:** If the status returns `error`, the app transitions to the **Error Screen** along with the specific error trace.

---

### 2.4. Screen 4: Results Dashboard
The rich interactive interface where the user reviews, searches, and interacts with the podcast material.

*   **What the User Sees:**
    *   A split-pane dashboard:
        *   **Left Panel (35% width):** The **Interactive Transcript & Scrubber Timeline**. A clean, scrollable timeline with timestamp markers (e.g. `00:00 - 02:15`) and corresponding text segment paragraphs.
        *   **Right Panel (65% width):** A tabbed control panel containing:
            *   `Tab 1: Chat Assistant` (Active by default) — A professional chat interface containing a message history and a question input bar.
            *   `Tab 2: Show Notes` — A beautifully formatted markdown area containing summary points and timestamp headers.
            *   `Tab 3: Key Quotes` — A grid of cards displaying key quotes, each with a clickable timestamp chip.
            *   `Tab 4: Social Posts` — Split columns for ready-to-copy Twitter, LinkedIn, and Instagram content drafts with integrated "Copy to Clipboard" buttons.
*   **User Actions & Interactive Behaviors:**
    *   **Clicking a Transcript Segment:** Jumps the timeline highlight to that segment.
    *   **Clicking a Timestamp Chip (anywhere on the screen):** Automatically highlights and scrolls the timeline left panel directly to the corresponding segment with a smooth scroll-into-view animation.
    *   **Submitting a Question in Chat:**
        *   User types a question and clicks send or hits `Enter`.
        *   A message bubble with a typing spinner appears in the chat area.
        *   On success, the AI's response is rendered. It contains inline clickable source chips (e.g. `[08:12]`). Hovering over a chip highlights the text context, and clicking it focuses the timeline.
    *   **Copying Content:** Clicking the "Copy" icon on show notes, quotes, or social drafts highlights the button with a temporary green "Copied!" checkmark.

---

### 2.5. Screen 5: Error Screen
A simple, constructive error panel to handle pipeline crashes.

*   **What the User Sees:**
    *   An illustrative warning icon with a title: *"Something went wrong during processing."*
    *   A text box containing the technical description (e.g. *"Error: yt-dlp failed to download stream. Private video or region locked."*).
    *   A large, centered action button: `<- Back to Ingestion Page`.
*   **User Actions:**
    *   **Click Back Button:** Resets the application state and navigates back to the **Input Page**.

---

## 3. Edge Case Mitigation Strategies

| Edge Case | Detection Method | UI/UX Mitigation |
| :--- | :--- | :--- |
| **Invalid YouTube Link** | Regex matching on URL paste or processing button submit. | Shows a clean red error below the input: *"Please enter a valid YouTube URL (e.g. youtube.com/watch?v=...)"*. The submit button remains disabled until valid. |
| **Video unavailable / Private** | `yt-dlp` returns a download failure inside the backend background loop. | The API updates the job status to `error` with a descriptive message. The frontend polling loop catches this and displays the Error Screen: *"This video is private, deleted, or geoblocked. Please try a different URL."* |
| **Audio longer than 2 Hours** | The backend assesses metadata duration in the initial ingestion/download check. | The backend flags the file as exceeding MVP thresholds, raising an explicit error: *"We only support audio under 2 hours for now. Please upload a shorter file."* |
| **User refreshes during Ingestion** | Browser unload event / Refresh check. | Since job states are stored on disk inside `data/{job_id}.json`, if the user refreshes the page during processing, they can simply return, and pasting the same URL will immediately resume or load the completed result! |
| **Query returns no answers** | FAISS distance checks return similarity scores below a defined threshold. | The Chat Assistant answers: *"I couldn't find any discussion in this podcast regarding that topic. Try rephrasing or ask another question about the episode!"* |
