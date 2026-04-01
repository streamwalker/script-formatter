import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  BookText, 
  MessageSquare, 
  User, 
  FileText,
  Hash,
  Type,
  Brackets,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';

// Pre-built pattern blocks with expanded format support
const PATTERN_BLOCKS = {
  pageMarkers: [
    // Standard formats
    { id: 'page-word', label: 'PAGE + Number', pattern: 'PAGE\\s*(\\d+)', description: 'Matches "PAGE 1", "PAGE 2", etc.' },
    { id: 'page-hash', label: '# Page', pattern: '#\\s*PAGE\\s*(\\d+)', description: 'Matches "# PAGE 1"' },
    { id: 'page-bracket', label: '[Page N]', pattern: '\\[Page\\s*(\\d+)\\]', description: 'Matches "[Page 1]"' },
    { id: 'scene-int', label: 'INT./EXT. Scene', pattern: '(INT\\.|EXT\\.)\\s*(.+?)\\s*[-–—]', description: 'Screenplay scene headings' },
    { id: 'chapter', label: 'Chapter N', pattern: 'CHAPTER\\s*(\\d+)', description: 'Matches "CHAPTER 1"' },
    // Manga formats
    { id: 'manga-page', label: 'ページ (Japanese)', pattern: '(\\d+)\\s*ページ', description: 'Japanese page format "1ページ"' },
    { id: 'manga-chapter', label: '第N話', pattern: '第\\s*(\\d+)\\s*話', description: 'Japanese chapter "第1話"' },
    // Webcomic formats
    { id: 'episode', label: 'Episode N', pattern: 'EPISODE\\s*(\\d+)', description: 'Episode format for webcomics' },
    { id: 'scroll-section', label: '--- Section ---', pattern: '[-–—]{3,}\\s*(.+?)\\s*[-–—]{3,}', description: 'Scroll separator sections' },
    // Storyboard formats
    { id: 'scene-number', label: 'Scene N', pattern: 'SCENE\\s*(\\d+)', description: 'Scene numbering for storyboards' },
    { id: 'shot-marker', label: 'SHOT:', pattern: 'SHOT\\s*(\\d+[A-Z]?):', description: 'Shot markers like "SHOT 1A:"' },
  ],
  panels: [
    // Standard formats
    { id: 'panel-dash', label: 'N - Description', pattern: '(\\d+)\\s*[-–—]\\s*(.+)', description: 'Panel number with dash' },
    { id: 'panel-colon', label: 'Panel N:', pattern: 'Panel\\s*(\\d+):', description: 'Panel N: format' },
    { id: 'panel-bracket', label: '[Panel N]', pattern: '\\[Panel\\s*(\\d+)\\]', description: 'Bracketed panels' },
    { id: 'panel-number', label: 'Just Number.', pattern: '^(\\d+)\\.\\s*(.+)', description: 'Simple "1. Description"' },
    { id: 'panel-paren', label: '(N)', pattern: '\\((\\d+)\\)\\s*(.+)', description: 'Parenthesized numbers' },
    // Manga formats
    { id: 'manga-koma', label: 'コマN', pattern: 'コマ\\s*(\\d+)', description: 'Japanese panel "コマ1"' },
    { id: 'right-to-left', label: 'R→L Panel', pattern: '【(\\d+)】', description: 'Right-to-left panel markers' },
    { id: 'splash-page', label: 'SPLASH:', pattern: 'SPLASH(?:\\s*PAGE)?:', description: 'Full page splash panels' },
    // Webcomic formats
    { id: 'vertical-break', label: '▼ Panel', pattern: '▼\\s*(.+)', description: 'Vertical scroll panel marker' },
    { id: 'webtoon-cut', label: 'CUT N', pattern: 'CUT\\s*(\\d+)', description: 'Webtoon cut format' },
    // Storyboard formats
    { id: 'frame', label: 'FRAME N', pattern: 'FRAME\\s*(\\d+)', description: 'Storyboard frame' },
    { id: 'shot-size', label: 'CU/MS/WS', pattern: '(ECU|CU|MCU|MS|MLS|LS|ELS|WS)\\s*[-:]\\s*(.+)', description: 'Shot sizes (Close-up, Wide, etc.)' },
    { id: 'camera-angle', label: 'ANGLE:', pattern: '(HIGH|LOW|DUTCH|POV|OTS)\\s*ANGLE\\s*[-:]', description: 'Camera angle markers' },
  ],
  dialogue: [
    // Standard formats
    { id: 'char-colon', label: 'CHARACTER:', pattern: '([A-Z][A-Z\\s]+):', description: 'NAME: dialogue format' },
    { id: 'char-paren', label: 'CHARACTER (cont)', pattern: '([A-Z]+)(?:\\s*\\([^)]+\\))?:', description: 'With parentheticals' },
    { id: 'char-quotes', label: '"Dialogue"', pattern: '"([^"]+)"', description: 'Quoted dialogue' },
    { id: 'char-angle', label: '<Character>', pattern: '<([^>]+)>', description: 'Angle bracket format' },
    // Manga formats
    { id: 'manga-bubble', label: '「台詞」', pattern: '「([^」]+)」', description: 'Japanese quotation marks' },
    { id: 'manga-thought', label: '（思考）', pattern: '（([^）]+)）', description: 'Japanese thought parentheses' },
    { id: 'sfx-katakana', label: 'SFX Katakana', pattern: '[ァ-ヶー]{2,}', description: 'Katakana sound effects' },
    // Webcomic formats
    { id: 'chat-bubble', label: '@Name:', pattern: '@([\\w]+):', description: 'Chat-style dialogue' },
    { id: 'emoji-prefix', label: '😊 Dialogue', pattern: '[\\u{1F300}-\\u{1F9FF}]\\s*(.+)', description: 'Emoji-prefixed dialogue' },
  ],
  narration: [
    // Standard formats
    { id: 'caption', label: 'CAPTION:', pattern: 'CAPTION:\\s*(.+)', description: 'CAPTION: text' },
    { id: 'reads', label: 'Reads:', pattern: 'Reads:\\s*(.+)', description: 'Reads: text format' },
    { id: 'narration-bracket', label: '[Narration]', pattern: '\\[([^\\]]+)\\]', description: 'Bracketed narration' },
    { id: 'vo', label: '(V.O.)', pattern: '\\(V\\.O\\.\\)\\s*(.+)', description: 'Voice over' },
    { id: 'sfx', label: 'SFX:', pattern: 'SFX:\\s*(.+)', description: 'Sound effects' },
    // Manga formats
    { id: 'manga-narration', label: 'ナレーション', pattern: 'ナレーション[：:]\\s*(.+)', description: 'Japanese narration' },
    { id: 'manga-monologue', label: '心の声', pattern: '〈([^〉]+)〉', description: 'Inner monologue markers' },
    // Webcomic formats
    { id: 'author-note', label: 'A/N:', pattern: 'A\\/N:\\s*(.+)', description: 'Author note' },
    { id: 'timestamp', label: 'TIME:', pattern: '\\[(?:TIME|LOCATION):\\s*([^\\]]+)\\]', description: 'Time/location stamps' },
    // Storyboard formats
    { id: 'action-line', label: 'ACTION:', pattern: 'ACTION:\\s*(.+)', description: 'Action description' },
    { id: 'camera-note', label: 'CAM:', pattern: 'CAM(?:ERA)?:\\s*(.+)', description: 'Camera movement notes' },
    { id: 'audio-cue', label: 'AUDIO:', pattern: 'AUDIO:\\s*(.+)', description: 'Audio/music cues' },
  ],
  characters: [
    // Standard formats
    { id: 'caps', label: 'ALL CAPS', pattern: '\\b([A-Z]{2,})\\b', description: 'Words in all capitals' },
    { id: 'caps-space', label: 'CAPS (2+ letters)', pattern: '([A-Z][A-Z]+)', description: 'Two or more capitals' },
    { id: 'title-case', label: 'Title Case', pattern: '\\b([A-Z][a-z]+)\\b', description: 'Capitalized words' },
    // Manga formats
    { id: 'manga-name', label: 'Japanese Name', pattern: '[一-龯ぁ-んァ-ン]+(?:さん|くん|ちゃん|様)?', description: 'Japanese names with honorifics' },
    { id: 'furigana', label: 'Name (reading)', pattern: '([\\u4E00-\\u9FAF]+)\\s*[（\\(]([ぁ-んァ-ン]+)[）\\)]', description: 'Kanji with furigana' },
    // Webcomic formats
    { id: 'username', label: '@username', pattern: '@([\\w_]+)', description: 'Username mentions' },
    { id: 'color-code', label: '#Color Name', pattern: '#([A-Za-z]+):', description: 'Color-coded character names' },
  ],
};

