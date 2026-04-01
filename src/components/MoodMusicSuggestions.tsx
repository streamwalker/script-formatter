import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  Volume2, 
  Headphones, 
  ExternalLink, 
  Clock, 
  Lightbulb,
  Waves
} from 'lucide-react';
import { 
  generatePanelAudioSuggestion, 
  MusicSuggestion, 
  SoundEffectSuggestion,
  getTempoLabel,
  PanelAudioSuggestion
} from '@/lib/moodMusicSuggestions';
import { getCategoryColor } from '@/lib/moodTimeline';
import { cn } from '@/lib/utils';

interface MoodMusicSuggestionsProps {
  characterMoods: Record<string, string>;
  moodIntensities?: Record<string, number>;
  trigger?: React.ReactNode;
}

export function MoodMusicSuggestions({ 
  characterMoods, 
  moodIntensities = {},
  trigger 
}: MoodMusicSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const suggestion = useMemo(() => 
    generatePanelAudioSuggestion(characterMoods, moodIntensities),
    [characterMoods, moodIntensities]
  );

  const hasCharacters = Object.keys(characterMoods).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Music className="w-4 h-4" />
            Music Suggestions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Audio Suggestions for Panel
          </DialogTitle>
        </DialogHeader>

        {!hasCharacters ? (
          <div className="py-12 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Add character moods to get music and sound suggestions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mood Summary */}
            <Card className="bg-secondary/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${getCategoryColor(suggestion.moodCategory)}20` }}
                    >
                      <Waves 
                        className="w-5 h-5" 
                        style={{ color: getCategoryColor(suggestion.moodCategory) }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Dominant Mood: {suggestion.dominantMood}</p>
                      <p className="text-sm text-muted-foreground">
                        Intensity Level: {suggestion.intensity}/3
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className="capitalize"
                    style={{ 
                      backgroundColor: `${getCategoryColor(suggestion.moodCategory)}20`,
                      color: getCategoryColor(suggestion.moodCategory)
                    }}
                  >
                    {suggestion.moodCategory}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Music and Ambient */}
            <Tabs defaultValue="music" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="music" className="gap-2">
                  <Music className="w-4 h-4" />
                  Background Music
                </TabsTrigger>
                <TabsTrigger value="ambient" className="gap-2">
                  <Volume2 className="w-4 h-4" />
                  Ambient Sounds
                </TabsTrigger>
              </TabsList>

              <TabsContent value="music" className="mt-4">
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3 pr-4">
                    {suggestion.musicSuggestions.map((music) => (
                      <MusicCard key={music.id} music={music} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ambient" className="mt-4">
                <ScrollArea className="h-[280px]">
                  <div className="grid grid-cols-2 gap-3 pr-4">
                    {suggestion.ambientSounds.map((sound) => (
                      <AmbientCard key={sound.id} sound={sound} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Production Notes */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Production Notes</p>
                    <p className="text-sm text-muted-foreground">{suggestion.productionNotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MusicCardProps {
  music: MusicSuggestion;
}

function MusicCard({ music }: MusicCardProps) {
  const handleSearch = () => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(music.searchQuery + ' royalty free')}`;
    window.open(searchUrl, '_blank');
  };

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{music.title}</h4>
              <Badge variant="secondary" className="text-xs shrink-0">
                {music.genre}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{music.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getTempoLabel(music.tempo)}
              </span>
              <span className="capitalize">{music.mood}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {music.instruments.map((inst, i) => (
                <Badge key={i} variant="outline" className="text-xs py-0">
                  {inst}
                </Badge>
              ))}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={handleSearch}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface AmbientCardProps {
  sound: SoundEffectSuggestion;
}

function AmbientCard({ sound }: AmbientCardProps) {
  const getCategoryIcon = () => {
    switch (sound.category) {
      case 'nature': return '🌿';
      case 'urban': return '🏙️';
      case 'action': return '⚔️';
      case 'emotional': return '💓';
      case 'ambient': return '🔊';
      default: return '🎵';
    }
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{getCategoryIcon()}</span>
          <h4 className="font-medium text-sm">{sound.name}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{sound.description}</p>
        <Badge variant="outline" className="text-xs mt-2 capitalize">
          {sound.category}
        </Badge>
      </CardContent>
    </Card>
  );
}
