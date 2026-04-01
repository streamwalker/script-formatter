import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Sparkles,
  Swords,
  Heart,
  Drama,
  Laugh,
  Ghost,
  Search,
  Save,
  Download,
  Upload,
  FileJson,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  MoodPreset, 
  loadMoodPresets, 
  saveMoodPreset, 
  deleteMoodPreset,
  PRESET_CATEGORIES,
  applyPresetToCharacters,
  CharacterMoodAssignment,
  downloadPresetsAsFile,
  importPresetsFromJSON,
  loadCustomPresets
} from '@/lib/moodPresets';
import { EMOTION_STATES, EmotionState } from '@/lib/characterMoods';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MoodPresetManagerProps {
  panelCharacters: string[];
  onApplyPreset: (moodAssignments: Record<string, EmotionState>) => void;
  onSaveCurrentAsPreset?: (characterMoods: Record<string, string>) => void;
  currentMoods?: Record<string, EmotionState>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  action: <Swords className="w-4 h-4" />,
  romance: <Heart className="w-4 h-4" />,
  drama: <Drama className="w-4 h-4" />,
  comedy: <Laugh className="w-4 h-4" />,
  horror: <Ghost className="w-4 h-4" />,
  mystery: <Search className="w-4 h-4" />,
  custom: <Sparkles className="w-4 h-4" />,
};

