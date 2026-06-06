import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, Upload, ArrowRight, Loader2, Play, Sparkles, Zap, Search, Bot, Share2 } from 'lucide-react';
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

      {/* Main Responsive Grid Layout */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 flex-grow z-10">
        
        {/* Left Pane: Value Proposition */}
        <div className="flex flex-col justify-center space-y-6 text-left max-w-xl animate-fade-in-up">
          <div className="inline-flex items-center space-x-2 bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-3 py-1.5 rounded-full w-fit">
            <Sparkles className="w-3.5 h-3.5 text-theme-accent-purple animate-pulse" />
            <span className="text-[10px] font-bold text-theme-accent-purple uppercase tracking-widest">
              v2.0 High-Speed Pipeline Active
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-theme-text-primary leading-tight">
            Read. Search.<br />
            Repurpose.<br />
            <span className="text-theme-accent-purple shadow-glow-strong">Intelligence Layer</span> <br />
            for Podcasts
          </h1>
          
          <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed">
            Convert long audio and video interviews into searchable markdown show notes, structured transcripts, high-fidelity timelines, and dynamic social media threads.
          </p>

          {/* Core Pipeline Metrics */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme-border-muted">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center border border-theme-accent-purple/25">
                <Zap className="w-4 h-4 text-theme-accent-purple" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-theme-text-primary">Parallel Workers</h4>
                <p className="text-[10px] text-theme-text-disabled">API threadpool & asyncio</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center border border-theme-accent-purple/25">
                <Search className="w-4 h-4 text-theme-accent-purple" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-theme-text-primary">FAISS Indexing</h4>
                <p className="text-[10px] text-theme-text-disabled">Semantic QA database</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Ingestion Card */}
        <div className="w-full max-w-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel rounded-2xl p-6 md:p-8 border border-theme-border-muted shadow-2xl relative animate-pulse-glow">
            
            {/* Glowing backdrop portals */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-theme-accent-purple/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-theme-accent-purple/10 rounded-full blur-3xl -z-10"></div>

            {/* Toggle tabs */}
            <div className="flex bg-theme-bg-primary p-1 rounded-xl mb-6 border border-theme-border-muted">
              <button 
                onClick={() => { setActiveTab('youtube'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  activeTab === 'youtube' 
                    ? 'bg-theme-accent-purple text-white shadow-glow' 
                    : 'text-theme-text-secondary hover:text-theme-text-primary'
                }`}
              >
                <Youtube className="w-4 h-4 mr-2" />
                YouTube Link
              </button>
              <button 
                onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  activeTab === 'upload' 
                    ? 'bg-theme-accent-purple text-white shadow-glow' 
                    : 'text-theme-text-secondary hover:text-theme-text-primary'
                }`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Audio File
              </button>
            </div>

            {/* TAB 1: YouTube Ingestion */}
            {activeTab === 'youtube' && (
              <form onSubmit={handleYoutubeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2">
                    YouTube Stream URL
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-theme-bg-tertiary border border-theme-border-muted focus:border-theme-accent-purple rounded-xl px-4 py-3 text-xs text-theme-text-primary placeholder-theme-text-disabled outline-none transition-all duration-200 focus:ring-2 focus:ring-theme-accent-purple/20"
                      disabled={isLoading}
                    />
                    <Youtube className="absolute right-4 top-3 w-4 h-4 text-theme-text-disabled" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2">
                    Custom Title (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Funding Interview with Elon Musk"
                    className="w-full bg-theme-bg-tertiary border border-theme-border-muted focus:border-theme-accent-purple rounded-xl px-4 py-3 text-xs text-theme-text-primary placeholder-theme-text-disabled outline-none transition-all duration-200 focus:ring-2 focus:ring-theme-accent-purple/20"
                    disabled={isLoading}
                  />
                </div>

                {errorMsg && (
                  <div className="text-theme-error text-xs bg-theme-error/10 border border-theme-error/20 p-3 rounded-lg leading-relaxed font-medium">
                    {errorMsg}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-theme-accent-purple hover:bg-theme-accent-purple/90 active:scale-[0.99] text-white font-bold rounded-xl py-3 px-6 text-xs uppercase tracking-wider flex items-center justify-center shadow-glow transition-all duration-200 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin-custom" />
                      Starting Ingestion Engine...
                    </>
                  ) : (
                    <>
                      Process Podcast Link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: Audio File Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2">
                  Upload MP3/WAV Audio payload
                </label>
                
                <div className="border-2 border-dashed border-theme-border-muted hover:border-theme-accent-purple rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-theme-bg-primary/20 hover:bg-theme-bg-primary/40 relative">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-theme-accent-purple mb-3 shadow-glow" />
                  <span className="text-xs font-bold text-theme-text-primary mb-1">
                    {uploadFile ? uploadFile.name : 'Select Podcast Audio File'}
                  </span>
                  <span className="text-[10px] text-theme-text-secondary">
                    {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Drag and drop or browse (Max 100MB)'}
                  </span>
                </div>

                {errorMsg && (
                  <div className="text-theme-error text-xs bg-theme-error/10 border border-theme-error/20 p-3 rounded-lg font-medium">
                    {errorMsg}
                  </div>
                )}

                <button 
                  onClick={() => {
                    if (!uploadFile) {
                      setErrorMsg('Please upload an audio file first.');
                      return;
                    }
                    setErrorMsg('Direct audio file uploads will be fully supported in production environments. Please use the YouTube URL processing tab for testing!');
                  }}
                  className="w-full bg-theme-accent-purple hover:bg-theme-accent-purple/90 text-white font-bold rounded-xl py-3 px-6 text-xs uppercase tracking-wider flex items-center justify-center shadow-glow transition-all duration-200 cursor-pointer"
                >
                  Upload & Process File
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Capabilities showcase section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-16 border-t border-theme-border-muted animate-fade-in-up z-10" style={{ animationDelay: '0.2s' }}>
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-theme-text-primary mb-3">
            Supercharge Your Podcast Workflow
          </h2>
          <p className="text-xs md:text-sm text-theme-text-secondary leading-relaxed">
            PodcastIQ automatically orchestrates an intelligent data compilation pipeline in parallel.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Capability 1 */}
          <div className="glass-panel hover:bg-theme-bg-secondary/60 hover:border-theme-accent-purple/40 border border-theme-border-muted p-5 rounded-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center mb-4 border border-theme-accent-purple/20 group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-4 h-4 text-theme-accent-purple animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-2">High-Speed STT</h3>
            <p className="text-[11px] text-theme-text-secondary leading-relaxed">
              Speeds up speech-to-text using faster-whisper (CTranslate2) or parallel cloud thread pools.
            </p>
          </div>

          {/* Capability 2 */}
          <div className="glass-panel hover:bg-theme-bg-secondary/60 hover:border-theme-accent-purple/40 border border-theme-border-muted p-5 rounded-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center mb-4 border border-theme-accent-purple/20 group-hover:scale-110 transition-transform duration-200">
              <Search className="w-4 h-4 text-theme-accent-purple" />
            </div>
            <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-2">FAISS Vector Index</h3>
            <p className="text-[11px] text-theme-text-secondary leading-relaxed">
              Groups transcripts into overlapping chunks, calculates embeddings, and indexes them locally.
            </p>
          </div>

          {/* Capability 3 */}
          <div className="glass-panel hover:bg-theme-bg-secondary/60 hover:border-theme-accent-purple/40 border border-theme-border-muted p-5 rounded-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center mb-4 border border-theme-accent-purple/20 group-hover:scale-110 transition-transform duration-200">
              <Bot className="w-4 h-4 text-theme-accent-purple" />
            </div>
            <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-2">Interactive AI Chat</h3>
            <p className="text-[11px] text-theme-text-secondary leading-relaxed">
              Ask natural language questions. Chat replies map directly to clickable timing citations.
            </p>
          </div>

          {/* Capability 4 */}
          <div className="glass-panel hover:bg-theme-bg-secondary/60 hover:border-theme-accent-purple/40 border border-theme-border-muted p-5 rounded-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-theme-accent-purple/10 flex items-center justify-center mb-4 border border-theme-accent-purple/20 group-hover:scale-110 transition-transform duration-200">
              <Share2 className="w-4 h-4 text-theme-accent-purple" />
            </div>
            <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-2">Marketing Copy</h3>
            <p className="text-[11px] text-theme-text-secondary leading-relaxed">
              Generates ready-to-use summaries, key quote databases, and custom X thread layout copies.
            </p>
          </div>
          
        </div>
      </section>

      {/* Footer Details */}
      <footer className="w-full py-6 text-center border-t border-theme-border-muted text-xs text-theme-text-disabled z-10 bg-theme-bg-primary/20">
        PodcastIQ Intelligence Layer MVP &bull; Built with FastAPI + faster-whisper + FAISS + React
      </footer>
      
    </div>
  );
}
