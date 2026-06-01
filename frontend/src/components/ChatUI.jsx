import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, Sparkles, Clock } from 'lucide-react';

export default function ChatUI({ podcastId, onCitationClick }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am your PodcastIQ Assistant. I have indexed the entire transcript of this episode. Ask me anything, for example: 'What did the guest say about seed funding?' or 'Summarize the final takeaways.'",
      sources: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const threadEndRef = useRef(null);

  // Auto-scroll to bottom of chat thread on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    setInputText('');
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcast_id: podcastId,
          question: query
        })
      });

      if (!response.ok) {
        throw new Error('Chat engine failed to compile answer.');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I encountered an error connecting to our QA engine. Please verify if the API is active.",
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-theme-bg-secondary/40 backdrop-blur-md rounded-2xl border border-theme-border-muted overflow-hidden">
      
      {/* Panel header title */}
      <div className="px-6 py-4 border-b border-theme-border-muted bg-theme-bg-secondary flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-4 h-4 text-theme-accent-purple" />
          <h3 className="font-extrabold text-sm text-theme-text-primary uppercase tracking-wider">AI Podcast Assistant</h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-theme-text-disabled">RAG Index Engine Active</span>
      </div>

      {/* Messages Thread Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                isUser 
                  ? 'bg-theme-accent-purple text-white rounded-tr-none' 
                  : 'bg-theme-bg-secondary border border-theme-border-muted text-theme-text-primary rounded-tl-none'
              }`}>
                
                {/* Message Header Label */}
                <div className="flex items-center space-x-1.5 mb-1.5 opacity-60">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {isUser ? 'You' : 'PodcastIQ Bot'}
                  </span>
                </div>

                {/* Message Body String */}
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>

                {/* CITATIONS & SOURCES DRAWER */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-theme-border-muted space-y-2">
                    <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest block mb-1">
                      Cited Timeline References:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, srcIdx) => (
                        <button
                          key={srcIdx}
                          onClick={() => onCitationClick(src.start_sec)}
                          className="timestamp-chip inline-flex items-center space-x-1 bg-theme-accent-purple/10 hover:bg-theme-accent-purple/20 text-theme-accent-purple px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all duration-200 border border-theme-accent-purple/10"
                          title={src.text.slice(0, 80) + '...'}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{src.timestamp_str}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Dynamic Typing Spinner Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-theme-bg-secondary border border-theme-border-muted rounded-2xl rounded-tl-none p-4 flex items-center space-x-2 text-theme-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin-custom text-theme-accent-purple" />
              <span className="text-xs font-medium">Scanning FAISS index & drafting answer...</span>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Message Ingestion Form Bar */}
      <form onSubmit={handleSend} className="p-4 border-t border-theme-border-muted bg-theme-bg-secondary/80">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question about this episode..."
            className="w-full bg-theme-bg-tertiary border border-theme-border-muted focus:border-theme-accent-purple rounded-xl pl-4 pr-12 py-3.5 text-xs text-theme-text-primary placeholder-theme-text-disabled outline-none transition-all duration-200 focus:ring-2 focus:ring-theme-accent-purple/15"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 p-2.5 rounded-lg bg-theme-accent-purple hover:bg-theme-accent-purple/90 active:scale-95 disabled:bg-theme-bg-tertiary disabled:text-theme-text-disabled text-white shadow-glow transition-all duration-200 flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
      
    </div>
  );
}
