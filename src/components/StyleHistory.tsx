import { useState, useEffect } from 'react';
import { History, TrendingUp, Trash2, Blend } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtStyle, getStyleById, StyleMix, generateMixedStylePrompt } from '@/lib/artStyles';
import {
  StyleHistoryEntry,
  getStyleHistory,
  getMostUsedStyles,
  clearStyleHistory,
} from '@/lib/styleHistory';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StyleHistoryProps {
  onSelectStyle: (style: ArtStyle) => void;
  onSelectMix: (mix: StyleMix, promptModifier: string) => void;
  disabled?: boolean;
}

export function StyleHistory({
  onSelectStyle,
  onSelectMix,
  disabled,
}: StyleHistoryProps) {
  const [recentHistory, setRecentHistory] = useState<StyleHistoryEntry[]>([]);
  const [mostUsed, setMostUsed] = useState<StyleHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        const [recent, frequent] = await Promise.all([
          getStyleHistory(8),
          getMostUsedStyles(5),
        ]);
        setRecentHistory(recent);
        setMostUsed(frequent);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleSelect = (entry: StyleHistoryEntry) => {
    if (entry.isMix && entry.primaryStyle && entry.secondaryStyle) {
      const mix: StyleMix = {
        primaryStyle: entry.primaryStyle as ArtStyle,
        secondaryStyle: entry.secondaryStyle as ArtStyle,
        primaryIntensity: entry.primaryIntensity || 70,
        secondaryIntensity: entry.secondaryIntensity || 30,
      };
      onSelectMix(mix, generateMixedStylePrompt(mix));
    } else if (entry.styleId) {
      onSelectStyle(entry.styleId as ArtStyle);
    }
  };

  const handleClearHistory = async () => {
    const success = await clearStyleHistory();
    if (success) {
      setRecentHistory([]);
      setMostUsed([]);
      toast.success('History cleared');
    } else {
      toast.error('Failed to clear history');
    }
  };

  if (isLoading) return null;
  if (!isAuthenticated) return null;
  if (recentHistory.length === 0 && mostUsed.length === 0) return null;

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Style History</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="recent" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="frequent" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Most Used
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-2">
          <div className="flex flex-wrap gap-2">
            {recentHistory.map(entry => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onSelect={() => handleSelect(entry)}
                disabled={disabled}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="frequent" className="mt-2">
          <div className="flex flex-wrap gap-2">
            {mostUsed.map(entry => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onSelect={() => handleSelect(entry)}
                disabled={disabled}
                showCount
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface HistoryCardProps {
  entry: StyleHistoryEntry;
  onSelect: () => void;
  disabled?: boolean;
  showCount?: boolean;
}

function HistoryCard({ entry, onSelect, disabled, showCount }: HistoryCardProps) {
  const style = entry.styleId ? getStyleById(entry.styleId as ArtStyle) : null;
  const primaryStyle = entry.primaryStyle ? getStyleById(entry.primaryStyle as ArtStyle) : null;
  const secondaryStyle = entry.secondaryStyle ? getStyleById(entry.secondaryStyle as ArtStyle) : null;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        'hover:border-primary/50 hover:bg-primary/5',
        entry.isMix
          ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30'
          : 'bg-secondary/30 border-border',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {entry.isMix ? (
        <>
          <Blend className="h-4 w-4 text-primary" />
          <span className="text-xs">
            {primaryStyle?.name} + {secondaryStyle?.name}
          </span>
        </>
      ) : (
        <>
          <span className="text-lg">{style?.preview}</span>
          <span className="text-xs">{style?.name}</span>
        </>
      )}
      {showCount && (
        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          {entry.useCount}×
        </span>
      )}
    </button>
  );
}
