import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Zap, Settings2 } from 'lucide-react';

export interface ProcessingOptionsState {
  enableDiarization: boolean;
  enableSpeakerRange: boolean;
  minSpeakers: number;
  maxSpeakers: number;
}

interface ProcessingOptionsProps {
  options: ProcessingOptionsState;
  onChange: (options: ProcessingOptionsState) => void;
  disabled?: boolean;
}

export const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const handleToggleDiarization = (checked: boolean) => {
    onChange({ ...options, enableDiarization: checked });
  };

  const handleToggleRange = (checked: boolean) => {
    onChange({ ...options, enableSpeakerRange: checked });
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange({
      ...options,
      minSpeakers: isNaN(val) ? 1 : Math.max(1, Math.min(val, options.maxSpeakers))
    });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange({
      ...options,
      maxSpeakers: isNaN(val) ? 10 : Math.max(options.minSpeakers, Math.min(val, 30))
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6 border-border/70 bg-card/60 backdrop-blur-sm shadow-sm transition-all">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          {/* Main Diarization Switch */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="diarization-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                    Speaker Diarization (Identification)
                  </Label>
                  {options.enableDiarization ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                      Multi-Speaker
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                      Fast Mode (~5x faster)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {options.enableDiarization 
                    ? "Identifies and color-codes each speaker across the transcript and summary notes."
                    : "Skips speaker clustering to save time. Best for monologues, lectures, podcasts, or quick summaries."}
                </p>
              </div>
            </div>

            <Switch
              id="diarization-toggle"
              checked={options.enableDiarization}
              onCheckedChange={handleToggleDiarization}
              disabled={disabled}
            />
          </div>

          {/* Sub-options: Speaker Range (only if diarization is enabled) */}
          {options.enableDiarization && (
            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="range-toggle"
                  checked={options.enableSpeakerRange}
                  onCheckedChange={(checked) => handleToggleRange(!!checked)}
                  disabled={disabled}
                />
                <Label htmlFor="range-toggle" className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Specify speaker count range (helps prevent extra phantom speakers)
                </Label>
              </div>

              {options.enableSpeakerRange && (
                <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Min:</span>
                    <Input
                      type="number"
                      min={1}
                      max={options.maxSpeakers}
                      value={options.minSpeakers}
                      onChange={handleMinChange}
                      disabled={disabled}
                      className="w-16 h-7 text-xs text-center font-mono"
                    />
                  </div>

                  <span className="text-muted-foreground">—</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Max:</span>
                    <Input
                      type="number"
                      min={options.minSpeakers}
                      max={30}
                      value={options.maxSpeakers}
                      onChange={handleMaxChange}
                      disabled={disabled}
                      className="w-16 h-7 text-xs text-center font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
