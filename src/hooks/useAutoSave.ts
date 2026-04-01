import { useEffect, useRef, useCallback, useState } from 'react';
import { autoSaveVersion, ProjectSnapshot } from '@/lib/projectVersioning';

interface UseAutoSaveOptions {
  projectId: string | null;
  getSnapshot: () => ProjectSnapshot;
  intervalMinutes?: number;
  enabled?: boolean;
  onSaveStart?: () => void;
  onSaveComplete?: (success: boolean) => void;
}

interface AutoSaveState {
  lastSaveTime: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: Error | null;
}

export function useAutoSave({
  projectId,
  getSnapshot,
  intervalMinutes = 5,
  enabled = true,
  onSaveStart,
  onSaveComplete,
}: UseAutoSaveOptions) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaveTime: null,
    isSaving: false,
    hasUnsavedChanges: false,
    error: null,
  });

  const lastSnapshotRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Check if current state differs from last saved
  const checkForChanges = useCallback(() => {
    if (!projectId) return false;
    
    const currentSnapshot = JSON.stringify(getSnapshot());
    const hasChanges = currentSnapshot !== lastSnapshotRef.current;
    
    setState(prev => ({ ...prev, hasUnsavedChanges: hasChanges }));
    return hasChanges;
  }, [projectId, getSnapshot]);

  // Perform auto-save
  const performAutoSave = useCallback(async (isManual = false) => {
    if (!projectId || !enabled) return false;
    
    // Check for changes before saving (unless manual save)
    if (!isManual && !checkForChanges()) {
      return false;
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));
    onSaveStart?.();

    try {
      const snapshot = getSnapshot();
      const { success, error } = await autoSaveVersion(projectId, snapshot);
      
      if (success) {
        lastSnapshotRef.current = JSON.stringify(snapshot);
        setState(prev => ({
          ...prev,
          lastSaveTime: new Date(),
          isSaving: false,
          hasUnsavedChanges: false,
          error: null,
        }));
        onSaveComplete?.(true);
        return true;
      } else {
        setState(prev => ({ 
          ...prev, 
          isSaving: false, 
          error: error || new Error('Auto-save failed') 
        }));
        onSaveComplete?.(false);
        return false;
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isSaving: false, 
        error: err as Error 
      }));
      onSaveComplete?.(false);
      return false;
    }
  }, [projectId, enabled, checkForChanges, getSnapshot, onSaveStart, onSaveComplete]);

  // Manual save trigger
  const saveNow = useCallback(() => {
    return performAutoSave(true);
  }, [performAutoSave]);

  // Initialize and set up interval
  useEffect(() => {
    if (!enabled || !projectId) {
      isInitializedRef.current = false;
      return;
    }

    // Initialize snapshot on first run
    if (!isInitializedRef.current) {
      lastSnapshotRef.current = JSON.stringify(getSnapshot());
      isInitializedRef.current = true;
    }

    // Set up auto-save interval
    const intervalMs = intervalMinutes * 60 * 1000;
    saveTimeoutRef.current = setInterval(() => {
      performAutoSave();
    }, intervalMs);

    // Check for changes every 30 seconds to update UI
    const changeCheckInterval = setInterval(checkForChanges, 30000);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
      clearInterval(changeCheckInterval);
    };
  }, [enabled, projectId, intervalMinutes, performAutoSave, getSnapshot, checkForChanges]);

  // Reset when project changes
  useEffect(() => {
    if (projectId) {
      lastSnapshotRef.current = '';
      isInitializedRef.current = false;
      setState({
        lastSaveTime: null,
        isSaving: false,
        hasUnsavedChanges: false,
        error: null,
      });
    }
  }, [projectId]);

  return {
    ...state,
    saveNow,
    checkForChanges,
  };
}

// Format time since last save
export function formatTimeSince(date: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  return date.toLocaleDateString();
}
