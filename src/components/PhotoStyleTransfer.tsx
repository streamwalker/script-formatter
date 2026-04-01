import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ImagePlus, Wand2, Download, RefreshCw, Upload } from 'lucide-react';
import { ArtStyle, ART_STYLES, getStyleById, StyleMix, generateMixedStylePrompt } from '@/lib/artStyles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoStyleTransferProps {
  selectedStyle?: ArtStyle;
  mixedStylePrompt?: string;
  disabled?: boolean;
}

export function PhotoStyleTransfer({ selectedStyle, mixedStylePrompt, disabled }: PhotoStyleTransferProps) {
  const [open, setOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [localStyle, setLocalStyle] = useState<ArtStyle>(selectedStyle || 'western');
  const [preserveContent, setPreserveContent] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setTransformedImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setTransformedImage(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleTransform = async () => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      const styleConfig = getStyleById(localStyle);
      const promptModifier = mixedStylePrompt || styleConfig?.promptModifier || localStyle;

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('apply-art-style', {
        body: {
          imageData: uploadedImage,
          artStyle: styleConfig?.name || localStyle,
          promptModifier,
          preserveContent
        }
      });

      setProgress(90);

      if (error) throw error;
      
      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit reached. Please wait a moment and try again.');
        } else if (data.error.includes('Usage limit')) {
          toast.error('Usage limit reached. Please add credits to continue.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setTransformedImage(data.image);
      setProgress(100);
      toast.success('Photo transformed to comic art!');
    } catch (error) {
      console.error('Transform error:', error);
      toast.error('Failed to transform image. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!transformedImage) return;

    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = `comic-art-${Date.now()}.png`;
    link.click();
    toast.success('Image downloaded!');
  };

  const handleReset = () => {
    setUploadedImage(null);
    setTransformedImage(null);
  };

  const currentStyleConfig = getStyleById(localStyle);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <ImagePlus className="h-4 w-4" />
          Photo to Comic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Transform Photo to Comic Art
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Style Selection */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label>Art Style</Label>
              <Select value={localStyle} onValueChange={(v) => setLocalStyle(v as ArtStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ART_STYLES.map(style => (
                    <SelectItem key={style.id} value={style.id}>
                      <span className="flex items-center gap-2">
                        <span>{style.preview}</span>
                        <span>{style.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="preserve-content"
                checked={preserveContent}
                onCheckedChange={setPreserveContent}
              />
              <Label htmlFor="preserve-content" className="text-sm">
                Preserve composition
              </Label>
            </div>
          </div>

          {/* Image Preview Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Image */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Original Photo</Label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'relative aspect-square rounded-lg border-2 border-dashed',
                  'flex items-center justify-center overflow-hidden',
                  'transition-colors cursor-pointer hover:border-primary/50',
                  uploadedImage ? 'border-border' : 'border-muted-foreground/25'
                )}
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer p-8 text-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Drop an image or click to upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Transformed Image */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Comic Art Result ({currentStyleConfig?.name})
              </Label>
              <div
                className={cn(
                  'relative aspect-square rounded-lg border-2',
                  'flex items-center justify-center overflow-hidden',
                  transformedImage ? 'border-primary' : 'border-dashed border-muted-foreground/25'
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                      <div 
                        className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" 
                        style={{ animationDuration: '1s' }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">Transforming to comic art...</span>
                    <Progress value={progress} className="w-40" />
                  </div>
                ) : transformedImage ? (
                  <img
                    src={transformedImage}
                    alt="Transformed"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <Wand2 className="h-12 w-12 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Transformed result will appear here
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {uploadedImage && (
              <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
            
            {transformedImage && (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            
            <Button 
              onClick={handleTransform} 
              disabled={!uploadedImage || isProcessing}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {isProcessing ? 'Transforming...' : 'Transform to Comic'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
