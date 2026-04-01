import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Palette, 
  Play,
  User,
  Smile,
  Frown,
  Meh,
  Zap,
  Gauge,
  Link2,
  History,
  Music,
  FileDown
} from 'lucide-react';
import { 
  EMOTION_STATES, 
  EmotionState, 
  MoodCategory,
  getEmotionsByCategory,
  getCharacterMood,
  setCharacterMood,
  getEmotionById
} from '@/lib/characterMoods';
import { ArtStyle } from '@/lib/artStyles';
import { saveMoodSnapshot, getInheritedMoods } from '@/lib/moodTimeline';
import { detectMoodConflicts, SceneContext } from '@/lib/archetypeMoods';
import { getDominantMoodColorGrading, ColorGradingPreset } from '@/lib/moodColorGrading';
import { MoodPresetManager } from '@/components/MoodPresetManager';
import { AutoMoodDetector } from '@/components/AutoMoodDetector';
import { MoodConflictWarning } from '@/components/MoodConflictWarning';
import { ArchetypeMoodSuggestions } from '@/components/ArchetypeMoodSuggestions';
import { MoodColorGradingSelector } from '@/components/MoodColorGradingSelector';
import { MoodMusicSuggestions } from '@/components/MoodMusicSuggestions';
import { MoodExportReport } from '@/components/MoodExportReport';
import { MoodStyleSuggestions } from '@/components/MoodStyleSuggestions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CharacterMoodSelection {
  characterName: string;
  characterId: string;
  moodId: string;
  moodName: string;
  visualCues: string[];
  colorTones: string[];
  expressionKeywords: string[];
  bodyLanguageHints: string[];
  intensity: number;
}

interface CharacterArchetypeInfo {
  name: string;
  archetypeId?: string;
}

interface PanelMoodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  panelCharacters: string[];
  onGenerate: (characterMoods: CharacterMoodSelection[], colorGrading?: ColorGradingPreset) => void;
  panelDescription: string;
  panelId?: number;
  pageNumber?: number;
  panelIndex?: number;
  dialogue?: string;
  characterArchetypes?: Record<string, string>; // characterName -> archetypeId
  enableMoodInheritance?: boolean;
  currentArtStyle?: ArtStyle;
  onStyleSelect?: (style: ArtStyle) => void;
}

const CATEGORY_CONFIG: Record<MoodCategory, { icon: React.ReactNode; label: string; color: string }> = {
  positive: { icon: <Smile className="w-4 h-4" />, label: 'Positive', color: 'text-green-500' },
  negative: { icon: <Frown className="w-4 h-4" />, label: 'Negative', color: 'text-red-500' },
  neutral: { icon: <Meh className="w-4 h-4" />, label: 'Neutral', color: 'text-blue-500' },
  intense: { icon: <Zap className="w-4 h-4" />, label: 'Intense', color: 'text-orange-500' },
};

