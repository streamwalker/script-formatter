import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, Upload, X, Users, ImagePlus, Tag } from 'lucide-react';
import { toast } from 'sonner';

export interface LabeledReferenceImage {
  image: string; // base64
  characterName: string; // e.g., "ORION", "POSEIDON"
}

interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  referenceImages: string[]; // legacy base64 images
  labeledImages?: LabeledReferenceImage[]; // new labeled format
}

interface CharacterContextProps {
  value: string;
  onChange: (value: string) => void;
  referenceImages: string[];
  onReferenceImagesChange: (images: string[]) => void;
  labeledImages?: LabeledReferenceImage[];
  onLabeledImagesChange?: (images: LabeledReferenceImage[]) => void;
  disabled?: boolean;
}

const STORAGE_KEY = 'comic-character-presets';

export function CharacterContext({
  value,
  onChange,
  referenceImages,
  onReferenceImagesChange,
  labeledImages = [],
  onLabeledImagesChange,
  disabled
}: CharacterContextProps) {
  const [presets, setPresets] = useState<CharacterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresets = (newPresets: CharacterPreset[]) => {
    setPresets(newPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    if (!value.trim()) {
      toast.error('No character description to save');
      return;
    }

    const newPreset: CharacterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      description: value,
      referenceImages: referenceImages,
      labeledImages: labeledImages,
    };

    savePresets([...presets, newPreset]);
    setPresetName('');
    setShowSaveInput(false);
    toast.success(`Preset "${newPreset.name}" saved!`);
  };

  const handleLoadPreset = (preset: CharacterPreset) => {
    onChange(preset.description);
    onReferenceImagesChange(preset.referenceImages);
    if (onLabeledImagesChange && preset.labeledImages) {
      onLabeledImagesChange(preset.labeledImages);
    }
    toast.success(`Loaded "${preset.name}"`);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    savePresets(updated);
    toast.success('Preset deleted');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newImages: string[] = [];
    const newLabeledImages: LabeledReferenceImage[] = [];
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      newImages.push(base64);
      // Extract name from filename (e.g., "orion.png" -> "ORION")
      const nameFromFile = file.name.replace(/\.[^/.]+$/, '').toUpperCase().replace(/[_-]/g, ' ');
      newLabeledImages.push({
        image: base64,
        characterName: nameFromFile || `CHARACTER ${labeledImages.length + newLabeledImages.length + 1}`,
      });
    }

    if (newImages.length > 0) {
      onReferenceImagesChange([...referenceImages, ...newImages]);
      if (onLabeledImagesChange) {
        onLabeledImagesChange([...labeledImages, ...newLabeledImages]);
      }
      toast.success(`Added ${newImages.length} reference image(s). Click on image labels to set character names.`);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const updated = referenceImages.filter((_, i) => i !== index);
    onReferenceImagesChange(updated);
    if (onLabeledImagesChange) {
      const updatedLabeled = labeledImages.filter((_, i) => i !== index);
      onLabeledImagesChange(updatedLabeled);
    }
  };

  const updateImageLabel = (index: number, newName: string) => {
    if (!onLabeledImagesChange) return;
    const updated = labeledImages.map((img, i) => 
      i === index ? { ...img, characterName: newName.toUpperCase() } : img
    );
    onLabeledImagesChange(updated);
  };

  const handleLabelSave = (index: number) => {
    if (editingName.trim()) {
      updateImageLabel(index, editingName.trim());
    }
    setEditingImageIndex(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      {/* Header with presets */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </span>
          Character Descriptions
        </label>
        
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <select
              className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground"
              onChange={(e) => {
                const preset = presets.find(p => p.id === e.target.value);
                if (preset) handleLoadPreset(preset);
                e.target.value = '';
              }}
              value=""
              disabled={disabled}
            >
              <option value="">Load preset...</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveInput(!showSaveInput)}
            disabled={disabled || !value.trim()}
            className="text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Save preset input */}
      {showSaveInput && (
        <div className="flex gap-2 animate-fade-in">
          <Input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
          />
          <Button size="sm" onClick={handleSavePreset} className="h-8">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveInput(false)} className="h-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Character description textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your main characters for visual consistency. Use the format:&#10;&#10;POSEIDON: Tall muscular man with long white hair, blue trident, golden armor, piercing blue eyes&#10;&#10;ORION: Young hero with blonde hair, lightning powers, blue and silver suit"
        className="w-full h-32 p-4 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none font-mono text-sm"
        disabled={disabled}
      />

      {/* Reference images section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <ImagePlus className="w-3 h-3" />
            Reference Images (label each with character name)
          </label>
          <label className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={disabled}
            />
            <span className="text-xs text-primary hover:underline flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload images
            </span>
          </label>
        </div>

        {/* Image previews with labels */}
        {referenceImages.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {referenceImages.map((img, index) => {
              const labeledImage = labeledImages[index];
              const characterName = labeledImage?.characterName || `REF ${index + 1}`;
              const isEditing = editingImageIndex === index;
              
              return (
                <div key={index} className="relative group flex flex-col items-center gap-1">
                  <img
                    src={img}
                    alt={`Reference ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                  
                  {/* Character name label */}
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Name..."
                        className="h-6 w-20 text-xs px-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLabelSave(index);
                          if (e.key === 'Escape') {
                            setEditingImageIndex(null);
                            setEditingName('');
                          }
                        }}
                        onBlur={() => handleLabelSave(index)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingImageIndex(index);
                        setEditingName(characterName);
                      }}
                      className="flex items-center gap-1 text-xs bg-accent/30 hover:bg-accent/50 px-2 py-0.5 rounded-full text-foreground transition-colors"
                      title="Click to edit character name"
                    >
                      <Tag className="w-3 h-3" />
                      {characterName}
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Upload character reference images and label them with character names (e.g., ORION, POSEIDON) for accurate character matching in panels.
        </p>
      </div>

      {/* Saved presets list */}
      {presets.length > 0 && (
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2">Saved presets:</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
              <div 
                key={preset.id}
                className="flex items-center gap-1 bg-secondary/50 rounded-full pl-3 pr-1 py-1 text-xs group"
              >
                <button
                  onClick={() => handleLoadPreset(preset)}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {preset.name}
                  {(preset.labeledImages?.length || preset.referenceImages.length) > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({preset.labeledImages?.length || preset.referenceImages.length} img)
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="p-1 hover:bg-destructive/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
