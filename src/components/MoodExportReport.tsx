import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  FileDown, 
  User, 
  TrendingUp, 
  BarChart3,
  PieChart,
  Printer
} from 'lucide-react';
import { 
  getAllCharacterTimelines, 
  calculateTimelineStatistics,
  detectMoodTransitions,
  getCategoryColor,
  CharacterMoodTimeline,
  TimelineStatistics
} from '@/lib/moodTimeline';
import { getEmotionById, MoodCategory } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';

interface MoodExportReportProps {
  trigger?: React.ReactNode;
}

export function MoodExportReport({ trigger }: MoodExportReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const timelines = useMemo(() => getAllCharacterTimelines(), [isOpen]);
  const hasData = timelines.length > 0 && timelines.some(t => t.snapshots.length > 0);

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="w-4 h-4" />
              Export Report
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Emotional Arc Report
            </DialogTitle>
          </DialogHeader>

          {!hasData ? (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No mood data to export. Generate panels with character moods first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Report includes emotional arcs for {timelines.length} character(s)
                </p>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </Button>
              </div>
              
              <Separator />
              
              {/* Preview */}
              <div ref={printRef} className="space-y-6">
                <ReportContent timelines={timelines} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-report, .print-report * {
            visibility: visible;
          }
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden printable version */}
      {showPreview && (
        <div className="print-report fixed inset-0 bg-background z-50 overflow-auto p-8">
          <Button 
            className="no-print fixed top-4 right-4" 
            variant="outline"
            onClick={() => setShowPreview(false)}
          >
            Close Preview
          </Button>
          <ReportContent timelines={timelines} isPrintMode />
        </div>
      )}
    </>
  );
}

interface ReportContentProps {
  timelines: CharacterMoodTimeline[];
  isPrintMode?: boolean;
}