export function MoodPresetManager({ 
  panelCharacters, 
  onApplyPreset,
  onSaveCurrentAsPreset,
  currentMoods 
}: MoodPresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<MoodPreset[]>(() => loadMoodPresets());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<MoodPreset['category']>('custom');
  
  // Export/Import state
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    presets: MoodPreset[];
    fileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPresets = selectedCategory === 'all' 
    ? presets 
    : presets.filter(p => p.category === selectedCategory);

  const customPresets = presets.filter(p => !p.isBuiltIn);

  const handleApplyPreset = (preset: MoodPreset) => {
    if (isSelectMode) return;
    
    const assignments = applyPresetToCharacters(preset, panelCharacters);
    const moodAssignments: Record<string, EmotionState> = {};
    
    Object.entries(assignments).forEach(([char, moodId]) => {
      const emotion = EMOTION_STATES.find(e => e.id === moodId);
      if (emotion) {
        moodAssignments[char] = emotion;
      }
    });
    
    onApplyPreset(moodAssignments);
    toast.success(`Applied "${preset.name}" preset`);
    setIsOpen(false);
  };

  const handleDeletePreset = (presetId: string) => {
    deleteMoodPreset(presetId);
    setPresets(loadMoodPresets());
    setSelectedForExport(prev => {
      const next = new Set(prev);
      next.delete(presetId);
      return next;
    });
    toast.success('Preset deleted');
  };

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    
    if (!currentMoods || Object.keys(currentMoods).length === 0) {
      toast.error('No moods selected to save');
      return;
    }

    const characterMoods: CharacterMoodAssignment[] = Object.entries(currentMoods).map(([char, emotion], index) => ({
      role: index === 0 ? 'protagonist' : 'supporting' as const,
      moodId: emotion.id,
    }));

    saveMoodPreset({
      name: newPresetName,
      description: newPresetDescription || `Custom preset with ${Object.keys(currentMoods).length} character moods`,
      category: newPresetCategory,
      characterMoods,
    });

    setPresets(loadMoodPresets());
    setNewPresetName('');
    setNewPresetDescription('');
    setShowCreateForm(false);
    toast.success('Preset saved!');
  };

  // Export handlers
  const handleExportSelected = () => {
    if (selectedForExport.size === 0) {
      toast.error('Select presets to export');
      return;
    }
    downloadPresetsAsFile(Array.from(selectedForExport));
    toast.success(`Exported ${selectedForExport.size} presets`);
    setSelectedForExport(new Set());
    setIsSelectMode(false);
  };

  const handleExportAll = () => {
    if (customPresets.length === 0) {
      toast.error('No custom presets to export');
      return;
    }
    downloadPresetsAsFile();
    toast.success(`Exported ${customPresets.length} presets`);
  };

  const toggleExportSelection = (presetId: string) => {
    setSelectedForExport(prev => {
      const next = new Set(prev);
      if (next.has(presetId)) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      return next;
    });
  };

  // Import handlers
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.presets && Array.isArray(data.presets)) {
        setImportPreview({
          presets: data.presets,
          fileName: file.name,
        });
      } else {
        toast.error('Invalid preset file format');
      }
    } catch (err) {
      toast.error('Failed to read file');
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const jsonString = JSON.stringify({ presets: importPreview.presets });
    const result = importPresetsFromJSON(jsonString);

    if (result.success) {
      setPresets(loadMoodPresets());
      
      let message = `Imported ${result.imported} presets`;
      if (result.duplicates.length > 0) {
        message += ` (${result.duplicates.length} duplicates skipped)`;
      }
      toast.success(message);
    } else {
      toast.error(result.errors.join(', '));
    }

    setImportPreview(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bookmark className="w-4 h-4" />
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              Mood Presets
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleImportClick}
                className="gap-1 text-xs"
              >
                <Upload className="w-3 h-3" />
                Import
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportAll}
                disabled={customPresets.length === 0}
                className="gap-1 text-xs"
              >
                <Download className="w-3 h-3" />
                Export All
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Import Preview Dialog */}
        {importPreview && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-2 mb-4">
                <FileJson className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Import Presets</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                File: {importPreview.fileName}
              </p>
              
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium mb-2">
                  {importPreview.presets.length} preset(s) found:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {importPreview.presets.slice(0, 5).map((p, i) => (
                    <li key={i}>• {p.name}</li>
                  ))}
                  {importPreview.presets.length > 5 && (
                    <li>...and {importPreview.presets.length - 5} more</li>
                  )}
                </ul>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setImportPreview(null)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleConfirmImport}
                  className="gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Import
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Presets</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Category Filter & Selection Mode */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 flex-wrap flex-1">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </Button>
                {PRESET_CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="gap-1.5"
                  >
                    {CATEGORY_ICONS[cat.id]}
                    {cat.label}
                  </Button>
                ))}
              </div>
              
              {customPresets.length > 0 && (
                <Button
                  variant={isSelectMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedForExport(new Set());
                  }}
                >
                  {isSelectMode ? 'Cancel' : 'Select'}
                </Button>
              )}
            </div>

            {/* Selection toolbar */}
            {isSelectMode && (
              <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {selectedForExport.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  disabled={selectedForExport.size === 0}
                  className="gap-1 ml-auto"
                >
                  <Download className="w-3 h-3" />
                  Export Selected
                </Button>
              </div>
            )}

            {/* Preset Grid */}
            <ScrollArea className="h-[350px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-4">
                {filteredPresets.map(preset => (
                  <div
                    key={preset.id}
                    className={cn(
                      'p-4 rounded-lg border border-border bg-card transition-all cursor-pointer group',
                      'flex flex-col justify-between',
                      !isSelectMode && 'hover:border-primary/50',
                      isSelectMode && selectedForExport.has(preset.id) && 'border-primary bg-primary/5'
                    )}
                    onClick={() => isSelectMode && !preset.isBuiltIn 
                      ? toggleExportSelection(preset.id) 
                      : handleApplyPreset(preset)
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isSelectMode && !preset.isBuiltIn && (
                            <Checkbox 
                              checked={selectedForExport.has(preset.id)}
                              onCheckedChange={() => toggleExportSelection(preset.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          )}
                          <span className="font-medium text-sm">{preset.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {CATEGORY_ICONS[preset.category]}
                          {!preset.isBuiltIn && !isSelectMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePreset(preset.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{preset.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {preset.characterMoods.slice(0, 3).map((mood, i) => {
                        const emotion = EMOTION_STATES.find(e => e.id === mood.moodId);
                        return (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {mood.role}: {emotion?.name || mood.moodId}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preset Name</Label>
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="My Custom Preset"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Describe when to use this preset"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newPresetCategory} onValueChange={(v) => setNewPresetCategory(v as MoodPreset['category'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          {CATEGORY_ICONS[cat.id]}
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentMoods && Object.keys(currentMoods).length > 0 && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Current Mood Selection</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentMoods).map(([char, emotion]) => (
                      <Badge key={char} variant="outline">
                        {char}: {emotion.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSaveNewPreset} 
                className="w-full gap-2"
                disabled={!currentMoods || Object.keys(currentMoods).length === 0}
              >
                <Save className="w-4 h-4" />
                Save Current Moods as Preset
              </Button>

              {(!currentMoods || Object.keys(currentMoods).length === 0) && (
                <p className="text-xs text-muted-foreground text-center">
                  Select moods for characters first, then save as a preset
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
