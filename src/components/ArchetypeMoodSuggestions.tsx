import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Sparkles, Check } from 'lucide-react';
import { 
  SceneContext, 
  getSuggestedMoodsForArchetype, 
  scoreMoodForArchetype,
  getMoodCompatibilityLabel 
} from '@/lib/archetypeMoods';
import { CHARACTER_ARCHETYPES } from '@/lib/characterArchetypes';
import { EmotionState } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';

interface ArchetypeMoodSuggestionsProps {
  characterName: string;
  archetypeId?: string;
  currentMoodId?: string;
  onSelectMood: (mood: EmotionState) => void;
  onSelectArchetype?: (archetypeId: string) => void;
}

const SCENE_CONTEXTS: { id: SceneContext; label: string }[] = [
  { id: 'default', label: 'Normal' },
  { id: 'stress', label: 'Under Stress' },
  { id: 'social', label: 'Social' },
  { id: 'conflict', label: 'Conflict' },
  { id: 'downtime', label: 'Relaxed' },
];

export function ArchetypeMoodSuggestions({
  characterName,
  archetypeId,
  currentMoodId,
  onSelectMood,
  onSelectArchetype,
}: ArchetypeMoodSuggestionsProps) {
  const [selectedContext, setSelectedContext] = useState<SceneContext>('default');
  const [localArchetype, setLocalArchetype] = useState(archetypeId || '');

  const effectiveArchetype = localArchetype || archetypeId;
  const archetype = effectiveArchetype 
    ? CHARACTER_ARCHETYPES.find(a => a.id === effectiveArchetype) 
    : null;

  const suggestedMoods = effectiveArchetype 
    ? getSuggestedMoodsForArchetype(effectiveArchetype, selectedContext)
    : [];

  const handleArchetypeChange = (id: string) => {
    setLocalArchetype(id);
    onSelectArchetype?.(id);
  };

  if (!effectiveArchetype) {
    return (
      <div className="p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{characterName}</span>
        </div>
        <Select value={localArchetype} onValueChange={handleArchetypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Assign archetype for suggestions..." />
          </SelectTrigger>
          <SelectContent>
            {CHARACTER_ARCHETYPES.map(arch => (
              <SelectItem key={arch.id} value={arch.id} className="text-xs">
                {arch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{characterName}</span>
          <Badge variant="outline" className="text-xs">
            {archetype?.name}
          </Badge>
        </div>
        <Select value={selectedContext} onValueChange={(v) => setSelectedContext(v as SceneContext)}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCENE_CONTEXTS.map(ctx => (
              <SelectItem key={ctx.id} value={ctx.id} className="text-xs">
                {ctx.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap">
        {suggestedMoods.map(mood => {
          const score = scoreMoodForArchetype(effectiveArchetype, mood.id);
          const compatibility = getMoodCompatibilityLabel(score);
          const isSelected = currentMoodId === mood.id;

          return (
            <TooltipProvider key={mood.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 text-xs gap-1',
                      isSelected && 'ring-2 ring-primary ring-offset-1'
                    )}
                    onClick={() => onSelectMood(mood)}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {mood.name}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className={compatibility.color}>{compatibility.label} for {archetype?.name}</p>
                    <p className="text-muted-foreground mt-1">
                      {mood.expressionKeywords.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {suggestedMoods.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No suggestions available for this context
        </p>
      )}
    </div>
  );
}
