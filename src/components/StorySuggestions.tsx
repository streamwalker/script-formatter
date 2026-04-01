import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Sparkles, 
  RefreshCw, 
  BookOpen,
  Users,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  Heart,
  ArrowRight,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadStoryArcs, StoryArc } from '@/lib/storyArcs';
import { loadStoryEvents, StoryEvent } from '@/lib/storyEvents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CharacterData {
  id: string;
  name: string;
  description: string;
  archetype?: string;
  traits?: string[];
}

interface PlotSuggestion {
  title: string;
  description: string;
  type: 'plot_twist' | 'character_development' | 'conflict' | 'resolution' | 'relationship';
  involvedCharacters: string[];
  setup: string;
  payoff: string;
  tension: 'low' | 'medium' | 'high';
}

interface CharacterArcSuggestion {
  characterName: string;
  currentState: string;
  suggestedArc: string;
  milestones: string[];
  challenges: string[];
  potentialGrowth: string;
}

interface StorySuggestionsProps {
  characters: CharacterData[];
  trigger?: React.ReactNode;
}

const SUGGESTION_TYPE_CONFIG: Record<PlotSuggestion['type'], { icon: React.ReactNode; color: string; label: string }> = {
  plot_twist: { icon: <Zap className="w-4 h-4" />, color: 'text-yellow-500', label: 'Plot Twist' },
  character_development: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-500', label: 'Character Growth' },
  conflict: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500', label: 'Conflict' },
  resolution: { icon: <Check className="w-4 h-4" />, color: 'text-green-500', label: 'Resolution' },
  relationship: { icon: <Heart className="w-4 h-4" />, color: 'text-pink-500', label: 'Relationship' },
};

export function StorySuggestions({ characters, trigger }: StorySuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [plotSuggestions, setPlotSuggestions] = useState<PlotSuggestion[]>([]);
  const [arcSuggestions, setArcSuggestions] = useState<CharacterArcSuggestion[]>([]);
  const [selectedTab, setSelectedTab] = useState('plot');

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      const storyArcs = loadStoryArcs();
      const storyEvents = loadStoryEvents();
      
      const { data, error } = await supabase.functions.invoke('generate-story-suggestions', {
        body: {
          characters: characters.map(c => ({
            name: c.name,
            description: c.description,
            archetype: c.archetype,
            traits: c.traits
          })),
          storyArcs: storyArcs.map(arc => ({
            title: arc.title,
            genre: arc.genre,
            themes: arc.themes,
            chapters: arc.chapters.map(ch => ({
              title: ch.title,
              status: ch.status,
              themes: ch.themes
            }))
          })),
          events: storyEvents.slice(-20).map(e => ({
            title: e.title,
            type: e.type,
            significance: e.significance,
            involvedCharacters: e.involvedCharacters.map(c => c.characterName)
          }))
        }
      });

      if (error) {
        console.error('Story suggestions error:', error);
        toast.error('Failed to generate suggestions');
        return;
      }

      if (data?.plotSuggestions) {
        setPlotSuggestions(data.plotSuggestions);
      }
      if (data?.characterArcSuggestions) {
        setArcSuggestions(data.characterArcSuggestions);
      }
      
      toast.success('Generated story suggestions!');
    } catch (err) {
      console.error('Error generating suggestions:', err);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && plotSuggestions.length === 0 && arcSuggestions.length === 0) {
      generateSuggestions();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Story Suggestions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Story Suggestions
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="plot" className="gap-1.5">
                <BookOpen className="w-4 h-4" />
                Plot Ideas
              </TabsTrigger>
              <TabsTrigger value="arcs" className="gap-1.5">
                <Users className="w-4 h-4" />
                Character Arcs
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <TabsContent value="plot">
            <ScrollArea className="h-[450px] pr-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing your story...</p>
                </div>
              ) : plotSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Lightbulb className="w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No suggestions yet. Click refresh to generate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plotSuggestions.map((suggestion, idx) => {
                    const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.type];
                    return (
                      <Card key={idx} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className={typeConfig.color}>{typeConfig.icon}</span>
                              <CardTitle className="text-base">{suggestion.title}</CardTitle>
                            </div>
                            <Badge 
                              variant={suggestion.tension === 'high' ? 'destructive' : suggestion.tension === 'medium' ? 'default' : 'secondary'}
                            >
                              {suggestion.tension} tension
                            </Badge>
                          </div>
                          <Badge variant="outline" className="w-fit">{typeConfig.label}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                              <p className="font-medium text-xs mb-1 flex items-center gap-1">
                                <Target className="w-3 h-3" /> Setup
                              </p>
                              <p className="text-muted-foreground text-xs">{suggestion.setup}</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                              <p className="font-medium text-xs mb-1 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Payoff
                              </p>
                              <p className="text-muted-foreground text-xs">{suggestion.payoff}</p>
                            </div>
                          </div>
                          
                          {suggestion.involvedCharacters.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {suggestion.involvedCharacters.map(char => (
                                <Badge key={char} variant="secondary" className="text-xs">
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="arcs">
            <ScrollArea className="h-[450px] pr-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing character arcs...</p>
                </div>
              ) : arcSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Users className="w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No arc suggestions yet. Click refresh to generate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {arcSuggestions.map((arc, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          {arc.characterName}
                        </CardTitle>
                        <CardDescription>{arc.currentState}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="bg-primary/10 rounded-lg p-3">
                          <p className="font-medium text-sm mb-1">Suggested Arc</p>
                          <p className="text-sm text-muted-foreground">{arc.suggestedArc}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-medium text-xs mb-1.5 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-green-500" /> Milestones
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {arc.milestones.map((m, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                  {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-xs mb-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-orange-500" /> Challenges
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {arc.challenges.map((c, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-secondary/50 rounded-lg p-2.5">
                          <p className="font-medium text-xs mb-1">Potential Growth</p>
                          <p className="text-xs text-muted-foreground">{arc.potentialGrowth}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
