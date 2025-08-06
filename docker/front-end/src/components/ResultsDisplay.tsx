import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, MessageSquare } from 'lucide-react';

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

interface ResultsDisplayProps {
  results: ResultsData;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
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

  return (
    <div className="space-y-6">
      {/* Processing Time */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processing Time</p>
              <p className="text-2xl font-bold text-primary">
                {formatDuration(results.processing_time_seconds)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Chronological Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {results.resumen}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Transcription
            <Badge variant="secondary" className="ml-auto">
              {results.transcription.length} segments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.transcription.map((segment, index) => (
              <div 
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs font-mono">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};