import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Clapperboard, Tv, Film, Theater, Wand2 } from 'lucide-react';
import type { StoryFormatDefault } from '@/lib/storyPlanData';

interface PortFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (formatFields: Record<string, string>) => void;
  storyTitle: string;
  defaultFormat?: StoryFormatDefault;
}

export const PortFormatDialog = ({ open, onOpenChange, onConfirm, storyTitle, defaultFormat }: PortFormatDialogProps) => {
  const [medium, setMedium] = useState('');
  const [comicPages, setComicPages] = useState('');
  const [comicIssues, setComicIssues] = useState('');
  const [tvEpLength, setTvEpLength] = useState('');
  const [tvSeriesEpLength, setTvSeriesEpLength] = useState('');
  const [tvSeriesEpisodes, setTvSeriesEpisodes] = useState('');
  const [filmLength, setFilmLength] = useState('');
  const [stageActs, setStageActs] = useState('');
  const [stageRuntime, setStageRuntime] = useState('');

  // Apply defaults when dialog opens
  useEffect(() => {
    if (open && defaultFormat) {
      setMedium(defaultFormat.medium);
      const cfg = defaultFormat.config || {};
      setComicPages(cfg._comic_pages || '');
      setComicIssues(cfg._comic_issues || '');
      setTvEpLength(cfg._tv_ep_length || '');
      setTvSeriesEpLength(cfg._tv_series_ep_length || '');
      setTvSeriesEpisodes(cfg._tv_series_episodes || '');
      setFilmLength(cfg._film_length || '');
      setStageActs(cfg._stage_acts || '');
      setStageRuntime(cfg._stage_runtime || '');
    }
  }, [open, defaultFormat]);

  const handleConfirm = () => {
    const fields: Record<string, string> = { _medium: medium };
    if (medium === 'comic') {
      if (comicPages) fields._comic_pages = comicPages;
      if (comicIssues) fields._comic_issues = comicIssues;
    } else if (medium === 'tv_episode') {
      if (tvEpLength) fields._tv_ep_length = tvEpLength;
    } else if (medium === 'tv_series') {
      if (tvSeriesEpLength) fields._tv_series_ep_length = tvSeriesEpLength;
      if (tvSeriesEpisodes) fields._tv_series_episodes = tvSeriesEpisodes;
    } else if (medium === 'film') {
      if (filmLength) fields._film_length = filmLength;
    } else if (medium === 'stage_play') {
      if (stageActs) fields._stage_acts = stageActs;
      if (stageRuntime) fields._stage_runtime = stageRuntime;
    }
    onConfirm(fields);
  };

  const mediums = [
    { value: 'comic', label: 'Comic Book', icon: <Clapperboard className="h-4 w-4" /> },
    { value: 'tv_episode', label: 'TV Episode', icon: <Tv className="h-4 w-4" /> },
    { value: 'tv_series', label: 'TV Series', icon: <Tv className="h-4 w-4" /> },
    { value: 'film', label: 'Feature Film', icon: <Film className="h-4 w-4" /> },
    { value: 'stage_play', label: 'Stage Play', icon: <Theater className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Format & Medium</DialogTitle>
          <DialogDescription>
            Select a medium for "{storyTitle}" before porting into the Narrative Engine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Medium selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Medium</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mediums.map(m => (
                <Button
                  key={m.value}
                  variant={medium === m.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => setMedium(m.value)}
                >
                  {m.icon} {m.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Comic Book options */}
          {medium === 'comic' && (
            <div className="space-y-4 pl-2 border-l-2 border-accent/20">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Pages Per Issue</label>
                <div className="flex gap-2">
                  {['20', '32'].map(v => (
                    <Button key={v} variant={comicPages === v ? 'default' : 'outline'} size="sm" onClick={() => setComicPages(v)}>
                      {v} Pages
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Series Format</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '4', label: '4-Issue Mini' },
                    { value: '6', label: '6-Issue Mini' },
                    { value: '8', label: '8-Issue Mini' },
                    { value: '12', label: '12-Issue Mini' },
                  ].map(v => (
                    <Button key={v.value} variant={comicIssues === v.value ? 'default' : 'outline'} size="sm" onClick={() => setComicIssues(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              {comicPages && comicIssues && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Pacing Summary</p>
                  <p className="text-xs text-muted-foreground">
                    {comicIssues}-issue series × {comicPages} pages = <span className="text-primary font-semibold">{parseInt(comicIssues) * parseInt(comicPages)} total pages</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Act I: Issues 1–{Math.ceil(parseInt(comicIssues) * 0.25)} &nbsp;|&nbsp;
                    Act II: Issues {Math.ceil(parseInt(comicIssues) * 0.25) + 1}–{Math.ceil(parseInt(comicIssues) * 0.75)} &nbsp;|&nbsp;
                    Act III: Issues {Math.ceil(parseInt(comicIssues) * 0.75) + 1}–{comicIssues}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TV Episode options */}
          {medium === 'tv_episode' && (
            <div className="space-y-4 pl-2 border-l-2 border-accent/20">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Episode Length</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '22', label: '22 min (Half-hour)' },
                    { value: '30', label: '30 min (Streaming)' },
                    { value: '44', label: '44 min (Hour Drama)' },
                    { value: '60', label: '60 min (Premium)' },
                  ].map(v => (
                    <Button key={v.value} variant={tvEpLength === v.value ? 'default' : 'outline'} size="sm" onClick={() => setTvEpLength(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              {tvEpLength && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Pacing Summary</p>
                  <p className="text-xs text-muted-foreground">
                    ~1 script page per minute = <span className="text-primary font-semibold">~{tvEpLength} script pages</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Act I: ~{Math.round(parseInt(tvEpLength) * 0.25)} min &nbsp;|&nbsp;
                    Act II: ~{Math.round(parseInt(tvEpLength) * 0.5)} min &nbsp;|&nbsp;
                    Act III: ~{Math.round(parseInt(tvEpLength) * 0.25)} min
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TV Series options */}
          {medium === 'tv_series' && (
            <div className="space-y-4 pl-2 border-l-2 border-accent/20">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Episode Length</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '22', label: '22 min' },
                    { value: '30', label: '30 min' },
                    { value: '44', label: '44 min' },
                    { value: '60', label: '60 min' },
                  ].map(v => (
                    <Button key={v.value} variant={tvSeriesEpLength === v.value ? 'default' : 'outline'} size="sm" onClick={() => setTvSeriesEpLength(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Episodes Per Season</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '6', label: '6 Episodes' },
                    { value: '8', label: '8 Episodes' },
                    { value: '10', label: '10 Episodes' },
                    { value: '13', label: '13 Episodes' },
                    { value: '22', label: '22 Episodes' },
                  ].map(v => (
                    <Button key={v.value} variant={tvSeriesEpisodes === v.value ? 'default' : 'outline'} size="sm" onClick={() => setTvSeriesEpisodes(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              {tvSeriesEpisodes && tvSeriesEpLength && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Season Pacing</p>
                  <p className="text-xs text-muted-foreground">
                    {tvSeriesEpisodes} episodes × {tvSeriesEpLength} min = <span className="text-primary font-semibold">{parseInt(tvSeriesEpisodes) * parseInt(tvSeriesEpLength)} total minutes</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Setup (Eps 1–{Math.ceil(parseInt(tvSeriesEpisodes) * 0.25)}) &nbsp;|&nbsp;
                    Escalation (Eps {Math.ceil(parseInt(tvSeriesEpisodes) * 0.25) + 1}–{Math.ceil(parseInt(tvSeriesEpisodes) * 0.75)}) &nbsp;|&nbsp;
                    Resolution (Eps {Math.ceil(parseInt(tvSeriesEpisodes) * 0.75) + 1}–{tvSeriesEpisodes})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Feature Film options */}
          {medium === 'film' && (
            <div className="space-y-4 pl-2 border-l-2 border-accent/20">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Runtime</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '90', label: '90 min (Tight)' },
                    { value: '105', label: '105 min (Standard)' },
                    { value: '120', label: '120 min (Standard+)' },
                    { value: '150', label: '150 min (Epic)' },
                  ].map(v => (
                    <Button key={v.value} variant={filmLength === v.value ? 'default' : 'outline'} size="sm" onClick={() => setFilmLength(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              {filmLength && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Script Pacing</p>
                  <p className="text-xs text-muted-foreground">
                    ~1 page/min = <span className="text-primary font-semibold">~{filmLength} script pages</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Act I: pp 1–{Math.round(parseInt(filmLength) * 0.25)} &nbsp;|&nbsp;
                    Act II: pp {Math.round(parseInt(filmLength) * 0.25) + 1}–{Math.round(parseInt(filmLength) * 0.75)} &nbsp;|&nbsp;
                    Act III: pp {Math.round(parseInt(filmLength) * 0.75) + 1}–{filmLength}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inciting Incident: ~p{Math.round(parseInt(filmLength) * 0.12)} &nbsp;|&nbsp;
                    Midpoint: ~p{Math.round(parseInt(filmLength) * 0.5)} &nbsp;|&nbsp;
                    Low Point: ~p{Math.round(parseInt(filmLength) * 0.75)} &nbsp;|&nbsp;
                    Climax: ~p{Math.round(parseInt(filmLength) * 0.9)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stage Play options */}
          {medium === 'stage_play' && (
            <div className="space-y-4 pl-2 border-l-2 border-accent/20">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Act Structure</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '1', label: '1-Act' },
                    { value: '2', label: '2-Act' },
                    { value: '3', label: '3-Act' },
                    { value: '5', label: '5-Act' },
                  ].map(v => (
                    <Button key={v.value} variant={stageActs === v.value ? 'default' : 'outline'} size="sm" onClick={() => setStageActs(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Estimated Runtime</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '60', label: '60 min (One-Act)' },
                    { value: '90', label: '90 min (Standard)' },
                    { value: '120', label: '120 min (Full Length)' },
                    { value: '150', label: '150 min (Epic)' },
                  ].map(v => (
                    <Button key={v.value} variant={stageRuntime === v.value ? 'default' : 'outline'} size="sm" onClick={() => setStageRuntime(v.value)}>
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              {stageActs && stageRuntime && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Pacing Summary</p>
                  <p className="text-xs text-muted-foreground">
                    {stageActs}-act play, ~{stageRuntime} min runtime
                  </p>
                  {parseInt(stageActs) >= 2 && (
                    <p className="text-xs text-muted-foreground">
                      Intermission after Act {Math.ceil(parseInt(stageActs) / 2)} (~{Math.round(parseInt(stageRuntime) * 0.5)} min mark)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ~{Math.round(parseInt(stageRuntime) / parseInt(stageActs))} min per act
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!medium} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Port to Engine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
