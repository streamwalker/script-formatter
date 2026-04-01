import { useState } from 'react';
import { ART_STYLES, ArtStyle, StyleMix, getStyleById, generateMixedStylePrompt } from '@/lib/artStyles';
import { cn } from '@/lib/utils';
import { Blend, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface StyleMixerProps {
  onApplyMix: (mix: StyleMix, promptModifier: string) => void;
  disabled?: boolean;
}

export function StyleMixer({ onApplyMix, disabled }: StyleMixerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [primaryStyle, setPrimaryStyle] = useState<ArtStyle>('western');
  const [secondaryStyle, setSecondaryStyle] = useState<ArtStyle>('manga');
  const [primaryIntensity, setPrimaryIntensity] = useState(70);
  const [secondaryIntensity, setSecondaryIntensity] = useState(30);

  const primaryConfig = getStyleById(primaryStyle);
  const secondaryConfig = getStyleById(secondaryStyle);

  const handleApply = () => {
    const mix: StyleMix = {
      primaryStyle,
      secondaryStyle,
      primaryIntensity,
      secondaryIntensity,
    };
    const prompt = generateMixedStylePrompt(mix);
    onApplyMix(mix, prompt);
    setIsOpen(false);
  };

  const handleReset = () => {
    setPrimaryIntensity(70);
    setSecondaryIntensity(30);
  };

  const handlePrimaryIntensityChange = (value: number[]) => {
    const newPrimary = value[0];
    setPrimaryIntensity(newPrimary);
    // Auto-adjust secondary to complement
    setSecondaryIntensity(100 - newPrimary);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Blend className="h-4 w-4" />
          Mix Styles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Blend className="h-5 w-5 text-primary" />
            Style Mixer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Style Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Primary Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Style</label>
              <Select value={primaryStyle} onValueChange={(v) => setPrimaryStyle(v as ArtStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ART_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id} disabled={style.id === secondaryStyle}>
                      <span className="flex items-center gap-2">
                        <span>{style.preview}</span>
                        <span>{style.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary Style</label>
              <Select value={secondaryStyle} onValueChange={(v) => setSecondaryStyle(v as ArtStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ART_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id} disabled={style.id === primaryStyle}>
                      <span className="flex items-center gap-2">
                        <span>{style.preview}</span>
                        <span>{style.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="flex items-center justify-center gap-4 p-6 bg-secondary/30 rounded-xl">
            <div className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
              primaryIntensity >= secondaryIntensity ? 'border-primary bg-primary/10' : 'border-border'
            )}>
              <span className="text-4xl">{primaryConfig.preview}</span>
              <span className="text-sm font-medium">{primaryConfig.name}</span>
              <Badge variant={primaryIntensity >= secondaryIntensity ? 'default' : 'secondary'}>
                {primaryIntensity}%
              </Badge>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Blend className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Blend</span>
            </div>

            <div className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
              secondaryIntensity > primaryIntensity ? 'border-primary bg-primary/10' : 'border-border'
            )}>
              <span className="text-4xl">{secondaryConfig.preview}</span>
              <span className="text-sm font-medium">{secondaryConfig.name}</span>
              <Badge variant={secondaryIntensity > primaryIntensity ? 'default' : 'secondary'}>
                {secondaryIntensity}%
              </Badge>
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Blend Ratio</label>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>
            <div className="px-2">
              <Slider
                value={[primaryIntensity]}
                onValueChange={handlePrimaryIntensityChange}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100% {secondaryConfig.name}</span>
              <span>50/50</span>
              <span>100% {primaryConfig.name}</span>
            </div>
          </div>

          {/* Preview Description */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Result: </span>
              A {primaryIntensity >= secondaryIntensity ? 'primarily' : 'blend of'} {primaryConfig.name} style 
              with {secondaryIntensity}% {secondaryConfig.name} influence, combining{' '}
              {primaryConfig.description.toLowerCase()} with {secondaryConfig.description.toLowerCase()}.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Blend className="h-4 w-4" />
              Apply Mixed Style
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}