import { AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MoodConflict {
  characterName: string;
  conflict: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface MoodConflictWarningProps {
  conflicts: MoodConflict[];
  className?: string;
}

const SEVERITY_CONFIG = {
  low: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  medium: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  high: { color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

export function MoodConflictWarning({ conflicts, className }: MoodConflictWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  const highestSeverity = conflicts.reduce((acc, c) => {
    if (c.severity === 'high') return 'high';
    if (c.severity === 'medium' && acc !== 'high') return 'medium';
    return acc;
  }, 'low' as 'low' | 'medium' | 'high');

  const config = SEVERITY_CONFIG[highestSeverity];

  return (
    <div className={cn(
      'rounded-lg border p-3',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('w-4 h-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>
            {conflicts.length} Mood Conflict{conflicts.length > 1 ? 's' : ''} Detected
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {conflicts.map((conflict, index) => (
            <div 
              key={index}
              className="bg-background/50 rounded-md p-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {conflict.characterName}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', SEVERITY_CONFIG[conflict.severity].color)}
                >
                  {conflict.severity}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-1">{conflict.conflict}</p>
              <div className="flex items-start gap-1 text-muted-foreground">
                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{conflict.suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
