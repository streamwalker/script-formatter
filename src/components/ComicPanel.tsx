import { ParsedPanel, LabeledReferenceImage } from '@/lib/scriptParser';
import { RefreshCw, Loader2, Undo2, Redo2, BarChart3, Smile, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConsistencyChecker } from './ConsistencyChecker';
import { PanelCommentsOverlay } from './PanelCommentsOverlay';

interface ComicPanelProps {
  panel: ParsedPanel;
  imageUrl?: string;
  isGenerating?: boolean;
  className?: string;
  onRegenerate?: (panelId: number) => void;
  onCompareRegenerate?: (panelId: number) => void;
  canRegenerate?: boolean;
  historyIndex?: number;
  historyLength?: number;
  onUndo?: (panelId: number) => void;
  onRedo?: (panelId: number) => void;
  labeledImages?: LabeledReferenceImage[];
  onAnalyzeComposition?: (panelId: number) => void;
  onMoodSelect?: (panelId: number) => void;
  onGenerateDialogue?: (panelId: number) => void;
  projectId?: string;
  canComment?: boolean;
}

export function ComicPanel({ 
  panel, 
  imageUrl, 
  isGenerating, 
  className = '',
  onRegenerate,
  onCompareRegenerate,
  canRegenerate = false,
  historyIndex = 0,
  historyLength = 0,
  onUndo,
  onRedo,
  labeledImages = [],
  onAnalyzeComposition,
  onMoodSelect,
  onGenerateDialogue,
  projectId,
  canComment = false,
}: ComicPanelProps) {
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const panelCharacters = [...(panel.characters || []), ...(panel.dialogueSpeakers || [])];

  return (
    <div className={`relative panel-border overflow-hidden group ${className}`}>
      {/* Control buttons */}
      {canRegenerate && !isGenerating && imageUrl && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {/* Undo/Redo buttons */}
          {historyLength > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onUndo?.(panel.id)}
                disabled={!canUndo}
                className="bg-background/80 backdrop-blur-sm hover:bg-background h-8 w-8"
                title="Undo (previous version)"
              >
                <Undo2 className="w-3 h-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onRedo?.(panel.id)}
                disabled={!canRedo}
                className="bg-background/80 backdrop-blur-sm hover:bg-background h-8 w-8"
                title="Redo (next version)"
              >
                <Redo2 className="w-3 h-3" />
              </Button>
            </>
          )}
          
          {/* Regenerate with comparison */}
          {onCompareRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCompareRegenerate(panel.id)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Compare
            </Button>
          )}
          
          {/* Quick regenerate */}
          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRegenerate(panel.id)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Quick
            </Button>
          )}

          {/* Consistency Checker */}
          {labeledImages.length > 0 && (
            <ConsistencyChecker
              panelImage={imageUrl}
              panelId={panel.id}
              labeledImages={labeledImages}
              panelCharacters={panelCharacters}
            />
          )}

          {/* Composition Analyzer */}
          {onAnalyzeComposition && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAnalyzeComposition(panel.id)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
              title="Analyze composition"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Analyze
            </Button>
          )}

          {/* Mood-based generation */}
          {onMoodSelect && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMoodSelect(panel.id)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
              title="Generate with character moods"
            >
              <Smile className="w-3 h-3 mr-1" />
              Moods
            </Button>
          )}

          {/* Dialogue generator */}
          {onGenerateDialogue && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGenerateDialogue(panel.id)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
              title="Generate dialogue with AI"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Dialogue
            </Button>
          )}
        </div>
      )}

      {/* History indicator */}
      {historyLength > 1 && !isGenerating && (
        <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            {historyIndex + 1}/{historyLength}
          </span>
        </div>
      )}

      {/* Panel image */}
      <div className="relative w-full h-full bg-secondary">
        {isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Generating panel {panel.id}...</p>
            </div>
          </div>
        ) : imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt={panel.description}
              className={cn('w-full h-full object-cover', panel.isBlackAndWhite && 'grayscale')}
            />
            {/* Comments overlay */}
            {projectId && (
              <PanelCommentsOverlay
                projectId={projectId}
                panelId={String(panel.id)}
                canComment={canComment}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted p-4">
            <p className="text-xs text-muted-foreground text-center line-clamp-3">
              {panel.description}
            </p>
          </div>
        )}
      </div>

      {/* Narration box - top */}
      {panel.narration && (
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="narration-box">
            <p className="comic-text text-xs leading-tight">
              {panel.narration}
            </p>
          </div>
        </div>
      )}

      {/* Dialogue bubble */}
      {panel.dialogue && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="speech-bubble">
            <p className="comic-text text-xs leading-tight">
              {panel.dialogue}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
