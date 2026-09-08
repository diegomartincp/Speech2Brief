import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  FileText, 
  Users, 
  Trash2, 
  ExternalLink, 
  Search, 
  RotateCcw, 
  FolderOpen,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResultsData } from './ResultsDisplay';

export interface HistoryItem {
  id: string;
  created_at: string;
  filename: string;
  detected_language: string;
  processing_time_seconds: number;
  speakers_count: number;
  speaker_map: { [key: string]: string };
  diarization_enabled: boolean;
  summary_snippet: string;
  segments_count: number;
}

interface HistoryViewProps {
  apiEndpoint: string;
  onOpenTranscription: (fullData: ResultsData) => void;
  onBackToNew: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  apiEndpoint,
  onOpenTranscription,
  onBackToNew,
}) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}/transcriptions`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        throw new Error('Could not load history');
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not load history",
        description: "Failed to connect to backend transcriptions storage.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [apiEndpoint]);

  const handleOpen = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await fetch(`${apiEndpoint}/transcriptions/${id}`);
      if (res.ok) {
        const fullData: ResultsData = await res.json();
        onOpenTranscription(fullData);
      } else {
        throw new Error('Failed to load transcription details');
      }
    } catch (e) {
      toast({
        title: "Error opening transcription",
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved transcription?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`${apiEndpoint}/transcriptions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast({
          title: "Transcription deleted",
          description: "Removed from local storage.",
        });
      }
    } catch (e) {
      toast({
        title: "Failed to delete",
        description: "Could not remove file.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'Unknown date';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.filename.toLowerCase().includes(q) ||
      (item.summary_snippet && item.summary_snippet.toLowerCase().includes(q)) ||
      (item.detected_language && item.detected_language.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Search and Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Past Transcriptions ({items.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Locally saved JSON transcripts with speaker mappings and AI summaries.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by filename or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
            className="h-8 text-xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onBackToNew}
            className="h-8 text-xs"
          >
            + Process New Audio
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && items.length === 0 && (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl border border-border/50 bg-card/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <Card className="border-dashed border-border/80 bg-card/40 text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {searchQuery ? 'No matching transcriptions' : 'No saved transcriptions yet'}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? `No transcripts match "${searchQuery}". Try a different keyword.` 
                  : 'Whenever you process an audio or video file, the results will automatically be stored here in JSON.'}
              </p>
            </div>
            <Button size="sm" onClick={onBackToNew}>
              Upload Media File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History Cards List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredItems.map((item) => {
          const isOpening = openingId === item.id;
          const isDeleting = deletingId === item.id;

          return (
            <Card 
              key={item.id}
              className="border-border/60 hover:border-primary/40 bg-card/60 backdrop-blur-sm transition-all hover:shadow-md cursor-pointer group"
              onClick={() => handleOpen(item.id)}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Title & Date */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {item.filename}
                      </h3>

                      <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(item.created_at)}
                      </Badge>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.detected_language && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 px-1.5">
                          {item.detected_language}
                        </Badge>
                      )}

                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground/80" />
                        {formatTime(item.processing_time_seconds)}
                      </span>

                      <span className="text-muted-foreground/40">•</span>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.segments_count} segments
                      </span>

                      <span className="text-muted-foreground/40">•</span>

                      {item.speakers_count > 0 ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.speakers_count} speakers
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Single speaker
                        </span>
                      )}
                    </div>

                    {/* Summary Snippet */}
                    {item.summary_snippet && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed pt-1">
                        {item.summary_snippet}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isOpening}
                      className="h-8 text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isOpening ? 'Loading...' : 'Open'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={isDeleting}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
