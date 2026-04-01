import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Check, AlertCircle, Sparkles, Loader2, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { LabeledReferenceImage } from './CharacterContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractNameFromFilename } from '@/lib/scriptTemplates';
import { CharacterSheetExport } from './CharacterSheetExport';

export interface CharacterAnalysis {
  suggestedName: string;
  physicalDescription: string;
  clothing: string;
  distinguishingFeatures: string;
  colorPalette: string;
  estimatedAge: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface EnhancedLabeledImage extends LabeledReferenceImage {
  analysis?: CharacterAnalysis;
  isAnalyzing?: boolean;
}


interface CharacterMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (labeledImages: LabeledReferenceImage[], generatedDescriptions?: string) => void;
  referenceImages: string[];
  initialLabeledImages?: LabeledReferenceImage[];
  detectedCharacters?: string[];
}

export function CharacterMappingDialog({
  isOpen,
  onClose,
  onConfirm,
  referenceImages,
  initialLabeledImages = [],
  detectedCharacters = [],
}: CharacterMappingDialogProps) {
  const [labeledImages, setLabeledImages] = useState<EnhancedLabeledImage[]>(() => {
    return referenceImages.map((img, index) => {
      const existing = initialLabeledImages[index];
      return existing || { image: img, characterName: '' };
    });
  });
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isDetectingAll, setIsDetectingAll] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);

  const updateLabel = (index: number, name: string) => {
    setLabeledImages(prev => prev.map((item, i) => 
      i === index ? { ...item, characterName: name.toUpperCase() } : item
    ));
  };

  const updateAnalysis = (index: number, analysis: CharacterAnalysis) => {
    setLabeledImages(prev => prev.map((item, i) => 
      i === index ? { ...item, analysis, characterName: analysis.suggestedName } : item
    ));
  };

  const setAnalyzing = (index: number, isAnalyzing: boolean) => {
    setLabeledImages(prev => prev.map((item, i) => 
      i === index ? { ...item, isAnalyzing } : item
    ));
  };

  // Analyze a single image
  const analyzeImage = async (index: number) => {
    const image = labeledImages[index];
    if (!image) return;

    setAnalyzing(index, true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-character', {
        body: {
          image: image.image,
          filenameHint: image.characterName || undefined,
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else if (error.message?.includes('429')) {
          toast.error('Rate limited. Please wait a moment and try again.');
        } else {
          toast.error('Failed to analyze image');
        }
        return;
      }

      if (data?.analysis) {
        updateAnalysis(index, data.analysis);
        toast.success(`Detected: ${data.analysis.suggestedName}`);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      toast.error('Failed to analyze character');
    } finally {
      setAnalyzing(index, false);
    }
  };

  // Analyze all images
  const analyzeAllImages = async () => {
    setIsDetectingAll(true);
    
    for (let i = 0; i < labeledImages.length; i++) {
      if (!labeledImages[i].analysis) {
        await analyzeImage(i);
        // Small delay between requests to avoid rate limiting
        if (i < labeledImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    setIsDetectingAll(false);
    toast.success('All characters analyzed!');
  };

  const handleConfirm = () => {
    // Ensure all images have names
    const finalImages = labeledImages.map((img, i) => ({
      image: img.image,
      characterName: img.characterName.trim() || `CHARACTER ${i + 1}`,
    }));

    // Generate combined character descriptions from AI analysis
    const descriptions = labeledImages
      .filter(img => img.analysis)
      .map(img => {
        const a = img.analysis!;
        return `${img.characterName}: ${a.physicalDescription}. ${a.clothing}. ${a.distinguishingFeatures}. Colors: ${a.colorPalette}.`;
      })
      .join('\n\n');

    onConfirm(finalImages, descriptions || undefined);
  };

  const unnamedCount = labeledImages.filter(img => !img.characterName.trim()).length;
  const analyzedCount = labeledImages.filter(img => img.analysis).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Map Characters to Reference Images
          </DialogTitle>
          <DialogDescription>
            Assign character names or use AI to auto-detect and generate detailed descriptions.
          </DialogDescription>
        </DialogHeader>

        {/* Auto-detect all button */}
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div>
            <p className="text-sm font-medium text-foreground">AI Character Detection</p>
            <p className="text-xs text-muted-foreground">
              Analyze images to auto-generate names and descriptions
            </p>
          </div>
          <Button
            onClick={analyzeAllImages}
            disabled={isDetectingAll}
            size="sm"
            className="gap-2"
          >
            {isDetectingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Detect All ({analyzedCount}/{labeledImages.length})
              </>
            )}
          </Button>
        </div>

        {/* Detected characters hint */}
        {detectedCharacters.length > 0 && (
          <div className="p-3 bg-accent/20 rounded-lg border border-accent/30">
            <p className="text-sm font-medium text-foreground mb-2">
              Characters detected in script:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedCharacters.map((char, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary cursor-pointer hover:bg-primary/30 transition-colors"
                  onClick={() => {
                    const emptyIndex = labeledImages.findIndex(img => !img.characterName.trim());
                    if (emptyIndex !== -1) {
                      updateLabel(emptyIndex, char);
                    }
                  }}
                  title="Click to assign to next empty slot"
                >
                  {char}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click a name to assign it to the next empty image slot
            </p>
          </div>
        )}

        {/* Image mapping grid */}
        <div className="space-y-4 py-2">
          {referenceImages.map((img, index) => {
            const labeledImage = labeledImages[index];
            const isExpanded = expandedIndex === index;
            const hasAnalysis = !!labeledImage?.analysis;

            return (
              <div 
                key={index} 
                className={`border rounded-lg overflow-hidden transition-all ${
                  hasAnalysis ? 'border-primary/30 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex gap-4 p-4">
                  {/* Image preview */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <img
                      src={img}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {labeledImage?.characterName && (
                      <div className="absolute top-1 right-1">
                        <Check className="w-5 h-5 text-green-500 bg-background rounded-full p-0.5" />
                      </div>
                    )}
                    {labeledImage?.isAnalyzing && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Name and controls */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`char-${index}`} className="text-xs text-muted-foreground">
                          Character Name
                        </Label>
                        <Input
                          id={`char-${index}`}
                          value={labeledImage?.characterName || ''}
                          onChange={(e) => updateLabel(index, e.target.value)}
                          placeholder="e.g., ORION"
                          className="h-9 uppercase"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => analyzeImage(index)}
                        disabled={labeledImage?.isAnalyzing || isDetectingAll}
                        className="gap-1"
                      >
                        {labeledImage?.isAnalyzing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Detect
                      </Button>
                    </div>

                    {/* Confidence badge and expand button */}
                    {hasAnalysis && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          labeledImage.analysis!.confidence === 'high' 
                            ? 'bg-green-500/20 text-green-600' 
                            : labeledImage.analysis!.confidence === 'medium'
                            ? 'bg-amber-500/20 text-amber-600'
                            : 'bg-red-500/20 text-red-600'
                        }`}>
                          {labeledImage.analysis!.confidence} confidence
                        </span>
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>Hide details <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>View details <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded analysis details */}
                {isExpanded && hasAnalysis && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-2">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Physical Description</Label>
                        <p className="text-sm">{labeledImage.analysis!.physicalDescription}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Clothing</Label>
                        <p className="text-sm">{labeledImage.analysis!.clothing}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Distinguishing Features</Label>
                        <p className="text-sm">{labeledImage.analysis!.distinguishingFeatures}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Color Palette</Label>
                        <p className="text-sm">{labeledImage.analysis!.colorPalette}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning for unnamed images */}
        {unnamedCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {unnamedCount} image{unnamedCount > 1 ? 's' : ''} not named. Unnamed images will be labeled automatically.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowExportSheet(true)}
            disabled={analyzedCount === 0}
            className="mr-auto"
          >
            <Printer className="w-4 h-4 mr-1" />
            Export Sheet
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="w-4 h-4 mr-1" />
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Character Sheet Export Dialog */}
      <CharacterSheetExport
        isOpen={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        characters={labeledImages.map(img => ({
          image: img.image,
          characterName: img.characterName || 'UNNAMED',
          analysis: img.analysis,
        }))}
      />
    </Dialog>
  );
}
