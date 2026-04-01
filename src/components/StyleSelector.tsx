import { useState } from 'react';
import { ArtStyle, ArtStyleConfig, getStylesByCategory, StyleMix } from '@/lib/artStyles';
import { cn } from '@/lib/utils';
import { Palette, Sparkles, Heart } from 'lucide-react';
import { StyleMixer } from './StyleMixer';
import { StylePreviewGenerator } from './StylePreviewGenerator';
import { StyleFavorites, useFavoriteStyle } from './StyleFavorites';
import { StyleRecommendations } from './StyleRecommendations';
import { StyleHistory } from './StyleHistory';
import { StyleComparison } from './StyleComparison';
import { CustomStyleCreator } from './CustomStyleCreator';
import { StylePreviewGallery } from './StylePreviewGallery';
import { StyleTemplates } from './StyleTemplates';
import { StyleRandomizer } from './StyleRandomizer';
import { PhotoStyleTransfer } from './PhotoStyleTransfer';
import { recordStyleUsage, recordMixUsage } from '@/lib/styleHistory';

interface StyleSelectorProps {
  selectedStyle: ArtStyle;
  onStyleSelect: (style: ArtStyle) => void;
  onMixedStyleApply?: (mix: StyleMix, promptModifier: string) => void;
  disabled?: boolean;
  scriptContent?: string;
}

export function StyleSelector({ selectedStyle, onStyleSelect, onMixedStyleApply, disabled, scriptContent }: StyleSelectorProps) {
  const [mixedStylePrompt, setMixedStylePrompt] = useState<string | null>(null);
  const generalStyles = getStylesByCategory('general');
  const artistStyles = getStylesByCategory('artist');
  const { isStyleFavorited, toggleFavorite, isAuthenticated } = useFavoriteStyle();

  const handleMixApply = (mix: StyleMix, promptModifier: string) => {
    setMixedStylePrompt(promptModifier);
    recordMixUsage(mix);
    if (onMixedStyleApply) {
      onMixedStyleApply(mix, promptModifier);
    }
  };

  const handleSelectFromFavorites = (style: ArtStyle) => {
    setMixedStylePrompt(null);
    onStyleSelect(style);
  };

  const handleSelectMixFromFavorites = (mix: StyleMix, promptModifier: string) => {
    setMixedStylePrompt(promptModifier);
    if (onMixedStyleApply) {
      onMixedStyleApply(mix, promptModifier);
    }
  };

  const handleStyleSelect = (style: ArtStyle) => {
    setMixedStylePrompt(null);
    recordStyleUsage(style);
    onStyleSelect(style);
  };

  const handleCustomStyleSelect = (config: ArtStyleConfig) => {
    setMixedStylePrompt(config.promptModifier);
    if (onMixedStyleApply) {
      onMixedStyleApply({ primaryStyle: 'western', secondaryStyle: 'western', primaryIntensity: 100, secondaryIntensity: 0 }, config.promptModifier);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tools Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StyleMixer onApplyMix={handleMixApply} disabled={disabled} />
        <StyleTemplates onApplyTemplate={handleMixApply} disabled={disabled} scriptContent={scriptContent} />
        <StyleRandomizer onApplyRandom={handleMixApply} disabled={disabled} />
        <PhotoStyleTransfer 
          selectedStyle={selectedStyle} 
          mixedStylePrompt={mixedStylePrompt || undefined} 
          disabled={disabled} 
        />
        <StylePreviewGenerator 
          selectedStyle={selectedStyle} 
          customPrompt={mixedStylePrompt || undefined}
          disabled={disabled} 
        />
        <StyleComparison disabled={disabled} onSelectStyle={handleStyleSelect} />
        <StylePreviewGallery disabled={disabled} onSelectStyle={handleStyleSelect} />
        {mixedStylePrompt && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            Mixed style active
          </span>
        )}
      </div>

      {/* Style History */}
      <StyleHistory
        onSelectStyle={handleSelectFromFavorites}
        onSelectMix={handleSelectMixFromFavorites}
        disabled={disabled}
      />

      {/* Style Recommendations */}
      <StyleRecommendations
        scriptContent={scriptContent}
        selectedStyle={selectedStyle}
        onSelectStyle={handleStyleSelect}
        disabled={disabled}
      />

      {/* Custom Styles */}
      <CustomStyleCreator
        onSelectCustomStyle={handleCustomStyleSelect}
        disabled={disabled}
      />

      {/* Favorites Section */}
      <StyleFavorites
        onSelectStyle={handleSelectFromFavorites}
        onSelectMix={handleSelectMixFromFavorites}
        selectedStyle={selectedStyle}
        disabled={disabled}
      />

      {/* General Styles */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">General Styles</label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {generalStyles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              isSelected={selectedStyle === style.id && !mixedStylePrompt}
              onSelect={() => {
                setMixedStylePrompt(null);
                onStyleSelect(style.id);
              }}
              disabled={disabled}
              isFavorited={isStyleFavorited(style.id)}
              onToggleFavorite={() => toggleFavorite(style.id)}
              showFavorite={isAuthenticated}
            />
          ))}
        </div>
      </div>

      {/* Artist-Inspired Styles */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <label className="text-sm font-medium text-foreground">Artist-Inspired Styles</label>
          <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Legendary Artists
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {artistStyles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              isSelected={selectedStyle === style.id && !mixedStylePrompt}
              onSelect={() => {
                setMixedStylePrompt(null);
                onStyleSelect(style.id);
              }}
              disabled={disabled}
              isArtist
              isFavorited={isStyleFavorited(style.id)}
              onToggleFavorite={() => toggleFavorite(style.id)}
              showFavorite={isAuthenticated}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StyleCardProps {
  style: ArtStyleConfig;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  isArtist?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  showFavorite?: boolean;
}

function StyleCard({ style, isSelected, onSelect, disabled, isArtist, isFavorited, onToggleFavorite, showFavorite }: StyleCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        isSelected
          ? 'border-primary bg-primary/10 shadow-glow'
          : isArtist 
            ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
            : 'border-border bg-secondary/30 hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary animate-pulse" />
      )}
      
      {/* Artist badge */}
      {isArtist && !isSelected && (
        <div className="absolute top-2 right-2">
          <Sparkles className="h-3 w-3 text-amber-500" />
        </div>
      )}

      {/* Favorite button */}
      {showFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className={cn(
            'absolute top-2 left-2 p-1 rounded-full transition-all',
            'hover:bg-rose-500/20',
            isFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorited ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground hover:text-rose-500'
            )}
          />
        </button>
      )}
      
      {/* Preview icon */}
      <div className="text-3xl mb-2">{style.preview}</div>
      
      {/* Name */}
      <h3 className="font-semibold text-foreground text-sm">{style.name}</h3>
      
      {/* Description */}
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {style.description}
      </p>
    </button>
  );
}
