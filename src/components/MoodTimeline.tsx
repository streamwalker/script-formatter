import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { 
  Activity, 
  TrendingUp,
  ArrowRight,
  User,
  Play,
  Pause,
  RotateCcw,
  FastForward
} from 'lucide-react';
import { 
  getAllCharacterTimelines, 
  calculateTimelineStatistics,
  getCategoryColor,
  getIntensityOpacity,
  CharacterMoodTimeline,
  TimelineStatistics
} from '@/lib/moodTimeline';
import { getEmotionById } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';

interface MoodTimelineProps {
  onNavigateToPanel?: (panelId: number) => void;
  trigger?: React.ReactNode;
}

export function MoodTimeline({ onNavigateToPanel, trigger }: MoodTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const timelines = useMemo(() => getAllCharacterTimelines(), [isOpen]);
  const statistics = useMemo(() => 
    timelines.map(t => calculateTimelineStatistics(t.characterName)),
    [timelines]
  );

  // Get all unique panels for x-axis
  const allPanels = useMemo(() => {
    const panels = new Map<number, { pageNumber: number; panelIndex: number }>();
    timelines.forEach(t => {
      t.snapshots.forEach(s => {
        if (!panels.has(s.panelId)) {
          panels.set(s.panelId, { pageNumber: s.pageNumber, panelIndex: s.panelIndex });
        }
      });
    });
    return Array.from(panels.entries())
      .sort((a, b) => {
        if (a[1].pageNumber !== b[1].pageNumber) return a[1].pageNumber - b[1].pageNumber;
        return a[1].panelIndex - b[1].panelIndex;
      });
  }, [timelines]);

  const hasData = timelines.length > 0 && timelines.some(t => t.snapshots.length > 0);

  // Playback controls
  useEffect(() => {
    if (isPlaying && allPanels.length > 0) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentPlaybackIndex(prev => {
          const next = prev + 1;
          if (next >= allPanels.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1500 / playbackSpeed);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
    
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, allPanels.length]);

  // Auto-scroll during playback
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const nodeWidth = 40; // w-6 + gap
      const scrollPosition = currentPlaybackIndex * nodeWidth - 200;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [currentPlaybackIndex, isPlaying]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPlaybackIndex(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Activity className="w-4 h-4" />
            Mood Timeline
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Character Mood Timeline
          </DialogTitle>
        </DialogHeader>

        {!hasData ? (
          <div className="py-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No mood data yet. Generate panels with character moods to see the timeline.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Playback Controls */}
            <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <Button variant="outline" size="sm" onClick={handlePause} className="gap-1">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handlePlay} className="gap-1">
                    <Play className="w-4 h-4" />
                    Play
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <FastForward className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={([v]) => setPlaybackSpeed(v)}
                  min={0.5}
                  max={3}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">{playbackSpeed}x</span>
              </div>
              
              <Badge variant="secondary" className="ml-auto">
                Panel {currentPlaybackIndex + 1} / {allPanels.length}
              </Badge>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor('positive') }} />
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor('negative') }} />
                <span>Negative</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor('neutral') }} />
                <span>Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor('intense') }} />
                <span>Intense</span>
              </div>
            </div>

            {/* Timeline Visualization */}
            <ScrollArea className="w-full">
              <div ref={scrollContainerRef} className="min-w-[600px] pb-4">
                {/* X-Axis Labels */}
                <div className="flex ml-32 mb-2">
                  {allPanels.map(([panelId, info], index) => (
                    <div 
                      key={panelId} 
                      className={cn(
                        'w-10 text-center text-xs flex-shrink-0 transition-all duration-300',
                        index === currentPlaybackIndex 
                          ? 'text-primary font-bold scale-110' 
                          : 'text-muted-foreground'
                      )}
                    >
                      P{info.pageNumber}.{info.panelIndex + 1}
                    </div>
                  ))}
                </div>

                {/* Character Lanes */}
                {timelines.map(timeline => (
                  <TimelineLane 
                    key={timeline.characterName}
                    timeline={timeline}
                    allPanels={allPanels}
                    onNavigateToPanel={onNavigateToPanel}
                    currentPlaybackIndex={currentPlaybackIndex}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statistics.map(stat => (
                <StatisticsCard key={stat.characterName} stats={stat} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TimelineLaneProps {
  timeline: CharacterMoodTimeline;
  allPanels: [number, { pageNumber: number; panelIndex: number }][];
  onNavigateToPanel?: (panelId: number) => void;
  currentPlaybackIndex: number;
  isPlaying: boolean;
}

function TimelineLane({ timeline, allPanels, onNavigateToPanel, currentPlaybackIndex, isPlaying }: TimelineLaneProps) {
  const moodByPanel = useMemo(() => {
    const map = new Map<number, { moodId: string; emotion: typeof timeline.snapshots[0]['emotion'] }>();
    timeline.snapshots.forEach(s => {
      map.set(s.panelId, { moodId: s.moodId, emotion: s.emotion });
    });
    return map;
  }, [timeline]);

  return (
    <div className="flex items-center mb-3">
      {/* Character Name */}
      <div className="w-32 pr-3 flex items-center gap-2 flex-shrink-0">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{timeline.characterName}</span>
      </div>

      {/* Mood Nodes */}
      <div className="flex items-center">
        {allPanels.map(([panelId], index) => {
          const moodData = moodByPanel.get(panelId);
          const prevPanelId = index > 0 ? allPanels[index - 1][0] : null;
          const prevMoodData = prevPanelId ? moodByPanel.get(prevPanelId) : null;
          const hasTransition = prevMoodData && moodData && prevMoodData.moodId !== moodData.moodId;
          const isActive = index === currentPlaybackIndex;
          const isPast = index < currentPlaybackIndex;

          return (
            <div key={panelId} className="flex items-center">
              {/* Transition line */}
              {index > 0 && (
                <div 
                  className={cn(
                    'w-4 h-0.5 transition-all duration-500',
                    hasTransition 
                      ? isPast || isActive 
                        ? 'bg-accent animate-pulse' 
                        : 'bg-accent/50'
                      : isPast || isActive 
                        ? 'bg-primary/50' 
                        : 'bg-border'
                  )}
                  style={{
                    height: hasTransition ? '3px' : '2px',
                  }}
                />
              )}
              
              {/* Mood Node */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'w-6 h-6 rounded-full border-2 border-background transition-all duration-300',
                        moodData ? 'cursor-pointer' : 'cursor-default',
                        isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background animate-mood-pulse',
                        isActive && hasTransition && 'animate-mood-glow'
                      )}
                      style={{
                        backgroundColor: moodData?.emotion 
                          ? getCategoryColor(moodData.emotion.category)
                          : 'hsl(var(--muted))',
                        opacity: moodData?.emotion 
                          ? getIntensityOpacity(moodData.emotion.intensity)
                          : 0.3,
                        transform: isActive ? 'scale(1.4)' : isPast ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isActive && moodData?.emotion 
                          ? `0 0 20px ${getCategoryColor(moodData.emotion.category)}` 
                          : 'none',
                      }}
                      onClick={() => moodData && onNavigateToPanel?.(panelId)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {moodData?.emotion ? (
                      <div className="text-xs">
                        <p className="font-medium">{moodData.emotion.name}</p>
                        <p className="text-muted-foreground">{moodData.emotion.expressionKeywords.slice(0, 2).join(', ')}</p>
                      </div>
                    ) : (
                      <span className="text-xs">No mood set</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatisticsCardProps {
  stats: TimelineStatistics;
}

function StatisticsCard({ stats }: StatisticsCardProps) {
  const mostCommonEmotion = getEmotionById(stats.mostCommonMood);

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{stats.characterName}</span>
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Most common:</span>
          <Badge variant="secondary" className="text-xs">
            {mostCommonEmotion?.name || stats.mostCommonMood}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transitions:</span>
          <span>{stats.transitionCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg intensity:</span>
          <span>{stats.averageIntensity.toFixed(1)}/3</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Range:</span>
          <span className="flex items-center gap-1">
            {stats.emotionalRange.min} <ArrowRight className="w-3 h-3" /> {stats.emotionalRange.max}
          </span>
        </div>
      </div>
    </div>
  );
}
