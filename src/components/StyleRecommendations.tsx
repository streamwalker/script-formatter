import { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArtStyle, ArtStyleConfig } from '@/lib/artStyles';
import {
  StoryGenre,
  GENRE_CONFIGS,
  getRecommendedStylesForGenre,
  getStyleCompatibilityScore,
  detectGenreFromScript,
  getGenreConfig,
} from '@/lib/styleRecommendations';
import { cn } from '@/lib/utils';

interface StyleRecommendationsProps {
  scriptContent?: string;
  selectedStyle: ArtStyle;
  onSelectStyle: (style: ArtStyle) => void;
  disabled?: boolean;
}

export function StyleRecommendations({
  scriptContent,
  selectedStyle,
  onSelectStyle,
  disabled,
}: StyleRecommendationsProps) {
  const [selectedGenre, setSelectedGenre] = useState<StoryGenre | null>(null);
  const [detectedGenre, setDetectedGenre] = useState<{ genre: StoryGenre; confidence: number } | null>(null);

  useEffect(() => {
    if (scriptContent) {
      const detected = detectGenreFromScript(scriptContent);
      setDetectedGenre(detected);
      if (detected && !selectedGenre) {
        setSelectedGenre(detected.genre);
      }
    }
  }, [scriptContent]);

  const activeGenre = selectedGenre || detectedGenre?.genre;
  const recommendations = activeGenre ? getRecommendedStylesForGenre(activeGenre) : null;
  const genreConfig = activeGenre ? getGenreConfig(activeGenre) : null;

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-foreground">Style Recommendations</span>
        </div>

        <div className="flex items-center gap-2">
          {detectedGenre && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Auto-detected: {getGenreConfig(detectedGenre.genre).name} ({detectedGenre.confidence}%)
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                {activeGenre ? (
                  <>
                    <span className="mr-1">{genreConfig?.icon}</span>
                    {genreConfig?.name}
                  </>
                ) : (
                  'Select Genre'
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              {GENRE_CONFIGS.map(genre => (
                <DropdownMenuItem
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className="cursor-pointer"
                >
                  <span className="mr-2">{genre.icon}</span>
                  {genre.name}
                  {selectedGenre === genre.id && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {recommendations && genreConfig && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {genreConfig.reasoning}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {recommendations.primary.slice(0, 4).map(style => (
                <RecommendedStyleCard
                  key={style.id}
                  style={style}
                  score={getStyleCompatibilityScore(style.id, activeGenre!)}
                  isPrimary
                  isSelected={selectedStyle === style.id}
                  onSelect={() => onSelectStyle(style.id)}
                  disabled={disabled}
                  reasoning={genreConfig.reasoning}
                />
              ))}
              {recommendations.secondary.slice(0, 2).map(style => (
                <RecommendedStyleCard
                  key={style.id}
                  style={style}
                  score={getStyleCompatibilityScore(style.id, activeGenre!)}
                  isPrimary={false}
                  isSelected={selectedStyle === style.id}
                  onSelect={() => onSelectStyle(style.id)}
                  disabled={disabled}
                  reasoning={genreConfig.reasoning}
                />
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {!activeGenre && (
        <p className="text-xs text-muted-foreground">
          Select a genre to see style recommendations, or add script content for auto-detection.
        </p>
      )}
    </div>
  );
}

interface RecommendedStyleCardProps {
  style: ArtStyleConfig;
  score: number;
  isPrimary: boolean;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  reasoning: string;
}

function RecommendedStyleCard({
  style,
  score,
  isPrimary,
  isSelected,
  onSelect,
  disabled,
  reasoning,
}: RecommendedStyleCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
            'hover:scale-105',
            isSelected
              ? 'border-primary bg-primary/20'
              : isPrimary
                ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500'
                : 'border-border bg-secondary/30 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
        >
          <span className="text-lg">{style.preview}</span>
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium">{style.name}</span>
            <span
              className={cn(
                'text-[10px]',
                score >= 90 ? 'text-emerald-500' : score >= 75 ? 'text-amber-500' : 'text-muted-foreground'
              )}
            >
              {score}% match
            </span>
          </div>
          {isPrimary && (
            <Sparkles className="h-3 w-3 text-amber-500" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-medium">{style.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
        <p className="text-xs mt-1">
          <span className="font-medium">Why?</span> {reasoning}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
