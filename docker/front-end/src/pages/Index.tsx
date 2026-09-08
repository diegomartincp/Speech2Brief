import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AudioUpload } from '@/components/AudioUpload';
import { ResultsDisplay, ResultsData } from '@/components/ResultsDisplay';
import { LoadingState } from '@/components/LoadingState';
import { ConfigBanner, SystemConfig } from '@/components/ConfigBanner';
import { ProcessingOptions, ProcessingOptionsState } from '@/components/ProcessingOptions';
import { HistoryView } from '@/components/HistoryView';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Zap, 
  Shield, 
  Globe, 
  MessageSquare, 
  Server, 
  Github, 
  ArrowRight,
  Users,
  Mic,
  FolderOpen
} from 'lucide-react';
import heroImage from '@/assets/hero-audio.jpg';

type AppState = 'idle' | 'processing' | 'results' | 'error';

const Index = () => {
  const [state, setState] = useState<AppState>('idle');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string>('');
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  
  // Processing options
  const [options, setOptions] = useState<ProcessingOptionsState>({
    enableDiarization: true,
    enableSpeakerRange: false,
    minSpeakers: 1,
    maxSpeakers: 10,
  });

  // Real-time step tracking state
  const [currentStep, setCurrentStep] = useState<string>('uploaded');
  const [stepMessage, setStepMessage] = useState<string>('Loading media file...');
  const [progress, setProgress] = useState<number>(10);

  const { toast } = useToast();
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:5000';

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}/config`);
        if (res.ok) {
          const data = await res.json();
          setSystemConfig(data);
        }
      } catch (e) {
        console.warn('[Speech2Brief] Could not fetch backend system config:', e);
      }
    };
    fetchConfig();
  }, [API_ENDPOINT]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    processAudio(file);
  };

  const processAudio = async (file: File) => {
    setState('processing');
    setError('');
    setCurrentStep('uploaded');
    setStepMessage(`Uploading ${file.name}...`);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('diarization', options.enableDiarization ? 'true' : 'false');
    if (options.enableDiarization && options.enableSpeakerRange) {
      formData.append('min_speakers', options.minSpeakers.toString());
      formData.append('max_speakers', options.maxSpeakers.toString());
    }

    try {
      console.log(`[Speech2Brief] Sending file to ${API_ENDPOINT}/summarize?stream=true`);
      const response = await fetch(`${API_ENDPOINT}/summarize?stream=true`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle Server-Sent Events stream
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalData: ResultsData | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                try {
                  const payload = JSON.parse(trimmed.replace(/^data:\s*/, ''));
                  console.log('[Speech2Brief Event]', payload);

                  if (payload.step) {
                    setCurrentStep(payload.step);
                  }
                  if (payload.message) {
                    setStepMessage(payload.message);
                  }
                  if (typeof payload.progress === 'number') {
                    setProgress(payload.progress);
                  }

                  if (payload.step === 'error') {
                    throw new Error(payload.message || 'Processing failed');
                  }

                  if (payload.step === 'completed' && payload.data) {
                    finalData = payload.data as ResultsData;
                  }
                } catch (e) {
                  if (e instanceof Error && e.message.includes('Processing failed')) {
                    throw e;
                  }
                  console.warn('[Speech2Brief] SSE parse warning:', e);
                }
              }
            }
          }
        }

        if (finalData) {
          setResults(finalData);
          setState('results');
          toast({
            title: "Processing complete!",
            description: `Audio transcribed and summarized in ${finalData.processing_time_seconds.toFixed(1)}s`,
          });
          return;
        }
      }

      // Fallback to standard JSON response if streaming not supported
      const data: ResultsData = await response.json();
      setResults(data);
      setState('results');
      
      toast({
        title: "Processing complete!",
        description: `Audio processed in ${data.processing_time_seconds.toFixed(1)} seconds`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio';
      console.error('[Speech2Brief Error]', err);
      setError(errorMessage);
      setState('error');
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const resetApp = () => {
    setState('idle');
    setSelectedFile(null);
    setResults(null);
    setError('');
    setCurrentStep('uploaded');
    setStepMessage('Loading media file...');
    setProgress(10);
  };

  const features = [
    {
      icon: Shield,
      title: "100% Local Processing",
      description: "All transcription, speaker identification, and summarization run on your hardware. No data leaves your machine."
    },
    {
      icon: Users,
      title: "Speaker Identification",
      description: "Advanced diarization distinguishes multiple speakers, attributing dialogues with color-coded speaker tags."
    },
    {
      icon: Zap,
      title: "Optimized Processing",
      description: "WhisperX with quantized int8 and Llama 3 for fast, precise transcription and chronologically ordered notes."
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Accurately detects audio language, aligns phonemes, and generates summaries in the original discussion language."
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Context-aware summaries that capture key decisions, assigned tasks, debate arguments, and discussion flow."
    },
    {
      icon: Server,
      title: "Docker & Native Ready",
      description: "Tailored deployment profiles for Apple Silicon Mac, CPU-only, and NVIDIA GPU workstations."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-black/20" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              WhisperX + Pyannote Diarization + Llama 3
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
              Speech2Brief
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-light">
              Transform meetings and audio into structured, speaker-identified chronological notes 
              with state-of-the-art AI models running 100% locally.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Try It Now
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => window.open('https://github.com/diegomartincp/Speech2Brief', '_blank')}
              >
                <Github className="w-5 h-5 mr-2" />
                View on GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="upload-section" className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Active Profile & Models Configuration Banner */}
          <ConfigBanner config={systemConfig} />

          {/* Navigation Tabs (New vs History) */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60 shadow-inner">
              <button
                type="button"
                onClick={() => { setActiveTab('new'); if (state === 'results') setState('idle'); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'new' && state !== 'results'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>New Transcription</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('history'); if (state === 'results') setState('idle'); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history' && state !== 'results'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Past Transcriptions</span>
              </button>
            </div>
          </div>

          {activeTab === 'history' && state !== 'results' && (
            <HistoryView
              apiEndpoint={API_ENDPOINT}
              onOpenTranscription={(data) => {
                setResults(data);
                setState('results');
              }}
              onBackToNew={() => {
                setActiveTab('new');
                setState('idle');
              }}
            />
          )}

          {activeTab === 'new' && (
            <>
              {state === 'idle' && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">
                      Process Audio & Video
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Upload any audio or video file to generate transcripts with optional speaker diarization and AI summaries
                    </p>
                  </div>

                  <ProcessingOptions
                    options={options}
                    onChange={setOptions}
                  />
                  <AudioUpload onFileSelect={handleFileSelect} />
                </>
              )}

              {state === 'processing' && (
                <LoadingState 
                  fileName={selectedFile?.name} 
                  currentStep={currentStep}
                  stepMessage={stepMessage}
                  progress={progress}
                  diarizationEnabled={options.enableDiarization}
                />
              )}
            </>
          )}

          {state === 'results' && results && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/50">
                <Button 
                  onClick={() => { setActiveTab('history'); setState('idle'); }} 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  ← Back to Past Transcriptions
                </Button>

                <Button 
                  onClick={resetApp} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  + Process Another File
                </Button>
              </div>

              <ResultsDisplay results={results} apiEndpoint={API_ENDPOINT} />
            </div>
          )}

          {state === 'error' && (
            <Card className="border-destructive/30 shadow-md">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  Processing Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 font-mono text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </p>
                <Button onClick={resetApp} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built on Advanced Local AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Speech2Brief combines WhisperX neural ASR, Pyannote speaker diarization, and 
              Llama 3 LLMs served locally via Ollama for zero-leakage confidential processing.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/60 hover:border-primary/40 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/40 py-12 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-3">Speech2Brief</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Private, self-hosted audio transcription, speaker diarization, and chronological summarization.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge variant="outline" className="text-xs">
                Supports: MP3, WAV, OGG, OPUS, MP4, MOV, MKV
              </Badge>
              <Badge variant="outline" className="text-xs">
                Pyannote Speaker Diarization
              </Badge>
              <Badge variant="outline" className="text-xs">
                Apple Silicon Optimized
              </Badge>
              <Badge variant="outline" className="text-xs">
                NVIDIA CUDA Compatible
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
