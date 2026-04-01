import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Wand2, CheckCircle, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface GenerationPhase {
  id: string;
  label: string;
  duration: number;
  icon: string;
}

const GENERATION_PHASES: GenerationPhase[] = [
  { id: 'analyzing', label: 'Analyzing prompt...', duration: 1500, icon: '🔍' },
  { id: 'consistency', label: 'Applying character consistency...', duration: 2000, icon: '🎭' },
  { id: 'rendering', label: 'Rendering panel...', duration: 3000, icon: '🎨' },
  { id: 'finalizing', label: 'Finalizing image...', duration: 1500, icon: '✨' },
];

interface GenerationProgressOverlayProps {
  isGenerating: boolean;
  panelId?: number;
  onComplete?: () => void;
  className?: string;
}

export function GenerationProgressOverlay({
  isGenerating,
  panelId,
  onComplete,
  className,
}: GenerationProgressOverlayProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [prevPhaseIndex, setPrevPhaseIndex] = useState(-1);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentPhaseIndex(0);
      setPhaseProgress(0);
      setIsComplete(false);
      setPrevPhaseIndex(-1);
      return;
    }

    let phaseIndex = 0;
    let progress = 0;
    const intervalId = setInterval(() => {
      progress += 2;
      setPhaseProgress(progress);

      if (progress >= 100) {
        progress = 0;
        setPrevPhaseIndex(phaseIndex);
        phaseIndex++;
        if (phaseIndex >= GENERATION_PHASES.length) {
          clearInterval(intervalId);
          setIsComplete(true);
          onComplete?.();
        } else {
          setCurrentPhaseIndex(phaseIndex);
          setPhaseProgress(0);
        }
      }
    }, GENERATION_PHASES[phaseIndex]?.duration / 50 || 50);

    return () => clearInterval(intervalId);
  }, [isGenerating, onComplete]);

  if (!isGenerating && !isComplete) return null;

  const currentPhase = GENERATION_PHASES[currentPhaseIndex];
  const overallProgress = ((currentPhaseIndex / GENERATION_PHASES.length) * 100) + 
    (phaseProgress / GENERATION_PHASES.length);

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center',
        'bg-background/90 backdrop-blur-md rounded-lg',
        'animate-fade-in',
        className
      )}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div 
          className={cn(
            "absolute inset-0 opacity-20",
            "bg-gradient-to-br from-primary via-accent to-primary",
            "animate-pulse"
          )} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative text-center space-y-5 p-8">
        {isComplete ? (
          <div className="animate-scale-in">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full bg-green-500/30 animate-ping"
                style={{ animationDuration: '1s' }}
              />
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto relative z-10" />
            </div>
            <p className="text-lg font-semibold text-green-500 mt-4 animate-fade-in">
              Generation complete!
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {['✨', '🎉', '✨'].map((emoji, i) => (
                <span 
                  key={i} 
                  className="text-xl animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Animated loader with sparkles */}
            <div className="relative inline-block">
              <div 
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                style={{ 
                  transform: 'scale(1.5)',
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
              <Loader2 className="h-14 w-14 text-primary animate-spin mx-auto" />
              <Sparkles 
                className="h-5 w-5 text-accent absolute -top-2 -right-2" 
                style={{ animation: 'pulse 1s ease-in-out infinite' }}
              />
              <Sparkles 
                className="h-4 w-4 text-primary absolute -bottom-1 -left-1" 
                style={{ animation: 'pulse 1.5s ease-in-out infinite 0.5s' }}
              />
            </div>
            
            {/* Phase label with animated transition */}
            <div className="space-y-2 min-h-[60px]">
              <div 
                key={currentPhase?.id}
                className="animate-fade-in"
              >
                <p className="text-base font-semibold text-foreground flex items-center gap-2 justify-center">
                  <span className="text-xl">{currentPhase?.icon}</span>
                  <Wand2 className="h-4 w-4 text-primary" />
                  {currentPhase?.label || 'Processing...'}
                </p>
              </div>
              
              {panelId !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Panel {panelId}
                </p>
              )}
            </div>

            {/* Enhanced progress bar */}
            <div className="w-56 space-y-2">
              <div className="relative">
                <Progress 
                  value={overallProgress} 
                  className="h-3 bg-secondary/50"
                />
                <div 
                  className="absolute top-0 left-0 h-full rounded-full opacity-50 blur-sm"
                  style={{
                    width: `${overallProgress}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                    transition: 'width 0.3s ease-out',
                  }}
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                {Math.round(overallProgress)}% complete
              </p>
            </div>

            {/* Enhanced phase indicators */}
            <div className="flex justify-center items-center gap-2 mt-4">
              {GENERATION_PHASES.map((phase, idx) => {
                const isCompleted = idx < currentPhaseIndex;
                const isCurrent = idx === currentPhaseIndex;
                
                return (
                  <div key={phase.id} className="flex items-center">
                    <div
                      className={cn(
                        'relative flex items-center justify-center transition-all duration-300',
                        isCompleted || isCurrent ? 'scale-100' : 'scale-90 opacity-50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300',
                          isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : isCurrent
                            ? 'bg-primary/30 text-primary border-2 border-primary animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 animate-scale-in" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      {isCurrent && (
                        <div 
                          className="absolute inset-0 rounded-full border-2 border-primary/50"
                          style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                        />
                      )}
                    </div>
                    {idx < GENERATION_PHASES.length - 1 && (
                      <div 
                        className={cn(
                          'w-6 h-0.5 mx-1 transition-all duration-300',
                          idx < currentPhaseIndex ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Phase names below indicators */}
            <div className="flex justify-center gap-2 text-xs text-muted-foreground mt-1">
              {GENERATION_PHASES.map((phase, idx) => (
                <span 
                  key={phase.id}
                  className={cn(
                    'w-8 text-center truncate transition-colors',
                    idx === currentPhaseIndex && 'text-primary font-medium'
                  )}
                  title={phase.label}
                >
                  {phase.icon}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}