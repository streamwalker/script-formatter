import { useState, useEffect } from 'react';
import { Grid3X3, Loader2, RefreshCw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ART_STYLES, ArtStyle, ArtStyleConfig, getStyleById } from '@/lib/artStyles';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StylePreviewGalleryProps {
  onSelectStyle?: (style: ArtStyle) => void;
  disabled?: boolean;
}

interface StylePreview {
  styleId: ArtStyle;
  imageUrl: string | null;
  isLoading: boolean;
  error: boolean;
}

const SAMPLE_SCENE = 'A heroic character standing dramatically on a rooftop at sunset, city skyline behind';
const CACHE_KEY = 'style-preview-gallery-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Load cached previews from localStorage
function loadCachedPreviews(): Record<string, { url: string; timestamp: number }> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error loading cached previews:', e);
  }
  return {};
}

// Save previews to localStorage cache
function saveCachedPreview(styleId: string, url: string) {
  try {
    const cache = loadCachedPreviews();
    cache[styleId] = { url, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error saving cached preview:', e);
  }
}

// Check if cached preview is still valid
function getCachedPreview(styleId: string): string | null {
  const cache = loadCachedPreviews();
  const cached = cache[styleId];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }
  return null;
}

export function StylePreviewGallery({ onSelectStyle, disabled }: StylePreviewGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previews, setPreviews] = useState<StylePreview[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(-1);

  // Initialize previews when dialog opens
  useEffect(() => {
    if (isOpen) {
      const initialPreviews = ART_STYLES.map(style => ({
        styleId: style.id,
        imageUrl: getCachedPreview(style.id),
        isLoading: false,
        error: false,
      }));
      setPreviews(initialPreviews);
    }
  }, [isOpen]);

  const generatePreview = async (index: number) => {
    const style = ART_STYLES[index];
    if (!style) return;

    setPreviews(prev => prev.map((p, i) =>
      i === index ? { ...p, isLoading: true, error: false } : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-style-preview', {
        body: {
          stylePrompt: `${style.promptModifier}. Scene: ${SAMPLE_SCENE}`,
          styleName: style.name,
        },
      });

      if (error) throw error;

      const imageUrl = data.previewImage;
      saveCachedPreview(style.id, imageUrl);

      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, isLoading: false, imageUrl } : p
      ));
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, isLoading: false, error: true } : p
      ));
    }
  };

  const generateAllMissing = async () => {
    setIsGeneratingAll(true);
    
    for (let i = 0; i < previews.length; i++) {
      if (!previews[i].imageUrl && !previews[i].error) {
        setGeneratingIndex(i);
        await generatePreview(i);
        // Small delay between generations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsGeneratingAll(false);
    setGeneratingIndex(-1);
    toast.success('Gallery generation complete');
  };

  const handleSelectStyle = (styleId: ArtStyle) => {
    onSelectStyle?.(styleId);
    setIsOpen(false);
    toast.success(`Selected ${getStyleById(styleId).name}`);
  };

  const missingCount = previews.filter(p => !p.imageUrl && !p.error).length;
  const generatedCount = previews.filter(p => p.imageUrl).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Grid3X3 className="h-4 w-4 mr-2" />
          Style Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Style Preview Gallery</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {generatedCount}/{ART_STYLES.length} generated
              </span>
              {missingCount > 0 && (
                <Button
                  size="sm"
                  onClick={generateAllMissing}
                  disabled={isGeneratingAll}
                >
                  {isGeneratingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating ({generatingIndex + 1}/{previews.length})
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate All ({missingCount})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => {
              const style = ART_STYLES[index];
              return (
                <GalleryCard
                  key={style.id}
                  style={style}
                  preview={preview}
                  onGenerate={() => generatePreview(index)}
                  onSelect={() => handleSelectStyle(style.id)}
                  isGeneratingAll={isGeneratingAll}
                />
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface GalleryCardProps {
  style: ArtStyleConfig;
  preview: StylePreview;
  onGenerate: () => void;
  onSelect: () => void;
  isGeneratingAll: boolean;
}

function GalleryCard({ style, preview, onGenerate, onSelect, isGeneratingAll }: GalleryCardProps) {
  return (
    <div className={cn(
      'group rounded-xl border overflow-hidden transition-all',
      style.category === 'artist' 
        ? 'border-amber-500/30 bg-amber-500/5' 
        : 'border-border bg-secondary/20',
      'hover:border-primary/50 hover:shadow-lg'
    )}>
      {/* Preview Image Area */}
      <div className="aspect-square relative bg-secondary/50">
        {preview.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview.imageUrl ? (
          <>
            <img
              src={preview.imageUrl}
              alt={`${style.name} preview`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Button
                size="sm"
                onClick={onSelect}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Check className="h-4 w-4 mr-1" />
                Select
              </Button>
            </div>
          </>
        ) : preview.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <X className="h-6 w-6 text-destructive" />
            <span className="text-xs text-muted-foreground text-center">Failed</span>
            <Button size="sm" variant="outline" onClick={onGenerate}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <span className="text-5xl opacity-30">{style.preview}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerate}
              disabled={isGeneratingAll}
            >
              {isGeneratingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Style Info */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.preview}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{style.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {style.category === 'artist' ? style.artistName || 'Artist' : 'General'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
