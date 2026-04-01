import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Palette } from 'lucide-react';
import { MoodCategory } from '@/lib/characterMoods';
import { ArtStyle, ArtStyleConfig } from '@/lib/artStyles';
import { 
  MoodStyleRecommendation, 
  getStyleSuggestionsForMultipleMoods,
  getDominantMoodCategory
} from '@/lib/moodStyleSuggestions';
import { cn } from '@/lib/utils';

interface CharacterMoodInput {
  moodId: string;
  category: MoodCategory;
  intensity: number;
}

interface MoodStyleSuggestionsProps {
  characterMoods: CharacterMoodInput[];
  currentStyle?: ArtStyle;
  onSelectStyle: (style: ArtStyle) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function MoodStyleSuggestions({
  characterMoods,
  currentStyle,
  onSelectStyle,
  disabled,
  compact = false
}: MoodStyleSuggestionsProps) {
  if (characterMoods.length === 0) return null;

  const suggestions = getStyleSuggestionsForMultipleMoods(characterMoods);
  const dominantCategory = getDominantMoodCategory(characterMoods);

  if (suggestions.length === 0) return null;

  const categoryColors: Record<MoodCategory, string> = {
    positive: 'bg-green-500/10 text-green-600 border-green-500/30',
    negative: 'bg-red-500/10 text-red-600 border-red-500/30',
    neutral: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    intense: 'bg-orange-500/10 text-orange-600 border-orange-500/30'
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Suggested for mood:</span>
        </div>
        {suggestions.slice(0, 3).map(({ style, score }) => (
          <Button
            key={style.id}
            variant={currentStyle === style.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectStyle(style.id as ArtStyle)}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <span>{style.preview}</span>
            <span>{style.name}</span>
            <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
              {score}%
            </Badge>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Style Suggestions for Panel Mood</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn('capitalize text-xs', categoryColors[dominantCategory])}
        >
          {dominantCategory} tone
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {suggestions.map(({ style, score, reason }) => (
          <StyleSuggestionCard
            key={style.id}
            style={style}
            score={score}
            reason={reason}
            isSelected={currentStyle === style.id}
            onSelect={() => onSelectStyle(style.id as ArtStyle)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface StyleSuggestionCardProps {
  style: ArtStyleConfig;
  score: number;
  reason: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function StyleSuggestionCard({ 
  style, 
  score, 
  reason, 
  isSelected, 
  onSelect, 
  disabled 
}: StyleSuggestionCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'p-3 rounded-lg border text-left transition-all',
        'hover:border-primary/50 hover:bg-primary/5',
        isSelected 
          ? 'border-primary bg-primary/10' 
          : 'border-border bg-card',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{style.preview}</span>
        <Badge 
          variant={score >= 90 ? 'default' : 'secondary'} 
          className="text-[10px] h-5"
        >
          {score}%
        </Badge>
      </div>
      <h4 className="font-medium text-sm mt-1">{style.name}</h4>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {reason}
      </p>
    </button>
  );
}
