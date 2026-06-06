import React, { useState } from 'react';
import { BookOpen, Quote, Share2, Copy, Check, Clock, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function GeneratedContent({ showNotes, keyQuotes, socialPosts, onCitationClick, activeTab }) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState('notes');
  const activeSubTab = activeTab || localActiveSubTab;
  const setActiveSubTab = activeTab ? () => {} : setLocalActiveSubTab;
  const [copiedStates, setCopiedStates] = useState({});

  const handleCopyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Simple Markdown parsing fallback to render headers, list bullets, and timestamps cleanly
  const renderFormattedMarkdown = (markdownStr) => {
    if (!markdownStr) return <p className="text-theme-text-disabled">No show notes generated.</p>;
    
    return markdownStr.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // H2 Headers
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-theme-text-primary mt-6 mb-3 border-b border-theme-border-muted pb-1.5">{trimmed.replace('## ', '')}</h2>;
      }
      // H3 Headers
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-theme-accent-purple mt-4 mb-2">{trimmed.replace('### ', '')}</h3>;
      }
      // Blockquotes
      if (trimmed.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-2 border-theme-accent-purple bg-theme-bg-tertiary/40 px-4 py-2 my-3 rounded-r-lg text-xs italic text-theme-text-secondary">{trimmed.replace('> ', '')}</blockquote>;
      }
      // Bullet points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const textOnly = trimmed.substring(2);
        
        // Parse brackets for timestamp chips inside show notes (e.g. [05:12])
        const timestampMatch = textOnly.match(/^\[([0-9]{2}:[0-9]{2})\]/);
        if (timestampMatch) {
          const timestampStr = timestampMatch[1];
          const restOfText = textOnly.replace(`[${timestampStr}]`, '').trim();
          
          // Helper to convert MM:SS to seconds
          const parts = timestampStr.split(':');
          const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          
          return (
            <li key={idx} className="ml-4 list-disc text-xs text-theme-text-secondary py-1 leading-relaxed">
              <button 
                onClick={() => onCitationClick(seconds)}
                className="timestamp-chip inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-theme-accent-purple/10 text-theme-accent-purple font-mono font-bold text-[10px] mr-1.5"
              >
                <Clock className="w-2.5 h-2.5" />
                <span>{timestampStr}</span>
              </button>
              {restOfText}
            </li>
          );
        }
        
        return <li key={idx} className="ml-4 list-disc text-xs text-theme-text-secondary py-1 leading-relaxed">{textOnly}</li>;
      }
      
      // Empty line spacer
      if (!trimmed) {
        return <div key={idx} className="h-2"></div>;
      }
      
      // Standard Paragraph
      return <p key={idx} className="text-xs leading-relaxed text-theme-text-secondary mb-2">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-theme-bg-secondary/40 backdrop-blur-md rounded-2xl border border-theme-border-muted overflow-hidden">
      
      {/* Subtab control panel */}
      <div className="flex bg-theme-bg-secondary border-b border-theme-border-muted">
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center border-b-2 transition-all duration-300 ${
            activeSubTab === 'notes'
              ? 'border-theme-accent-purple text-theme-text-primary bg-theme-bg-primary/10'
              : 'border-transparent text-theme-text-disabled hover:text-theme-text-primary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 mr-2" />
          Show Notes
        </button>
        <button
          onClick={() => setActiveSubTab('quotes')}
          className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center border-b-2 transition-all duration-300 ${
            activeSubTab === 'quotes'
              ? 'border-theme-accent-purple text-theme-text-primary bg-theme-bg-primary/10'
              : 'border-transparent text-theme-text-disabled hover:text-theme-text-primary'
          }`}
        >
          <Quote className="w-3.5 h-3.5 mr-2" />
          Key Quotes
        </button>
        <button
          onClick={() => setActiveSubTab('social')}
          className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center border-b-2 transition-all duration-300 ${
            activeSubTab === 'social'
              ? 'border-theme-accent-purple text-theme-text-primary bg-theme-bg-primary/10'
              : 'border-transparent text-theme-text-disabled hover:text-theme-text-primary'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 mr-2" />
          Social Kit
        </button>
      </div>

      {/* Main Tab content viewer */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* SUBTAB 1: Show Notes markdown view */}
        {activeSubTab === 'notes' && (
          <div className="space-y-4 animate-fade-in relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-text-disabled uppercase">Markdown Summary Outline</span>
              <button
                onClick={() => handleCopyToClipboard(showNotes, 'notes')}
                className="inline-flex items-center space-x-1 text-[10px] font-bold text-theme-accent-purple bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-2.5 py-1 rounded-lg hover:bg-theme-accent-purple/20 transition-all duration-200"
              >
                {copiedStates['notes'] ? <Check className="w-3 h-3 text-theme-success" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStates['notes'] ? 'Copied!' : 'Copy Markdown'}</span>
              </button>
            </div>
            
            <div className="bg-theme-bg-primary/30 rounded-2xl border border-theme-border-muted p-5 prose-custom">
              {renderFormattedMarkdown(showNotes)}
            </div>
          </div>
        )}

        {/* SUBTAB 2: Key Quotes grid cards */}
        {activeSubTab === 'quotes' && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-[10px] font-bold tracking-widest text-theme-text-disabled uppercase block">guest highlight quotes</span>
            
            {keyQuotes && keyQuotes.length > 0 ? (
              <div className="grid gap-4">
                {keyQuotes.map((quote, qidx) => {
                  const parts = quote.timestamp.split(':');
                  const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  
                  return (
                    <div key={qidx} className="bg-theme-bg-secondary/80 border border-theme-border-muted rounded-2xl p-5 relative group shadow-md hover:border-theme-border-active transition-all duration-300">
                      <Quote className="w-8 h-8 text-theme-accent-purple/10 absolute right-4 top-4 group-hover:scale-105 transition-transform duration-300" />
                      
                      <div className="flex items-center mb-3">
                        <button
                          onClick={() => onCitationClick(seconds)}
                          className="timestamp-chip inline-flex items-center space-x-1 bg-theme-accent-purple/10 text-theme-accent-purple font-mono font-bold text-xs px-2.5 py-1 rounded-full"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{quote.timestamp}</span>
                        </button>
                      </div>

                      <p className="text-xs leading-relaxed italic text-theme-text-primary whitespace-pre-wrap font-medium">
                        "{quote.text}"
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-theme-text-disabled">No key quotes generated for this podcast segment.</p>
            )}
          </div>
        )}

        {/* SUBTAB 3: platform-Specific Social kits */}
        {activeSubTab === 'social' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Row 1: Twitter Thread */}
            <div className="space-y-3 bg-theme-bg-secondary border border-theme-border-muted p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-theme-border-muted">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shrink-0">
                    <Twitter className="w-4 h-4 text-sky-400 fill-sky-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-bold text-theme-text-primary">PodcastIQ X Thread</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center text-[8px] font-bold text-white shrink-0" title="Verified Creator">✓</span>
                    </div>
                    <span className="text-[10px] text-theme-text-disabled">@podcastiq &bull; Auto Thread Draft</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyToClipboard(socialPosts.twitter, 'tw')}
                  className="text-[10px] font-bold text-theme-accent-purple bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-2.5 py-1 rounded-lg hover:bg-theme-accent-purple/20 transition-all duration-200 cursor-pointer flex items-center space-x-1"
                >
                  {copiedStates['tw'] ? <Check className="w-3 h-3 text-theme-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedStates['tw'] ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-theme-bg-primary/50 p-4 rounded-xl border border-theme-border-muted text-xs text-theme-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                {socialPosts.twitter || 'Twitter post not configured.'}
              </div>
              
              {/* Tweet Metrics Mock Panel */}
              <div className="flex items-center justify-start gap-6 pt-2 text-[10px] text-theme-text-disabled border-t border-theme-border-muted/50 select-none">
                <span>💬 12 replies</span>
                <span>🔁 48 reposts</span>
                <span>❤️ 294 likes</span>
              </div>
            </div>

            {/* Row 2: LinkedIn Narrative */}
            <div className="space-y-3 bg-theme-bg-secondary border border-theme-border-muted p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-theme-border-muted">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <Linkedin className="w-4 h-4 text-blue-500 fill-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-bold text-theme-text-primary">PodcastIQ Curator</span>
                      <span className="text-[9px] bg-theme-bg-tertiary px-1 rounded text-theme-text-disabled">In</span>
                    </div>
                    <span className="text-[10px] text-theme-text-disabled">Executive Insights Creator &bull; 1h &bull; 🌐</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyToClipboard(socialPosts.linkedin, 'li')}
                  className="text-[10px] font-bold text-theme-accent-purple bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-2.5 py-1 rounded-lg hover:bg-theme-accent-purple/20 transition-all duration-200 cursor-pointer flex items-center space-x-1"
                >
                  {copiedStates['li'] ? <Check className="w-3 h-3 text-theme-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedStates['li'] ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-theme-bg-primary/50 p-4 rounded-xl border border-theme-border-muted text-xs text-theme-text-secondary whitespace-pre-wrap leading-relaxed">
                {socialPosts.linkedin || 'LinkedIn post not configured.'}
              </div>

              {/* LinkedIn Reaction Metrics Mock Panel */}
              <div className="flex items-center justify-between pt-2 border-t border-theme-border-muted/50 text-[10px] text-theme-text-disabled select-none">
                <div className="flex items-center space-x-1">
                  <span>👍❤️💡</span>
                  <span>142 reactions</span>
                </div>
                <span>12 comments &bull; 4 reposts</span>
              </div>
            </div>

            {/* Row 3: Instagram Copy */}
            <div className="space-y-3 bg-theme-bg-secondary border border-theme-border-muted p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-theme-border-muted">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shrink-0">
                    <Instagram className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-theme-text-primary block">podcastiq_shorts</span>
                    <span className="text-[10px] text-theme-text-disabled">Visual Hook & Reels Copy</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyToClipboard(socialPosts.instagram, 'ig')}
                  className="text-[10px] font-bold text-theme-accent-purple bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-2.5 py-1 rounded-lg hover:bg-theme-accent-purple/20 transition-all duration-200 cursor-pointer flex items-center space-x-1"
                >
                  {copiedStates['ig'] ? <Check className="w-3 h-3 text-theme-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedStates['ig'] ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-theme-bg-primary/50 p-4 rounded-xl border border-theme-border-muted text-xs text-theme-text-secondary whitespace-pre-wrap leading-relaxed">
                {socialPosts.instagram || 'Instagram post not configured.'}
              </div>
            </div>

          </div>
        )}

      </div>
      
    </div>
  );
}
