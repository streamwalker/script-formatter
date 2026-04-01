import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, Check, AlertTriangle, Users, MessageSquare, Camera, Sparkles } from 'lucide-react';
import { ParsedPage, ParsedPanel } from '@/lib/scriptParser';

interface ScriptPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  parsedPages: ParsedPage[];
  detectedCharacters: string[];
  artStyle: string;
}

function PanelPreview({ panel, index }: { panel: ParsedPanel; index: number }) {
  return (
    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Panel {index + 1}
        </span>
        <div className="flex gap-1">
          {panel.isBlackAndWhite && (
            <Badge variant="outline" className="text-xs">B&W</Badge>
          )}
        </div>
      </div>
      
      <p className="text-sm text-foreground/90 leading-relaxed">
        {panel.description}
      </p>
      
      {/* Characters detected */}
      {panel.characters && panel.characters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">Characters:</span>
          {panel.characters.map((char, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {char}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Dialogue speakers */}
      {panel.dialogueSpeakers && panel.dialogueSpeakers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <MessageSquare className="w-3 h-3 text-accent" />
          <span className="text-xs text-muted-foreground">Speaking:</span>
          {panel.dialogueSpeakers.map((speaker, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {speaker}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Composition notes */}
      {panel.compositionNotes && (
        <div className="flex items-center gap-2">
          <Camera className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">
            {panel.compositionNotes}
          </span>
        </div>
      )}
      
      {/* Narration */}
      {panel.narration && (
        <div className="p-2 bg-background/50 rounded text-xs italic text-muted-foreground border-l-2 border-primary">
          "{panel.narration}"
        </div>
      )}
    </div>
  );
}

export function ScriptPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  parsedPages,
  detectedCharacters,
  artStyle,
}: ScriptPreviewDialogProps) {
  const totalPanels = parsedPages.reduce((acc, page) => acc + page.panels.length, 0);
  const panelsWithCharacters = parsedPages.reduce(
    (acc, page) => acc + page.panels.filter(p => p.characters && p.characters.length > 0).length, 
    0
  );
  const panelsWithComposition = parsedPages.reduce(
    (acc, page) => acc + page.panels.filter(p => p.compositionNotes).length, 
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Script Preview
          </DialogTitle>
          <DialogDescription>
            Review the parsed script before generation. Verify that characters and directions are detected correctly.
          </DialogDescription>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">{parsedPages.length}</p>
            <p className="text-xs text-muted-foreground">Pages</p>
          </div>
          <div className="p-3 bg-accent/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-accent">{totalPanels}</p>
            <p className="text-xs text-muted-foreground">Panels</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-500">{detectedCharacters.length}</p>
            <p className="text-xs text-muted-foreground">Characters</p>
          </div>
          <div className="p-3 bg-secondary rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">{artStyle}</p>
            <p className="text-xs text-muted-foreground">Style</p>
          </div>
        </div>

        {/* Detected characters */}
        {detectedCharacters.length > 0 && (
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              All Detected Characters ({detectedCharacters.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedCharacters.map((char, i) => (
                <Badge key={i} className="bg-primary/20 text-primary hover:bg-primary/30">
                  {char}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Detection stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            {panelsWithCharacters}/{totalPanels} panels with detected characters
          </span>
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3 text-green-500" />
            {panelsWithComposition}/{totalPanels} panels with composition cues
          </span>
        </div>

        {/* Warning if no characters detected */}
        {detectedCharacters.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No characters detected in the script. Consider using format like "CHARACTER NAME: dialogue" or "CHARACTER NAME does action" for better detection.
            </p>
          </div>
        )}

        {/* Pages and panels preview */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 pr-4">
            {parsedPages.map((page, pageIndex) => (
              <div key={pageIndex} className="space-y-3">
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">
                    Page {page.pageNumber}
                  </h3>
                  {page.openingNarration && (
                    <p className="text-sm italic text-muted-foreground mt-1 border-l-2 border-accent pl-3">
                      {page.openingNarration}
                    </p>
                  )}
                </div>
                
                <div className="grid gap-3">
                  {page.panels.map((panel, panelIndex) => (
                    <PanelPreview key={panel.id} panel={panel} index={panelIndex} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Edit Script
          </Button>
          <Button onClick={onConfirm}>
            <Sparkles className="w-4 h-4 mr-1" />
            Start Generation ({totalPanels} panels)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
