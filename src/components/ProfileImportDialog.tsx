import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileJson,
  AlertTriangle,
  Check,
  X,
  Plus
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

interface ImportedProfile {
  name: string;
  description: string;
  keyFeatures?: KeyFeatures;
  consistencyWeight?: number;
  referenceImages?: string[];
}

interface ImportData {
  version: string;
  exportedAt: string;
  profiles: ImportedProfile[];
}

type ConflictResolution = 'skip' | 'replace' | 'merge' | 'rename';

interface ProfileImportDialogProps {
  existingCharacters: CharacterPreset[];
  onImport: (characters: CharacterPreset[]) => void;
  trigger?: React.ReactNode;
}

export function ProfileImportDialog({ 
  existingCharacters, 
  onImport, 
  trigger 
}: ProfileImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [conflicts, setConflicts] = useState<Map<string, ConflictResolution>>(new Map());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ImportData;
        
        // Validate structure
        if (!data.version || !Array.isArray(data.profiles)) {
          throw new Error('Invalid file format');
        }

        setImportData(data);
        
        // Detect conflicts
        const newConflicts = new Map<string, ConflictResolution>();
        data.profiles.forEach(profile => {
          const existing = existingCharacters.find(
            c => c.name.toLowerCase() === profile.name.toLowerCase()
          );
          if (existing) {
            newConflicts.set(profile.name, 'skip'); // Default to skip
          }
        });
        setConflicts(newConflicts);
        
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Invalid file format');
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleFileSelect(file);
    } else {
      toast.error('Please drop a JSON file');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleResolutionChange = (name: string, resolution: ConflictResolution) => {
    const newConflicts = new Map(conflicts);
    newConflicts.set(name, resolution);
    setConflicts(newConflicts);
  };

  const handleImport = () => {
    if (!importData) return;

    const newCharacters: CharacterPreset[] = [];
    let skippedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    importData.profiles.forEach(profile => {
      const existingChar = existingCharacters.find(
        c => c.name.toLowerCase() === profile.name.toLowerCase()
      );
      
      if (existingChar) {
        const resolution = conflicts.get(profile.name) || 'skip';
        
        switch (resolution) {
          case 'skip':
            skippedCount++;
            break;
            
          case 'replace':
            // Create updated version of existing character
            newCharacters.push({
              ...existingChar,
              description: profile.description,
              profile: profile.keyFeatures ? {
                id: existingChar.id,
                name: existingChar.name,
                description: existingChar.description,
                keyFeatures: profile.keyFeatures,
                consistencyWeight: profile.consistencyWeight || 0.7,
              } : undefined,
              referenceImages: profile.referenceImages || existingChar.referenceImages,
              poses: profile.referenceImages?.map((img, i) => ({
                id: `imported-${Date.now()}-${i}`,
                image: img,
                poseType: 'custom' as const,
                tags: [],
              })) || existingChar.poses,
            });
            updatedCount++;
            break;
            
          case 'merge':
            // Merge profiles - keep existing, add new data
            const mergedProfile = existingChar.profile ? {
              id: existingChar.id,
              name: existingChar.name,
              description: existingChar.description,
              keyFeatures: {
                ...existingChar.profile.keyFeatures,
                ...profile.keyFeatures,
              },
              consistencyWeight: profile.consistencyWeight || existingChar.profile.consistencyWeight,
            } : profile.keyFeatures ? {
              id: existingChar.id,
              name: existingChar.name,
              description: existingChar.description,
              keyFeatures: profile.keyFeatures,
              consistencyWeight: profile.consistencyWeight || 0.7,
            } : undefined;
            
            newCharacters.push({
              ...existingChar,
              profile: mergedProfile,
              // Add new reference images to existing
              referenceImages: [
                ...existingChar.referenceImages,
                ...(profile.referenceImages || []),
              ],
              poses: [
                ...(existingChar.poses || []),
                ...(profile.referenceImages?.map((img, i) => ({
                  id: `imported-${Date.now()}-${i}`,
                  image: img,
                  poseType: 'custom' as const,
                  tags: [],
                })) || []),
              ],
            });
            updatedCount++;
            break;
            
          case 'rename':
            // Add as new with modified name
            newCharacters.push({
              id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${profile.name} (imported)`,
              description: profile.description,
              referenceImages: profile.referenceImages || [],
              poses: profile.referenceImages?.map((img, i) => ({
                id: `imported-${Date.now()}-${i}`,
                image: img,
                poseType: 'custom' as const,
                tags: [],
              })),
              profile: profile.keyFeatures ? {
                id: `imported-${Date.now()}`,
                name: `${profile.name} (imported)`,
                description: profile.description,
                keyFeatures: profile.keyFeatures,
                consistencyWeight: profile.consistencyWeight || 0.7,
              } : undefined,
            });
            addedCount++;
            break;
        }
      } else {
        // No conflict, add new character
        newCharacters.push({
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: profile.name,
          description: profile.description,
          referenceImages: profile.referenceImages || [],
          poses: profile.referenceImages?.map((img, i) => ({
            id: `imported-${Date.now()}-${i}`,
            image: img,
            poseType: 'custom' as const,
            tags: [],
          })),
          profile: profile.keyFeatures ? {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: profile.name,
            description: profile.description,
            keyFeatures: profile.keyFeatures,
            consistencyWeight: profile.consistencyWeight || 0.7,
          } : undefined,
        });
        addedCount++;
      }
    });

    onImport(newCharacters);
    
    const messages = [];
    if (addedCount > 0) messages.push(`${addedCount} added`);
    if (updatedCount > 0) messages.push(`${updatedCount} updated`);
    if (skippedCount > 0) messages.push(`${skippedCount} skipped`);
    
    toast.success(`Import complete: ${messages.join(', ')}`);
    setIsOpen(false);
    setImportData(null);
    setConflicts(new Map());
  };

  const conflictCount = conflicts.size;
  const profileCount = importData?.profiles.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Import Profiles
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Character Profiles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!importData ? (
            // File Upload
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleInputChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Drop a JSON file here or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports exported character profiles
              </p>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{profileCount} profile(s) found</span>
                  {conflictCount > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {conflictCount} conflicts
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Exported: {new Date(importData.exportedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Profile List */}
              <ScrollArea className="h-[250px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {importData.profiles.map((profile, idx) => {
                    const hasConflict = conflicts.has(profile.name);
                    const resolution = conflicts.get(profile.name);
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          hasConflict ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{profile.name}</span>
                          {hasConflict ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
                              Conflict
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-500/50">
                              <Plus className="h-3 w-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {profile.description}
                        </p>

                        {/* Features info */}
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {profile.keyFeatures && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">Has Profile</span>
                          )}
                          {profile.referenceImages?.length ? (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              {profile.referenceImages.length} images
                            </span>
                          ) : null}
                        </div>

                        {/* Conflict Resolution */}
                        {hasConflict && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <Label className="text-xs mb-2 block">Resolution:</Label>
                            <RadioGroup 
                              value={resolution} 
                              onValueChange={(v) => handleResolutionChange(profile.name, v as ConflictResolution)}
                              className="grid grid-cols-2 gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="skip" id={`skip-${idx}`} />
                                <Label htmlFor={`skip-${idx}`} className="text-xs cursor-pointer">Skip</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="replace" id={`replace-${idx}`} />
                                <Label htmlFor={`replace-${idx}`} className="text-xs cursor-pointer">Replace</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="merge" id={`merge-${idx}`} />
                                <Label htmlFor={`merge-${idx}`} className="text-xs cursor-pointer">Merge</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="rename" id={`rename-${idx}`} />
                                <Label htmlFor={`rename-${idx}`} className="text-xs cursor-pointer">Add New</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImportData(null);
                    setConflicts(new Map());
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Import
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
