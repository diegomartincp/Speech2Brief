import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Check, RotateCcw } from 'lucide-react';
import { getSpeakerColor, formatSpeakerName } from './ResultsDisplay';

interface SpeakerRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: string[];
  currentSpeakerMap: { [key: string]: string };
  onSave: (newSpeakerMap: { [key: string]: string }) => Promise<void> | void;
  isSaving?: boolean;
}

export const SpeakerRenameModal: React.FC<SpeakerRenameModalProps> = ({
  isOpen,
  onClose,
  speakers,
  currentSpeakerMap,
  onSave,
  isSaving = false,
}) => {
  const [draftMap, setDraftMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      const initial: { [key: string]: string } = {};
      speakers.forEach(spk => {
        initial[spk] = currentSpeakerMap[spk] || formatSpeakerName(spk);
      });
      setDraftMap(initial);
    }
  }, [isOpen, speakers, currentSpeakerMap]);

  const handleChange = (speakerId: string, newName: string) => {
    setDraftMap(prev => ({
      ...prev,
      [speakerId]: newName
    }));
  };

  const handleReset = () => {
    const reset: { [key: string]: string } = {};
    speakers.forEach(spk => {
      reset[spk] = formatSpeakerName(spk);
    });
    setDraftMap(reset);
  };

  const handleSave = async () => {
    await onSave(draftMap);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Rename Speakers</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Assign recognizable names to speakers across the transcript and exports.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto pr-1">
          {speakers.map((spk) => {
            const colors = getSpeakerColor(spk);
            const defaultName = formatSpeakerName(spk);
            const value = draftMap[spk] ?? defaultName;

            return (
              <div
                key={spk}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card/40"
              >
                <div className={`px-2.5 py-1 rounded text-xs font-semibold border ${colors.badge}`}>
                  {spk}
                </div>

                <div className="flex-1">
                  <Input
                    type="text"
                    value={value}
                    placeholder={defaultName}
                    onChange={(e) => handleChange(spk, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Names'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
