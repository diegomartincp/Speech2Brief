import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Mic, MicOff, FileAudio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ onFileSelect, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const supportedFormats = ['.mp3', '.wav', '.ogg', '.opus'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedFormats.includes(extension)) {
      toast({
        title: "Unsupported file format",
        description: `Please upload one of: ${supportedFormats.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        onFileSelect(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`transition-all duration-300 ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <CardContent className="p-8">
          <div
            className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center space-y-4 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <FileAudio className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Audio File</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your audio file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supported formats: {supportedFormats.join(', ')} • Max size: 50MB
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept={supportedFormats.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
        {/*
        // TODO: Add recording functionality
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Or record audio directly</p>
          <Button
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            size="lg"
            className="gap-2"
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Recording
              </>
            )}
          </Button>
        </div>*/}
    </div>
  );
};