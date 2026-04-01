import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wand2, 
  Loader2, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';
import { EmotionState, EMOTION_STATES } from '@/lib/characterMoods';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MoodSuggestion {
  characterName: string;
  suggestedMoodId: string;
  confidence: number;
  reasoning: string;
}

interface AutoMoodDetectorProps {
  panelDescription: string;
  dialogue?: string;
  panelCharacters: string[];
  onApplySuggestions: (suggestions: Record<string, EmotionState>) => void;
}

export function AutoMoodDetector({
  panelDescription,
  dialogue,
  panelCharacters,
  onApplySuggestions,
}: AutoMoodDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<MoodSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAnalyze = async () => {
    if (panelCharacters.length === 0) {
      toast.error('No characters in this panel to analyze');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions([]);
    setShowSuggestions(false);

    try {
      const { data, error } = await supabase.functions.invoke('detect-mood', {
        body: {
          panelDescription,
          dialogue,
          characters: panelCharacters,
        },
      });

      if (error) {
        console.error('Error detecting moods:', error);
        if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please wait a moment.');
        } else {
          toast.error('Failed to analyze moods');
        }
        return;
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
        toast.success(`Analyzed ${data.suggestions.length} character moods`);
      } else {
        toast.info('No mood suggestions generated');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to analyze moods');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAll = () => {
    const moodAssignments: Record<string, EmotionState> = {};
    
    suggestions.forEach(suggestion => {
      const emotion = EMOTION_STATES.find(e => e.id === suggestion.suggestedMoodId);
      if (emotion) {
        moodAssignments[suggestion.characterName] = emotion;
      }
    });

    onApplySuggestions(moodAssignments);
    setShowSuggestions(false);
    toast.success('Applied all AI suggestions');
  };

  const handleApplySingle = (suggestion: MoodSuggestion) => {
    const emotion = EMOTION_STATES.find(e => e.id === suggestion.suggestedMoodId);
    if (emotion) {
      onApplySuggestions({ [suggestion.characterName]: emotion });
      toast.success(`Applied ${emotion.name} to ${suggestion.characterName}`);
    }
  };

  const handleDismiss = () => {
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={isAnalyzing || panelCharacters.length === 0}
        className="gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Auto-Detect Moods
          </>
        )}
      </Button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI Mood Suggestions</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyAll}
                className="h-7 text-xs gap-1"
              >
                <Check className="w-3 h-3" />
                Apply All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2 pr-2">
              {suggestions.map((suggestion, index) => {
                const emotion = EMOTION_STATES.find(e => e.id === suggestion.suggestedMoodId);
                
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between p-2 bg-card rounded border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{suggestion.characterName}</span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'text-xs',
                            emotion?.category === 'positive' && 'bg-green-500/20 text-green-700',
                            emotion?.category === 'negative' && 'bg-red-500/20 text-red-700',
                            emotion?.category === 'neutral' && 'bg-blue-500/20 text-blue-700',
                            emotion?.category === 'intense' && 'bg-orange-500/20 text-orange-700',
                          )}
                        >
                          {emotion?.name || suggestion.suggestedMoodId}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplySingle(suggestion)}
                      className="h-7 w-7 p-0 ml-2"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
