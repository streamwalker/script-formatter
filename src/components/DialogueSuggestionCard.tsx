import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Check, Plus } from 'lucide-react';
import { DialogueSuggestion, getEmotionIcon } from '@/lib/dialogueGenerator';

interface DialogueSuggestionCardProps {
  suggestion: DialogueSuggestion;
  isSelected: boolean;
  onClick: () => void;
  onUse: () => void;
}

export function DialogueSuggestionCard({
  suggestion,
  isSelected,
  onClick,
  onUse,
}: DialogueSuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${suggestion.speaker}: "${suggestion.dialogue}"`);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Speaker and Emotion */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{suggestion.speaker}</span>
            <Badge variant="outline" className="text-xs">
              {getEmotionIcon(suggestion.emotion)} {suggestion.emotion}
            </Badge>
          </div>
          
          {/* Dialogue */}
          <p className="text-sm text-foreground/90 leading-relaxed">
            "{suggestion.dialogue}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
