import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, ArrowLeft, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';

interface ComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  newImage: string | null;
  isGenerating: boolean;
  panelDescription: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}

export function ComparisonDialog({
  isOpen,
  onClose,
  currentImage,
  newImage,
  isGenerating,
  panelDescription,
  onAccept,
  onReject,
  onRegenerate,
}: ComparisonDialogProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [overlayPosition, setOverlayPosition] = useState(50);

  return (
    <Dialog open={isOpen} onOpenChange={() => !isGenerating && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Compare Panel Versions</span>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
              >
                Side by Side
              </Button>
              <Button
                variant={viewMode === 'overlay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overlay')}
              >
                Overlay
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* View modes */}
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Current image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Current</span>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
                  <img
                    src={currentImage}
                    alt="Current version"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* New image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">New</span>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Generating...</p>
                      </div>
                    </div>
                  ) : newImage ? (
                    <img
                      src={newImage}
                      alt="New version"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No new version yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Overlay view */
            <div className="space-y-2">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-secondary">
                {/* Current image (background) */}
                <img
                  src={currentImage}
                  alt="Current version"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* New image (foreground with clip) */}
                {newImage && !isGenerating && (
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - overlayPosition}% 0 0)` }}
                  >
                    <img
                      src={newImage}
                      alt="New version"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Slider line */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                  style={{ left: `${overlayPosition}%` }}
                />
                
                {/* Labels */}
                <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                  Current
                </div>
                <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
                  New
                </div>

                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Slider control */}
              <input
                type="range"
                min="0"
                max="100"
                value={overlayPosition}
                onChange={(e) => setOverlayPosition(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating || !newImage}
              />
            </div>
          )}

          {/* Panel description */}
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-xs text-muted-foreground line-clamp-2">{panelDescription}</p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={onRegenerate}
              disabled={isGenerating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Try Another'}
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isGenerating || !newImage}
              >
                <X className="w-4 h-4 mr-2" />
                Keep Current
              </Button>
              <Button
                onClick={onAccept}
                disabled={isGenerating || !newImage}
              >
                <Check className="w-4 h-4 mr-2" />
                Use New
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}