interface PatternBlock {
  id: string;
  label: string;
  pattern: string;
  description: string;
}

interface SelectedPatterns {
  pageMarker: PatternBlock | null;
  panel: PatternBlock | null;
  dialogue: PatternBlock | null;
  narration: PatternBlock | null;
  character: PatternBlock | null;
}

interface VisualTemplateBuilderProps {
  onSave: (template: {
    name: string;
    description: string;
    pageMarkerPattern: string;
    panelPattern: string;
    dialoguePattern: string;
    narrationPattern: string;
    characterNamePattern: string;
  }) => void;
  initialTemplate?: {
    name: string;
    description: string;
    pageMarkerPattern: string;
    panelPattern: string;
    dialoguePattern: string;
    narrationPattern: string;
    characterNamePattern: string;
  };
}

export function VisualTemplateBuilder({ onSave, initialTemplate }: VisualTemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [templateDesc, setTemplateDesc] = useState(initialTemplate?.description || '');
  const [sampleText, setSampleText] = useState(`PAGE 1

1 - A dark alley at night. Rain falls heavily.

CAPTION: The city never sleeps.

DETECTIVE: "We've got another one."

2 - Close up on the detective's face, grim expression.

OFFICER: What do we have?
DETECTIVE: Same M.O. as before.

PAGE 2

3 - Wide shot of the crime scene.

[The yellow tape flutters in the wind]

4 - Detective kneels to examine evidence.

SFX: Thunder rumbles in the distance`);

  const [selectedPatterns, setSelectedPatterns] = useState<SelectedPatterns>({
    pageMarker: initialTemplate?.pageMarkerPattern 
      ? PATTERN_BLOCKS.pageMarkers.find(p => p.pattern === initialTemplate.pageMarkerPattern) || null 
      : null,
    panel: initialTemplate?.panelPattern 
      ? PATTERN_BLOCKS.panels.find(p => p.pattern === initialTemplate.panelPattern) || null 
      : null,
    dialogue: initialTemplate?.dialoguePattern 
      ? PATTERN_BLOCKS.dialogue.find(p => p.pattern === initialTemplate.dialoguePattern) || null 
      : null,
    narration: initialTemplate?.narrationPattern 
      ? PATTERN_BLOCKS.narration.find(p => p.pattern === initialTemplate.narrationPattern) || null 
      : null,
    character: initialTemplate?.characterNamePattern 
      ? PATTERN_BLOCKS.characters.find(p => p.pattern === initialTemplate.characterNamePattern) || null 
      : null,
  });

  const [customPatterns, setCustomPatterns] = useState({
    pageMarker: '',
    panel: '',
    dialogue: '',
    narration: '',
    character: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectBlock = (category: keyof SelectedPatterns, block: PatternBlock) => {
    setSelectedPatterns(prev => ({
      ...prev,
      [category]: prev[category]?.id === block.id ? null : block,
    }));
    // Clear custom pattern when selecting a block
    setCustomPatterns(prev => ({
      ...prev,
      [category]: '',
    }));
  };

  const handleCustomPattern = (category: keyof SelectedPatterns, value: string) => {
    setCustomPatterns(prev => ({
      ...prev,
      [category]: value,
    }));
    // Clear selected block when entering custom
    if (value) {
      setSelectedPatterns(prev => ({
        ...prev,
        [category]: null,
      }));
    }
  };

  const getPattern = (category: keyof SelectedPatterns): string => {
    if (customPatterns[category]) return customPatterns[category];
    return selectedPatterns[category]?.pattern || '';
  };

  const copyPattern = (pattern: string, id: string) => {
    navigator.clipboard.writeText(pattern);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = () => {
    if (!templateName.trim()) return;
    
    onSave({
      name: templateName,
      description: templateDesc,
      pageMarkerPattern: getPattern('pageMarker'),
      panelPattern: getPattern('panel'),
      dialoguePattern: getPattern('dialogue'),
      narrationPattern: getPattern('narration'),
      characterNamePattern: getPattern('character'),
    });
  };

  const renderPatternCategory = (
    title: string,
    icon: React.ReactNode,
    category: keyof SelectedPatterns,
    blocks: PatternBlock[]
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="font-medium">{title}</Label>
      </div>
      
      {/* Pre-built blocks */}
      <div className="flex flex-wrap gap-2">
        {blocks.map(block => (
          <Button
            key={block.id}
            variant={selectedPatterns[category]?.id === block.id ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handleSelectBlock(category, block)}
            title={block.description}
          >
            {block.label}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                copyPattern(block.pattern, block.id);
              }}
            >
              {copiedId === block.id ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-50" />
              )}
            </Button>
          </Button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">or custom:</span>
        <Input
          value={customPatterns[category]}
          onChange={(e) => handleCustomPattern(category, e.target.value)}
          placeholder="Enter custom regex..."
          className="font-mono text-xs h-8 flex-1"
        />
      </div>

      {/* Current pattern preview */}
      {getPattern(category) && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
          <Brackets className="h-3.5 w-3.5 text-muted-foreground" />
          <code className="font-mono flex-1 text-muted-foreground">{getPattern(category)}</code>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Template Name & Description */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="My Custom Format"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-desc">Description</Label>
          <Input
            id="template-desc"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            placeholder="Format used by..."
          />
        </div>
      </div>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="builder" className="flex-1">Pattern Builder</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Live Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4 mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {renderPatternCategory(
                'Page Markers',
                <BookText className="h-4 w-4" />,
                'pageMarker',
                PATTERN_BLOCKS.pageMarkers
              )}

              {renderPatternCategory(
                'Panel Pattern',
                <Hash className="h-4 w-4" />,
                'panel',
                PATTERN_BLOCKS.panels
              )}

              {renderPatternCategory(
                'Dialogue Pattern',
                <MessageSquare className="h-4 w-4" />,
                'dialogue',
                PATTERN_BLOCKS.dialogue
              )}

              {renderPatternCategory(
                'Narration Pattern',
                <FileText className="h-4 w-4" />,
                'narration',
                PATTERN_BLOCKS.narration
              )}

              {renderPatternCategory(
                'Character Names',
                <User className="h-4 w-4" />,
                'character',
                PATTERN_BLOCKS.characters
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Sample Script Text</Label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Paste sample script text here..."
              className="h-32 font-mono text-sm"
            />
          </div>

          <TemplatePreviewPanel
            sampleText={sampleText}
            patterns={{
              pageMarkerPattern: getPattern('pageMarker') || '$^',
              panelPattern: getPattern('panel'),
              dialoguePattern: getPattern('dialogue'),
              narrationPattern: getPattern('narration'),
              characterNamePattern: getPattern('character'),
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={!templateName.trim()}
        className="w-full"
      >
        Save Template
      </Button>
    </div>
  );
}
