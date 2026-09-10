import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Zap, Settings2, Brain, Globe } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect language' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'en', label: 'English' },
  { code: 'ca', label: 'Catalan (Català)' },
  { code: 'gl', label: 'Galician (Galego)' },
  { code: 'eu', label: 'Basque (Euskara)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'custom', label: 'Other (Custom code)...' },
];

export interface ProcessingOptionsState {
  enableDiarization: boolean;
  enableSpeakerRange: boolean;
  minSpeakers: number;
  maxSpeakers: number;
  enableSummarization: boolean;
  selectedModel?: string;
  language?: string;
}

interface ProcessingOptionsProps {
  options: ProcessingOptionsState;
  onChange: (options: ProcessingOptionsState) => void;
  disabled?: boolean;
  availableModels?: string[];
  currentModel?: string;
  llmProvider?: string;
}

export const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  options,
  onChange,
  disabled = false,
  availableModels = [],
  currentModel = '',
  llmProvider = 'ollama',
}) => {
  const currentLang = options.language || 'auto';
  const isKnownPreset = SUPPORTED_LANGUAGES.some(l => l.code === currentLang);
  const [showCustomInput, setShowCustomInput] = useState(!isKnownPreset && currentLang !== 'auto');

  const handleLanguageChange = (val: string) => {
    if (val === 'custom') {
      setShowCustomInput(true);
      onChange({ ...options, language: '' });
    } else {
      setShowCustomInput(false);
      onChange({ ...options, language: val });
    }
  };

  const handleToggleDiarization = (checked: boolean) => {
    onChange({ ...options, enableDiarization: checked });
  };

  const handleToggleSummarization = (checked: boolean) => {
    onChange({ ...options, enableSummarization: checked });
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
          {/* Spoken Language Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/50 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="language-select" className="text-sm font-semibold text-foreground">
                    Audio Language
                  </Label>
                  {options.language && options.language !== 'auto' ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold font-mono uppercase">
                      {options.language} (Forced)
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      Auto-Detect
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {options.language && options.language !== 'auto'
                    ? `Forcing ${options.language.toUpperCase()} avoids language misdetection and speeds up WhisperX transcription.`
                    : "Automatically detects spoken language. If audio starts with silence/music, consider forcing the language."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                id="language-select"
                value={showCustomInput ? 'custom' : (options.language || 'auto')}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={disabled}
                className="h-8 px-3 rounded-md bg-muted/70 border border-border/60 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-52"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>

              {showCustomInput && (
                <Input
                  type="text"
                  placeholder="e.g. sv"
                  maxLength={5}
                  value={options.language || ''}
                  onChange={(e) => onChange({ ...options, language: e.target.value.toLowerCase().trim() })}
                  disabled={disabled}
                  className="w-20 h-8 text-xs font-mono uppercase text-center"
                />
              )}
            </div>
          </div>

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

          {/* Main LLM Summarization Switch */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="summarization-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                    AI Chronological Summary (Local LLM)
                  </Label>
                  {options.enableSummarization !== false ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                      {llmProvider === 'lmstudio' ? 'LM Studio (Metal GPU)' : 'Ollama'}
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                      Transcription Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {options.enableSummarization !== false
                    ? "Generates structured chronological notes with key points, agreements, and decisions using your local LLM."
                    : "Skips LLM summary generation to save time. Produces speech-to-text transcript and speaker identification only."}
                </p>
              </div>
            </div>

            <Switch
              id="summarization-toggle"
              checked={options.enableSummarization !== false}
              onCheckedChange={handleToggleSummarization}
              disabled={disabled}
            />
          </div>

          {/* Sub-options: Summarization Model (only if summarization is enabled) */}
          {options.enableSummarization !== false && (
            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground text-xs font-medium">
                Active Local Model:
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {availableModels && availableModels.length > 0 ? (
                  <select
                    id="model-select"
                    value={options.selectedModel || currentModel || availableModels[0]}
                    onChange={(e) => onChange({ ...options, selectedModel: e.target.value })}
                    disabled={disabled}
                    className="h-8 px-3 rounded-md bg-muted/70 border border-border/60 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="model-input"
                    type="text"
                    placeholder={currentModel || "e.g. llama3:8b"}
                    value={options.selectedModel !== undefined ? options.selectedModel : (currentModel || '')}
                    onChange={(e) => onChange({ ...options, selectedModel: e.target.value })}
                    disabled={disabled}
                    className="w-full sm:w-64 h-8 text-xs font-mono"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