export function PanelMoodSelector({ 
  isOpen, 
  onClose, 
  panelCharacters, 
  onGenerate,
  panelDescription,
  panelId,
  pageNumber = 1,
  panelIndex = 0,
  dialogue,
  characterArchetypes = {},
  enableMoodInheritance = true,
  currentArtStyle,
  onStyleSelect
}: PanelMoodSelectorProps) {
  const [selectedMoods, setSelectedMoods] = useState<Record<string, EmotionState>>({});
  const [intensityOverrides, setIntensityOverrides] = useState<Record<string, number>>({});
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MoodCategory>('neutral');
  const [showArchetypeSuggestions, setShowArchetypeSuggestions] = useState(true);
  const [moodInheritance, setMoodInheritance] = useState(enableMoodInheritance);
  const [inheritedFrom, setInheritedFrom] = useState<Record<string, boolean>>({});
  const [colorGradingAuto, setColorGradingAuto] = useState(true);
  const [selectedColorGrading, setSelectedColorGrading] = useState<ColorGradingPreset | undefined>();

  // Get inherited moods for this panel
  const inheritedMoods = useMemo(() => {
    if (!moodInheritance) return {};
    return getInheritedMoods(panelCharacters, pageNumber, panelIndex);
  }, [moodInheritance, panelCharacters, pageNumber, panelIndex]);

  // Initialize with inherited moods, existing moods, or defaults
  useEffect(() => {
    if (isOpen && panelCharacters.length > 0) {
      const initialMoods: Record<string, EmotionState> = {};
      const initialIntensities: Record<string, number> = {};
      const inherited: Record<string, boolean> = {};
      
      panelCharacters.forEach(charName => {
        const charId = charName.toLowerCase().replace(/\s+/g, '_');
        
        // Priority: 1. Existing mood for this character, 2. Inherited mood, 3. Neutral
        const existingMood = getCharacterMood(charId);
        const inheritedMoodId = inheritedMoods[charName];
        
        if (existingMood) {
          const emotion = getEmotionById(existingMood.currentMood);
          if (emotion) {
            initialMoods[charName] = emotion;
            initialIntensities[charName] = emotion.intensity;
          }
        } else if (inheritedMoodId && moodInheritance) {
          const emotion = getEmotionById(inheritedMoodId);
          if (emotion) {
            initialMoods[charName] = emotion;
            initialIntensities[charName] = emotion.intensity;
            inherited[charName] = true;
          }
        }
        
        if (!initialMoods[charName]) {
          const neutral = EMOTION_STATES.find(e => e.id === 'neutral') || EMOTION_STATES[0];
          initialMoods[charName] = neutral;
          initialIntensities[charName] = neutral.intensity;
        }
      });
      
      setSelectedMoods(initialMoods);
      setIntensityOverrides(initialIntensities);
      setInheritedFrom(inherited);
      setActiveCharacter(panelCharacters[0] || null);
      
      // Show toast if moods were inherited
      const inheritedCount = Object.keys(inherited).length;
      if (inheritedCount > 0) {
        toast.info(`Inherited moods for ${inheritedCount} character${inheritedCount > 1 ? 's' : ''} from previous panel`);
      }
    }
  }, [isOpen, panelCharacters, inheritedMoods, moodInheritance]);

  // Detect mood conflicts
  const conflicts = useMemo(() => {
    const moodData = Object.entries(selectedMoods).map(([name, mood]) => ({
      characterName: name,
      archetypeId: characterArchetypes[name],
      moodId: mood.id,
    }));
    
    // Detect scene context from description
    const descLower = panelDescription.toLowerCase();
    let context: SceneContext = 'default';
    if (/fight|battle|attack|defend/.test(descLower)) context = 'conflict';
    else if (/party|celebration|gathering/.test(descLower)) context = 'social';
    else if (/rest|sleep|relax|peaceful/.test(descLower)) context = 'downtime';
    else if (/chase|escape|danger|threat/.test(descLower)) context = 'stress';
    
    return detectMoodConflicts(moodData, context, panelDescription);
  }, [selectedMoods, characterArchetypes, panelDescription]);

  const handleSelectMood = (charName: string, emotion: EmotionState) => {
    setSelectedMoods(prev => ({
      ...prev,
      [charName]: emotion
    }));
    // Set default intensity for the new mood
    setIntensityOverrides(prev => ({
      ...prev,
      [charName]: emotion.intensity
    }));
    // Clear inherited status when manually selecting
    setInheritedFrom(prev => {
      const next = { ...prev };
      delete next[charName];
      return next;
    });
    
    const charId = charName.toLowerCase().replace(/\s+/g, '_');
    setCharacterMood(charId, emotion.id, 'Panel generation');
  };

  const handleIntensityChange = (charName: string, value: number) => {
    setIntensityOverrides(prev => ({
      ...prev,
      [charName]: value
    }));
  };

  const handleGenerate = () => {
    const moodData: CharacterMoodSelection[] = panelCharacters.map(charName => {
      const mood = selectedMoods[charName] || EMOTION_STATES.find(e => e.id === 'neutral')!;
      const customIntensity = intensityOverrides[charName] ?? mood.intensity;
      
      return {
        characterName: charName,
        characterId: charName.toLowerCase().replace(/\s+/g, '_'),
        moodId: mood.id,
        moodName: mood.name,
        visualCues: mood.visualCues,
        colorTones: mood.colorTones,
        expressionKeywords: mood.expressionKeywords,
        bodyLanguageHints: mood.bodyLanguageHints,
        intensity: customIntensity,
      };
    });
    
    if (panelId !== undefined) {
      const moodRecord: Record<string, string> = {};
      panelCharacters.forEach(char => {
        moodRecord[char] = selectedMoods[char]?.id || 'neutral';
      });
      saveMoodSnapshot({
        panelId,
        pageNumber,
        panelIndex,
        characterMoods: moodRecord,
        timestamp: Date.now(),
      });
    }
    
    // Get color grading preset
    const moodIds = Object.fromEntries(
      Object.entries(selectedMoods).map(([k, v]) => [k, v.id])
    );
    const colorGrading = colorGradingAuto 
      ? getDominantMoodColorGrading(moodIds) 
      : selectedColorGrading;
    
    onGenerate(moodData, colorGrading);
    onClose();
  };

  const handleApplyPreset = (moodAssignments: Record<string, EmotionState>) => {
    setSelectedMoods(prev => ({ ...prev, ...moodAssignments }));
    // Update intensities for preset moods
    Object.entries(moodAssignments).forEach(([char, mood]) => {
      setIntensityOverrides(prev => ({ ...prev, [char]: mood.intensity }));
    });
  };

  const handleApplyAISuggestions = (suggestions: Record<string, EmotionState>) => {
    setSelectedMoods(prev => ({ ...prev, ...suggestions }));
    Object.entries(suggestions).forEach(([char, mood]) => {
      setIntensityOverrides(prev => ({ ...prev, [char]: mood.intensity }));
    });
  };

  const categoryEmotions = getEmotionsByCategory(selectedCategory);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Set Character Moods for Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset and Auto-Detect Controls */}
          <div className="flex gap-2 flex-wrap">
            <MoodPresetManager
              panelCharacters={panelCharacters}
              onApplyPreset={handleApplyPreset}
              currentMoods={selectedMoods}
            />
            <AutoMoodDetector
              panelDescription={panelDescription}
              dialogue={dialogue}
              panelCharacters={panelCharacters}
              onApplySuggestions={handleApplyAISuggestions}
            />
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="mood-inheritance"
                  checked={moodInheritance}
                  onCheckedChange={setMoodInheritance}
                  className="h-4 w-7"
                />
                <Label htmlFor="mood-inheritance" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Inherit
                </Label>
              </div>
              <Button
                variant={showArchetypeSuggestions ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowArchetypeSuggestions(!showArchetypeSuggestions)}
                className="gap-1"
              >
                <User className="w-4 h-4" />
                Hints
              </Button>
            </div>
          </div>

          {/* Mood Inheritance Info */}
          {Object.keys(inheritedFrom).length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg text-xs">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Inherited from previous panel: {Object.keys(inheritedFrom).join(', ')}
              </span>
            </div>
          )}

          {/* Conflict Warnings */}
          <MoodConflictWarning conflicts={conflicts} />

          {/* Panel Preview */}
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{panelDescription}</p>
          </div>

          {/* Archetype Suggestions */}
          {showArchetypeSuggestions && activeCharacter && (
            <ArchetypeMoodSuggestions
              characterName={activeCharacter}
              archetypeId={characterArchetypes[activeCharacter]}
              currentMoodId={selectedMoods[activeCharacter]?.id}
              onSelectMood={(mood) => handleSelectMood(activeCharacter, mood)}
            />
          )}

          {/* Character Selection Tabs */}
          {panelCharacters.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {panelCharacters.map(charName => (
                <Button
                  key={charName}
                  variant={activeCharacter === charName ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCharacter(charName)}
                  className="flex items-center gap-2"
                >
                  <User className="w-3 h-3" />
                  {charName}
                  {selectedMoods[charName] && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {selectedMoods[charName].name}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {activeCharacter && (
            <>
              {/* Current Mood Display with Intensity Slider */}
              {selectedMoods[activeCharacter] && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{activeCharacter}'s Current Mood</span>
                    <Badge 
                      className={cn(
                        'capitalize',
                        CATEGORY_CONFIG[selectedMoods[activeCharacter].category].color
                      )}
                    >
                      {selectedMoods[activeCharacter].name}
                    </Badge>
                  </div>
                  
                  {/* Intensity Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        Emotional Intensity
                      </Label>
                      <span className="text-xs font-medium">
                        {intensityOverrides[activeCharacter] === 1 ? 'Subtle' : 
                         intensityOverrides[activeCharacter] === 2 ? 'Moderate' : 'Extreme'}
                      </span>
                    </div>
                    <Slider
                      value={[intensityOverrides[activeCharacter] || 2]}
                      onValueChange={([v]) => handleIntensityChange(activeCharacter, v)}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtle</span>
                      <span>Moderate</span>
                      <span>Extreme</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                    {selectedMoods[activeCharacter].expressionKeywords.map(kw => (
                      <span key={kw} className="bg-secondary px-2 py-0.5 rounded">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mood Category Tabs */}
              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as MoodCategory)}>
                <TabsList className="grid grid-cols-4 w-full">
                  {(Object.entries(CATEGORY_CONFIG) as [MoodCategory, typeof CATEGORY_CONFIG.positive][]).map(([cat, config]) => (
                    <TabsTrigger key={cat} value={cat} className="flex items-center gap-1.5">
                      {config.icon}
                      <span className="hidden sm:inline">{config.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4">
                  <ScrollArea className="h-[220px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4">
                      {categoryEmotions.map(emotion => (
                        <button
                          key={emotion.id}
                          onClick={() => handleSelectMood(activeCharacter, emotion)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all hover:border-primary/50',
                            selectedMoods[activeCharacter]?.id === emotion.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-sm">{emotion.name}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: emotion.intensity }).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                              ))}
                              {Array.from({ length: 3 - emotion.intensity }).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted" />
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {emotion.expressionKeywords.slice(0, 3).join(', ')}
                          </div>
                          <div className="flex gap-1">
                            {emotion.colorTones.map(tone => (
                              <Palette 
                                key={tone} 
                                className="w-3 h-3" 
                                style={{ color: tone.includes('warm') ? '#f97316' : tone.includes('cool') ? '#3b82f6' : '#6b7280' }}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Summary of all character moods */}
          {panelCharacters.length > 0 && Object.keys(selectedMoods).length > 0 && (
            <div className="space-y-3">
              {/* Style Suggestions based on Mood */}
              {onStyleSelect && (
                <MoodStyleSuggestions
                  characterMoods={Object.entries(selectedMoods).map(([name, mood]) => ({
                    moodId: mood.id,
                    category: mood.category,
                    intensity: intensityOverrides[name] ?? mood.intensity
                  }))}
                  currentStyle={currentArtStyle}
                  onSelectStyle={onStyleSelect}
                />
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Panel Mood Summary</p>
                  <div className="flex flex-wrap gap-2">
                    {panelCharacters.map(charName => {
                      const intensity = intensityOverrides[charName] ?? 2;
                      const isInherited = inheritedFrom[charName];
                      return (
                        <Badge key={charName} variant="outline" className={cn("text-xs gap-1", isInherited && "border-dashed")}>
                          {charName}: {selectedMoods[charName]?.name || 'Neutral'}
                          <span className="text-muted-foreground">
                            ({intensity === 1 ? 'S' : intensity === 2 ? 'M' : 'E'})
                          </span>
                          {isInherited && <Link2 className="w-2.5 h-2.5" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                
                {/* Color Grading */}
                <MoodColorGradingSelector
                  characterMoods={selectedMoods}
                  selectedPreset={selectedColorGrading}
                  onSelectPreset={setSelectedColorGrading}
                  autoMode={colorGradingAuto}
                  onAutoModeChange={setColorGradingAuto}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center gap-2 pt-2">
            <div className="flex gap-2">
              <MoodMusicSuggestions
                characterMoods={Object.fromEntries(
                  Object.entries(selectedMoods).map(([k, v]) => [k, v.id])
                )}
                moodIntensities={intensityOverrides}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Music className="w-4 h-4" />
                    Music
                  </Button>
                }
              />
              <MoodExportReport
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileDown className="w-4 h-4" />
                    Export
                  </Button>
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} className="gap-2">
                <Play className="w-4 h-4" />
                Generate with Moods
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
