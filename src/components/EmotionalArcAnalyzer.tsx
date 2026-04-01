import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Sparkles, 
  AlertTriangle, 
  Check, 
  X,
  Loader2,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EMOTION_STATES, getEmotionById } from '@/lib/characterMoods';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ArcSuggestion {
  panelRange: { start: number; end: number };
  suggestedMood: string;
  intensity: 1 | 2 | 3;
  reasoning: string;
  emotionalTurningPoint: boolean;
}

interface ArcAnalysis {
  characterName: string;
  suggestedArc: ArcSuggestion[];
  overallAnalysis: string;
  conflictsDetected: string[];
}

interface EmotionalArcAnalyzerProps {
  characters: { id: string; name: string; description?: string }[];
  onApplySuggestion?: (characterName: string, panelId: number, moodId: string) => void;
  trigger?: React.ReactNode;
}

export function EmotionalArcAnalyzer({ characters, onApplySuggestion, trigger }: EmotionalArcAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ArcAnalysis | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    if (!selectedCharacter) {
      toast.error('Please select a character');
      return;
    }

    const character = characters.find(c => c.name === selectedCharacter);
    if (!character) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setAcceptedSuggestions(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('analyze-emotional-arc', {
        body: {
          characterName: character.name,
          characterProfile: {
            name: character.name,
            description: character.description,
          },
        },
      });

      if (error) {
        console.error('Analysis error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error('Failed to analyze emotional arc');
        }
        return;
      }

      setAnalysis(data);
      toast.success('Analysis complete!');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to analyze emotional arc');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptSuggestion = (index: number, suggestion: ArcSuggestion) => {
    setAcceptedSuggestions(prev => new Set(prev).add(index));
    
    // Apply to each panel in the range
    for (let panelId = suggestion.panelRange.start; panelId <= suggestion.panelRange.end; panelId++) {
      onApplySuggestion?.(analysis!.characterName, panelId, suggestion.suggestedMood);
    }
    
    toast.success(`Applied "${suggestion.suggestedMood}" to panels ${suggestion.panelRange.start}-${suggestion.panelRange.end}`);
  };

  const handleApplyAll = () => {
    if (!analysis) return;
    
    analysis.suggestedArc.forEach((suggestion, index) => {
      if (!acceptedSuggestions.has(index)) {
        handleAcceptSuggestion(index, suggestion);
      }
    });
    
    toast.success('Applied all suggestions!');
  };

  const getMoodEmotion = (moodId: string) => {
    return EMOTION_STATES.find(e => 
      e.id === moodId || 
      e.name.toLowerCase() === moodId.toLowerCase()
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analyze Arc
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            AI Emotional Arc Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Character Selection */}
          <div className="flex gap-3">
            <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a character" />
              </SelectTrigger>
              <SelectContent>
                {characters.map(char => (
                  <SelectItem key={char.id} value={char.name}>
                    {char.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleAnalyze} 
              disabled={!selectedCharacter || isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analyze
            </Button>
          </div>

          {/* Loading State */}
          {isAnalyzing && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing emotional arc...</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !isAnalyzing && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Overall Analysis */}
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Overall Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground">{analysis.overallAnalysis}</p>
                </div>

                {/* Conflicts */}
                {analysis.conflictsDetected.length > 0 && (
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                    <h3 className="font-medium mb-2 flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Conflicts Detected
                    </h3>
                    <ul className="text-sm space-y-1">
                      {analysis.conflictsDetected.map((conflict, i) => (
                        <li key={i} className="text-muted-foreground">• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Suggested Arc</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleApplyAll}
                      className="gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Apply All
                    </Button>
                  </div>

                  {analysis.suggestedArc.map((suggestion, index) => {
                    const emotion = getMoodEmotion(suggestion.suggestedMood);
                    const isAccepted = acceptedSuggestions.has(index);

                    return (
                      <div 
                        key={index}
                        className={cn(
                          'p-3 rounded-lg border transition-all',
                          isAccepted 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-card border-border hover:border-primary/50',
                          suggestion.emotionalTurningPoint && 'ring-2 ring-accent/50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">
                                Panels {suggestion.panelRange.start}-{suggestion.panelRange.end}
                              </Badge>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: emotion ? `hsl(var(--${emotion.category === 'positive' ? 'primary' : emotion.category === 'negative' ? 'destructive' : 'muted'}))` : undefined 
                                }}
                              >
                                {emotion?.name || suggestion.suggestedMood}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Intensity: {suggestion.intensity}/3
                              </span>
                              {suggestion.emotionalTurningPoint && (
                                <Badge variant="default" className="bg-accent text-accent-foreground">
                                  Turning Point
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                          </div>

                          <div className="flex gap-1">
                            {!isAccepted ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleAcceptSuggestion(index, suggestion)}
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setAcceptedSuggestions(prev => {
                                    const next = new Set(prev);
                                    next.delete(index);
                                    return next;
                                  })}
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <Badge variant="default" className="bg-primary/20 text-primary">
                                Applied
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!analysis && !isAnalyzing && (
            <div className="py-12 text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a character and click "Analyze" to get AI-powered emotional arc suggestions.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
