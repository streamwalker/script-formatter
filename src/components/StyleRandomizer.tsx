import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dices, RefreshCw, Sparkles, Star } from 'lucide-react';
import { StyleMix, getStyleById } from '@/lib/artStyles';
import { StoryGenre } from '@/lib/styleRecommendations';
import { 
  RandomizerMode, 
  RandomizedResult, 
  randomizeStyle, 
  getRandomizerModes 
} from '@/lib/styleRandomizer';

interface StyleRandomizerProps {
  onApplyRandom: (mix: StyleMix, promptModifier: string) => void;
  disabled?: boolean;
  genre?: StoryGenre;
}

export function StyleRandomizer({ onApplyRandom, disabled, genre }: StyleRandomizerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RandomizerMode>('complementary');
  const [result, setResult] = useState<RandomizedResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const modes = getRandomizerModes();
  
  const handleRandomize = useCallback(() => {
    setIsAnimating(true);
    
    // Quick animation effect
    let count = 0;
    const interval = setInterval(() => {
      setResult(randomizeStyle({ mode, genre }));
      count++;
      if (count >= 8) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 100);
  }, [mode, genre]);
  
  const handleApply = () => {
    if (result) {
      onApplyRandom(result.mix, result.promptModifier);
      setOpen(false);
    }
  };
  
  const primaryConfig = result ? getStyleById(result.mix.primaryStyle) : null;
  const secondaryConfig = result ? getStyleById(result.mix.secondaryStyle) : null;
  
  const renderStars = (score: number) => {
    const fullStars = Math.floor(score / 20);
    const hasHalf = score % 20 >= 10;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars 
                ? 'fill-yellow-400 text-yellow-400' 
                : i === fullStars && hasHalf 
                  ? 'fill-yellow-400/50 text-yellow-400' 
                  : 'text-muted-foreground'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({score}%)</span>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Dices className="h-4 w-4" />
          Randomize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dices className="h-5 w-5" />
            Style Randomizer
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Randomization Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as RandomizerMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modes.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Randomize Button */}
          <Button 
            onClick={handleRandomize} 
            size="lg" 
            className="w-full gap-2"
            disabled={isAnimating}
          >
            <Dices className={`h-5 w-5 ${isAnimating ? 'animate-spin' : ''}`} />
            {isAnimating ? 'Mixing...' : 'Randomize!'}
          </Button>
          
          {/* Result Display */}
          {result && (
            <div className={`space-y-4 p-4 border rounded-lg ${isAnimating ? 'opacity-50' : ''}`}>
              {/* Style Blend Visualization */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-4xl mb-1">{primaryConfig?.preview}</div>
                  <div className="text-sm font-medium">{primaryConfig?.name}</div>
                  <Badge variant="secondary">{result.mix.primaryIntensity}%</Badge>
                </div>
                
                <div className="text-2xl text-muted-foreground">⟷</div>
                
                <div className="text-center">
                  <div className="text-4xl mb-1">{secondaryConfig?.preview}</div>
                  <div className="text-sm font-medium">{secondaryConfig?.name}</div>
                  <Badge variant="secondary">{result.mix.secondaryIntensity}%</Badge>
                </div>
              </div>
              
              {/* Blend Bar */}
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                <div 
                  className="bg-primary h-full transition-all duration-300" 
                  style={{ width: `${result.mix.primaryIntensity}%` }} 
                />
                <div 
                  className="bg-secondary h-full transition-all duration-300" 
                  style={{ width: `${result.mix.secondaryIntensity}%` }} 
                />
              </div>
              
              {/* Fun Fact */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Sparkles className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                <p className="text-sm italic">{result.funFact}</p>
              </div>
              
              {/* Compatibility Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compatibility:</span>
                {renderStars(result.compatibilityScore)}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRandomize}
                  disabled={isAnimating}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-roll
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={isAnimating}
                  className="flex-1 gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply Style
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
