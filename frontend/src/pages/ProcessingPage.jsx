import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Play } from 'lucide-react';

export default function ProcessingPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [jobStatus, setJobStatus] = useState('queued');
  const [jobTitle, setJobTitle] = useState('Fetching details...');
  const [errorMsg, setErrorMsg] = useState('');

  // Stepper phases configuration
  const steps = [
    { key: 'queued', label: 'Queueing Task', desc: 'Podcast is scheduled for ingestion.' },
    { key: 'downloading', label: 'Extracting Audio Stream', desc: 'yt-dlp is isolating the mono MP3 stream.' },
    { key: 'transcribing', label: 'Running Speech-To-Text', desc: 'Whisper is transcribing conversation with timestamps.' },
    { key: 'indexing', label: 'Compiling RAG Index', desc: 'LangChain is embedding text chunks into local FAISS database.' },
    { key: 'generating', label: 'Synthesizing Show Deliverables', desc: 'Groq/OpenAI Llama is compiling show notes and social posts.' },
  ];

  // Map jobStatus state to step index integer
  const getActiveStepIndex = (status) => {
    if (status === 'queued') return 0;
    if (status === 'downloading') return 1;
    if (status === 'transcribing') return 2;
    if (status === 'indexing') return 3;
    if (status === 'generating') return 4;
    if (status === 'done') return 5;
    return -1;
  };

  useEffect(() => {
    let pollInterval = null;

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/job/${jobId}`);
        if (!response.ok) {
          throw new Error('Processing job not registered or offline.');
        }

        const data = await response.json();
        setJobStatus(data.status);
        if (data.title) {
          setJobTitle(data.title);
        }

        if (data.status === 'done') {
          clearInterval(pollInterval);
          // Small visual pause for satisfying UX before transitioning to results dashboard
          setTimeout(() => {
            navigate(`/results/${jobId}`);
          }, 800);
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setErrorMsg(data.error_message || 'Ingestion crashed due to an internal system exception.');
        }
      } catch (err) {
        clearInterval(pollInterval);
        setErrorMsg(err.message || 'Lost connection to backend server.');
      }
    };

    // Initial check and trigger polling loop
    fetchJobStatus();
    pollInterval = setInterval(fetchJobStatus, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, navigate]);

  const activeIndex = getActiveStepIndex(jobStatus);

  return (
    <div className="min-h-screen bg-theme-bg-primary hero-gradient relative flex flex-col justify-between overflow-hidden">
      
      {/* Header Panel */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-theme-border-muted bg-theme-bg-primary/40 backdrop-blur-md z-15">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-lg bg-theme-accent-purple flex items-center justify-center shadow-glow">
            <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gradient">PodcastIQ</span>
        </div>
      </header>

      {/* Main progress stepper frame */}
      <main className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col items-center justify-center flex-grow z-10">
        
        {jobStatus === 'error' ? (
          /* Error State Card view */
          <div className="w-full glass-panel rounded-2xl p-8 border border-theme-error/20 shadow-2xl text-center space-y-6 animate-fade-in max-w-lg">
            <div className="w-16 h-16 rounded-full bg-theme-error/10 flex items-center justify-center mx-auto border border-theme-error/20">
              <AlertTriangle className="w-8 h-8 text-theme-error" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-theme-text-primary">Pipeline Processing Error</h2>
              <p className="text-sm text-theme-text-secondary leading-relaxed">
                An error occurred during podcast analysis:
              </p>
              <div className="bg-theme-bg-primary/80 border border-theme-border-muted p-4 rounded-xl text-left text-xs font-mono text-theme-error max-h-48 overflow-y-auto mt-2 leading-relaxed">
                {errorMsg}
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center bg-theme-bg-tertiary hover:bg-theme-bg-tertiary/80 active:scale-[0.98] border border-theme-border-muted hover:border-theme-text-secondary text-theme-text-primary font-bold rounded-xl py-3 px-6 text-sm transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home Ingestion
            </button>
          </div>
        ) : (
          /* Processing Pipeline State Stepper view */
          <div className="w-full glass-panel rounded-2xl p-6 md:p-8 border border-theme-border-muted shadow-2xl relative space-y-8 animate-fade-in">
            
            {/* Upper title context */}
            <div className="text-center md:text-left border-b border-theme-border-muted pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1 max-w-lg">
                <span className="text-[10px] font-bold tracking-widest text-theme-accent-purple uppercase">Active Processing Job</span>
                <h2 className="text-lg font-bold text-theme-text-primary truncate">{jobTitle}</h2>
              </div>
              <div className="flex items-center bg-theme-accent-purple/10 border border-theme-accent-purple/20 px-3 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 text-theme-accent-purple animate-spin-custom mr-2" />
                <span className="text-xs font-bold text-theme-accent-purple uppercase tracking-wider">
                  {jobStatus === 'done' ? 'Completing!' : jobStatus}
                </span>
              </div>
            </div>

            {/* Stepper Progress items */}
            <div className="space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[1px] before:bg-theme-border-muted">
              {steps.map((step, idx) => {
                const isActive = jobStatus === step.key;
                const isCompleted = activeIndex > idx;
                
                return (
                  <div key={idx} className="flex items-start space-x-4 relative group">
                    
                    {/* Circle checkpoint dot indicator */}
                    <div className="z-10 flex items-center justify-center">
                      {isCompleted ? (
                        <div className="w-10 h-10 rounded-full bg-theme-success/15 flex items-center justify-center border border-theme-success/30 shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all duration-300">
                          <CheckCircle2 className="w-5 h-5 text-theme-success" />
                        </div>
                      ) : isActive ? (
                        <div className="w-10 h-10 rounded-full bg-theme-accent-purple/20 flex items-center justify-center border border-theme-accent-purple shadow-glow transition-all duration-300">
                          <Loader2 className="w-4 h-4 text-theme-accent-purple animate-spin-custom" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-theme-bg-tertiary flex items-center justify-center border border-theme-border-muted text-theme-text-disabled text-xs font-bold transition-all duration-300">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Progress descriptions */}
                    <div className="pt-1 space-y-0.5 flex-1">
                      <h3 className={`text-sm font-bold transition-colors duration-200 ${
                        isActive ? 'text-theme-accent-purple' : isCompleted ? 'text-theme-text-primary' : 'text-theme-text-disabled'
                      }`}>
                        {step.label}
                      </h3>
                      <p className={`text-xs leading-relaxed transition-colors duration-200 ${
                        isActive ? 'text-theme-text-secondary' : isCompleted ? 'text-theme-text-secondary/70' : 'text-theme-text-disabled/60'
                      }`}>
                        {step.desc}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-theme-text-secondary">
                Please do not close this browser window. Processing standard files usually takes 1-3 minutes.
              </span>
            </div>
            
          </div>
        )}
      </main>

      {/* Footer details */}
      <footer className="w-full py-6 text-center border-t border-theme-border-muted text-xs text-theme-text-disabled z-10 bg-theme-bg-primary/20">
        PodcastIQ Ingestion Monitor &bull; Status updates sync via SSE/Polling pipelines
      </footer>
      
    </div>
  );
}
