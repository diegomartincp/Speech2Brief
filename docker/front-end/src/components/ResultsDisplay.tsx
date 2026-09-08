import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  FileText, 
  MessageSquare, 
  Copy, 
  Check, 
  Users, 
  Globe, 
  FileDown, 
  UserCheck, 
  Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SpeakerRenameModal } from './SpeakerRenameModal';
import { ExportMarkdownModal } from './ExportMarkdownModal';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface ResultsData {
  id?: string;
  created_at?: string;
  filename?: string;
  processing_time_seconds: number;
  resumen: string;
  transcription: TranscriptionSegment[];
  speakers?: string[];
  speaker_map?: { [key: string]: string };
  detected_language?: string;
  config?: any;
}

interface ResultsDisplayProps {
  results: ResultsData;
  apiEndpoint?: string;
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

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, apiEndpoint }) => {
  const [copiedTranscription, setCopiedTranscription] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [speakerMap, setSpeakerMap] = useState<{ [key: string]: string }>(results.speaker_map || {});
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavingSpeakers, setIsSavingSpeakers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSpeakerMap(results.speaker_map || {});
  }, [results]);

  const getEffectiveSpeakerName = (speakerId?: string): string => {
    if (!speakerId) return '';
    return speakerMap[speakerId] || formatSpeakerName(speakerId);
  };

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
        const name = getEffectiveSpeakerName(seg.speaker);
        const spk = name ? ` ${name}:` : '';
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

  const handleSaveSpeakerMap = async (newMap: { [key: string]: string }) => {
    setSpeakerMap(newMap);
    if (results.id && apiEndpoint) {
      setIsSavingSpeakers(true);
      try {
        const res = await fetch(`${apiEndpoint}/transcriptions/${results.id}/speakers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speaker_map: newMap })
        });
        if (res.ok) {
          toast({
            title: "Speaker names saved!",
            description: "Updated permanently in local storage.",
          });
        }
      } catch (e) {
        console.warn('Could not persist speaker names:', e);
      } finally {
        setIsSavingSpeakers(false);
      }
    } else {
      toast({
        title: "Speaker names updated",
        description: "Names updated for current view and export.",
      });
    }
  };

  const hasSpeakers = results.speakers && results.speakers.length > 0;

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
              <p className="text-xs text-muted-foreground font-medium">Processing Duration</p>
              <p className="text-xl font-bold font-mono tracking-tight text-foreground">
                {formatDuration(results.processing_time_seconds)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Detected Language</p>
              <p className="text-xl font-bold uppercase tracking-tight text-foreground">
                {results.detected_language || 'Auto'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Speaker Count & Rename Action */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Identified Speakers</p>
                <p className="text-xl font-bold tracking-tight text-foreground">
                  {hasSpeakers ? `${results.speakers!.length}` : '1 (Single)'}
                </p>
              </div>
            </div>

            {hasSpeakers && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRenameOpen(true)}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Rename
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          {results.filename && (
            <span className="text-xs font-mono text-muted-foreground truncate max-w-xs sm:max-w-md">
              File: <strong className="text-foreground">{results.filename}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSpeakers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenameOpen(true)}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Rename Speakers
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Markdown
          </Button>
        </div>
      </div>

      {/* Chronological Summary Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Executive Summary
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
            <CardTitle className="text-lg">Full Transcription</CardTitle>
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {results.transcription.length} segments
            </Badge>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>

        {/* Detected Speaker Badges Palette */}
        {hasSpeakers && (
          <div className="px-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Speakers:
              </span>
              {results.speakers!.map((spk) => {
                const color = getSpeakerColor(spk);
                const displayName = getEffectiveSpeakerName(spk);
                return (
                  <Badge 
                    key={spk} 
                    variant="outline" 
                    className={`text-xs py-0.5 px-2.5 font-medium border cursor-pointer hover:opacity-80 transition-opacity ${color.badge}`}
                    onClick={() => setIsRenameOpen(true)}
                    title={`Click to rename ${displayName}`}
                  >
                    {displayName}
                  </Badge>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRenameOpen(true)}
              className="h-7 text-xs text-primary hover:text-primary flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Edit Names
            </Button>
          </div>
        )}

        <CardContent className="pt-4">
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {results.transcription.map((segment, index) => {
              const color = getSpeakerColor(segment.speaker);
              const speakerLabel = getEffectiveSpeakerName(segment.speaker);

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
                          className={`text-xs font-semibold py-0 px-2 cursor-pointer hover:opacity-80 ${color.badge}`}
                          onClick={() => setIsRenameOpen(true)}
                          title="Click to rename speaker"
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

      {/* Modals */}
      {hasSpeakers && (
        <SpeakerRenameModal
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          speakers={results.speakers!}
          currentSpeakerMap={speakerMap}
          onSave={handleSaveSpeakerMap}
          isSaving={isSavingSpeakers}
        />
      )}

      <ExportMarkdownModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        results={results}
        speakerMap={speakerMap}
      />
    </div>
  );
};