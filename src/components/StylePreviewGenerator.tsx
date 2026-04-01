import { useState } from 'react';
import { ArtStyleConfig, getStyleById, ArtStyle } from '@/lib/artStyles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StylePreviewGeneratorProps {
  selectedStyle: ArtStyle;
  customPrompt?: string;
  disabled?: boolean;
}

interface PreviewCache {
  [key: string]: string;
}

export function StylePreviewGenerator({ selectedStyle, customPrompt, disabled }: StylePreviewGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<PreviewCache>({});

  const style = getStyleById(selectedStyle);

  const generatePreview = async (forceRegenerate = false) => {
    const cacheKey = customPrompt || selectedStyle;
    
    // Check cache first unless forcing regeneration
    if (!forceRegenerate && previewCache[cacheKey]) {
      setPreviewImage(previewCache[cacheKey]);
      return;
    }

    setIsGenerating(true);
    setPreviewImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-style-preview', {
        body: {
          stylePrompt: customPrompt || style.promptModifier,
          styleName: customPrompt ? 'Mixed Style' : style.name,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.previewImage) {
        setPreviewImage(data.previewImage);
        setPreviewCache(prev => ({
          ...prev,
          [cacheKey]: data.previewImage,
        }));
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate style preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      generatePreview();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Eye className="h-4 w-4" />
          Preview Style
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Style Preview: {customPrompt ? 'Mixed Style' : style.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Style Info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <span className="text-3xl">{style.preview}</span>
            <div>
              <h4 className="font-medium">{customPrompt ? 'Mixed Style' : style.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {customPrompt ? 'Custom style blend' : style.description}
              </p>
            </div>
          </div>

          {/* Preview Image */}
          <div className={cn(
            'relative aspect-square rounded-xl overflow-hidden border-2 border-border',
            'bg-gradient-to-br from-secondary/50 to-muted/50'
          )}>
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating preview...</p>
              </div>
            ) : previewImage ? (
              <img
                src={previewImage}
                alt={`${style.name} style preview`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Eye className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preview will appear here</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generatePreview(true)}
              disabled={isGenerating}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
              Regenerate
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center">
            This preview shows how characters will look in the selected style. 
            Actual panel results may vary based on scene content.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}