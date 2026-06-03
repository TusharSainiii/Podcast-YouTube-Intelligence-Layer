import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Quote, Share2, Sparkles, Play, ArrowLeft, Loader2 } from 'lucide-react';

import Timeline from '../components/Timeline';
import ChatUI from '../components/ChatUI';
import GeneratedContent from '../components/GeneratedContent';
import ThemeToggle from '../components/ThemeToggle';

export default function ResultsPage() {
  const { podcastId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Loaded podcast data state
  const [podcastTitle, setPodcastTitle] = useState('Analysis Results');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [segments, setSegments] = useState([]);
  const [showNotes, setShowNotes] = useState('');
  const [keyQuotes, setKeyQuotes] = useState([]);
  const [socialPosts, setSocialPosts] = useState({});

  // Timeline synchronization states
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(null);
  
  // Right Main Tab state: 'chat' | 'notes' | 'quotes' | 'social'
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    const fetchPodcastData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/content/${podcastId}`);
        if (!response.ok) {
          throw new Error('Analytics content is not ready yet or does not exist.');
        }

        const data = await response.json();
        setPodcastTitle(data.title);
        setYoutubeUrl(data.youtube_url);
        setSegments(data.segments || []);
        setShowNotes(data.show_notes || '');
        setKeyQuotes(data.key_quotes || []);
        setSocialPosts(data.social_posts || {});
      } catch (err) {
        setErrorMsg(err.message || 'Failed to establish connection to database.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPodcastData();
  }, [podcastId]);

  // Hook to handle timestamp clicks from Chat or Quotes
  const handleCitationClick = (seconds) => {
    if (!segments || segments.length === 0) return;

    // 1. Attempt to find exact overlap segment
    const matchIdx = segments.findIndex(
      (seg) => seconds >= parseFloat(seg.start) && seconds <= parseFloat(seg.end)
    );

    if (matchIdx !== -1) {
      setActiveSegmentIdx(matchIdx);
    } else {
      // 2. Fallback: Find closest segment by start time
      let closestIdx = 0;
      let minDiff = Math.abs(parseFloat(segments[0].start) - seconds);

      for (let i = 1; i < segments.length; i++) {
        const diff = Math.abs(parseFloat(segments[i].start) - seconds);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      setActiveSegmentIdx(closestIdx);
    }
  };

  const handleSegmentClick = (idx, startSec) => {
    setActiveSegmentIdx(idx);
    // Clicking a segment can trigger audio jump in a media-connected player context in the future
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-bg-primary flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-theme-accent-purple animate-spin-custom shadow-glow" />
        <span className="text-xs font-semibold text-theme-text-secondary uppercase tracking-widest animate-pulse">
          Loading workspace content...
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-theme-bg-primary flex flex-col items-center justify-center p-6 space-y-6">
        <div className="text-center space-y-2 max-w-md bg-theme-bg-secondary p-8 rounded-2xl border border-theme-border-muted shadow-xl">
          <h2 className="text-xl font-bold text-theme-error">Ingestion Data Unavailable</h2>
          <p className="text-xs text-theme-text-secondary leading-relaxed">
            We couldn't retrieve the analysis files: <br />
            <span className="font-mono text-theme-error/80 mt-1 block">{errorMsg}</span>
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-theme-bg-tertiary border border-theme-border-muted hover:border-theme-text-secondary text-theme-text-primary font-bold rounded-xl py-2 px-4 text-xs transition-colors duration-200 mt-4 flex items-center justify-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Back to Ingestion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-theme-bg-primary flex flex-col overflow-hidden select-none">
      
      {/* Upper Navigation Header Bar */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-theme-border-muted bg-theme-bg-secondary/40 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-theme-accent-purple flex items-center justify-center shadow-glow">
            <Play className="w-3.5 h-3.5 fill-white text-white translate-x-[1px]" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-gradient">PodcastIQ</span>
        </div>
        
        <div className="flex items-center space-x-4 max-w-md md:max-w-xl truncate">
          <span className="text-[10px] text-theme-text-disabled border border-theme-border-muted px-2 py-0.5 rounded uppercase tracking-wider font-bold">
            Ingested
          </span>
          <span className="text-xs font-semibold text-theme-text-secondary truncate" title={podcastTitle}>
            {podcastTitle}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Podcast</span>
          </button>
        </div>
      </header>

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Timeline Panel (35% width, independent scrolls) */}
        <aside className="w-[35%] shrink-0 h-full border-r border-theme-border-muted">
          <Timeline 
            segments={segments} 
            activeSegmentIdx={activeSegmentIdx} 
            onSegmentClick={handleSegmentClick} 
          />
        </aside>

        {/* Right Main Working Area (65% width, holds tab workspace panels) */}
        <main className="w-[65%] h-full flex flex-col overflow-hidden bg-theme-bg-primary">
          
          {/* Main Workspace Navigation Tab Bar */}
          <div className="flex bg-theme-bg-secondary/60 border-b border-theme-border-muted shrink-0 px-6 py-2 gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-theme-accent-purple text-white shadow-glow'
                  : 'text-theme-text-disabled hover:text-theme-text-primary'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Assistant</span>
            </button>
            
            <button
              onClick={() => setActiveTab('notes')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeTab === 'notes'
                  ? 'bg-theme-accent-purple text-white shadow-glow'
                  : 'text-theme-text-disabled hover:text-theme-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Show Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('quotes')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeTab === 'quotes'
                  ? 'bg-theme-accent-purple text-white shadow-glow'
                  : 'text-theme-text-disabled hover:text-theme-text-primary'
              }`}
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Quotes</span>
            </button>

            <button
              onClick={() => setActiveTab('social')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeTab === 'social'
                  ? 'bg-theme-accent-purple text-white shadow-glow'
                  : 'text-theme-text-disabled hover:text-theme-text-primary'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Social Posts</span>
            </button>
          </div>

          {/* Dynamic Content Frame Viewport */}
          <div className="flex-1 overflow-hidden p-6">
            {activeTab === 'chat' && (
              <ChatUI 
                podcastId={podcastId} 
                onCitationClick={handleCitationClick} 
              />
            )}
            
            {(activeTab === 'notes' || activeTab === 'quotes' || activeTab === 'social') && (
              <GeneratedContent
                showNotes={showNotes}
                keyQuotes={keyQuotes}
                socialPosts={socialPosts}
                onCitationClick={handleCitationClick}
                // Lock inside subtab viewer based on main tab selection
                // The component has internal tab toggling which we can bypass by forcing the subtab selection
              />
            )}
          </div>

        </main>
        
      </div>
      
    </div>
  );
}
