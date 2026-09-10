import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Copy, Check, FileDown, FileText } from 'lucide-react';
import { ResultsData, formatSpeakerName } from './ResultsDisplay';
import { useToast } from '@/hooks/use-toast';

interface ExportMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ResultsData;
  speakerMap?: { [key: string]: string };
}

export const ExportMarkdownModal: React.FC<ExportMarkdownModalProps> = ({
  isOpen,
  onClose,
  results,
  speakerMap = {},
}) => {
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEffectiveSpeakerName = (spkId?: string): string => {
    if (!spkId) return '';
    return speakerMap[spkId] || formatSpeakerName(spkId);
  };

  // Generate the markdown document
  const markdownContent = useMemo(() => {
    const lines: string[] = [];
    const docTitle = results.filename ? results.filename : 'Meeting Transcript';

    lines.push(`# ${docTitle}\n`);

    if (includeMetadata) {
      lines.push(`- **Export Date:** ${new Date().toLocaleString()}`);
      if (results.detected_language) {
        lines.push(`- **Language:** ${results.detected_language.toUpperCase()}`);
      }
      lines.push(`- **Total Processing Duration:** ${results.processing_time_seconds.toFixed(1)}s`);
      if (results.speakers && results.speakers.length > 0) {
        const names = results.speakers.map(s => getEffectiveSpeakerName(s)).join(', ');
        lines.push(`- **Identified Speakers (${results.speakers.length}):** ${names}`);
      }
      lines.push('\n---\n');
    }

    if (includeSummary && results.resumen) {
      lines.push('## Executive Summary\n');
      lines.push(results.resumen.trim());
      lines.push('\n\n---\n');
    }

    lines.push('## Full Transcript\n');

    results.transcription.forEach(seg => {
      const timeTag = includeTimestamps 
        ? `\`[${formatTime(seg.start)} - ${formatTime(seg.end)}]\` ` 
        : '';
      const speakerName = getEffectiveSpeakerName(seg.speaker);
      const speakerTag = speakerName ? `**${speakerName}:** ` : '';

      lines.push(`${timeTag}${speakerTag}${seg.text.trim()}\n`);
    });

    return lines.join('\n');
  }, [results, speakerMap, includeSummary, includeTimestamps, includeMetadata]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard!",
        description: "Markdown transcript ready to paste.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({
        title: "Failed to copy",
        description: "Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const cleanName = (results.filename || 'transcript').replace(/\.[^/.]+$/, "");
    const filename = `${cleanName}.md`;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "File downloaded!",
      description: `Saved as ${filename}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Export to Markdown</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Customize export options and download or copy formatted Markdown.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Export Configuration Options */}
        <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-y border-border/50">
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-summary"
              checked={includeSummary && !!results.resumen}
              onCheckedChange={(checked) => setIncludeSummary(!!checked)}
              disabled={!results.resumen}
            />
            <Label 
              htmlFor="include-summary" 
              className={`font-medium ${!results.resumen ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              Include AI Summary {!results.resumen && '(N/A)'}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-timestamps"
              checked={includeTimestamps}
              onCheckedChange={(checked) => setIncludeTimestamps(!!checked)}
            />
            <Label htmlFor="include-timestamps" className="cursor-pointer font-medium">
              Include Timestamps
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-metadata"
              checked={includeMetadata}
              onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
            />
            <Label htmlFor="include-metadata" className="cursor-pointer font-medium">
              Include File Info
            </Label>
          </div>
        </div>

        {/* Live Markdown Preview */}
        <div className="flex-1 min-h-[220px] max-h-[320px] overflow-hidden flex flex-col rounded-lg border border-border/60 bg-muted/30">
          <div className="px-3 py-1.5 bg-muted/60 border-b border-border/40 text-[11px] font-mono text-muted-foreground flex justify-between items-center">
            <span>Markdown Preview</span>
            <span>{markdownContent.length} chars</span>
          </div>
          <pre className="p-3 text-xs font-mono text-foreground/90 overflow-y-auto whitespace-pre-wrap flex-1 leading-relaxed selection:bg-primary/20">
            {markdownContent}
          </pre>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Markdown'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download .md
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
