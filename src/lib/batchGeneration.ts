import { ParsedPanel } from './scriptParser';
import { EmotionState, getEmotionById } from './characterMoods';

export interface BatchConfig {
  batchSize: number;
  enableMoodProgression: boolean;
  consistencyBoost: boolean;
  pauseBetweenBatches: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 4,
  enableMoodProgression: true,
  consistencyBoost: true,
  pauseBetweenBatches: 1000,
};

export type PanelStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface BatchProgress {
  totalPanels: number;
  completedPanels: number;
  currentBatch: number;
  totalBatches: number;
  panelStatuses: Record<string, PanelStatus>;
  estimatedTimeRemaining: number;
  isPaused: boolean;
}

export interface MoodProgressionPlan {
  characterName: string;
  panelMoods: Array<{
    panelKey: string;
    moodId: string;
    moodName: string;
    transitionType: 'stable' | 'shift' | 'dramatic';
  }>;
}

export interface BatchPanelRequest {
  panelKey: string;
  pageNumber: number;
  panelIndex: number;
  prompt: string;
  characters: string[];
  mood?: string;
  compositionNotes?: string;
}

export interface BatchGenerationResult {
  panelKey: string;
  success: boolean;
  imageData?: string;
  error?: string;
  characterContext?: string;
}

// Create batches from panels for sequential processing
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// Calculate optimal batch size based on complexity
export function calculateOptimalBatchSize(panelCount: number, characterCount: number): number {
  // More characters = smaller batches for better consistency
  if (characterCount > 5) return 2;
  if (characterCount > 3) return 3;
  if (panelCount > 12) return 4;
  return Math.min(4, Math.ceil(panelCount / 3));
}

// Detect mood transitions between consecutive panels
function detectTransitionType(prevMood?: string, currentMood?: string): 'stable' | 'shift' | 'dramatic' {
  if (!prevMood || !currentMood) return 'stable';
  if (prevMood === currentMood) return 'stable';
  
  const prevMoodData = getEmotionById(prevMood);
  const currentMoodData = getEmotionById(currentMood);
  
  if (!prevMoodData || !currentMoodData) return 'shift';
  
  // Dramatic if switching between opposite categories
  const opposites: Record<string, string> = {
    positive: 'negative',
    negative: 'positive',
    neutral: 'intense',
    intense: 'neutral',
  };
  
  if (opposites[prevMoodData.category] === currentMoodData.category) {
    return 'dramatic';
  }
  
  return 'shift';
}

// Build mood progression plan from panels
export function buildMoodProgression(
  panels: Array<{ panelKey: string; characters: string[] }>,
  characterMoods: Record<string, string>
): MoodProgressionPlan[] {
  const characterPanels: Record<string, Array<{ panelKey: string; index: number }>> = {};
  
  // Group panels by character
  panels.forEach((panel, index) => {
    panel.characters.forEach(char => {
      if (!characterPanels[char]) {
        characterPanels[char] = [];
      }
      characterPanels[char].push({ panelKey: panel.panelKey, index });
    });
  });
  
  // Build progression for each character
  return Object.entries(characterPanels).map(([characterName, appearances]) => {
    const currentMoodId = characterMoods[characterName] || 'neutral';
    const currentMood = getEmotionById(currentMoodId);
    
    let prevMoodId = currentMoodId;
    
    const panelMoods = appearances.map((appearance, idx) => {
      // For now, inherit the current mood - can be enhanced with AI suggestions
      const moodId = currentMoodId;
      const transitionType = detectTransitionType(prevMoodId, moodId);
      prevMoodId = moodId;
      
      return {
        panelKey: appearance.panelKey,
        moodId,
        moodName: currentMood?.name || 'Neutral',
        transitionType,
      };
    });
    
    return {
      characterName,
      panelMoods,
    };
  });
}

// Merge session context from completed panels
export function mergeSessionContext(
  previousContext: string,
  completedPanels: BatchGenerationResult[]
): string {
  const newDescriptions = completedPanels
    .filter(p => p.success && p.characterContext)
    .map(p => p.characterContext)
    .join('\n');
  
  if (!previousContext) return newDescriptions;
  if (!newDescriptions) return previousContext;
  
  return `${previousContext}\n${newDescriptions}`;
}

// Estimate time remaining based on progress
export function estimateTimeRemaining(
  completedPanels: number,
  totalPanels: number,
  elapsedMs: number
): number {
  if (completedPanels === 0) return totalPanels * 15000; // Estimate 15s per panel
  
  const msPerPanel = elapsedMs / completedPanels;
  const remainingPanels = totalPanels - completedPanels;
  
  return Math.round(msPerPanel * remainingPanels);
}

// Format time for display
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) return `${minutes}min`;
  return `${minutes}min ${remainingSeconds}s`;
}

// Get status color for panel
export function getStatusColor(status: PanelStatus): string {
  switch (status) {
    case 'pending': return 'bg-muted';
    case 'generating': return 'bg-primary/50 animate-pulse';
    case 'complete': return 'bg-green-500/20';
    case 'failed': return 'bg-destructive/20';
    default: return 'bg-muted';
  }
}

// Get status icon for panel
export function getStatusIcon(status: PanelStatus): string {
  switch (status) {
    case 'pending': return '○';
    case 'generating': return '⏳';
    case 'complete': return '✓';
    case 'failed': return '✕';
    default: return '○';
  }
}
