import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Brain, Mic } from 'lucide-react';

interface LoadingStateProps {
  fileName?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ fileName }) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          return 0;
        }
        const diff = Math.random() * 10;
        return Math.min(oldProgress + diff, 95);
      });
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">Processing Your Audio</h3>
            {fileName && (
              <p className="text-muted-foreground mb-4">
                File: {fileName}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              Our AI is transcribing and summarizing your audio...
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                Transcribing
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Summarizing
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};