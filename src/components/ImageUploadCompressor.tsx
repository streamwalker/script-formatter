import { useState, useRef, useCallback } from 'react';
import { Upload, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  compressImage,
  compressImages,
  formatFileSize,
  isImageFile,
  CompressionResult,
} from '@/lib/imageCompression';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadCompressorProps {
  onUpload: (files: File[]) => void;
  maxSizeMB?: number;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageUploadCompressor({
  onUpload,
  maxSizeMB = 20,
  maxFiles = 10,
  accept = 'image/*',
  disabled,
  className,
}: ImageUploadCompressorProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).slice(0, maxFiles);
    
    if (files.length === 0) return;

    const imageFiles = files.filter(isImageFile);
    const nonImageFiles = files.filter(f => !isImageFile(f));

    if (imageFiles.length === 0 && nonImageFiles.length > 0) {
      // No images, pass through non-image files
      onUpload(nonImageFiles);
      return;
    }

    setIsCompressing(true);
    setProgress(0);
    setResults([]);

    try {
      const compressionResults = await compressImages(
        imageFiles,
        { maxSizeMB },
        (completed, total) => setProgress((completed / total) * 100)
      );

      setResults(compressionResults);

      const compressedFiles = compressionResults.map(r => r.file);
      const allFiles = [...compressedFiles, ...nonImageFiles];
      
      // Show summary
      const totalOriginal = compressionResults.reduce((sum, r) => sum + r.originalSize, 0);
      const totalCompressed = compressionResults.reduce((sum, r) => sum + r.compressedSize, 0);
      const wasAnyCompressed = compressionResults.some(r => r.wasCompressed);

      if (wasAnyCompressed) {
        const savings = totalOriginal - totalCompressed;
        const savingsPercent = Math.round((savings / totalOriginal) * 100);
        toast.success(
          `Compressed ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}: saved ${formatFileSize(savings)} (${savingsPercent}%)`
        );
      }

      onUpload(allFiles);
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to compress images');
    } finally {
      setIsCompressing(false);
      setProgress(0);
      
      // Clear results after a delay
      setTimeout(() => setResults([]), 3000);
    }
  }, [maxSizeMB, maxFiles, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || isCompressing) return;
    
    handleFiles(e.dataTransfer.files);
  }, [disabled, isCompressing, handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isCompressing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !isCompressing) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer',
          'flex flex-col items-center justify-center gap-3',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50',
          (disabled || isCompressing) && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          disabled={disabled || isCompressing}
          className="hidden"
        />

        {isCompressing ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Compressing images...</p>
              <Progress value={progress} className="w-48 mt-2" />
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drop images here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images over {maxSizeMB}MB will be automatically compressed
              </p>
            </div>
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
            >
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{result.file.name}</span>
              
              {result.wasCompressed ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground line-through">
                    {formatFileSize(result.originalSize)}
                  </span>
                  <span className="text-emerald-500">
                    {formatFileSize(result.compressedSize)}
                  </span>
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(result.originalSize)}</span>
                  <span className="text-emerald-500">OK</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple hook for programmatic compression
export function useImageCompression() {
  const [isCompressing, setIsCompressing] = useState(false);

  const compress = async (file: File, maxSizeMB = 20): Promise<File> => {
    if (!isImageFile(file)) return file;
    
    setIsCompressing(true);
    try {
      const result = await compressImage(file, { maxSizeMB });
      return result.file;
    } finally {
      setIsCompressing(false);
    }
  };

  const compressMultiple = async (
    files: File[],
    maxSizeMB = 20
  ): Promise<File[]> => {
    setIsCompressing(true);
    try {
      const results = await compressImages(files, { maxSizeMB });
      return results.map(r => r.file);
    } finally {
      setIsCompressing(false);
    }
  };

  return { compress, compressMultiple, isCompressing };
}
