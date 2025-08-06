import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AudioUpload } from '@/components/AudioUpload';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Zap, 
  Shield, 
  Globe, 
  MessageSquare, 
  Server,
  Github,
  ArrowRight
} from 'lucide-react';
import heroImage from '@/assets/hero-audio.jpg';

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface ResultsData {
  processing_time_seconds: number;
  resumen: string;
  transcription: TranscriptionSegment[];
}

type AppState = 'idle' | 'processing' | 'results' | 'error';

const Index = () => {
  const [state, setState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:5000';

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    processAudio(file);
  };

  const processAudio = async (file: File) => {
    setState('processing');
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_ENDPOINT}/summarize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data: ResultsData = await response.json();
      setResults(data);
      setState('results');
      
      toast({
        title: "Processing complete!",
        description: `Audio processed in ${data.processing_time_seconds.toFixed(1)} seconds`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio';
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
  };

  const features = [
    {
      icon: Shield,
      title: "100% Local Processing",
      description: "All transcription and summarization runs on your hardware. No data leaves your machine."
    },
    {
      icon: Zap,
      title: "High-Speed Processing",
      description: "Powered by WhisperX and Llama 3 for fast, accurate transcription and summarization."
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Accurately transcribes and summarizes in the original language of the audio."
    },
    {
      icon: MessageSquare,
      title: "Telegram Bot Integration",
      description: "Send voice messages directly to the Telegram bot for instant processing."
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Context-aware summaries that capture discussion flow, agreements, and decisions."
    },
    {
      icon: Server,
      title: "Easy Deployment",
      description: "Flexible deployment with Docker Compose profiles for GPU or CPU processing."
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
            <Badge className="mb-6 bg-white/20 text-white border-white/30">
              Powered by WhisperX + Llama 3
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Speech2Brief
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed">
              Transform speech into structured, chronological meeting notes with 
              advanced AI models running completely locally on your hardware.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Try It Now
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => window.open('https://github.com/your-repo/speech2brief', '_blank')}
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="upload-section" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Process Your Audio
            </h2>
            <p className="text-xl text-muted-foreground">
              Upload an audio file or record directly to get started
            </p>
          </div>

          {state === 'idle' && (
            <AudioUpload onFileSelect={handleFileSelect} />
          )}

          {state === 'processing' && (
            <LoadingState fileName={selectedFile?.name} />
          )}

          {state === 'results' && results && (
            <div className="space-y-8">
              <div className="text-center">
                <Button onClick={resetApp} variant="outline" size="lg">
                  Process Another File
                </Button>
              </div>
              <ResultsDisplay results={results} />
            </div>
          )}

          {state === 'error' && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Processing Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={resetApp} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built on Advanced AI Models
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Speech2Brief combines the speed of WhisperX neural ASR with the summarization 
              capabilities of large language models served locally using Ollama.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
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
      <footer className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Ready to Deploy?</h3>
            <p className="text-muted-foreground mb-6">
              Get started with Speech2Brief using Docker or native installation. 
              Check the documentation for setup instructions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Badge variant="outline" className="text-sm">
                Supports: MP3, WAV, OGG, OPUS
              </Badge>
              <Badge variant="outline" className="text-sm">
                Docker Ready
              </Badge>
              <Badge variant="outline" className="text-sm">
                Self-Hosted
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
