import { ParsedPanel } from '@/lib/scriptParser';
import { getStyleById, ArtStyle } from '@/lib/artStyles';

export interface CostBreakdown {
  panelCount: number;
  estimatedCreditsMin: number;
  estimatedCreditsMax: number;
  breakdown: {
    baseGeneration: number;
    characterConsistency: number;
    moodProcessing: number;
    referenceImages: number;
    styleComplexity: number;
  };
  complexityMultiplier: number;
  artStyleComplexity: 'low' | 'medium' | 'high';
}

export interface CostFactors {
  panelCount: number;
  characterCount: number;
  hasReferenceImages: boolean;
  referenceImageCount: number;
  hasMoodProgression: boolean;
  consistencyEnabled: boolean;
  artStyle: ArtStyle;
}

// Cost constants (in credits)
const BASE_COST_PER_PANEL = 1;
const REFERENCE_IMAGE_COST = 0.2;
const MOOD_PROCESSING_COST = 0.1;
const CONSISTENCY_COST = 0.15;
const CHARACTER_CONSISTENCY_COST = 0.1;

const STYLE_COMPLEXITY_MAP: Partial<Record<ArtStyle, 'low' | 'medium' | 'high'>> = {
  western: 'medium',
  manga: 'high',
  noir: 'medium',
  watercolor: 'high',
  'arthur-adams': 'high',
  'alan-davis': 'medium',
  'mark-silvestri': 'high',
  'john-byrne': 'medium',
  'jim-lee': 'high',
  'barry-windsor-smith': 'high',
  'wendy-pini': 'medium',
  'frank-miller': 'medium',
  'oliver-coipel': 'high',
  'moebius': 'high',
  'mike-mignola': 'medium',
  'todd-mcfarlane': 'high',
  'alex-ross': 'high',
};

const COMPLEXITY_MULTIPLIER: Record<'low' | 'medium' | 'high', number> = {
  low: 1.0,
  medium: 1.2,
  high: 1.5,
};

export function getArtStyleComplexity(style: ArtStyle): 'low' | 'medium' | 'high' {
  return STYLE_COMPLEXITY_MAP[style] ?? 'medium';
}

export function estimateCost(factors: CostFactors): CostBreakdown {
  const { panelCount, characterCount, referenceImageCount, hasMoodProgression, consistencyEnabled, artStyle } = factors;
  
  const complexity = getArtStyleComplexity(artStyle);
  const multiplier = COMPLEXITY_MULTIPLIER[complexity];
  
  // Calculate individual components
  const baseGeneration = panelCount * BASE_COST_PER_PANEL;
  const characterConsistency = consistencyEnabled ? characterCount * panelCount * CHARACTER_CONSISTENCY_COST : 0;
  const moodProcessing = hasMoodProgression ? panelCount * MOOD_PROCESSING_COST : 0;
  const referenceImages = referenceImageCount * REFERENCE_IMAGE_COST;
  const styleComplexity = baseGeneration * (multiplier - 1);
  
  const subtotal = baseGeneration + characterConsistency + moodProcessing + referenceImages + styleComplexity;
  
  // Calculate min/max range (±15%)
  const estimatedCreditsMin = Math.ceil(subtotal * 0.85);
  const estimatedCreditsMax = Math.ceil(subtotal * 1.15);
  
  return {
    panelCount,
    estimatedCreditsMin,
    estimatedCreditsMax,
    breakdown: {
      baseGeneration: Math.round(baseGeneration * 100) / 100,
      characterConsistency: Math.round(characterConsistency * 100) / 100,
      moodProcessing: Math.round(moodProcessing * 100) / 100,
      referenceImages: Math.round(referenceImages * 100) / 100,
      styleComplexity: Math.round(styleComplexity * 100) / 100,
    },
    complexityMultiplier: multiplier,
    artStyleComplexity: complexity,
  };
}

export function formatCostRange(min: number, max: number): string {
  if (min === max) {
    return `~${min} credits`;
  }
  return `${min}-${max} credits`;
}

export function getComplexityFactors(
  panels: ParsedPanel[],
  referenceImageCount: number,
  artStyle: ArtStyle,
  consistencyEnabled: boolean,
  hasMoodProgression: boolean
): CostFactors {
  // Extract unique characters from all panels
  const allCharacters = new Set<string>();
  panels.forEach(panel => {
    panel.characters?.forEach(char => allCharacters.add(char));
    panel.dialogueSpeakers?.forEach(speaker => allCharacters.add(speaker));
  });
  
  return {
    panelCount: panels.length,
    characterCount: allCharacters.size,
    hasReferenceImages: referenceImageCount > 0,
    referenceImageCount,
    hasMoodProgression,
    consistencyEnabled,
    artStyle,
  };
}

export function getCostSummary(cost: CostBreakdown): string {
  const parts: string[] = [];
  
  parts.push(`${cost.panelCount} panels`);
  
  if (cost.breakdown.characterConsistency > 0) {
    parts.push('with character consistency');
  }
  
  if (cost.breakdown.moodProcessing > 0) {
    parts.push('mood processing');
  }
  
  if (cost.breakdown.referenceImages > 0) {
    parts.push(`${Math.round(cost.breakdown.referenceImages / REFERENCE_IMAGE_COST)} reference images`);
  }
  
  parts.push(`${cost.artStyleComplexity} complexity style`);
  
  return parts.join(', ');
}
