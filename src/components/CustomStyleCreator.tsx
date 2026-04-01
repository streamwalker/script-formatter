import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Wand2, Save, X, Download, Upload, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ART_STYLES, ArtStyle, ArtStyleConfig } from '@/lib/artStyles';
import {
  CustomStyle,
  getCustomStyles,
  createCustomStyle,
  updateCustomStyle,
  deleteCustomStyle,
  customStyleToConfig,
  downloadStyleExport,
  validateStyleImport,
  importCustomStyles,
  readFileAsJson,
  StyleExportPackage,
} from '@/lib/customStyles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const EMOJI_OPTIONS = ['🎨', '✨', '🌟', '💫', '🎭', '🖼️', '🌈', '🔮', '⚡', '🌙', '🔥', '❄️', '🌸', '🍂'];

interface CustomStyleCreatorProps {
  onSelectCustomStyle: (config: ArtStyleConfig) => void;
  disabled?: boolean;
}

export function CustomStyleCreator({ onSelectCustomStyle, disabled }: CustomStyleCreatorProps) {
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promptModifier, setPromptModifier] = useState('');
  const [previewEmoji, setPreviewEmoji] = useState('🎨');
  const [baseStyle, setBaseStyle] = useState<ArtStyle | ''>('');
  
  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPackage, setImportPackage] = useState<StyleExportPackage | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'replace' | 'rename'>('rename');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        const styles = await getCustomStyles();
        setCustomStyles(styles);
      }
    };
    init();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPromptModifier('');
    setPreviewEmoji('🎨');
    setBaseStyle('');
    setEditingStyle(null);
  };

  const openCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (style: CustomStyle) => {
    setEditingStyle(style);
    setName(style.name);
    setDescription(style.description || '');
    setPromptModifier(style.promptModifier);
    setPreviewEmoji(style.previewEmoji);
    setBaseStyle(style.baseStyle || '');
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !promptModifier.trim()) {
      toast.error('Name and prompt modifier are required');
      return;
    }

    if (editingStyle) {
      const success = await updateCustomStyle(editingStyle.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        promptModifier: promptModifier.trim(),
        previewEmoji,
        baseStyle: baseStyle as ArtStyle || undefined,
      });
      
      if (success) {
        const styles = await getCustomStyles();
        setCustomStyles(styles);
        toast.success('Style updated');
        setIsOpen(false);
        resetForm();
      } else {
        toast.error('Failed to update style');
      }
    } else {
      const newStyle = await createCustomStyle(
        name.trim(),
        promptModifier.trim(),
        description.trim() || undefined,
        previewEmoji,
        baseStyle as ArtStyle || undefined
      );
      
      if (newStyle) {
        setCustomStyles(prev => [newStyle, ...prev]);
        toast.success('Custom style created');
        setIsOpen(false);
        resetForm();
      } else {
        toast.error('Failed to create style');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteCustomStyle(id);
    if (success) {
      setCustomStyles(prev => prev.filter(s => s.id !== id));
      toast.success('Style deleted');
    } else {
      toast.error('Failed to delete style');
    }
  };

  const handleExport = () => {
    if (customStyles.length === 0) {
      toast.error('No custom styles to export');
      return;
    }
    downloadStyleExport(customStyles);
    toast.success(`Exported ${customStyles.length} custom style(s)`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readFileAsJson(file);
      const pkg = validateStyleImport(data);
      
      if (!pkg) {
        toast.error('Invalid style export file');
        return;
      }

      setImportPackage(pkg);
      setIsImportOpen(true);
    } catch (error) {
      toast.error('Failed to read file');
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importPackage) return;

    setIsImporting(true);
    const result = await importCustomStyles(importPackage, customStyles, conflictResolution);
    setIsImporting(false);

    if (result.imported > 0) {
      const styles = await getCustomStyles();
      setCustomStyles(styles);
      toast.success(`Imported ${result.imported} style(s)${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}`);
    } else if (result.skipped > 0) {
      toast.info(`Skipped ${result.skipped} existing style(s)`);
    }

    if (result.errors > 0) {
      toast.error(`Failed to import ${result.errors} style(s)`);
    }

    setIsImportOpen(false);
    setImportPackage(null);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-500" />
          <label className="text-sm font-medium text-foreground">Custom Styles</label>
          {customStyles.length > 0 && (
            <span className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
              {customStyles.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {customStyles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <FileJson className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Styles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Styles
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {customStyles.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openCreate} disabled={disabled}>
                <Plus className="h-4 w-4 mr-1" />
                Create Style
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStyle ? 'Edit Custom Style' : 'Create Custom Style'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-[auto,1fr] gap-3 items-center">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setPreviewEmoji(emoji)}
                        className={cn(
                          'w-8 h-8 rounded-md transition-all text-lg',
                          previewEmoji === emoji
                            ? 'bg-primary/20 ring-2 ring-primary'
                            : 'hover:bg-secondary'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="My Custom Style"
                    maxLength={50}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A brief description of this style"
                />
              </div>

              <div>
                <Label htmlFor="baseStyle">Base Style (optional)</Label>
                <Select value={baseStyle} onValueChange={val => setBaseStyle(val as ArtStyle | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start from scratch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Start from scratch</SelectItem>
                    {ART_STYLES.map(style => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.preview} {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Your modifiers will be added to the base style
                </p>
              </div>

              <div>
                <Label htmlFor="promptModifier">Prompt Modifier</Label>
                <Textarea
                  id="promptModifier"
                  value={promptModifier}
                  onChange={e => setPromptModifier(e.target.value)}
                  placeholder="Describe the style characteristics: color palette, line quality, mood, influences..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This text will be added to your image generation prompts
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                {editingStyle ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>

          {/* Import Dialog */}
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Custom Styles</DialogTitle>
              </DialogHeader>
              
              {importPackage && (
                <div className="space-y-4 py-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-sm font-medium">
                      {importPackage.styles.length} style(s) found
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {importPackage.styles.slice(0, 5).map((style, i) => (
                        <span key={i} className="text-xs bg-primary/10 px-2 py-1 rounded-full">
                          {style.previewEmoji || '🎨'} {style.name}
                        </span>
                      ))}
                      {importPackage.styles.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{importPackage.styles.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">If a style with the same name exists:</Label>
                    <RadioGroup
                      value={conflictResolution}
                      onValueChange={val => setConflictResolution(val as typeof conflictResolution)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rename" id="rename" />
                        <Label htmlFor="rename" className="text-sm font-normal">
                          Rename imported style
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="replace" id="replace" />
                        <Label htmlFor="replace" className="text-sm font-normal">
                          Replace existing style
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="skip" id="skip" />
                        <Label htmlFor="skip" className="text-sm font-normal">
                          Skip duplicates
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {customStyles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {customStyles.map(style => (
            <div
              key={style.id}
              className={cn(
                'group relative p-4 rounded-xl border-2 transition-all',
                'border-violet-500/30 bg-violet-500/5 hover:border-violet-500/60',
                disabled && 'opacity-50'
              )}
            >
              <button
                onClick={() => onSelectCustomStyle(customStyleToConfig(style))}
                disabled={disabled}
                className="w-full text-left"
              >
                <div className="text-3xl mb-2">{style.previewEmoji}</div>
                <h3 className="font-semibold text-foreground text-sm">{style.name}</h3>
                {style.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {style.description}
                  </p>
                )}
                {style.baseStyle && (
                  <span className="text-xs text-violet-500 mt-1 inline-block">
                    Based on {style.baseStyle}
                  </span>
                )}
              </button>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => openEdit(style)}
                  className="p-1 rounded hover:bg-violet-500/20"
                >
                  <Pencil className="h-3 w-3 text-violet-500" />
                </button>
                <button
                  onClick={() => handleDelete(style.id)}
                  className="p-1 rounded hover:bg-destructive/20"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
