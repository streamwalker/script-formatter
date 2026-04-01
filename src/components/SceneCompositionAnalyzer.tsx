import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  LayoutGrid, 
  Loader2, 
  Camera, 
  Star,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { ParsedPanel } from '@/lib/scriptParser';
import {
  LayoutTemplate,
  PanelSize,
  CameraAngle,
  PanelLayoutSuggestion,
  SceneAnalysisResult,
  LAYOUT_TEMPLATES,
  CAMERA_ANGLES,
  detectScenePacing,
  suggestLayoutTemplate,
  calculateDramaticWeight,
  suggestCameraAngle,
  suggestPanelSize,
  detectKeyMoment,
  generateCompositionNotes,
  getPanelSizeInfo,
  getDramaticWeightStars,
} from '@/lib/sceneLayoutAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SceneCompositionAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: ParsedPanel[];
  pageNumber: number;
  genre?: string;
  onApplySuggestions: (updatedPanels: ParsedPanel[]) => void;
}

export function SceneCompositionAnalyzer({
  open,
  onOpenChange,
  panels,
  pageNumber,
  genre,
  onApplySuggestions,
}: SceneCompositionAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SceneAnalysisResult | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<PanelLayoutSuggestion[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<Set<number>>(new Set());
  const [useAI, setUseAI] = useState(true);

  // Run local analysis on open
  useEffect(() => {
    if (open && panels.length > 0) {
      runLocalAnalysis();
    }
  }, [open, panels]);

  const runLocalAnalysis = () => {
    const pacing = detectScenePacing(panels);
    const template = suggestLayoutTemplate(pacing, panels);
    
    const suggestions: PanelLayoutSuggestion[] = panels.map((panel, index) => {
      const dramaticWeight = calculateDramaticWeight(panel, index, panels.length);
      const cameraAngle = suggestCameraAngle(panel);
      const size = suggestPanelSize(dramaticWeight, panel);
      const keyMoment = detectKeyMoment(panel);
      const compositionNotes = generateCompositionNotes(panel, cameraAngle, size);

      return {
        panelKey: `${pageNumber}-${index}`,
        panelIndex: index,
        suggestedSize: size,
        suggestedCameraAngle: cameraAngle,
        dramaticWeight,
        compositionNotes,
        reasoning: `Based on content analysis: ${keyMoment.isKeyMoment ? `Key ${keyMoment.type} moment` : 'Standard scene'}`,
        isKeyMoment: keyMoment.isKeyMoment,
        keyMomentType: keyMoment.type,
      };
    });

    setLocalSuggestions(suggestions);
    setSelectedPanels(new Set(panels.map((_, i) => i)));
    
    setAnalysisResult({
      overallPacing: pacing,
      suggestedTemplate: template,
      panelSuggestions: suggestions,
      narrativeNotes: `Page ${pageNumber} has ${pacing} pacing. Suggested layout: ${LAYOUT_TEMPLATES[template].name}`,
      estimatedImpact: Math.round(suggestions.reduce((sum, s) => sum + s.dramaticWeight, 0) / suggestions.length * 2),
    });
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await supabase.functions.invoke('analyze-scene-layout', {
        body: { panels, pageNumber, genre },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      setAnalysisResult(result);
      
      // Merge AI suggestions with local structure
      const mergedSuggestions = localSuggestions.map((local, idx) => {
        const aiSuggestion = result.panelSuggestions?.find((s: any) => s.panelIndex === idx);
        if (aiSuggestion) {
          return {
            ...local,
            suggestedSize: aiSuggestion.suggestedSize || local.suggestedSize,
            suggestedCameraAngle: aiSuggestion.suggestedCameraAngle || local.suggestedCameraAngle,
            dramaticWeight: aiSuggestion.dramaticWeight || local.dramaticWeight,
            compositionNotes: aiSuggestion.compositionNotes || local.compositionNotes,
            reasoning: aiSuggestion.reasoning || local.reasoning,
            isKeyMoment: aiSuggestion.isKeyMoment ?? local.isKeyMoment,
            keyMomentType: aiSuggestion.keyMomentType || local.keyMomentType,
          };
        }
        return local;
      });

      setLocalSuggestions(mergedSuggestions);
      toast.success('AI analysis complete!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('AI analysis failed, using local analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSuggestion = (index: number, updates: Partial<PanelLayoutSuggestion>) => {
    setLocalSuggestions(prev => 
      prev.map((s, i) => i === index ? { ...s, ...updates } : s)
    );
  };

  const togglePanelSelection = (index: number) => {
    setSelectedPanels(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const applySelectedSuggestions = () => {
    const updatedPanels = panels.map((panel, index) => {
      if (!selectedPanels.has(index)) return panel;
      
      const suggestion = localSuggestions[index];
      if (!suggestion) return panel;

      return {
        ...panel,
        compositionNotes: suggestion.compositionNotes 
          ? `${panel.compositionNotes ? panel.compositionNotes + '. ' : ''}${suggestion.compositionNotes}. Camera: ${suggestion.suggestedCameraAngle}. Size: ${suggestion.suggestedSize}`
          : panel.compositionNotes,
      };
    });

    onApplySuggestions(updatedPanels);
    toast.success(`Applied suggestions to ${selectedPanels.size} panels`);
    onOpenChange(false);
  };

  const templateConfig = analysisResult?.suggestedTemplate 
    ? LAYOUT_TEMPLATES[analysisResult.suggestedTemplate]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Scene Composition Analyzer - Page {pageNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Analysis Summary */}
            {analysisResult && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Pacing</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      analysisResult.overallPacing === 'fast' ? 'destructive' :
                      analysisResult.overallPacing === 'slow' ? 'secondary' :
                      'default'
                    }>
                      {analysisResult.overallPacing.toUpperCase()}
                    </Badge>
                    <span className="text-lg">
                      {analysisResult.overallPacing === 'fast' ? '⚡' :
                       analysisResult.overallPacing === 'slow' ? '🌊' :
                       analysisResult.overallPacing === 'variable' ? '📈' : '➡️'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Suggested Template</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{templateConfig?.icon}</span>
                    <span className="font-medium">{templateConfig?.name}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Impact Score</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-4 rounded-sm ${
                          i < (analysisResult.estimatedImpact || 5) 
                            ? 'bg-primary' 
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">
                      {analysisResult.estimatedImpact}/10
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-ai"
                  checked={useAI}
                  onCheckedChange={(v) => setUseAI(!!v)}
                />
                <Label htmlFor="use-ai" className="text-sm">
                  Use AI-enhanced analysis
                </Label>
              </div>
              
              <Button
                onClick={runAIAnalysis}
                disabled={isAnalyzing || !useAI}
                size="sm"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Analyze with AI
              </Button>
            </div>

            <Separator />

            {/* Panel Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Panel Suggestions</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPanels(new Set(panels.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPanels(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {localSuggestions.map((suggestion, index) => {
                  const panel = panels[index];
                  const isSelected = selectedPanels.has(index);
                  
                  return (
                    <div
                      key={suggestion.panelKey}
                      className={`
                        p-4 rounded-lg border transition-colors
                        ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePanelSelection(index)}
                        />
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Panel {index + 1}</span>
                                {suggestion.isKeyMoment && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    {suggestion.keyMomentType}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {panel.description}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Weight</div>
                              <div className="text-amber-500">
                                {getDramaticWeightStars(suggestion.dramaticWeight)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Panel Size</Label>
                              <Select
                                value={suggestion.suggestedSize}
                                onValueChange={(v) => updateSuggestion(index, { suggestedSize: v as PanelSize })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(['full', 'large', 'medium', 'small', 'strip'] as PanelSize[]).map(size => (
                                    <SelectItem key={size} value={size} className="text-xs">
                                      {getPanelSizeInfo(size).label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs">Camera Angle</Label>
                              <Select
                                value={suggestion.suggestedCameraAngle}
                                onValueChange={(v) => updateSuggestion(index, { suggestedCameraAngle: v as CameraAngle })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CAMERA_ANGLES.map(angle => (
                                    <SelectItem key={angle.angle} value={angle.angle} className="text-xs">
                                      <span className="mr-1">{angle.icon}</span>
                                      {angle.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs">Dramatic Weight</Label>
                              <Slider
                                value={[suggestion.dramaticWeight]}
                                onValueChange={([v]) => updateSuggestion(index, { dramaticWeight: v as 1|2|3|4|5 })}
                                min={1}
                                max={5}
                                step={1}
                                className="mt-2"
                              />
                            </div>
                          </div>

                          {suggestion.compositionNotes && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <Camera className="h-3 w-3 inline mr-1" />
                              {suggestion.compositionNotes}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground italic">
                            💡 {suggestion.reasoning}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={applySelectedSuggestions}
            disabled={selectedPanels.size === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply to {selectedPanels.size} Panels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
