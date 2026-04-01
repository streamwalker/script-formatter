import { useState } from 'react';
import { Columns, Loader2, RefreshCw, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ART_STYLES, ArtStyle, getStyleById } from '@/lib/artStyles';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StyleComparisonProps {
  disabled?: boolean;
  onSelectStyle?: (style: ArtStyle) => void;
}

interface ComparisonSlot {
  styleId: ArtStyle;
  imageUrl?: string;
  isLoading: boolean;
}

const MAX_SLOTS = 4;

export function StyleComparison({ disabled, onSelectStyle }: StyleComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sceneDescription, setSceneDescription] = useState('A heroic figure standing on a rooftop at sunset');
  const [slots, setSlots] = useState<ComparisonSlot[]>([
    { styleId: 'western', isLoading: false },
    { styleId: 'manga', isLoading: false },
  ]);

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    
    // Find a style not already selected
    const usedStyles = slots.map(s => s.styleId);
    const availableStyle = ART_STYLES.find(s => !usedStyles.includes(s.id));
    
    if (availableStyle) {
      setSlots(prev => [...prev, { styleId: availableStyle.id, isLoading: false }]);
    }
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 2) return;
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlotStyle = (index: number, styleId: ArtStyle) => {
    setSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, styleId, imageUrl: undefined } : slot
    ));
  };

  const generatePreview = async (index: number) => {
    const slot = slots[index];
    const style = getStyleById(slot.styleId);

    setSlots(prev => prev.map((s, i) => 
      i === index ? { ...s, isLoading: true } : s
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-style-preview', {
        body: {
          stylePrompt: `${style.promptModifier}. Scene: ${sceneDescription}`,
          styleName: style.name,
        },
      });

      if (error) throw error;

      setSlots(prev => prev.map((s, i) => 
        i === index ? { ...s, isLoading: false, imageUrl: data.previewImage } : s
      ));
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
      setSlots(prev => prev.map((s, i) => 
        i === index ? { ...s, isLoading: false } : s
      ));
    }
  };

  const generateAllPreviews = async () => {
    for (let i = 0; i < slots.length; i++) {
      await generatePreview(i);
    }
  };

  const handleSelectStyle = (styleId: ArtStyle) => {
    onSelectStyle?.(styleId);
    setIsOpen(false);
    toast.success(`Selected ${getStyleById(styleId).name} style`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Columns className="h-4 w-4 mr-2" />
          Compare Styles
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Art Styles</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="scene">Scene Description</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="scene"
                value={sceneDescription}
                onChange={e => setSceneDescription(e.target.value)}
                placeholder="Describe the scene to compare across styles..."
                className="flex-1"
              />
              <Button onClick={generateAllPreviews} disabled={!sceneDescription.trim()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate All
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Comparing:</span>
            {slots.map((slot, index) => (
              <div key={index} className="flex items-center gap-1">
                <Select
                  value={slot.styleId}
                  onValueChange={val => updateSlotStyle(index, val as ArtStyle)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ART_STYLES.map(style => (
                      <SelectItem
                        key={style.id}
                        value={style.id}
                        disabled={slots.some((s, i) => i !== index && s.styleId === style.id)}
                      >
                        {style.preview} {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {slots.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeSlot(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {slots.length < MAX_SLOTS && (
              <Button variant="outline" size="sm" onClick={addSlot}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>

          <div className={cn(
            'grid gap-4',
            slots.length === 2 && 'grid-cols-2',
            slots.length === 3 && 'grid-cols-3',
            slots.length === 4 && 'grid-cols-2 sm:grid-cols-4'
          )}>
            {slots.map((slot, index) => {
              const style = getStyleById(slot.styleId);
              return (
                <div
                  key={index}
                  className="rounded-xl border border-border overflow-hidden bg-secondary/20"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{style.preview}</span>
                      <span className="font-medium text-sm">{style.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => generatePreview(index)}
                      disabled={slot.isLoading}
                    >
                      {slot.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="aspect-square relative bg-secondary/50">
                    {slot.isLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : slot.imageUrl ? (
                      <img
                        src={slot.imageUrl}
                        alt={`${style.name} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <span className="text-6xl opacity-30">{style.preview}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSelectStyle(slot.styleId)}
                    >
                      Use This Style
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
