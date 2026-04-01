import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Coins, ChevronDown, Image, Users, Palette, Smile, Layers } from 'lucide-react';
import { ParsedPage } from '@/lib/scriptParser';
import { ArtStyle, getStyleById } from '@/lib/artStyles';
import { estimateCost, formatCostRange, getComplexityFactors, CostBreakdown } from '@/lib/costEstimator';

interface CostEstimatorProps {
  pages: ParsedPage[];
  referenceImageCount: number;
  artStyle: ArtStyle;
  consistencyEnabled: boolean;
  hasMoodProgression: boolean;
  className?: string;
}

export function CostEstimator({
  pages,
  referenceImageCount,
  artStyle,
  consistencyEnabled,
  hasMoodProgression,
  className = '',
}: CostEstimatorProps) {
  const panels = useMemo(() => pages.flatMap(p => p.panels), [pages]);
  
  const costBreakdown = useMemo(() => {
    if (panels.length === 0) return null;
    
    const factors = getComplexityFactors(
      panels,
      referenceImageCount,
      artStyle,
      consistencyEnabled,
      hasMoodProgression
    );
    
    return estimateCost(factors);
  }, [panels, referenceImageCount, artStyle, consistencyEnabled, hasMoodProgression]);

  if (!costBreakdown || panels.length === 0) {
    return null;
  }

  const styleConfig = getStyleById(artStyle);
  const totalCost = (costBreakdown.estimatedCreditsMin + costBreakdown.estimatedCreditsMax) / 2;

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <span>Estimated Cost</span>
          </div>
          <Badge variant="secondary" className="font-mono">
            {formatCostRange(costBreakdown.estimatedCreditsMin, costBreakdown.estimatedCreditsMax)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary stats */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Layers className="w-3 h-3" />
            {panels.length} panels
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Palette className="w-3 h-3" />
            {styleConfig.name}
          </Badge>
          {referenceImageCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <Image className="w-3 h-3" />
              {referenceImageCount} refs
            </Badge>
          )}
          {consistencyEnabled && (
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              Consistency
            </Badge>
          )}
          {hasMoodProgression && (
            <Badge variant="outline" className="gap-1">
              <Smile className="w-3 h-3" />
              Moods
            </Badge>
          )}
        </div>

        {/* Complexity indicator */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Style Complexity</span>
            <span className="font-medium capitalize">{costBreakdown.artStyleComplexity}</span>
          </div>
          <Progress 
            value={costBreakdown.complexityMultiplier * 66.67} 
            className="h-1.5" 
          />
        </div>

        {/* Breakdown collapsible */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            <span>View breakdown</span>
            <ChevronDown className="w-3 h-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <CostLine 
              label="Base generation" 
              value={costBreakdown.breakdown.baseGeneration} 
              icon={<Layers className="w-3 h-3" />}
            />
            {costBreakdown.breakdown.styleComplexity > 0 && (
              <CostLine 
                label="Style complexity" 
                value={costBreakdown.breakdown.styleComplexity} 
                icon={<Palette className="w-3 h-3" />}
              />
            )}
            {costBreakdown.breakdown.characterConsistency > 0 && (
              <CostLine 
                label="Character consistency" 
                value={costBreakdown.breakdown.characterConsistency} 
                icon={<Users className="w-3 h-3" />}
              />
            )}
            {costBreakdown.breakdown.referenceImages > 0 && (
              <CostLine 
                label="Reference processing" 
                value={costBreakdown.breakdown.referenceImages} 
                icon={<Image className="w-3 h-3" />}
              />
            )}
            {costBreakdown.breakdown.moodProcessing > 0 && (
              <CostLine 
                label="Mood processing" 
                value={costBreakdown.breakdown.moodProcessing} 
                icon={<Smile className="w-3 h-3" />}
              />
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Estimated total</span>
                <span className="text-primary">
                  {formatCostRange(costBreakdown.estimatedCreditsMin, costBreakdown.estimatedCreditsMax)}
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <p className="text-[10px] text-muted-foreground">
          * Estimates are approximate. Actual usage may vary.
        </p>
      </CardContent>
    </Card>
  );
}

function CostLine({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono">{value.toFixed(1)}</span>
    </div>
  );
}
