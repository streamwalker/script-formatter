import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings2, 
  Eye, 
  Shirt, 
  Sparkles,
  Info
} from 'lucide-react';
import { ConsistencyConfig, DEFAULT_CONSISTENCY_CONFIG } from '@/lib/characterConsistencyModel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConsistencySettingsProps {
  config: ConsistencyConfig;
  onChange: (config: ConsistencyConfig) => void;
  compact?: boolean;
}

export function ConsistencySettings({ config, onChange, compact = false }: ConsistencySettingsProps) {
  const getWeightLabel = (weight: number) => {
    if (weight >= 0.9) return { label: 'Maximum', color: 'text-green-500' };
    if (weight >= 0.7) return { label: 'High', color: 'text-blue-500' };
    if (weight >= 0.5) return { label: 'Balanced', color: 'text-yellow-500' };
    if (weight >= 0.3) return { label: 'Flexible', color: 'text-orange-500' };
    return { label: 'Creative', color: 'text-purple-500' };
  };

  const weightInfo = getWeightLabel(config.characterWeight);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Character Consistency</Label>
          </div>
          <Badge variant="outline" className={weightInfo.color}>
            {weightInfo.label}
          </Badge>
        </div>
        <Slider
          value={[config.characterWeight]}
          onValueChange={([value]) => onChange({ ...config, characterWeight: value })}
          min={0.1}
          max={1}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Creative</span>
          <span>Strict</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Consistency Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Main Weight Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Character Weight</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Controls how strictly generated images should match reference images. 
                      Higher values mean more exact matching, lower values allow more creative freedom.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge variant="outline" className={weightInfo.color}>
              {weightInfo.label} ({Math.round(config.characterWeight * 100)}%)
            </Badge>
          </div>
          <Slider
            value={[config.characterWeight]}
            onValueChange={([value]) => onChange({ ...config, characterWeight: value })}
            min={0.1}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Creative Freedom</span>
            <span>Strict Reference</span>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm">Preserve Key Features</Label>
            </div>
            <Switch
              checked={config.preserveKeyFeatures}
              onCheckedChange={(checked) => onChange({ ...config, preserveKeyFeatures: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Lock hair, eyes, and distinctive marks across all panels
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shirt className="h-4 w-4 text-accent" />
              <Label className="text-sm">Clothing Consistency</Label>
            </div>
            <Switch
              checked={config.clothingConsistency}
              onCheckedChange={(checked) => onChange({ ...config, clothingConsistency: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Maintain outfit details unless script specifies change
          </p>
        </div>

        {/* Face Matching Priority */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-500" />
            <Label className="text-sm">Face Matching Priority</Label>
          </div>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <Badge
                key={priority}
                variant={config.faceMatchingPriority === priority ? 'default' : 'outline'}
                className="cursor-pointer capitalize flex-1 justify-center"
                onClick={() => onChange({ ...config, faceMatchingPriority: priority })}
              >
                {priority}
              </Badge>
            ))}
          </div>
        </div>

        {/* Pose Flexibility */}
        <div className="space-y-2">
          <Label className="text-sm">Pose Flexibility</Label>
          <div className="flex gap-2">
            {(['strict', 'moderate', 'flexible'] as const).map((mode) => (
              <Badge
                key={mode}
                variant={config.poseFlexibility === mode ? 'default' : 'outline'}
                className="cursor-pointer capitalize flex-1 justify-center"
                onClick={() => onChange({ ...config, poseFlexibility: mode })}
              >
                {mode}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {config.poseFlexibility === 'strict' 
              ? 'Character proportions remain constant' 
              : config.poseFlexibility === 'moderate'
              ? 'Dynamic poses while maintaining identity'
              : 'Prioritize action/emotion over consistency'}
          </p>
        </div>

        {/* Reset to defaults */}
        <button
          onClick={() => onChange(DEFAULT_CONSISTENCY_CONFIG)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Reset to defaults
        </button>
      </CardContent>
    </Card>
  );
}
