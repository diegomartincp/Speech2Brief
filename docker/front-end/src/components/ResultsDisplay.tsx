import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, MessageSquare, Copy, Check, Users, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface ResultsData {
  processing_time_seconds: number;
  resumen: string;
  transcription: TranscriptionSegment[];
  speakers?: string[];
  detected_language?: string;
}

interface ResultsDisplayProps {
  results: ResultsData;
}

export const formatSpeakerName = (speakerId?: string): string => {
  if (!speakerId) return '';
  if (speakerId.startsWith('SPEAKER_')) {
    const num = parseInt(speakerId.replace('SPEAKER_', ''), 10);
    return !isNaN(num) ? `Speaker ${num + 1}` : speakerId;
  }
  return speakerId;
};

export const getSpeakerColor = (speakerId?: string): { badge: string; border: string; bg: string } => {
  if (!speakerId) {
    return {
      badge: 'bg-muted text-muted-foreground border-border',
      border: 'border-l-border',
      bg: 'bg-muted/20'
    };
  }

  const colorPalette = [
    {
      badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      border: 'border-l-blue-500',
      bg: 'bg-blue-500/5'
    },
    {
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-500/5'
    },
    {
      badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      border: 'border-l-amber-500',
      bg: 'bg-amber-500/5'
    },
    {
      badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      border: 'border-l-purple-500',
      bg: 'bg-purple-500/5'
    },
    {
      badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      border: 'border-l-rose-500',
      bg: 'bg-rose-500/5'
    },
    {
      badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      border: 'border-l-cyan-500',
      bg: 'bg-cyan-500/5'
    }
  ];

  let hash = 0;
  for (let i = 0; i < speakerId.length; i++) {
    hash = speakerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  const [copiedTranscription, setCopiedTranscription] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const { toast } = useToast();

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleCopyTranscription = async () => {
    const formatted = results.transcription
      .map(seg => {
        const time = `[${formatTime(seg.start)} - ${formatTime(seg.end)}]`;
        const spk = seg.speaker ? ` ${formatSpeakerName(seg.speaker)}:` : '';
        return `${time}${spk} ${seg.text}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedTranscription(true);
      toast({
        title: "Transcription copied!",
        description: "Full formatted transcription copied to clipboard.",
      });
      setTimeout(() => setCopiedTranscription(false), 2500);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not access clipboard.",
        variant: "destructive"
      });
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(results.resumen);
      setCopiedSummary(true);
      toast({
        title: "Summary copied!",
        description: "Summary text copied to clipboard.",
      });
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not access clipboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Processing Time */}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Processing Time</p>
              <p className="text-xl font-bold text-foreground">
                {formatDuration(results.processing_time_seconds)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/15 text-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Detected Language</p>
              <p className="text-xl font-bold text-foreground">
                {(results.detected_language || 'Auto').toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Speakers */}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Speakers Identified</p>
              <p className="text-xl font-bold text-foreground">
                {results.speakers && results.speakers.length > 0 ? results.speakers.length : '1+'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chronological Summary Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Chronological Summary
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copy Summary</span>
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {results.resumen}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Card with Speakers & Copy Button */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Transcription</CardTitle>
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {results.transcription.length} segments
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyTranscription}
            className="flex items-center gap-1.5 h-8 text-xs font-medium"
          >
            {copiedTranscription ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copy Transcription</span>
              </>
            )}
          </Button>
        </CardHeader>

        {/* Detected Speaker Badges Palette */}
        {results.speakers && results.speakers.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap items-center gap-2 border-b border-border/40">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Speakers:
            </span>
            {results.speakers.map((spk) => {
              const color = getSpeakerColor(spk);
              return (
                <Badge 
                  key={spk} 
                  variant="outline" 
                  className={`text-xs py-0.5 px-2.5 font-medium border ${color.badge}`}
                >
                  {formatSpeakerName(spk)}
                </Badge>
              );
            })}
          </div>
        )}

        <CardContent className="pt-4">
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {results.transcription.map((segment, index) => {
              const color = getSpeakerColor(segment.speaker);
              const speakerLabel = formatSpeakerName(segment.speaker);

              return (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border border-l-4 transition-colors ${color.border} ${color.bg} hover:bg-muted/40`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {speakerLabel && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-semibold py-0 px-2 ${color.badge}`}
                        >
                          {speakerLabel}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {segment.text}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};