function ReportContent({ timelines, isPrintMode }: ReportContentProps) {
  const allStats = useMemo(() => 
    timelines.map(t => calculateTimelineStatistics(t.characterName)),
    [timelines]
  );

  const overallStats = useMemo(() => {
    const categoryTotals: Record<MoodCategory, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      intense: 0
    };

    let totalTransitions = 0;
    let totalPanels = 0;

    timelines.forEach(timeline => {
      timeline.snapshots.forEach(snap => {
        if (snap.emotion) {
          categoryTotals[snap.emotion.category]++;
        }
        totalPanels++;
      });
      totalTransitions += detectMoodTransitions(timeline.characterName).length;
    });

    return { categoryTotals, totalTransitions, totalPanels };
  }, [timelines]);

  return (
    <div className={cn("space-y-8", isPrintMode && "text-black")}>
      {/* Header */}
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold mb-2">Character Emotional Arc Report</h1>
        <p className="text-muted-foreground">
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Overall Summary */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Overall Mood Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(overallStats.categoryTotals) as [MoodCategory, number][]).map(([category, count]) => (
            <Card key={category}>
              <CardContent className="pt-4 text-center">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: `${getCategoryColor(category)}20` }}
                >
                  <span 
                    className="text-xl font-bold"
                    style={{ color: getCategoryColor(category) }}
                  >
                    {count}
                  </span>
                </div>
                <p className="font-medium capitalize">{category}</p>
                <p className="text-xs text-muted-foreground">
                  {overallStats.totalPanels > 0 
                    ? Math.round((count / overallStats.totalPanels) * 100) 
                    : 0}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Panel Appearances</p>
              <p className="text-2xl font-bold">{overallStats.totalPanels}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Mood Transitions</p>
              <p className="text-2xl font-bold">{overallStats.totalTransitions}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Per-Character Stats */}
      <section className="page-break-before">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Character Emotional Journeys
        </h2>
        <div className="space-y-6">
          {timelines.map((timeline, index) => (
            <CharacterReportSection 
              key={timeline.characterName} 
              timeline={timeline}
              stats={allStats[index]}
            />
          ))}
        </div>
      </section>

      {/* Transitions Analysis */}
      <section className="page-break-before">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Emotional Transitions Detail
        </h2>
        <div className="space-y-4">
          {timelines.map(timeline => {
            const transitions = detectMoodTransitions(timeline.characterName);
            if (transitions.length === 0) return null;
            
            return (
              <Card key={timeline.characterName}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{timeline.characterName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transitions.map((t, i) => {
                      const fromEmotion = getEmotionById(t.fromMoodId);
                      const toEmotion = getEmotionById(t.toMoodId);
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            Panel {t.fromPanelId} → {t.toPanelId}
                          </Badge>
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: fromEmotion ? `${getCategoryColor(fromEmotion.category)}20` : undefined,
                              color: fromEmotion ? getCategoryColor(fromEmotion.category) : undefined
                            }}
                          >
                            {fromEmotion?.name || t.fromMoodId}
                          </span>
                          <span>→</span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: toEmotion ? `${getCategoryColor(toEmotion.category)}20` : undefined,
                              color: toEmotion ? getCategoryColor(toEmotion.category) : undefined
                            }}
                          >
                            {toEmotion?.name || t.toMoodId}
                          </span>
                          <Badge 
                            variant={t.intensity === 'dramatic' ? 'default' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {t.intensity}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface CharacterReportSectionProps {
  timeline: CharacterMoodTimeline;
  stats: TimelineStatistics;
}

function CharacterReportSection({ timeline, stats }: CharacterReportSectionProps) {
  const dominantEmotion = getEmotionById(stats.mostCommonMood);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-4 h-4" />
            {timeline.characterName}
          </CardTitle>
          <Badge variant="secondary">
            {timeline.snapshots.length} panels
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-secondary/30 rounded">
            <p className="text-xs text-muted-foreground">Most Common</p>
            <p className="font-medium">{dominantEmotion?.name || stats.mostCommonMood}</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded">
            <p className="text-xs text-muted-foreground">Transitions</p>
            <p className="font-medium">{stats.transitionCount}</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded">
            <p className="text-xs text-muted-foreground">Avg Intensity</p>
            <p className="font-medium">{stats.averageIntensity.toFixed(1)}/3</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded">
            <p className="text-xs text-muted-foreground">Emotional Range</p>
            <p className="font-medium">{stats.emotionalRange.min} - {stats.emotionalRange.max}</p>
          </div>
        </div>

        {/* Mood Distribution Bar */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Mood Distribution</p>
          <div className="flex gap-1 h-6 rounded overflow-hidden">
            {Object.entries(stats.moodDistribution).map(([moodId, count]) => {
              const emotion = getEmotionById(moodId);
              const percentage = (count / timeline.snapshots.length) * 100;
              return (
                <div
                  key={moodId}
                  className="relative group"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: emotion ? getCategoryColor(emotion.category) : 'hsl(var(--muted))',
                    minWidth: count > 0 ? '20px' : 0
                  }}
                  title={`${emotion?.name || moodId}: ${count} (${Math.round(percentage)}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(stats.moodDistribution).map(([moodId, count]) => {
              const emotion = getEmotionById(moodId);
              return (
                <span key={moodId} className="flex items-center gap-1 text-xs">
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: emotion ? getCategoryColor(emotion.category) : 'hsl(var(--muted))' }}
                  />
                  {emotion?.name || moodId}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Timeline Preview */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Emotional Journey</p>
          <div className="flex items-center gap-1 flex-wrap">
            {timeline.snapshots.map((snap, i) => (
              <div
                key={snap.panelId}
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium"
                style={{ 
                  backgroundColor: snap.emotion ? `${getCategoryColor(snap.emotion.category)}30` : 'hsl(var(--muted))',
                  color: snap.emotion ? getCategoryColor(snap.emotion.category) : undefined
                }}
                title={`P${snap.pageNumber}.${snap.panelIndex + 1}: ${snap.emotion?.name || snap.moodId}`}
              >
                {snap.panelIndex + 1}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
