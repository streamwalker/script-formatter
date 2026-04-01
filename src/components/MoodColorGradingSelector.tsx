import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Palette, Sparkles, Sun, Moon, Flame, Snowflake, Eye } from 'lucide-react';
import { 
  COLOR_GRADING_PRESETS, 
  ColorGradingPreset, 
  getDominantMoodColorGrading,
  generateColorGradingCSS 
} from '@/lib/moodColorGrading';
import { EmotionState } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';

interface MoodColorGradingSelectorProps {
  characterMoods: Record<string, EmotionState>;
  selectedPreset?: ColorGradingPreset;
  onSelectPreset: (preset: ColorGradingPreset) => void;
  autoMode?: boolean;
  onAutoModeChange?: (auto: boolean) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  positive: <Sun className="w-4 h-4 text-yellow-500" />,
  negative: <Moon className="w-4 h-4 text-blue-500" />,
  neutral: <Eye className="w-4 h-4 text-gray-500" />,
  intense: <Flame className="w-4 h-4 text-orange-500" />,
};

export function MoodColorGradingSelector({
  characterMoods,
  selectedPreset,
  onSelectPreset,
  autoMode = true,
  onAutoModeChange,
}: MoodColorGradingSelectorProps) {
  const [showPreview, setShowPreview] = useState(false);

  // Auto-detect best preset based on character moods
  const moodIds = Object.fromEntries(
    Object.entries(characterMoods).map(([k, v]) => [k, v.id])
  );
  const autoPreset = getDominantMoodColorGrading(moodIds);

  const effectivePreset = autoMode ? autoPreset : selectedPreset;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Color Grading</span>
        </div>
        <Button
          variant={autoMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => onAutoModeChange?.(!autoMode)}
          className="gap-1 h-7 text-xs"
        >
          <Sparkles className="w-3 h-3" />
          {autoMode ? 'Auto' : 'Manual'}
        </Button>
      </div>

      {autoMode ? (
        <div className="p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {CATEGORY_ICONS[autoPreset.moodCategory] || CATEGORY_ICONS.neutral}
            <span className="text-sm font-medium">{autoPreset.name}</span>
            <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{autoPreset.description}</p>
          
          {/* Color preview */}
          <div className="mt-2 flex gap-1">
            <div 
              className="w-8 h-4 rounded"
              style={{ 
                background: autoPreset.overlayColor || 'transparent',
                border: '1px solid hsl(var(--border))'
              }}
            />
            <span className="text-xs text-muted-foreground">
              Warmth: {autoPreset.colorAdjustments.warmth > 0 ? '+' : ''}{autoPreset.colorAdjustments.warmth}
            </span>
          </div>
        </div>
      ) : (
        <Select 
          value={selectedPreset?.id} 
          onValueChange={(id) => {
            const preset = COLOR_GRADING_PRESETS.find(p => p.id === id);
            if (preset) onSelectPreset(preset);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select color grading..." />
          </SelectTrigger>
          <SelectContent>
            {COLOR_GRADING_PRESETS.map(preset => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[preset.moodCategory] || CATEGORY_ICONS.neutral}
                  <span>{preset.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Preview toggle */}
      {effectivePreset && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onMouseEnter={() => setShowPreview(true)}
                onMouseLeave={() => setShowPreview(false)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Hover to Preview Effect
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs p-0 overflow-hidden">
              <div 
                className="w-48 h-32 bg-gradient-to-br from-secondary to-background flex items-center justify-center"
                style={{ filter: generateColorGradingCSS(effectivePreset) }}
              >
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-2 bg-card rounded-full" />
                  <p className="text-xs text-foreground">Preview</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
