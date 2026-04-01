import { supabase } from '@/integrations/supabase/client';

export type DialogueTone = 'dramatic' | 'comedic' | 'tense' | 'romantic' | 'action' | 'mysterious' | 'casual';

export interface DialogueSuggestion {
  speaker: string;
  dialogue: string;
  emotion: string;
  tone?: DialogueTone;
}

export interface CharacterVoice {
  name: string;
  description?: string;
  traits?: string[];
  speechPattern?: string;
  archetype?: string;
}

export interface DialogueContext {
  sceneDescription: string;
  characters: CharacterVoice[];
  storyContext?: string;
  tone: DialogueTone;
  previousDialogue?: string;
  panelDescription?: string;
}

export interface GenerationOptions {
  count?: number;
  maxLength?: number;
  style?: 'comic' | 'manga' | 'graphic-novel';
}

// Generate dialogue suggestions using AI
export async function generateDialogue(
  context: DialogueContext,
  options: GenerationOptions = {}
): Promise<{ suggestions: DialogueSuggestion[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-dialogue', {
      body: {
        sceneDescription: context.sceneDescription,
        characters: context.characters,
        storyContext: context.storyContext,
        tone: context.tone,
        previousDialogue: context.previousDialogue,
        panelDescription: context.panelDescription,
        count: options.count || 5,
        maxLength: options.maxLength || 100,
        style: options.style || 'comic',
      },
    });

    if (error) throw error;

    return {
      suggestions: data?.suggestions || [],
      error: null,
    };
  } catch (err) {
    return {
      suggestions: [],
      error: err as Error,
    };
  }
}

// Format dialogue for panel display
export function formatDialogueForPanel(
  suggestion: DialogueSuggestion,
  format: 'bubble' | 'caption' | 'narration' = 'bubble'
): string {
  switch (format) {
    case 'bubble':
      return `${suggestion.speaker}: "${suggestion.dialogue}"`;
    case 'caption':
      return `[${suggestion.speaker}] ${suggestion.dialogue}`;
    case 'narration':
      return suggestion.dialogue;
    default:
      return suggestion.dialogue;
  }
}

// Build scene context from panel data
export function buildSceneContext(
  panelDescription: string,
  panelCharacters: string[],
  narration?: string,
  previousPanelDialogue?: string
): Partial<DialogueContext> {
  return {
    sceneDescription: panelDescription,
    panelDescription,
    storyContext: narration,
    previousDialogue: previousPanelDialogue,
  };
}

// Get character voice data from library
export function getCharacterVoice(
  characterName: string,
  characterLibrary: Array<{
    name: string;
    description?: string;
    traits?: string[];
    archetype?: string;
  }>
): CharacterVoice | null {
  const character = characterLibrary.find(
    c => c.name.toLowerCase() === characterName.toLowerCase()
  );
  
  if (!character) return null;
  
  return {
    name: character.name,
    description: character.description,
    traits: character.traits,
    archetype: character.archetype,
  };
}

// Tone descriptions for UI
export const TONE_OPTIONS: { value: DialogueTone; label: string; description: string }[] = [
  { value: 'dramatic', label: 'Dramatic', description: 'Intense, emotional moments' },
  { value: 'comedic', label: 'Comedic', description: 'Light-hearted, funny exchanges' },
  { value: 'tense', label: 'Tense', description: 'Suspenseful, on-edge conversations' },
  { value: 'romantic', label: 'Romantic', description: 'Intimate, heartfelt dialogue' },
  { value: 'action', label: 'Action', description: 'Short, punchy lines during action' },
  { value: 'mysterious', label: 'Mysterious', description: 'Cryptic, intriguing exchanges' },
  { value: 'casual', label: 'Casual', description: 'Natural, everyday conversation' },
];

// Emotion icons mapping
export const EMOTION_ICONS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  scared: '😨',
  confused: '😕',
  determined: '😤',
  thoughtful: '🤔',
  loving: '😍',
  neutral: '😐',
  excited: '🤩',
  worried: '😟',
};

export function getEmotionIcon(emotion: string): string {
  const normalized = emotion.toLowerCase();
  return EMOTION_ICONS[normalized] || '💬';
}
