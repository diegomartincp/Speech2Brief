import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  Sparkles, 
  Brain, 
  Mic, 
  Users, 
  Layers
} from 'lucide-react';

export interface SystemConfig {
  profile: string;
  device: string;
  whisperx_model: string;
  compute_type: string;
  batch_size: number;
  llama_model: string;
  threads: number;
  diarization_available: boolean;
}

interface ConfigBannerProps {
  config: SystemConfig | null;
  loading?: boolean;
}

export const ConfigBanner: React.FC<ConfigBannerProps> = ({ config, loading }) => {
  if (loading || !config) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm animate-pulse flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span>Detecting active Docker deployment profile and models...</span>
        </div>
      </div>
    );
  }

  const isAppleSilicon = config.profile.includes('apple-silicon') || (config.device === 'cpu' && config.profile.includes('silicon'));

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 p-3.5 rounded-xl border border-primary/20 bg-card/60 backdrop-blur-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Active Profile */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="default" 
            className={`font-semibold tracking-wide flex items-center gap-1.5 py-1 px-2.5 ${
              isAppleSilicon 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700' 
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Profile: {config.profile}</span>
          </Badge>
        </div>

        {/* Configuration Pills */}
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40">
            <Mic className="w-3 h-3 text-blue-500" />
            <span>WhisperX: <strong className="text-foreground font-semibold">{config.whisperx_model}</strong> ({config.compute_type})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40">
            <Brain className="w-3 h-3 text-purple-500" />
            <span>LLM: <strong className="text-foreground font-semibold">{config.llama_model}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40">
            <Cpu className="w-3 h-3 text-amber-500" />
            <span>CPU: <strong className="text-foreground font-semibold">{config.threads} Cores</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40">
            <Users className="w-3 h-3 text-emerald-500" />
            <span>Diarization: <strong className={config.diarization_available ? 'text-emerald-500' : 'text-amber-500'}>
              {config.diarization_available ? 'Ready' : 'No Token'}
            </strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
