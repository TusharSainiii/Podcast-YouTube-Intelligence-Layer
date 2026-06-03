import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, Upload, ArrowRight, Loader2, Play } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'upload'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  
  const navigate = useNavigate();

  // Validate standard YouTube patterns
  const validateUrl = (url) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]{11})/;
    return pattern.test(url);
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      setErrorMsg('Please paste a YouTube link to get started.');
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setErrorMsg('Invalid YouTube URL. Please use standard formats (e.g. youtube.com/watch?v=...)');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: trimmedUrl,
          custom_title: customTitle.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to dispatch processing job.');
      }

      const data = await response.json();
      navigate(`/process/${data.job_id}`);
    } catch (err) {
      setErrorMsg(err.message || 'Server connection failed. Make sure your FastAPI backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg('File exceeds our maximum size limit of 100MB.');
        return;
      }
      setUploadFile(file);
      setErrorMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg-primary hero-gradient relative flex flex-col justify-between overflow-hidden">
      
      {/* Upper Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-theme-border-muted bg-theme-bg-primary/40 backdrop-blur-md z-15">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-lg bg-theme-accent-purple flex items-center justify-center shadow-glow">
            <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gradient">PodcastIQ</span>
        </div>
        <div className="flex items-center space-x-4">
          <a 
            href="https://github.com/TusharSainiii/Podcast-YouTube-Intelligence-Layer" 
            target="_blank" 
            rel="noreferrer"
            className="text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors duration-200"
          >
            GitHub Repository
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Headline and Processing Box */}
      <main className="w-full max-w-7xl mx-auto px-6 py-16 flex flex-col items-center justify-center flex-grow z-10">
        
        {/* Core Taglines */}
        <div className="text-center max-w-3xl mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-theme-text-primary leading-tight">
            Read. Search. Repurpose.<br />
            <span className="text-theme-accent-purple shadow-glow-strong">Intelligence Layer</span> for Podcasts
          </h1>
          <p className="text-base md:text-lg text-theme-text-secondary max-w-2xl mx-auto">
            Convert long audio and video interviews into searchable markdown show notes, structured transcripts, high-fidelity timelines, and dynamic social media threads.
          </p>
        </div>

        {/* Dynamic Card Container */}
        <div className="w-full max-w-xl glass-panel rounded-2xl p-6 md:p-8 border border-theme-border-muted shadow-2xl relative">
          
          {/* Glowing backdrop circle */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-theme-accent-purple/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-theme-accent-purple/10 rounded-full blur-3xl -z-10"></div>

          {/* Toggle Widgets */}
          <div className="flex bg-theme-bg-primary p-1.5 rounded-xl mb-6 border border-theme-border-muted">
            <button 
              onClick={() => { setActiveTab('youtube'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all duration-300 ${
                activeTab === 'youtube' 
                  ? 'bg-theme-accent-purple text-white shadow-glow' 
                  : 'text-theme-text-secondary hover:text-theme-text-primary'
              }`}
            >
              <Youtube className="w-4 h-4 mr-2" />
              YouTube Video
            </button>
            <button 
              onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all duration-300 ${
                activeTab === 'upload' 
                  ? 'bg-theme-accent-purple text-white shadow-glow' 
                  : 'text-theme-text-secondary hover:text-theme-text-primary'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Audio Upload
            </button>
          </div>

          {/* TAB 1: YouTube Link Ingestion */}
          {activeTab === 'youtube' && (
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-theme-text-secondary mb-2">
                  YouTube Video Link
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-theme-bg-tertiary border border-theme-border-muted focus:border-theme-accent-purple rounded-xl px-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-disabled outline-none transition-all duration-200 focus:ring-2 focus:ring-theme-accent-purple/20"
                    disabled={isLoading}
                  />
                  <Youtube className="absolute right-4 top-3.5 w-5 h-5 text-theme-text-disabled" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-theme-text-secondary mb-2">
                  Custom Title (Optional)
                </label>
                <input 
                  type="text" 
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Funding Interview with Elon Musk"
                  className="w-full bg-theme-bg-tertiary border border-theme-border-muted focus:border-theme-accent-purple rounded-xl px-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-disabled outline-none transition-all duration-200 focus:ring-2 focus:ring-theme-accent-purple/20"
                  disabled={isLoading}
                />
              </div>

              {errorMsg && (
                <div className="text-theme-error text-xs bg-theme-error/10 border border-theme-error/20 p-3 rounded-lg leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-theme-accent-purple hover:bg-theme-accent-purple/90 active:scale-[0.99] text-white font-bold rounded-xl py-3 px-6 text-sm flex items-center justify-center shadow-glow transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin-custom" />
                    Starting Analysis Pipeline...
                  </>
                ) : (
                  <>
                    Process Podcast
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: Audio File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-theme-text-secondary mb-2">
                Audio File Ingestion (MP3, WAV)
              </label>
              
              <div className="border-2 border-dashed border-theme-border-muted hover:border-theme-accent-purple rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-theme-bg-primary/20 hover:bg-theme-bg-primary/40 relative">
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-theme-accent-purple mb-3 shadow-glow" />
                <span className="text-sm font-semibold text-theme-text-primary mb-1">
                  {uploadFile ? uploadFile.name : 'Select Podcast Audio File'}
                </span>
                <span className="text-xs text-theme-text-secondary">
                  {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Drag and drop or browse (Max 100MB)'}
                </span>
              </div>

              {errorMsg && (
                <div className="text-theme-error text-xs bg-theme-error/10 border border-theme-error/20 p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <button 
                onClick={() => {
                  if (!uploadFile) {
                    setErrorMsg('Please upload an audio file first.');
                    return;
                  }
                  // Simulating processing state for local direct upload MVP
                  setErrorMsg('Direct audio file uploads will be fully supported in production environments. Please use the YouTube URL processing tab for testing!');
                }}
                className="w-full bg-theme-accent-purple hover:bg-theme-accent-purple/90 text-white font-bold rounded-xl py-3 px-6 text-sm flex items-center justify-center shadow-glow transition-all duration-200"
              >
                Upload & Process File
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Footer Details */}
      <footer className="w-full py-6 text-center border-t border-theme-border-muted text-xs text-theme-text-disabled z-10 bg-theme-bg-primary/20">
        PodcastIQ Intelligence Layer MVP &bull; Built with FastAPI + whisper + FAISS + React
      </footer>
      
    </div>
  );
}
