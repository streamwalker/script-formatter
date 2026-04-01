import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Loader2,
  CheckCheck,
  SkipForward,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface PanelToFix {
  panelId: number;
  pageNumber: number;
  currentImage: string;
  description: string;
  score: number;
  issues: string[];
}

interface FixResult {
  panelId: number;
  status: 'pending' | 'generating' | 'ready' | 'accepted' | 'rejected' | 'skipped';
  newImage?: string;
}

interface AutoFixComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  panels: PanelToFix[];
  onGeneratePanel: (panelId: number) => Promise<string | null>;
  onComplete: (results: { accepted: number[]; rejected: number[]; skipped: number[] }) => void;
}

export function AutoFixComparisonDialog({
  isOpen,
  onClose,
  panels,
  onGeneratePanel,
  onComplete,
}: AutoFixComparisonDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<FixResult[]>([]);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [overlayPosition, setOverlayPosition] = useState(50);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize results when panels change
  useEffect(() => {
    if (panels.length > 0) {
      setResults(panels.map(p => ({ panelId: p.panelId, status: 'pending' })));
      setCurrentIndex(0);
      setIsComplete(false);
    }
  }, [panels]);

  // Start generating when we reach a pending panel
  useEffect(() => {
    if (results.length === 0 || currentIndex >= panels.length) return;
    
    const currentResult = results[currentIndex];
    if (currentResult?.status === 'pending') {
      generateCurrentPanel();
    }
  }, [currentIndex, results]);

  const generateCurrentPanel = async () => {
    const panel = panels[currentIndex];
    if (!panel) return;

    setResults(prev => prev.map((r, i) => 
      i === currentIndex ? { ...r, status: 'generating' } : r
    ));

    try {
      const newImage = await onGeneratePanel(panel.panelId);
      
      if (newImage) {
        setResults(prev => prev.map((r, i) => 
          i === currentIndex ? { ...r, status: 'ready', newImage } : r
        ));
      } else {
        // Generation failed, mark as skipped
        setResults(prev => prev.map((r, i) => 
          i === currentIndex ? { ...r, status: 'skipped' } : r
        ));
        toast.error('Failed to generate new image');
      }
    } catch (error) {
      console.error('Error generating panel:', error);
      setResults(prev => prev.map((r, i) => 
        i === currentIndex ? { ...r, status: 'skipped' } : r
      ));
    }
  };

  const handleAccept = () => {
    setResults(prev => prev.map((r, i) => 
      i === currentIndex ? { ...r, status: 'accepted' } : r
    ));
    moveToNext();
  };

  const handleReject = () => {
    setResults(prev => prev.map((r, i) => 
      i === currentIndex ? { ...r, status: 'rejected' } : r
    ));
    moveToNext();
  };

  const handleSkip = () => {
    setResults(prev => prev.map((r, i) => 
      i === currentIndex ? { ...r, status: 'skipped' } : r
    ));
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < panels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishReview();
    }
  };

  const moveToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAcceptAll = () => {
    setResults(prev => prev.map((r, i) => {
      if (i >= currentIndex && (r.status === 'ready' || r.status === 'pending')) {
        return { ...r, status: r.newImage ? 'accepted' : 'skipped' };
      }
      return r;
    }));
    finishReview();
  };

  const handleSkipAll = () => {
    setResults(prev => prev.map((r, i) => {
      if (i >= currentIndex && (r.status === 'ready' || r.status === 'pending' || r.status === 'generating')) {
        return { ...r, status: 'skipped' };
      }
      return r;
    }));
    finishReview();
  };

  const finishReview = () => {
    setIsComplete(true);
  };

  const handleComplete = () => {
    const accepted = results.filter(r => r.status === 'accepted').map(r => r.panelId);
    const rejected = results.filter(r => r.status === 'rejected').map(r => r.panelId);
    const skipped = results.filter(r => r.status === 'skipped').map(r => r.panelId);
    
    onComplete({ accepted, rejected, skipped });
    onClose();
  };

  const currentPanel = panels[currentIndex];
  const currentResult = results[currentIndex];
  const completedCount = results.filter(r => ['accepted', 'rejected', 'skipped'].includes(r.status)).length;
  const acceptedCount = results.filter(r => r.status === 'accepted').length;
  const rejectedCount = results.filter(r => r.status === 'rejected').length;

  if (!currentPanel && !isComplete) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Auto-Fix Comparison
            </span>
            {!isComplete && (
              <Badge variant="secondary">
                Panel {currentIndex + 1} of {panels.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isComplete ? (
          // Summary View
          <div className="space-y-6 py-4">
            <div className="text-center">
              <CheckCheck className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Review Complete</h3>
              <p className="text-muted-foreground">
                You've reviewed all {panels.length} panels
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{acceptedCount}</div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{rejectedCount}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {results.filter(r => r.status === 'skipped').length}
                </div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleComplete} className="gap-2">
                <Check className="h-4 w-4" />
                Apply {acceptedCount} Changes
              </Button>
            </div>
          </div>
        ) : (
          // Comparison View
          <div className="space-y-4">
            {/* Progress */}
            <Progress value={(completedCount / panels.length) * 100} className="h-2" />

            {/* Panel Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPanel.pageNumber} • Score: {currentPanel.score}%
              </span>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('side-by-side')}
                >
                  Side by Side
                </Button>
                <Button
                  variant={viewMode === 'overlay' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('overlay')}
                >
                  Overlay
                </Button>
              </div>
            </div>

            {/* Issues */}
            {currentPanel.issues.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                <strong>Issues:</strong> {currentPanel.issues.slice(0, 3).join(', ')}
              </div>
            )}

            {/* Image Comparison */}
            <div className="relative">
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center text-muted-foreground">Current</p>
                    <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
                      <img 
                        src={currentPanel.currentImage} 
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center text-muted-foreground">New</p>
                    <div className="aspect-square bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                      {currentResult?.status === 'generating' ? (
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                          <p className="text-sm text-muted-foreground">Generating...</p>
                        </div>
                      ) : currentResult?.newImage ? (
                        <img 
                          src={currentResult.newImage} 
                          alt="New"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Waiting...</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
                  {/* Current image (full) */}
                  <img 
                    src={currentPanel.currentImage} 
                    alt="Current"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* New image (clipped) */}
                  {currentResult?.newImage && (
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${overlayPosition}%` }}
                    >
                      <img 
                        src={currentResult.newImage} 
                        alt="New"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ width: `${100 / (overlayPosition / 100)}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Slider */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                    style={{ left: `${overlayPosition}%`, transform: 'translateX(-50%)' }}
                  />
                  
                  {/* Slider control */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={overlayPosition}
                    onChange={(e) => setOverlayPosition(Number(e.target.value))}
                    className="absolute bottom-4 left-4 right-4 opacity-0 cursor-ew-resize"
                    style={{ height: '100%', top: 0 }}
                  />
                  
                  {/* Labels */}
                  <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                    New
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                    Current
                  </div>
                </div>
              )}
            </div>

            {/* Navigation & Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={moveToPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  disabled={currentResult?.status === 'generating'}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={currentResult?.status !== 'ready'}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={currentResult?.status !== 'ready'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={moveToNext}
                disabled={currentIndex === panels.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Batch Actions */}
            <div className="flex gap-2 justify-center pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={handleSkipAll}>
                Skip All Remaining
              </Button>
              <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                Accept All Remaining
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
