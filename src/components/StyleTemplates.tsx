import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { StyleMix, getStyleById } from '@/lib/artStyles';
import { StoryGenre } from '@/lib/styleRecommendations';
import { 
  STYLE_TEMPLATES, 
  StyleTemplate, 
  getTemplatesByGenre, 
  applyTemplate,
  getRecommendedTemplates,
  getAllGenres 
} from '@/lib/styleTemplates';

interface StyleTemplatesProps {
  onApplyTemplate: (mix: StyleMix, promptModifier: string) => void;
  disabled?: boolean;
  scriptContent?: string;
}

export function StyleTemplates({ onApplyTemplate, disabled, scriptContent }: StyleTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  
  const genres = useMemo(() => getAllGenres(), []);
  
  const filteredTemplates = useMemo(() => {
    if (selectedGenre === 'all') return STYLE_TEMPLATES;
    return getTemplatesByGenre(selectedGenre as StoryGenre);
  }, [selectedGenre]);
  
  const recommendedTemplates = useMemo(() => {
    if (!scriptContent) return [];
    return getRecommendedTemplates(scriptContent);
  }, [scriptContent]);
  
  const handleApply = (template: StyleTemplate) => {
    const mix = applyTemplate(template);
    const primaryConfig = getStyleById(mix.primaryStyle);
    const secondaryConfig = getStyleById(mix.secondaryStyle);
    
    const promptModifier = `${primaryConfig?.promptModifier || ''} blended with ${secondaryConfig?.promptModifier || ''}, ${mix.primaryIntensity}% primary influence, ${mix.secondaryIntensity}% secondary influence`;
    
    onApplyTemplate(mix, promptModifier);
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Style Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recommendations */}
          {recommendedTemplates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Recommended for your script
              </div>
              <div className="flex gap-2 flex-wrap">
                {recommendedTemplates.slice(0, 3).map(template => (
                  <Button
                    key={template.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApply(template)}
                    className="gap-2"
                  >
                    <span>{template.icon}</span>
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Genre Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by genre:</span>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre} className="capitalize">
                    {genre.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Templates Grid */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  onApply={() => handleApply(template)} 
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: StyleTemplate;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const primaryConfig = getStyleById(template.primaryStyle);
  const secondaryConfig = getStyleById(template.secondaryStyle);
  
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <h3 className="font-medium">{template.name}</h3>
            <Badge variant="secondary" className="text-xs capitalize">
              {template.genre.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">{template.description}</p>
      
      {/* Style Blend Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex-1 truncate" title={primaryConfig?.name}>
            {primaryConfig?.preview} {primaryConfig?.name}
          </span>
          <span className="text-muted-foreground">{template.primaryIntensity}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          <div 
            className="bg-primary h-full" 
            style={{ width: `${template.primaryIntensity}%` }} 
          />
          <div 
            className="bg-secondary h-full" 
            style={{ width: `${template.secondaryIntensity}%` }} 
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex-1 truncate" title={secondaryConfig?.name}>
            {secondaryConfig?.preview} {secondaryConfig?.name}
          </span>
          <span className="text-muted-foreground">{template.secondaryIntensity}%</span>
        </div>
      </div>
      
      {/* Mood Keywords */}
      <div className="flex flex-wrap gap-1">
        {template.moodKeywords.slice(0, 3).map(keyword => (
          <Badge key={keyword} variant="outline" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
      
      <Button onClick={onApply} size="sm" className="w-full">
        Apply Template
      </Button>
    </div>
  );
}
