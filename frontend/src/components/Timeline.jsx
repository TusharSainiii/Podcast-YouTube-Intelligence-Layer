import React, { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

export default function Timeline({ segments, activeSegmentIdx, onSegmentClick }) {
  const segmentRefs = useRef([]);

  // Auto-scroll timeline to focus on the highlighted segment when activeSegmentIdx changes
  useEffect(() => {
    if (activeSegmentIdx !== null && activeSegmentIdx !== -1 && segmentRefs.current[activeSegmentIdx]) {
      segmentRefs.current[activeSegmentIdx].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeSegmentIdx]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-theme-bg-primary/20 border-r border-theme-border-muted overflow-hidden">
      
      {/* Sidebar Header Title */}
      <div className="px-6 py-4 border-b border-theme-border-muted bg-theme-bg-secondary/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-theme-accent-purple" />
          <h3 className="font-bold text-sm text-theme-text-primary uppercase tracking-wider">Podcast Timeline</h3>
        </div>
        <span className="text-[10px] bg-theme-accent-purple/10 text-theme-accent-purple border border-theme-accent-purple/20 px-2 py-0.5 rounded-full font-bold">
          {segments.length} Segments
        </span>
      </div>

      {/* Scrolling timeline segment feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {segments.map((seg, idx) => {
          const isActive = activeSegmentIdx === idx;
          
          return (
            <div
              key={idx}
              ref={(el) => (segmentRefs.current[idx] = el)}
              onClick={() => onSegmentClick(idx, seg.start)}
              className={`p-4 rounded-xl cursor-pointer border transition-all duration-300 relative group select-text ${
                isActive
                  ? 'bg-theme-accent-purple/5 border-theme-accent-purple shadow-[0_0_15px_rgba(108,99,255,0.08)]'
                  : 'bg-theme-bg-secondary/60 border-theme-border-muted hover:border-theme-border-active hover:bg-theme-bg-secondary/80'
              }`}
            >
              
              {/* Highlight bar glow overlay */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md transition-all duration-300 ${
                isActive ? 'bg-theme-accent-purple' : 'bg-transparent group-hover:bg-theme-border-active'
              }`}></div>

              {/* Timestamp chip layout */}
              <div className="flex items-center justify-between mb-2">
                <button 
                  className={`timestamp-chip px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight transition-all duration-200 ${
                    isActive 
                      ? 'bg-theme-accent-purple text-white shadow-glow' 
                      : 'bg-theme-accent-purple/10 text-theme-accent-purple'
                  }`}
                >
                  {formatTime(seg.start)} - {formatTime(seg.end)}
                </button>
                <span className="text-[10px] text-theme-text-disabled opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Click to Focus
                </span>
              </div>

              {/* Transcription literal string */}
              <p className={`text-xs leading-relaxed transition-colors duration-200 ${
                isActive ? 'text-theme-text-primary font-medium' : 'text-theme-text-secondary group-hover:text-theme-text-primary'
              }`}>
                {seg.text}
              </p>

            </div>
          );
        })}
      </div>
      
    </div>
  );
}
