import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import {
  DialogueSuggestion,
  DialogueTone,
  CharacterVoice,
  generateDialogue,
  TONE_OPTIONS,
  getEmotionIcon,
} from '@/lib/dialogueGenerator';
import { DialogueSuggestionCard } from './DialogueSuggestionCard';

interface DialogueGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelDescription: string;
  panelCharacters: string[];
  narration?: string;
  previousDialogue?: string;
  characterLibrary?: Array<{
    name: string;
    description?: string;
    traits?: string[];
    archetype?: string;
  }>;
  onSelectDialogue: (dialogue: string, speaker?: string) => void;
}

export function DialogueGenerator({
  open,
  onOpenChange,
  panelDescription,
  panelCharacters,
  narration,
  previousDialogue,
  characterLibrary = [],
  onSelectDialogue,
}: DialogueGeneratorProps) {
  const [tone, setTone] = useState<DialogueTone>('dramatic');
  const [customContext, setCustomContext] = useState('');
  const [suggestions, setSuggestions] = useState<DialogueSuggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setSuggestions([]);
    setSelectedIndex(null);

    // Build character voices from library
    const characters: CharacterVoice[] = panelCharacters.map(name => {
      const fromLib = characterLibrary.find(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
      return {
        name,
        description: fromLib?.description,
        traits: fromLib?.traits,
        archetype: fromLib?.archetype,
      };
    });

    const { suggestions: result, error } = await generateDialogue(
      {
        sceneDescription: panelDescription,
        characters,
        storyContext: customContext || narration,
        tone,
        previousDialogue,
        panelDescription,
      },
      { count: 5 }
    );

    if (error) {
      toast.error(error.message || 'Failed to generate dialogue');
    } else if (result.length === 0) {
      toast.error('No suggestions generated. Try adjusting the context.');
    } else {
      setSuggestions(result);
    }

    setGenerating(false);
  };

  const handleSelect = (suggestion: DialogueSuggestion) => {
    onSelectDialogue(suggestion.dialogue, suggestion.speaker);
    toast.success('Dialogue added to panel');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Dialogue Generator
          </DialogTitle>
          <DialogDescription>
            Generate character dialogue based on the scene context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Scene Context */}
          <div>
            <Label className="text-xs text-muted-foreground">Scene Description</Label>
            <p className="text-sm bg-muted/50 p-2 rounded mt-1">{panelDescription}</p>
          </div>

          {/* Characters */}
          <div>
            <Label className="text-xs text-muted-foreground">Characters in Scene</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {panelCharacters.length > 0 ? (
                panelCharacters.map(char => (
                  <Badge key={char} variant="secondary">
                    {char}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No characters detected</span>
              )}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <Label>Dialogue Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as DialogueTone)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Context */}
          <div>
            <Label>Additional Context (Optional)</Label>
            <Textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Add story context, character motivations, or specific requirements..."
              className="mt-1 h-20 resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : suggestions.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Dialogue
              </>
            )}
          </Button>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Suggestions</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <DialogueSuggestionCard
                    key={index}
                    suggestion={suggestion}
                    isSelected={selectedIndex === index}
                    onClick={() => setSelectedIndex(index)}
                    onUse={() => handleSelect(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
