import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Copy, 
  Check,
  FileJson,
  Image as ImageIcon,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { CharacterProfileData } from '@/components/CharacterProfileEditor';
import { KeyFeatures } from '@/lib/characterConsistencyModel';

interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];
  poses?: { id: string; image: string; poseType: string; tags: string[] }[];
  profile?: CharacterProfileData;
}

interface ExportedProfile {
  version: string;
  exportedAt: string;
  profiles: {
    name: string;
    description: string;
    keyFeatures?: KeyFeatures;
    consistencyWeight?: number;
    referenceImages?: string[];
  }[];
}

interface ProfileExportDialogProps {
  characters: CharacterPreset[];
  trigger?: React.ReactNode;
}

export function ProfileExportDialog({ characters, trigger }: ProfileExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState<'profile' | 'with-refs' | 'full'>('profile');
  const [copied, setCopied] = useState(false);

  const handleSelectAll = () => {
    if (selectedIds.size === characters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(characters.map(c => c.id)));
    }
  };

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const generateExportData = (): ExportedProfile => {
    const selectedCharacters = characters.filter(c => selectedIds.has(c.id));
    
    const profiles = selectedCharacters.map(char => {
      const base: ExportedProfile['profiles'][0] = {
        name: char.name,
        description: char.description,
      };

      if (char.profile) {
        base.keyFeatures = char.profile.keyFeatures;
        base.consistencyWeight = char.profile.consistencyWeight;
      }

      if (exportMode === 'with-refs' || exportMode === 'full') {
        base.referenceImages = char.poses?.map(p => p.image) || char.referenceImages || [];
      }

      return base;
    });

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profiles,
    };
  };

  const handleDownload = () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one character');
      return;
    }

    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-profiles-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedIds.size} profile(s)`);
    setIsOpen(false);
  };

  const handleCopyToClipboard = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one character');
      return;
    }

    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const getEstimatedSize = () => {
    if (selectedIds.size === 0) return '0 KB';
    
    const data = generateExportData();
    const json = JSON.stringify(data);
    const bytes = new Blob([json]).size;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const charactersWithProfiles = characters.filter(c => c.profile);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export Profiles
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Export Character Profiles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Mode */}
          <div className="space-y-2">
            <Label>What to include</Label>
            <RadioGroup value={exportMode} onValueChange={(v) => setExportMode(v as typeof exportMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="profile" id="profile" />
                <Label htmlFor="profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile only (smallest)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="with-refs" id="with-refs" />
                <Label htmlFor="with-refs" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  With reference images
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  Full character data
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Character Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select characters</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAll}
                className="h-auto py-1"
              >
                {selectedIds.size === characters.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              <div className="space-y-2">
                {characters.map(char => (
                  <div 
                    key={char.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(char.id) ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggle(char.id)}
                  >
                    <Checkbox 
                      checked={selectedIds.has(char.id)}
                      onCheckedChange={() => handleToggle(char.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{char.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {char.profile ? 'Has profile' : 'No profile'}
                        {char.poses?.length ? ` • ${char.poses.length} poses` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
            <span>{selectedIds.size} selected</span>
            <span>~{getEstimatedSize()}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopyToClipboard}
              disabled={selectedIds.size === 0}
              className="flex-1 gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={selectedIds.size === 0}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
