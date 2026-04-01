import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  PanelLayoutSuggestion, 
  LAYOUT_TEMPLATES, 
  LayoutTemplate,
  getPanelSizeInfo,
  getDramaticWeightStars,
  CAMERA_ANGLES
} from '@/lib/sceneLayoutAnalysis';
import { Star } from 'lucide-react';

interface LayoutPreviewProps {
  template: LayoutTemplate;
  suggestions: PanelLayoutSuggestion[];
  className?: string;
}

export function LayoutPreview({ template, suggestions, className = '' }: LayoutPreviewProps) {
  const config = LAYOUT_TEMPLATES[template];

  // Calculate layout positions
  const calculateLayoutPositions = () => {
    const positions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      suggestion: PanelLayoutSuggestion;
    }> = [];

    let currentY = 5;
    const containerWidth = 100; // percentage
    const gap = 2;

    suggestions.forEach((suggestion, index) => {
      let width: number, height: number, x: number;

      switch (suggestion.suggestedSize) {
        case 'full':
          width = containerWidth - gap * 2;
          height = 30;
          x = gap;
          break;
        case 'large':
          width = containerWidth - gap * 2;
          height = 25;
          x = gap;
          break;
        case 'medium':
          width = (containerWidth - gap * 3) / 2;
          height = 20;
          x = index % 2 === 0 ? gap : containerWidth / 2 + gap / 2;
          break;
        case 'small':
          width = (containerWidth - gap * 4) / 3;
          height = 15;
          x = gap + (index % 3) * (width + gap);
          break;
        case 'strip':
          width = containerWidth - gap * 2;
          height = 12;
          x = gap;
          break;
        default:
          width = (containerWidth - gap * 3) / 2;
          height = 20;
          x = gap;
      }

      // Simple vertical stacking for now
      if (suggestion.suggestedSize === 'medium' && index % 2 === 1) {
        // Same row as previous
        const prevPos = positions[positions.length - 1];
        if (prevPos) {
          positions.push({
            x,
            y: prevPos.y,
            width,
            height,
            suggestion,
          });
          return;
        }
      }

      if (suggestion.suggestedSize === 'small' && index % 3 !== 0) {
        // Same row as previous
        const prevPos = positions[positions.length - 1];
        if (prevPos) {
          positions.push({
            x,
            y: prevPos.y,
            width,
            height,
            suggestion,
          });
          return;
        }
      }

      positions.push({
        x,
        y: currentY,
        width,
        height,
        suggestion,
      });

      if (
        suggestion.suggestedSize === 'full' ||
        suggestion.suggestedSize === 'large' ||
        suggestion.suggestedSize === 'strip' ||
        (suggestion.suggestedSize === 'medium' && index % 2 === 1) ||
        (suggestion.suggestedSize === 'small' && index % 3 === 2)
      ) {
        currentY += height + gap;
      }
    });

    return positions;
  };

  const positions = calculateLayoutPositions();
  const maxY = Math.max(...positions.map(p => p.y + p.height)) + 5;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <div className="text-sm font-medium">{config.name}</div>
          <div className="text-xs text-muted-foreground">{config.description}</div>
        </div>
      </div>

      {/* Visual Preview */}
      <div 
        className="relative border border-border rounded-lg bg-muted/30 overflow-hidden"
        style={{ 
          width: '100%', 
          paddingBottom: `${Math.min(maxY * 1.5, 150)}%`,
          maxHeight: 300,
        }}
      >
        {positions.map((pos, index) => {
          const cameraAngle = CAMERA_ANGLES.find(a => a.angle === pos.suggestion.suggestedCameraAngle);
          
          return (
            <div
              key={pos.suggestion.panelKey}
              className={`
                absolute rounded border transition-all
                ${pos.suggestion.isKeyMoment 
                  ? 'border-primary bg-primary/20' 
                  : 'border-border/60 bg-card/80'
                }
              `}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                <div className="text-xs font-bold">
                  {index + 1}
                </div>
                {pos.suggestion.isKeyMoment && (
                  <Star className="w-3 h-3 text-primary mt-0.5" />
                )}
                <div className="text-[10px] text-muted-foreground">
                  {cameraAngle?.icon}
                </div>
              </div>

              {/* Dramatic weight indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b overflow-hidden">
                <div 
                  className="h-full bg-amber-500/60"
                  style={{ width: `${pos.suggestion.dramaticWeight * 20}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-primary bg-primary/20 border" />
          <span>Key Moment</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-border/60 bg-card/80 border" />
          <span>Standard</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-1 bg-amber-500/60 rounded" />
          <span>Dramatic Weight</span>
        </div>
      </div>

      {/* Panel Summary */}
      <div className="text-xs text-muted-foreground">
        {suggestions.length} panels • 
        {suggestions.filter(s => s.isKeyMoment).length} key moments •
        Avg weight: {(suggestions.reduce((sum, s) => sum + s.dramaticWeight, 0) / suggestions.length).toFixed(1)}
      </div>
    </div>
  );
}

// Compact preview for inline use
export function LayoutPreviewCompact({ 
  template, 
  panelCount 
}: { 
  template: LayoutTemplate; 
  panelCount: number;
}) {
  const config = LAYOUT_TEMPLATES[template];
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
      <span className="text-xl">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{config.name}</div>
        <div className="text-xs text-muted-foreground">{panelCount} panels</div>
      </div>
      <Badge variant="secondary" className="text-xs">
        {config.bestFor[0]}
      </Badge>
    </div>
  );
}
