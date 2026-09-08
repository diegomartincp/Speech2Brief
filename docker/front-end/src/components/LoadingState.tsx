import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Brain, 
  Mic, 
  FileAudio, 
  FileVideo, 
  Users, 
  CheckCircle2, 
  Sparkles,
  AlignLeft,
  Clock,
  Timer
} from 'lucide-react';

export interface LoadingStateProps {
  fileName?: string;
  currentStep?: string;
  stepMessage?: string;
  progress?: number;
  diarizationEnabled?: boolean;
}

interface StepItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const PIPELINE_STEPS: StepItem[] = [
  { id: 'uploaded', label: 'Loading Media', icon: FileAudio },
  { id: 'extracting_audio', label: 'Audio Extraction', icon: FileVideo },
  { id: 'transcribing', label: 'Transcription (WhisperX)', icon: Mic },
  { id: 'aligning', label: 'Phoneme Alignment', icon: AlignLeft },
  { id: 'diarizing', label: 'Speaker Identification', icon: Users },
  { id: 'summarizing', label: 'Chronological Summary (Llama 3)', icon: Brain },
];

const formatDuration = (sec: number): string => {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatCompletedDuration = (sec: number): string => {
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
};

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  fileName, 
  currentStep = 'uploaded', 
  stepMessage,
  progress = 15,
  diarizationEnabled = true
}) => {
  const [totalElapsed, setTotalElapsed] = useState<number>(0);
  const [stepElapsed, setStepElapsed] = useState<number>(0);
  const [stepDurations, setStepDurations] = useState<{ [key: string]: number }>({});
  
  const currentStepRef = useRef<string>(currentStep);
  const stepStartTimeRef = useRef<number>(Date.now());
  const globalStartTimeRef = useRef<number>(Date.now());

  // Overall timer ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalElapsed(Math.floor((Date.now() - globalStartTimeRef.current) / 1000));
      setStepElapsed(Math.floor((Date.now() - stepStartTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Track step transitions and record exact stage durations
  useEffect(() => {
    if (currentStep !== currentStepRef.current) {
      const prevStep = currentStepRef.current;
      const duration = (Date.now() - stepStartTimeRef.current) / 1000;
      
      // Map intermediate steps to pipeline step IDs
      let recordKey = prevStep;
      if (prevStep === 'audio_extracted') recordKey = 'extracting_audio';
      if (prevStep === 'language_detected') recordKey = 'transcribing';

      setStepDurations(prev => ({
        ...prev,
        [recordKey]: duration
      }));

      currentStepRef.current = currentStep;
      stepStartTimeRef.current = Date.now();
      setStepElapsed(0);
    }
  }, [currentStep]);

  const getStepStatus = (stepId: string) => {
    if (stepId === 'diarizing' && (!diarizationEnabled || currentStep === 'diarizing_skipped')) {
      return 'skipped';
    }

    const stepOrder = [
      'uploaded',
      'extracting_audio',
      'audio_extracted',
      'transcribing',
      'language_detected',
      'aligning',
      'diarizing',
      'diarizing_skipped',
      'summarizing',
      'completed'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    let targetIndex = stepOrder.indexOf(stepId);

    // Normalize target indices for checking
    if (stepId === 'extracting_audio' && currentStep === 'audio_extracted') return 'done';
    if (stepId === 'transcribing' && currentStep === 'language_detected') return 'active';

    if (currentIndex > targetIndex) return 'done';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="border-primary/20 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardContent className="p-8">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          {/* Animated Spinner Icon */}
          <div className="relative mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center shadow-md animate-pulse">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-300 animate-bounce" />
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                Processing Media
              </h3>
            </div>

            {/* Overall Live Timer Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-semibold mb-3">
              <Timer className="w-3.5 h-3.5 animate-spin" />
              <span>Total Elapsed: {formatDuration(totalElapsed)}</span>
            </div>

            {fileName && (
              <p className="text-sm font-medium text-muted-foreground mb-2 truncate">
                File: <span className="text-foreground font-mono">{fileName}</span>
              </p>
            )}
            <p className="text-primary font-medium text-base animate-pulse">
              {stepMessage || 'Processing current stage...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full h-2.5" />
          </div>

          {/* Step Pipeline Flow with Live Per-Step Timers */}
          <div className="pt-4 border-t border-border/60">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Pipeline Stages
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <Clock className="w-3 h-3" />
                <span>Live Per-Stage Duration</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {PIPELINE_STEPS.map((step) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;

                let statusClass = "text-muted-foreground/60 border-border/40 bg-background/50";
                let iconClass = "text-muted-foreground/60";

                if (status === 'done') {
                  statusClass = "text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-medium";
                  iconClass = "text-emerald-500";
                } else if (status === 'active') {
                  statusClass = "text-primary border-primary/40 bg-primary/10 font-semibold shadow-sm";
                  iconClass = "text-primary animate-spin";
                } else if (status === 'skipped') {
                  statusClass = "text-muted-foreground/40 border-border/30 bg-muted/20 opacity-60";
                  iconClass = "text-muted-foreground/40";
                }

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${statusClass}`}
                  >
                    <div className="flex-shrink-0">
                      {status === 'active' ? (
                        <Loader2 className={`w-4 h-4 ${iconClass}`} />
                      ) : status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Icon className={`w-4 h-4 ${iconClass}`} />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs truncate font-medium">{step.label}</span>
                      
                      {/* Live Counter or Recorded Duration */}
                      {status === 'active' && (
                        <span className="text-[11px] font-mono text-primary font-semibold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 animate-pulse" />
                          Running: {formatDuration(stepElapsed)}
                        </span>
                      )}
                      {status === 'done' && stepDurations[step.id] !== undefined && (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Took {formatCompletedDuration(stepDurations[step.id])}
                        </span>
                      )}
                    </div>

                    {/* Status Badges */}
                    {status === 'done' && (
                      <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    )}
                    {status === 'active' && (
                      <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded animate-pulse">
                        Active
                      </span>
                    )}
                    {status === 'skipped' && (
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Skipped
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};