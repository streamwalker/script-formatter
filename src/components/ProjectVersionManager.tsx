import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  History,
  Plus,
  RotateCcw,
  Trash2,
  Loader2,
  Clock,
  Layers,
  Palette,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  ProjectVersion,
  ProjectSnapshot,
  getProjectVersions,
  createVersion,
  deleteVersion,
  compareVersions,
  VersionDiff,
} from '@/lib/projectVersioning';

interface ProjectVersionManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  currentSnapshot: ProjectSnapshot | null;
  onRestore: (snapshot: ProjectSnapshot) => void;
}

export function ProjectVersionManager({
  open,
  onOpenChange,
  projectId,
  currentSnapshot,
  onRestore,
}: ProjectVersionManagerProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<ProjectVersion | null>(null);

  // Create form state
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');

  useEffect(() => {
    if (open && projectId) {
      loadVersions();
    }
  }, [open, projectId]);

  const loadVersions = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    const { versions: loadedVersions, error } = await getProjectVersions(projectId);
    
    if (error) {
      toast.error('Failed to load versions');
      console.error(error);
    } else {
      setVersions(loadedVersions);
    }
    
    setIsLoading(false);
  };

  const handleCreateVersion = async () => {
    if (!projectId || !currentSnapshot) return;
    
    setIsSaving(true);
    
    const { version, error } = await createVersion(
      projectId,
      currentSnapshot,
      newVersionName || undefined,
      newVersionDescription || undefined,
      false
    );
    
    if (version) {
      toast.success(`Version ${version.version_number} created`);
      setVersions(prev => [version, ...prev]);
      setShowCreateDialog(false);
      setNewVersionName('');
      setNewVersionDescription('');
    } else {
      toast.error('Failed to create version');
      console.error(error);
    }
    
    setIsSaving(false);
  };

  const handleRestore = () => {
    if (!selectedVersion) return;
    
    onRestore(selectedVersion.snapshot);
    toast.success(`Restored to version ${selectedVersion.version_number}`);
    setShowRestoreDialog(false);
    setSelectedVersion(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!versionToDelete) return;
    
    const { success, error } = await deleteVersion(versionToDelete.id);
    
    if (success) {
      toast.success('Version deleted');
      setVersions(prev => prev.filter(v => v.id !== versionToDelete.id));
    } else {
      toast.error('Failed to delete version');
      console.error(error);
    }
    
    setShowDeleteDialog(false);
    setVersionToDelete(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVersionStats = (snapshot: ProjectSnapshot) => {
    const panelCount = snapshot.pages?.reduce((acc, p) => acc + p.panels.length, 0) || 0;
    const imageCount = Object.keys(snapshot.panel_images || {}).length;
    return { panelCount, imageCount };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Project Versions
            </DialogTitle>
            <DialogDescription>
              Save and restore different versions of your comic project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create new version button */}
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!currentSnapshot || !projectId}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Current Version
            </Button>

            {/* Versions list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No versions saved yet</p>
                <p className="text-sm">Save a version to track your progress</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {versions.map((version) => {
                    const stats = getVersionStats(version.snapshot);
                    
                    return (
                      <div
                        key={version.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                v{version.version_number}
                              </span>
                              {version.version_name && (
                                <span className="text-sm truncate">
                                  - {version.version_name}
                                </span>
                              )}
                              {version.is_auto_save && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  <RefreshCw className="w-2 h-2 mr-1" />
                                  Auto
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(version.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {stats.panelCount} panels
                              </span>
                              <span className="flex items-center gap-1">
                                <Palette className="w-3 h-3" />
                                {version.snapshot.art_style}
                              </span>
                            </div>
                            
                            {version.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {version.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedVersion(version);
                                setShowRestoreDialog(true);
                              }}
                              title="Restore this version"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setVersionToDelete(version);
                                setShowDeleteDialog(true);
                              }}
                              title="Delete version"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Auto-saves are created every 5 minutes (last 5 kept)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Version Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save New Version</DialogTitle>
            <DialogDescription>
              Create a named snapshot of your current project state.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-name">Version Name (optional)</Label>
              <Input
                id="version-name"
                placeholder="e.g., After character redesign"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="version-description">Description (optional)</Label>
              <Textarea
                id="version-description"
                placeholder="What changes does this version include?"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Version'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current project state with version {selectedVersion?.version_number}
              {selectedVersion?.version_name && ` (${selectedVersion.version_name})`}.
              <br /><br />
              <strong>Your current unsaved changes will be lost.</strong> Consider saving the current state as a new version first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete version {versionToDelete?.version_number}
              {versionToDelete?.version_name && ` (${versionToDelete.version_name})`}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
