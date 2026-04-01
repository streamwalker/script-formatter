import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, 
  User, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink
} from 'lucide-react';
import { 
  getAllCharacterTimelines, 
  detectMoodTransitions,
  calculateTimelineStatistics,
  getCategoryColor,
  CharacterMoodTimeline,
  MoodTransition
} from '@/lib/moodTimeline';
import { getEmotionById } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';

interface MoodHistoryPanelProps {
  onNavigateToPanel?: (panelId: number) => void;
  trigger?: React.ReactNode;
}

export function MoodHistoryPanel({ onNavigateToPanel, trigger }: MoodHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');

  const timelines = useMemo(() => getAllCharacterTimelines(), [isOpen]);
  const characterNames = useMemo(() => timelines.map(t => t.characterName), [timelines]);

  const filteredTimelines = useMemo(() => {
    if (selectedCharacter === 'all') return timelines;
    return timelines.filter(t => t.characterName === selectedCharacter);
  }, [timelines, selectedCharacter]);

  const allTransitions = useMemo(() => {
    const transitions: (MoodTransition & { timestamp?: number })[] = [];
    filteredTimelines.forEach(t => {
      transitions.push(...detectMoodTransitions(t.characterName));
    });
    return transitions;
  }, [filteredTimelines]);

  const hasData = timelines.length > 0 && timelines.some(t => t.snapshots.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" />
            Mood History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Character Mood History
          </DialogTitle>
        </DialogHeader>

        {!hasData ? (
          <div className="py-12 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No mood history yet. Generate panels with character moods to track their emotional journey.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Character Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filter by character:</span>
              <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Characters</SelectItem>
                  {characterNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timeline View */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 pr-4">
                {filteredTimelines.map(timeline => (
                  <CharacterHistorySection
                    key={timeline.characterName}
                    timeline={timeline}
                    onNavigateToPanel={onNavigateToPanel}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Transitions Summary */}
            {allTransitions.length > 0 && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Emotional Transitions ({allTransitions.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTransitions.slice(0, 6).map((t, i) => {
                    const fromEmotion = getEmotionById(t.fromMoodId);
                    const toEmotion = getEmotionById(t.toMoodId);
                    return (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className={cn(
                          'text-xs gap-1 cursor-pointer hover:bg-secondary',
                          t.intensity === 'dramatic' && 'border-accent'
                        )}
                        onClick={() => onNavigateToPanel?.(t.toPanelId)}
                      >
                        <span className="text-muted-foreground">{t.characterName}:</span>
                        {fromEmotion?.name || t.fromMoodId}
                        <ArrowRight className="w-3 h-3" />
                        {toEmotion?.name || t.toMoodId}
                      </Badge>
                    );
                  })}
                  {allTransitions.length > 6 && (
                    <Badge variant="secondary" className="text-xs">
                      +{allTransitions.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CharacterHistorySectionProps {
  timeline: CharacterMoodTimeline;
  onNavigateToPanel?: (panelId: number) => void;
}

function CharacterHistorySection({ timeline, onNavigateToPanel }: CharacterHistorySectionProps) {
  const stats = useMemo(() => calculateTimelineStatistics(timeline.characterName), [timeline]);
  const transitions = useMemo(() => detectMoodTransitions(timeline.characterName), [timeline]);

  const getTransitionIcon = (index: number) => {
    if (index === 0) return null;
    
    const prevSnapshot = timeline.snapshots[index - 1];
    const currSnapshot = timeline.snapshots[index];
    
    if (!prevSnapshot.emotion || !currSnapshot.emotion) return <Minus className="w-3 h-3 text-muted-foreground" />;
    
    if (currSnapshot.emotion.intensity > prevSnapshot.emotion.intensity) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    } else if (currSnapshot.emotion.intensity < prevSnapshot.emotion.intensity) {
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    }
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3">
      {/* Character Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{timeline.characterName}</span>
          <Badge variant="secondary" className="text-xs">
            {timeline.snapshots.length} panels
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Most common: {getEmotionById(stats.mostCommonMood)?.name || stats.mostCommonMood}</span>
          <span>•</span>
          <span>{transitions.length} transitions</span>
        </div>
      </div>

      {/* Mood Timeline */}
      <div className="relative pl-4 border-l-2 border-border space-y-2">
        {timeline.snapshots.map((snapshot, index) => {
          const emotion = snapshot.emotion;
          const isTransition = index > 0 && timeline.snapshots[index - 1].moodId !== snapshot.moodId;

          return (
            <div
              key={snapshot.panelId}
              className={cn(
                'relative flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-secondary/50',
                isTransition && 'bg-accent/10'
              )}
              onClick={() => onNavigateToPanel?.(snapshot.panelId)}
            >
              {/* Timeline dot */}
              <div 
                className={cn(
                  'absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background',
                  isTransition && 'ring-2 ring-accent ring-offset-1 ring-offset-background'
                )}
                style={{ 
                  backgroundColor: emotion ? getCategoryColor(emotion.category) : 'hsl(var(--muted))'
                }}
              />

              {/* Panel info */}
              <div className="flex items-center gap-2 min-w-[80px]">
                <Badge variant="outline" className="text-xs">
                  P{snapshot.pageNumber}.{snapshot.panelIndex + 1}
                </Badge>
                {getTransitionIcon(index)}
              </div>

              {/* Mood info */}
              <div className="flex-1 flex items-center gap-2">
                <Badge 
                  className="text-xs"
                  style={{ 
                    backgroundColor: emotion ? `${getCategoryColor(emotion.category)}20` : undefined,
                    color: emotion ? getCategoryColor(emotion.category) : undefined,
                    borderColor: emotion ? getCategoryColor(emotion.category) : undefined
                  }}
                >
                  {emotion?.name || snapshot.moodId}
                </Badge>
                {emotion && (
                  <span className="text-xs text-muted-foreground">
                    {emotion.expressionKeywords.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>

              {/* Navigate button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
