import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Users,
  Sparkles
} from 'lucide-react';
import { ParsedPanel } from '@/lib/scriptParser';
import { 
  BatchConfig, 
  DEFAULT_BATCH_CONFIG, 
  BatchProgress, 
  PanelStatus,
  createBatches,
  buildMoodProgression,
  formatTimeRemaining,
  getStatusColor,
  getStatusIcon,
  MoodProgressionPlan
} from '@/lib/batchGeneration';
import { getEmotionById } from '@/lib/characterMoods';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CharacterProfile {
  id: string;
  name: string;
  physicalDescription: string;
  clothingDescription: string;
  distinctiveFeatures: string;
  colorPalette: string[];
  consistencyWeight: number;
}

interface LabeledReferenceImage {
  imageData: string;
  label: string;
}

interface BatchGenerationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: Array<{ pageNumber: number; panels: ParsedPanel[] }>;
  referenceImages: string[];
  labeledImages: LabeledReferenceImage[];
  characterProfiles: CharacterProfile[];
  artStyle: string;
  stylePromptModifier: string;
  consistencyWeight: number;
  characterMoods: Record<string, string>;
  onPanelGenerated: (pageNumber: number, panelIndex: number, imageData: string) => void;
  onComplete: () => void;
}

export function BatchGenerationPanel({
  open,
  onOpenChange,
  panels,
  referenceImages,
  labeledImages,
  characterProfiles,
  artStyle,
  stylePromptModifier,
  consistencyWeight,
  characterMoods,
  onPanelGenerated,
  onComplete,
}: BatchGenerationPanelProps) {
  const [config, setConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [moodProgression, setMoodProgression] = useState<MoodProgressionPlan[]>([]);
  const [sessionContext, setSessionContext] = useState('');

  // Flatten all panels with their keys
  const allPanels = panels.flatMap((page, pageIdx) =>
    page.panels.map((panel, panelIdx) => ({
      ...panel,
      pageNumber: page.pageNumber,
      panelIndex: panelIdx,
      panelKey: `${page.pageNumber}-${panelIdx}`,
    }))
  );

  const totalPanels = allPanels.length;
  const batches = createBatches(allPanels, config.batchSize);

  // Build mood progression preview
  useEffect(() => {
    if (config.enableMoodProgression) {
      const panelData = allPanels.map(p => ({
        panelKey: p.panelKey,
        characters: p.characters || [],
      }));
      const progression = buildMoodProgression(panelData, characterMoods);
      setMoodProgression(progression);
    } else {
      setMoodProgression([]);
    }
  }, [config.enableMoodProgression, characterMoods, allPanels.length]);

  // Start batch generation
  const startGeneration = useCallback(async () => {
    setIsGenerating(true);
    
    const initialStatuses: Record<string, PanelStatus> = {};
    allPanels.forEach(p => {
      initialStatuses[p.panelKey] = 'pending';
    });

    setProgress({
      totalPanels,
      completedPanels: 0,
      currentBatch: 0,
      totalBatches: batches.length,
      panelStatuses: initialStatuses,
      estimatedTimeRemaining: totalPanels * 15000,
      isPaused: false,
    });

    let currentContext = sessionContext;
    const startTime = Date.now();

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      
      // Update statuses to generating
      setProgress(prev => {
        if (!prev) return prev;
        const newStatuses = { ...prev.panelStatuses };
        batch.forEach(p => {
          newStatuses[p.panelKey] = 'generating';
        });
        return {
          ...prev,
          currentBatch: batchIdx + 1,
          panelStatuses: newStatuses,
        };
      });

      try {
        // Build mood descriptions for batch
        const moodDescriptions: Record<string, string> = {};
        batch.forEach(panel => {
          (panel.characters || []).forEach(char => {
            const moodId = characterMoods[char];
            if (moodId) {
              const emotion = getEmotionById(moodId);
              if (emotion) {
                moodDescriptions[char] = `${emotion.name} (${emotion.expressionKeywords.join(', ')})`;
              }
            }
          });
        });

        const response = await supabase.functions.invoke('generate-batch-panels', {
          body: {
            panels: batch.map(p => ({
              panelKey: p.panelKey,
              pageNumber: p.pageNumber,
              panelIndex: p.panelIndex,
              prompt: p.description,
              characters: p.characters || [],
              mood: p.characters?.[0] ? characterMoods[p.characters[0]] : undefined,
              compositionNotes: p.compositionNotes,
            })),
            referenceImages,
            labeledImages,
            characterProfiles,
            artStyle,
            stylePromptModifier,
            consistencyWeight: config.consistencyBoost ? consistencyWeight * 1.2 : consistencyWeight,
            sessionContext: currentContext,
            moodDescriptions,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const { results, sessionContext: newContext } = response.data;
        currentContext = newContext || currentContext;
        setSessionContext(currentContext);

        // Process results
        results.forEach((result: any) => {
          const [pageNum, panelIdx] = result.panelKey.split('-').map(Number);
          
          setProgress(prev => {
            if (!prev) return prev;
            const newStatuses = { ...prev.panelStatuses };
            newStatuses[result.panelKey] = result.success ? 'complete' : 'failed';
            
            const completed = Object.values(newStatuses).filter(s => s === 'complete').length;
            const elapsed = Date.now() - startTime;
            const remaining = completed > 0 
              ? Math.round((elapsed / completed) * (totalPanels - completed))
              : totalPanels * 15000;

            return {
              ...prev,
              completedPanels: completed,
              panelStatuses: newStatuses,
              estimatedTimeRemaining: remaining,
            };
          });

          if (result.success && result.imageData) {
            onPanelGenerated(pageNum, panelIdx, result.imageData);
          }
        });

      } catch (error) {
        console.error('Batch generation error:', error);
        toast.error(`Batch ${batchIdx + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Mark batch as failed
        setProgress(prev => {
          if (!prev) return prev;
          const newStatuses = { ...prev.panelStatuses };
          batch.forEach(p => {
            if (newStatuses[p.panelKey] === 'generating') {
              newStatuses[p.panelKey] = 'failed';
            }
          });
          return { ...prev, panelStatuses: newStatuses };
        });
      }

      // Delay between batches
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.pauseBetweenBatches));
      }
    }

    setIsGenerating(false);
    toast.success('Batch generation complete!');
    onComplete();
  }, [
    allPanels, 
    batches, 
    config, 
    referenceImages, 
    labeledImages, 
    characterProfiles, 
    artStyle, 
    stylePromptModifier, 
    consistencyWeight, 
    characterMoods,
    onPanelGenerated,
    onComplete,
    sessionContext,
    totalPanels,
  ]);

  const progressPercent = progress 
    ? Math.round((progress.completedPanels / progress.totalPanels) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Batch Panel Generation
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Configuration</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Batch Size: {config.batchSize}</Label>
                  <Slider
                    value={[config.batchSize]}
                    onValueChange={([v]) => setConfig(c => ({ ...c, batchSize: v }))}
                    min={2}
                    max={8}
                    step={1}
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="mood-progression"
                    checked={config.enableMoodProgression}
                    onCheckedChange={(v) => setConfig(c => ({ ...c, enableMoodProgression: v }))}
                    disabled={isGenerating}
                  />
                  <Label htmlFor="mood-progression" className="text-xs">
                    Mood Auto-Apply
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="consistency-boost"
                    checked={config.consistencyBoost}
                    onCheckedChange={(v) => setConfig(c => ({ ...c, consistencyBoost: v }))}
                    disabled={isGenerating}
                  />
                  <Label htmlFor="consistency-boost" className="text-xs">
                    Consistency+ (1.2x)
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Mood Progression Preview */}
            {moodProgression.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Mood Progression Preview
                </h3>
                <div className="space-y-2">
                  {moodProgression.slice(0, 5).map((plan) => {
                    const emotion = getEmotionById(plan.panelMoods[0]?.moodId);
                    return (
                      <div key={plan.characterName} className="flex items-center gap-2">
                        <span className="text-xs font-medium w-24 truncate">
                          {plan.characterName}:
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {plan.panelMoods.map((mood, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {mood.moodName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Panel Queue */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Panel Queue ({totalPanels} panels • {batches.length} batches)
              </h3>
              
              <div className="flex flex-wrap gap-1">
                {batches.map((batch, batchIdx) => (
                  <React.Fragment key={batchIdx}>
                    <div className="flex gap-1">
                      {batch.map((panel) => {
                        const status = progress?.panelStatuses[panel.panelKey] || 'pending';
                        return (
                          <div
                            key={panel.panelKey}
                            className={`
                              w-10 h-10 rounded flex items-center justify-center text-xs font-medium
                              ${getStatusColor(status)}
                              border border-border
                            `}
                            title={`Page ${panel.pageNumber}, Panel ${panel.panelIndex + 1}`}
                          >
                            <span>{getStatusIcon(status)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {batchIdx < batches.length - 1 && (
                      <div className="w-px h-10 bg-border mx-1" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Progress */}
            {progress && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      Progress: {progress.completedPanels}/{progress.totalPanels} panels
                    </span>
                    <span className="text-muted-foreground">
                      Est: {formatTimeRemaining(progress.estimatedTimeRemaining)}
                    </span>
                  </div>
                  <Progress value={progressPercent} />
                  
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {Object.values(progress.panelStatuses).filter(s => s === 'complete').length} Complete
                    </span>
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {Object.values(progress.panelStatuses).filter(s => s === 'generating').length} Generating
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                      {Object.values(progress.panelStatuses).filter(s => s === 'failed').length} Failed
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          {!isGenerating ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startGeneration} disabled={totalPanels === 0}>
                <Zap className="h-4 w-4 mr-2" />
                Generate {totalPanels} Panels
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
