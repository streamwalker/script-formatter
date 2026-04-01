import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Plus, Trash2, FileCode, Sparkles, FileText, Download, Upload, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ScriptParsingTemplate,
  getAllTemplates,
  saveUserTemplate,
  deleteUserTemplate,
  getTemplateById,
  detectTemplateWithConfidence,
  BUILT_IN_TEMPLATES,
  getUserTemplates,
  exportTemplatesToJson,
  importTemplatesFromJson,
} from '@/lib/scriptTemplates';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import { VisualTemplateBuilder } from './VisualTemplateBuilder';

interface ScriptTemplateSelectorProps {
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  scriptContent?: string;
  disabled?: boolean;
}

export function ScriptTemplateSelector({
  selectedTemplateId,
  onTemplateChange,
  scriptContent,
  disabled,
}: ScriptTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ScriptParsingTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ScriptParsingTemplate> | null>(null);
  const [sampleText, setSampleText] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'manual'>('visual');
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load templates
  useEffect(() => {
    setTemplates(getAllTemplates());
  }, []);

  // Auto-detect template when script changes
  const handleAutoDetect = () => {
    if (!scriptContent?.trim()) {
      toast.error('No script content to analyze');
      return;
    }
    
    const result = detectTemplateWithConfidence(scriptContent);
    onTemplateChange(result.template.id);
    toast.success(`Detected: ${result.template.name} (${result.confidence}% confidence)`);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate?.name?.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const newTemplate = saveUserTemplate({
      name: editingTemplate.name,
      description: editingTemplate.description || '',
      pageMarkerPattern: editingTemplate.pageMarkerPattern || '$^',
      panelPattern: editingTemplate.panelPattern || '(\\d+)\\s*[-–—]\\s*(.+)',
      dialoguePattern: editingTemplate.dialoguePattern || '([A-Z]+)\\s*:',
      narrationPattern: editingTemplate.narrationPattern || 'Reads:\\s*(.+)',
      characterNamePattern: editingTemplate.characterNamePattern || '([A-Z]{2,})',
      exampleFormat: editingTemplate.exampleFormat || '',
    });

    setTemplates(getAllTemplates());
    onTemplateChange(newTemplate.id);
    setEditingTemplate(null);
    setShowEditor(false);
    toast.success(`Template "${newTemplate.name}" created!`);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteUserTemplate(id);
    setTemplates(getAllTemplates());
    if (selectedTemplateId === id) {
      onTemplateChange('comic-script');
    }
    toast.success('Template deleted');
  };

  const loadCurrentScript = () => {
    if (scriptContent?.trim()) {
      setSampleText(scriptContent);
      toast.success('Loaded current script as sample');
    } else {
      toast.error('No script content available');
    }
  };

  // Export templates
  const handleExportTemplates = () => {
    const userTemplates = getUserTemplates();
    if (userTemplates.length === 0) {
      toast.error('No custom templates to export');
      return;
    }
    
    const json = exportTemplatesToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${userTemplates.length} template(s)`);
  };

  // Import templates
  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importTemplatesFromJson(content);
      
      if (result.errors.length > 0 && result.imported === 0) {
        toast.error(result.errors[0]);
      } else {
        setTemplates(getAllTemplates());
        if (result.imported > 0) {
          toast.success(`Imported ${result.imported} template(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
        }
        if (result.errors.length > 0) {
          result.errors.forEach(err => toast.warning(err));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedTemplate = getTemplateById(selectedTemplateId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          Script Format
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedTemplateId}
          onValueChange={onTemplateChange}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select format..." />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Built-in Formats
            </div>
            {BUILT_IN_TEMPLATES.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
            {templates.filter(t => !t.isBuiltIn).length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  Custom Templates
                </div>
                {templates.filter(t => !t.isBuiltIn).map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={handleAutoDetect}
          disabled={disabled || !scriptContent?.trim()}
          title="Auto-detect format"
        >
          <Sparkles className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setEditingTemplate({});
            setShowEditor(true);
          }}
          disabled={disabled}
          title="Create custom template"
        >
          <Plus className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowEditor(true)}
          disabled={disabled}
          title="Manage templates"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {selectedTemplate && (
        <p className="text-xs text-muted-foreground">
          {selectedTemplate.description}
        </p>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              {editingTemplate ? 'Create Custom Template' : 'Manage Templates'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Define custom parsing rules for your script format'
                : 'View and manage your script parsing templates'}
            </DialogDescription>
          </DialogHeader>

          {editingTemplate ? (
            <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'visual' | 'manual')} className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="visual" className="flex-1 gap-1.5">
                  <Wand2 className="w-4 h-4" />
                  Visual Builder
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 gap-1.5">
                  <FileCode className="w-4 h-4" />
                  Manual Regex
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual">
                <VisualTemplateBuilder
                  initialTemplate={editingTemplate.name ? {
                    name: editingTemplate.name || '',
                    description: editingTemplate.description || '',
                    pageMarkerPattern: editingTemplate.pageMarkerPattern || '',
                    panelPattern: editingTemplate.panelPattern || '',
                    dialoguePattern: editingTemplate.dialoguePattern || '',
                    narrationPattern: editingTemplate.narrationPattern || '',
                    characterNamePattern: editingTemplate.characterNamePattern || '',
                  } : undefined}
                  onSave={(template) => {
                    const newTemplate = saveUserTemplate({
                      ...template,
                      exampleFormat: '',
                    });
                    setTemplates(getAllTemplates());
                    onTemplateChange(newTemplate.id);
                    setEditingTemplate(null);
                    setShowEditor(false);
                    toast.success(`Template "${newTemplate.name}" created!`);
                  }}
                />
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={editingTemplate.name || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="My Custom Format"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-desc">Description</Label>
                    <Input
                      id="template-desc"
                      value={editingTemplate.description || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page-pattern">Page Marker Pattern (Regex)</Label>
                  <Input
                    id="page-pattern"
                    value={editingTemplate.pageMarkerPattern || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, pageMarkerPattern: e.target.value })}
                    placeholder="PAGE\s*(\d+)"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panel-pattern">Panel Pattern (Regex)</Label>
                  <Input
                    id="panel-pattern"
                    value={editingTemplate.panelPattern || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, panelPattern: e.target.value })}
                    placeholder="(\d+)\s*[-–—]\s*(.+)"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialogue-pattern">Dialogue Pattern (Regex)</Label>
                    <Input
                      id="dialogue-pattern"
                      value={editingTemplate.dialoguePattern || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, dialoguePattern: e.target.value })}
                      placeholder="([A-Z]+)\s*:"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="narration-pattern">Narration Pattern (Regex)</Label>
                    <Input
                      id="narration-pattern"
                      value={editingTemplate.narrationPattern || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, narrationPattern: e.target.value })}
                      placeholder="Reads:\s*(.+)"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="character-pattern">Character Name Pattern (Regex)</Label>
                  <Input
                    id="character-pattern"
                    value={editingTemplate.characterNamePattern || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, characterNamePattern: e.target.value })}
                    placeholder="([A-Z]{2,})"
                    className="font-mono text-sm"
                  />
                </div>

                {/* Sample text for testing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sample-text">Sample Text (for testing)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadCurrentScript}
                      className="text-xs h-6"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Use Current Script
                    </Button>
                  </div>
                  <Textarea
                    id="sample-text"
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    placeholder="Paste sample script text here to test your patterns..."
                    className="font-mono text-sm h-24"
                  />
                </div>

                {/* Live Preview Panel */}
                <TemplatePreviewPanel
                  sampleText={sampleText}
                  patterns={{
                    pageMarkerPattern: editingTemplate.pageMarkerPattern || '$^',
                    panelPattern: editingTemplate.panelPattern || '',
                    dialoguePattern: editingTemplate.dialoguePattern || '',
                    narrationPattern: editingTemplate.narrationPattern || '',
                    characterNamePattern: editingTemplate.characterNamePattern || '',
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {/* Import/Export buttons */}
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json"
                  ref={importInputRef}
                  onChange={handleImportTemplates}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Templates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTemplates}
                  disabled={templates.filter(t => !t.isBuiltIn).length === 0}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Templates
                </Button>
              </div>

              {/* Built-in templates */}
              <div>
                <h4 className="text-sm font-medium mb-2">Built-in Templates</h4>
                <div className="space-y-2">
                  {BUILT_IN_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onTemplateChange(template.id);
                          setShowEditor(false);
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* User templates */}
              {templates.filter(t => !t.isBuiltIn).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Custom Templates</h4>
                  <div className="space-y-2">
                    {templates.filter(t => !t.isBuiltIn).map(template => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onTemplateChange(template.id);
                              setShowEditor(false);
                            }}
                          >
                            Use
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setEditingTemplate({})}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Template
              </Button>
            </div>
          )}

          <DialogFooter>
            {editingTemplate ? (
              <>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Back
                </Button>
                {editorMode === 'manual' && (
                  <Button onClick={handleSaveTemplate}>
                    Save Template
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
