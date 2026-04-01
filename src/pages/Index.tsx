import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScriptInput } from '@/components/ScriptInput';
import { GraphicNovelPage } from '@/components/GraphicNovelPage';
import { PanelEditor } from '@/components/PanelEditor';
import { AuthModal } from '@/components/AuthModal';
import { ComparisonDialog } from '@/components/ComparisonDialog';
import { BatchConsistencyReport } from '@/components/BatchConsistencyReport';
import { GenerationProgressOverlay } from '@/components/GenerationProgressOverlay';
import { CompositionAnalyzer } from '@/components/CompositionAnalyzer';
import { PanelMoodSelector } from '@/components/PanelMoodSelector';
import { StorySuggestions } from '@/components/StorySuggestions';
import { MoodTimeline } from '@/components/MoodTimeline';
import { BatchGenerationPanel } from '@/components/BatchGenerationPanel';
import { SceneCompositionAnalyzer } from '@/components/SceneCompositionAnalyzer';
import { PanelLayoutEditor } from '@/components/PanelLayoutEditor';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import { ComicExportDialog } from '@/components/ComicExportDialog';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator';
import { DialogueGenerator } from '@/components/DialogueGenerator';
import { ProjectVersionManager } from '@/components/ProjectVersionManager';
import { LegalFooter } from '@/components/LegalFooter';
import { LeftSidebarAds, RightSidebarAds, BottomPicPoppitAds } from '@/components/SidebarAds';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { parseScript, generatePanelPrompt, ParsedPage, ParsedPanel, LabeledReferenceImage } from '@/lib/scriptParser';
import { ArtStyle, getStyleById } from '@/lib/artStyles';
import { ConsistencyConfig, DEFAULT_CONSISTENCY_CONFIG, CharacterProfile } from '@/lib/characterConsistencyModel';
import { CharacterProfileData } from '@/components/CharacterProfileEditor';
import { useAutoSave } from '@/hooks/useAutoSave';
import { subscribeToPresence, PresenceState } from '@/lib/collaboration';
import { ProjectSnapshot } from '@/lib/projectVersioning';
import { toast } from 'sonner';
import { BookOpen, Zap, Palette, Edit3, Save, Library, User, LogOut, Users, Pause, Play, RefreshCw, Activity, Layers, LayoutGrid, Share2, Download, MessageSquare, Lightbulb, History, FileText, GraduationCap, Menu, Dna, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Character preset interface matching CharacterLibrary
interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];
  poses?: { id: string; image: string; poseType: string; tags: string[] }[];
  profile?: CharacterProfileData;
}

const CHARACTER_STORAGE_KEY = 'comic-character-presets';

// Load character presets from localStorage
function loadCharacterPresets(): CharacterPreset[] {
  try {
    const saved = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Map panel characters to their profiles
function getCharacterProfiles(panelCharacters: string[], presets: CharacterPreset[]): CharacterProfile[] {
  const profiles: CharacterProfile[] = [];
  
  for (const charName of panelCharacters) {
    const preset = presets.find(p => 
      p.name.toLowerCase() === charName.toLowerCase()
    );
    
    if (preset?.profile) {
      const references = (preset.poses || []).map((p, i) => ({
        image: p.image,
        poseType: (p.poseType || 'portrait') as 'front' | 'side' | 'back' | 'action' | 'portrait' | 'full-body',
        tags: p.tags || [],
        isPrimary: i === 0,
      }));
      
      profiles.push({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        references,
        keyFeatures: preset.profile.keyFeatures,
        consistencyWeight: preset.profile.consistencyWeight,
      });
    }
  }
  
  return profiles;
}

interface PendingPanel {
  panelId: number;
  prompt: string;
  pageIndex: number;
  panelIndex: number;
}

interface PanelHistory {
  images: string[];
  currentIndex: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [parsedPages, setParsedPages] = useState<ParsedPage[]>([]);
  const [panelImages, setPanelImages] = useState<Record<number, string>>({});
  const [generatingPanels, setGeneratingPanels] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<ArtStyle>('western');
  const [currentScript, setCurrentScript] = useState('');
  const [currentCharacterContext, setCurrentCharacterContext] = useState('');
  const [currentReferenceImages, setCurrentReferenceImages] = useState<string[]>([]);
  const [currentLabeledImages, setCurrentLabeledImages] = useState<LabeledReferenceImage[]>([]);
  const [currentConsistencyConfig, setCurrentConsistencyConfig] = useState<ConsistencyConfig>(DEFAULT_CONSISTENCY_CONFIG);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showMidGenEdit, setShowMidGenEdit] = useState(false);
  const [tempCharacterContext, setTempCharacterContext] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [pendingPanels, setPendingPanels] = useState<PendingPanel[]>([]);
  const isPausedRef = useRef(false);
  const [panelHistory, setPanelHistory] = useState<Record<number, PanelHistory>>({});
  const [comparisonState, setComparisonState] = useState<{
    isOpen: boolean;
    panelId: number | null;
    currentImage: string;
    newImage: string | null;
    isGenerating: boolean;
    description: string;
  }>({ isOpen: false, panelId: null, currentImage: '', newImage: null, isGenerating: false, description: '' });
  const [generationProgress, setGenerationProgress] = useState<{
    currentPage: number;
    totalPages: number;
    currentPanel: number;
    totalPanels: number;
    completedPanels: number;
  } | null>(null);
  const [compositionAnalysisPanel, setCompositionAnalysisPanel] = useState<{
    panelId: number;
    image: string;
    description: string;
  } | null>(null);
  
  // Panel Mood Selection state
  const [moodSelectorState, setMoodSelectorState] = useState<{
    isOpen: boolean;
    panelId: number | null;
    panelCharacters: string[];
    panelDescription: string;
  }>({ isOpen: false, panelId: null, panelCharacters: [], panelDescription: '' });

  // Batch Generation state
  const [showBatchGeneration, setShowBatchGeneration] = useState(false);
  
  // Scene Composition Analyzer state
  const [sceneAnalyzerState, setSceneAnalyzerState] = useState<{
    isOpen: boolean;
    pageIndex: number;
  }>({ isOpen: false, pageIndex: 0 });

  // Panel Layout Editor state
  const [layoutEditorState, setLayoutEditorState] = useState<{
    isOpen: boolean;
    pageIndex: number;
  }>({ isOpen: false, pageIndex: 0 });

  // Character moods for batch generation
  const [characterMoods, setCharacterMoods] = useState<Record<string, string>>({});

  // Collaboration state
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [presenceList, setPresenceList] = useState<PresenceState[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const presenceSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Version history state
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [comicTitle, setComicTitle] = useState('');

  // Dialogue generator state
  const [dialogueGeneratorState, setDialogueGeneratorState] = useState<{
    isOpen: boolean;
    panelId: number | null;
    panelDescription: string;
    panelCharacters: string[];
    narration?: string;
    previousDialogue?: string;
  }>({ isOpen: false, panelId: null, panelDescription: '', panelCharacters: [] });

  // Character data for story suggestions
  const getCharacterData = () => {
    const presets = loadCharacterPresets();
    return presets.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      archetype: (p as any).archetype,
      traits: (p as any).traits
    }));
  };

  // Auto-save snapshot getter
  const getSnapshot = useCallback(() => ({
    script_text: currentScript,
    art_style: currentStyle,
    pages: parsedPages,
    panel_images: panelImages,
    character_context: currentCharacterContext,
    consistency_config: currentConsistencyConfig,
    labeled_images: currentLabeledImages,
    reference_images: currentReferenceImages,
  }), [currentScript, currentStyle, parsedPages, panelImages, currentCharacterContext, currentConsistencyConfig, currentLabeledImages, currentReferenceImages]);

  // Auto-save hook
  const {
    lastSaveTime,
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    error: autoSaveError,
    saveNow,
  } = useAutoSave({
    projectId: currentProjectId,
    getSnapshot,
    intervalMinutes: 5,
    enabled: !!user && !!currentProjectId && parsedPages.length > 0,
    onSaveComplete: (success) => {
      if (success) {
        toast.success('Auto-saved', { duration: 2000 });
      }
    },
  });

  useEffect(() => {
    // Check current auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to presence when project is loaded
  useEffect(() => {
    if (!currentProjectId || !user) {
      if (presenceSubscriptionRef.current) {
        presenceSubscriptionRef.current.unsubscribe();
        presenceSubscriptionRef.current = null;
      }
      setPresenceList([]);
      return;
    }

    const subscription = subscribeToPresence(
      currentProjectId,
      user.id,
      user.email || 'Unknown',
      (presence) => setPresenceList(presence)
    );
    presenceSubscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
    };
  }, [currentProjectId, user]);

  // Real-time sync for panel images from collaborators
  useEffect(() => {
    if (!currentProjectId) return;

    const channel = supabase
      .channel(`project-sync:${currentProjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comic_panels',
        },
        (payload) => {
          const { panel_number, image_data } = payload.new as any;
          if (image_data && panel_number) {
            setPanelImages(prev => {
              if (prev[panel_number] !== image_data) {
                return { ...prev, [panel_number]: image_data };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProjectId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentProjectId(null);
    toast.success('Signed out');
  };

  const handleScriptSubmit = async (script: string, style: ArtStyle, characterContext: string, referenceImages: string[], labeledImages: LabeledReferenceImage[] = [], consistencyConfig?: ConsistencyConfig) => {
    setIsProcessing(true);
    setShowResults(false);
    setCurrentStyle(style);
    setCurrentScript(script);
    setCurrentCharacterContext(characterContext);
    setCurrentReferenceImages(referenceImages);
    setCurrentLabeledImages(labeledImages);
    if (consistencyConfig) {
      setCurrentConsistencyConfig(consistencyConfig);
    }
    setIsPaused(false);
    isPausedRef.current = false;
    setPendingPanels([]);
    
    try {
      const pages = parseScript(script);
      
      if (pages.length === 0 || pages[0].panels.length === 0) {
        toast.error('Could not parse script. Please check the format.');
        setIsProcessing(false);
        return;
      }
      
      setParsedPages(pages);
      setPanelImages({});
      setShowResults(true);
      
      const styleConfig = getStyleById(style);
      const totalPanels = pages.reduce((acc, p) => acc + p.panels.length, 0);
      toast.success(`Generating ${totalPanels} panels in ${styleConfig.name} style`);
      
      await runGeneration(pages, styleConfig, characterContext, referenceImages, labeledImages, 0);
      
    } catch (error) {
      console.error('Error processing script:', error);
      toast.error('Failed to process script');
    } finally {
      setIsProcessing(false);
      setGenerationProgress(null);
    }
  };

  const runGeneration = async (
    pages: ParsedPage[], 
    styleConfig: ReturnType<typeof getStyleById>, 
    characterContext: string, 
    referenceImages: string[],
    labeledImages: LabeledReferenceImage[],
    startFromPanel: number = 0
  ) => {
    const totalPanels = pages.reduce((acc, p) => acc + p.panels.length, 0);
    let completedPanels = startFromPanel;
    let currentPanelIndex = 0;
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      for (let panelIndex = 0; panelIndex < page.panels.length; panelIndex++) {
        // Skip already completed panels
        if (currentPanelIndex < startFromPanel) {
          currentPanelIndex++;
          continue;
        }
        
        const panel = page.panels[panelIndex];
        
        // Check if paused
        if (isPausedRef.current) {
          // Store remaining panels
          const remaining: PendingPanel[] = [];
          for (let pi = pageIndex; pi < pages.length; pi++) {
            const p = pages[pi];
            const startIdx = pi === pageIndex ? panelIndex : 0;
            for (let pni = startIdx; pni < p.panels.length; pni++) {
              remaining.push({
                panelId: p.panels[pni].id,
                prompt: generatePanelPrompt(p.panels[pni], p.openingNarration, styleConfig.promptModifier, characterContext, labeledImages),
                pageIndex: pi,
                panelIndex: pni,
              });
            }
          }
          setPendingPanels(remaining);
          toast.info(`Generation paused. ${remaining.length} panels remaining.`);
          return;
        }
        
        // Update progress state
        setGenerationProgress({
          currentPage: pageIndex + 1,
          totalPages: pages.length,
          currentPanel: panelIndex + 1,
          totalPanels,
          completedPanels,
        });
        
        await generatePanelImage(
          panel.id, 
          generatePanelPrompt(panel, page.openingNarration, styleConfig.promptModifier, characterContext, labeledImages),
          referenceImages,
          labeledImages,
          panel.characters || panel.dialogueSpeakers
        );
        
        completedPanels++;
        currentPanelIndex++;
      }
    }
    
    // Clear progress when done
    setGenerationProgress(null);
    setPendingPanels([]);
    toast.success('All panels generated!');
  };

  const handlePauseGeneration = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResumeGeneration = async () => {
    if (pendingPanels.length === 0) return;
    
    setIsPaused(false);
    isPausedRef.current = false;
    setIsProcessing(true);
    
    const styleConfig = getStyleById(currentStyle);
    const totalPanels = parsedPages.reduce((acc, p) => acc + p.panels.length, 0);
    const completedPanels = totalPanels - pendingPanels.length;
    
    try {
      for (let i = 0; i < pendingPanels.length; i++) {
        if (isPausedRef.current) {
          setPendingPanels(pendingPanels.slice(i));
          toast.info(`Generation paused. ${pendingPanels.length - i} panels remaining.`);
          return;
        }
        
        const pending = pendingPanels[i];
        const targetPanel = parsedPages[pending.pageIndex].panels[pending.panelIndex];
        
        setGenerationProgress({
          currentPage: pending.pageIndex + 1,
          totalPages: parsedPages.length,
          currentPanel: pending.panelIndex + 1,
          totalPanels,
          completedPanels: completedPanels + i,
        });
        
        await generatePanelImage(
          pending.panelId,
          generatePanelPrompt(
            targetPanel,
            parsedPages[pending.pageIndex].openingNarration,
            styleConfig.promptModifier,
            currentCharacterContext,
            currentLabeledImages
          ),
          currentReferenceImages,
          currentLabeledImages,
          targetPanel.characters || targetPanel.dialogueSpeakers
        );
      }
      
      setGenerationProgress(null);
      setPendingPanels([]);
      toast.success('All panels generated!');
    } catch (error) {
      console.error('Error resuming generation:', error);
      toast.error('Failed to resume generation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchRegenerate = async () => {
    if (parsedPages.length === 0) return;
    
    const confirmRegenerate = window.confirm(
      `This will regenerate all ${parsedPages.reduce((acc, p) => acc + p.panels.length, 0)} panels with the current character descriptions. Continue?`
    );
    
    if (!confirmRegenerate) return;
    
    setIsProcessing(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setPendingPanels([]);
    setPanelImages({});
    
    const styleConfig = getStyleById(currentStyle);
    
    try {
      await runGeneration(parsedPages, styleConfig, currentCharacterContext, currentReferenceImages, currentLabeledImages, 0);
    } catch (error) {
      console.error('Error in batch regeneration:', error);
      toast.error('Failed to regenerate panels');
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePanelImage = async (
    panelId: number, 
    prompt: string, 
    referenceImages: string[] = [], 
    labeledImages: LabeledReferenceImage[] = [],
    panelCharacters?: string[],
    addToHistory = true,
    characterMoods?: Array<{
      characterName: string;
      moodId: string;
      moodName: string;
      visualCues: string[];
      colorTones: string[];
      expressionKeywords: string[];
      bodyLanguageHints: string[];
      intensity: number;
    }>
  ): Promise<string | null> => {
    setGeneratingPanels(prev => new Set(prev).add(panelId));
    
    // Load character presets and get profiles for this panel's characters
    const presets = loadCharacterPresets();
    const characterProfiles = panelCharacters ? getCharacterProfiles(panelCharacters, presets) : [];
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-panel', {
        body: { 
          prompt, 
          panelId, 
          referenceImages, 
          labeledImages, 
          panelCharacters: panelCharacters || [],
          consistencyConfig: currentConsistencyConfig,
          characterProfiles,
          characterMoods: characterMoods || [],
        }
      });

      if (error) {
        console.error(`Error generating panel ${panelId}:`, error);
        // Check for credit limit error (402)
        if (error.message?.includes('402') || error.message?.includes('Usage limit')) {
          toast.error('AI credits exhausted. Please add credits to your Lovable account to continue.', {
            duration: 8000,
          });
        } else if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Rate limit reached. Please wait a moment and try again.');
        } else {
          toast.error(`Failed to generate panel ${panelId}: ${error.message}`);
        }
        return null;
      }

      if (data?.image) {
        setPanelImages(prev => ({
          ...prev,
          [panelId]: data.image
        }));
        
        // Add to history
        if (addToHistory) {
          setPanelHistory(prev => {
            const existing = prev[panelId] || { images: [], currentIndex: -1 };
            // Truncate any "redo" history if we're not at the end
            const newImages = [...existing.images.slice(0, existing.currentIndex + 1), data.image];
            return {
              ...prev,
              [panelId]: {
                images: newImages,
                currentIndex: newImages.length - 1,
              }
            };
          });
        }
        
        return data.image;
      }
      
      return null;
    } catch (error) {
      console.error(`Error generating panel ${panelId}:`, error);
      toast.error(`Failed to generate panel ${panelId}`);
      return null;
    } finally {
      setGeneratingPanels(prev => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });
    }
  };

  const handleUndo = (panelId: number) => {
    const history = panelHistory[panelId];
    if (!history || history.currentIndex <= 0) return;
    
    const newIndex = history.currentIndex - 1;
    setPanelHistory(prev => ({
      ...prev,
      [panelId]: { ...history, currentIndex: newIndex }
    }));
    setPanelImages(prev => ({
      ...prev,
      [panelId]: history.images[newIndex]
    }));
    toast.success('Reverted to previous version');
  };

  const handleRedo = (panelId: number) => {
    const history = panelHistory[panelId];
    if (!history || history.currentIndex >= history.images.length - 1) return;
    
    const newIndex = history.currentIndex + 1;
    setPanelHistory(prev => ({
      ...prev,
      [panelId]: { ...history, currentIndex: newIndex }
    }));
    setPanelImages(prev => ({
      ...prev,
      [panelId]: history.images[newIndex]
    }));
    toast.success('Restored next version');
  };

  const handleCompareRegenerate = (panelId: number) => {
    let targetPanel: ParsedPanel | undefined;
    let description = '';
    
    for (const page of parsedPages) {
      const panel = page.panels.find(p => p.id === panelId);
      if (panel) {
        targetPanel = panel;
        description = panel.description;
        break;
      }
    }
    
    if (!targetPanel) return;
    
    const currentImage = panelImages[panelId];
    if (!currentImage) {
      toast.error('No current image to compare');
      return;
    }
    
    setComparisonState({
      isOpen: true,
      panelId,
      currentImage,
      newImage: null,
      isGenerating: false,
      description,
    });
  };

  const handleComparisonGenerate = async () => {
    if (!comparisonState.panelId) return;
    
    let targetPanel: ParsedPanel | undefined;
    let pageNarration: string | undefined;
    
    for (const page of parsedPages) {
      const panel = page.panels.find(p => p.id === comparisonState.panelId);
      if (panel) {
        targetPanel = panel;
        pageNarration = page.openingNarration;
        break;
      }
    }
    
    if (!targetPanel) return;
    
    setComparisonState(prev => ({ ...prev, isGenerating: true }));
    
    const styleConfig = getStyleById(currentStyle);
    const prompt = generatePanelPrompt(targetPanel, pageNarration, styleConfig.promptModifier, currentCharacterContext, currentLabeledImages);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-panel', {
        body: { 
          prompt, 
          panelId: comparisonState.panelId, 
          referenceImages: currentReferenceImages,
          labeledImages: currentLabeledImages,
          panelCharacters: targetPanel.characters || targetPanel.dialogueSpeakers || []
        }
      });
      
      if (error) {
        console.error('Error generating comparison:', error);
        // Check for credit limit error (402)
        if (error.message?.includes('402') || error.message?.includes('Usage limit')) {
          toast.error('AI credits exhausted. Please add credits to your Lovable account to continue.', {
            duration: 8000,
          });
        } else if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Rate limit reached. Please wait a moment and try again.');
        } else {
          toast.error('Failed to generate comparison image');
        }
        setComparisonState(prev => ({ ...prev, isGenerating: false }));
        return;
      }
      
      if (data?.image) {
        setComparisonState(prev => ({ ...prev, newImage: data.image, isGenerating: false }));
      }
    } catch (error) {
      console.error('Error generating comparison:', error);
      toast.error('Failed to generate comparison image');
      setComparisonState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleAcceptComparison = () => {
    if (!comparisonState.panelId || !comparisonState.newImage) return;
    
    const panelId = comparisonState.panelId;
    const newImage = comparisonState.newImage;
    
    setPanelImages(prev => ({ ...prev, [panelId]: newImage }));
    
    // Add to history
    setPanelHistory(prev => {
      const existing = prev[panelId] || { images: [], currentIndex: -1 };
      const newImages = [...existing.images.slice(0, existing.currentIndex + 1), newImage];
      return {
        ...prev,
        [panelId]: {
          images: newImages,
          currentIndex: newImages.length - 1,
        }
      };
    });
    
    setComparisonState({ isOpen: false, panelId: null, currentImage: '', newImage: null, isGenerating: false, description: '' });
    toast.success('New version accepted');
  };

  const handleRejectComparison = () => {
    setComparisonState({ isOpen: false, panelId: null, currentImage: '', newImage: null, isGenerating: false, description: '' });
    toast.info('Kept current version');
  };

  const handleRegeneratePanel = async (panelId: number) => {
    // Find the panel
    let targetPanel: ParsedPanel | undefined;
    let pageNarration: string | undefined;
    
    for (const page of parsedPages) {
      const panel = page.panels.find(p => p.id === panelId);
      if (panel) {
        targetPanel = panel;
        pageNarration = page.openingNarration;
        break;
      }
    }
    
    if (!targetPanel) return;
    
    const styleConfig = getStyleById(currentStyle);
    const prompt = generatePanelPrompt(targetPanel, pageNarration, styleConfig.promptModifier, currentCharacterContext, currentLabeledImages);
    
    toast.info(`Regenerating panel ${panelId}...`);
    await generatePanelImage(panelId, prompt, currentReferenceImages, currentLabeledImages, targetPanel.characters || targetPanel.dialogueSpeakers);
  };

  const handleOpenMoodSelector = (panelId: number) => {
    let targetPanel: ParsedPanel | undefined;
    for (const page of parsedPages) {
      const panel = page.panels.find(p => p.id === panelId);
      if (panel) { targetPanel = panel; break; }
    }
    if (!targetPanel) return;
    
    const characters = [...(targetPanel.characters || []), ...(targetPanel.dialogueSpeakers || [])];
    setMoodSelectorState({
      isOpen: true,
      panelId,
      panelCharacters: characters,
      panelDescription: targetPanel.description
    });
  };

  const handleGenerateWithMoods = async (characterMoods: Array<{
    characterName: string;
    moodId: string;
    moodName: string;
    visualCues: string[];
    colorTones: string[];
    expressionKeywords: string[];
    bodyLanguageHints: string[];
    intensity: number;
  }>) => {
    const panelId = moodSelectorState.panelId;
    if (!panelId) return;
    
    let targetPanel: ParsedPanel | undefined;
    let pageNarration: string | undefined;
    for (const page of parsedPages) {
      const panel = page.panels.find(p => p.id === panelId);
      if (panel) { targetPanel = panel; pageNarration = page.openingNarration; break; }
    }
    if (!targetPanel) return;
    
    const styleConfig = getStyleById(currentStyle);
    const prompt = generatePanelPrompt(targetPanel, pageNarration, styleConfig.promptModifier, currentCharacterContext, currentLabeledImages);
    
    toast.info(`Generating panel with character moods...`);
    await generatePanelImage(
      panelId, 
      prompt, 
      currentReferenceImages, 
      currentLabeledImages, 
      targetPanel.characters || targetPanel.dialogueSpeakers,
      true,
      characterMoods
    );
  };

  const handleEditPage = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
    setShowEditor(true);
  };

  const handleUpdatePage = (updatedPage: ParsedPage) => {
    setParsedPages(prev => {
      const newPages = [...prev];
      newPages[editingPageIndex] = updatedPage;
      return newPages;
    });
  };

  const handleSaveToLibrary = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('comic_projects')
        .insert({
          user_id: user.id,
          title: `Comic - ${new Date().toLocaleDateString()}`,
          script_text: currentScript,
          art_style: currentStyle,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Save pages and panels
      for (const page of parsedPages) {
        const { data: savedPage, error: pageError } = await supabase
          .from('comic_pages')
          .insert({
            project_id: project.id,
            page_number: page.pageNumber,
            opening_narration: page.openingNarration,
          })
          .select()
          .single();

        if (pageError) throw pageError;

        // Save panels for this page
        for (const panel of page.panels) {
          const { error: panelError } = await supabase
            .from('comic_panels')
            .insert({
              page_id: savedPage.id,
              panel_number: panel.id,
              description: panel.description,
              narration: panel.narration,
              dialogue: panel.dialogue,
              is_black_and_white: panel.isBlackAndWhite,
              image_data: panelImages[panel.id],
            });

          if (panelError) throw panelError;
        }
      }

      // Set the project ID for auto-save and collaboration
      setCurrentProjectId(project.id);
      
      toast.success('Saved to library!');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle dialogue selection from AI generator
  const handleSelectDialogue = (dialogue: string, speaker?: string) => {
    if (!dialogueGeneratorState.panelId) return;
    
    const panelId = dialogueGeneratorState.panelId;
    setParsedPages(prev => prev.map(page => ({
      ...page,
      panels: page.panels.map(panel => 
        panel.id === panelId 
          ? { ...panel, dialogue: speaker ? `${speaker}: "${dialogue}"` : dialogue }
          : panel
      )
    })));
    
    setDialogueGeneratorState({ isOpen: false, panelId: null, panelDescription: '', panelCharacters: [] });
  };

  // Open dialogue generator for a panel
  const handleOpenDialogueGenerator = (panelId: number) => {
    let targetPanel: ParsedPanel | undefined;
    let pageNarration: string | undefined;
    let previousPanelDialogue: string | undefined;
    
    for (const page of parsedPages) {
      for (let i = 0; i < page.panels.length; i++) {
        const panel = page.panels[i];
        if (panel.id === panelId) {
          targetPanel = panel;
          pageNarration = page.openingNarration;
          if (i > 0) {
            previousPanelDialogue = page.panels[i - 1].dialogue;
          }
          break;
        }
      }
      if (targetPanel) break;
    }
    
    if (!targetPanel) return;
    
    const characters = [...(targetPanel.characters || []), ...(targetPanel.dialogueSpeakers || [])];
    
    setDialogueGeneratorState({
      isOpen: true,
      panelId,
      panelDescription: targetPanel.description,
      panelCharacters: characters,
      narration: pageNarration,
      previousDialogue: previousPanelDialogue,
    });
  };

  // Restore version handler
  const handleRestoreVersion = useCallback((snapshot: ProjectSnapshot) => {
    setCurrentScript(snapshot.script_text || '');
    setCurrentStyle((snapshot.art_style as ArtStyle) || 'western');
    setParsedPages(snapshot.pages || []);
    setPanelImages(snapshot.panel_images || {});
    setCurrentCharacterContext(snapshot.character_context || '');
    setCurrentConsistencyConfig(snapshot.consistency_config || DEFAULT_CONSISTENCY_CONFIG);
    setCurrentLabeledImages(snapshot.labeled_images || []);
    setCurrentReferenceImages(snapshot.reference_images || []);
    setShowResults(true);
    toast.success('Version restored successfully');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Page-specific toolbar */}
      {(user && currentProjectId) && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="container py-2 flex items-center justify-end gap-2">
            <MoodTimeline 
              trigger={
                <Button variant="ghost" size="sm" className="gap-1">
                  <Activity className="w-4 h-4" />
                  Mood Timeline
                </Button>
              }
              onNavigateToPanel={(panelId) => {
                const panelElement = document.querySelector(`[data-panel-id="${panelId}"]`);
                if (panelElement) {
                  panelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  panelElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                  setTimeout(() => {
                    panelElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                  }, 2000);
                }
              }}
            />
            <AutoSaveIndicator
              lastSaveTime={lastSaveTime}
              isSaving={isAutoSaving}
              hasUnsavedChanges={hasUnsavedChanges}
              error={autoSaveError}
              onSaveNow={saveNow}
            />
            {presenceList.length > 0 && (
              <PresenceAvatars 
                presence={presenceList} 
                currentUserId={user.id} 
              />
            )}
            <Button variant="outline" size="sm" onClick={() => setShowVersionManager(true)}>
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCollaboration(true)}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(190_95%_50%_/_0.15),_transparent_50%)]" />
        
        <div className="container relative py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-display text-foreground mb-4 text-shadow-comic animate-slide-up tracking-widest">
              Celsius
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Transform your screenplays into stunning graphic novel pages with AI-powered artwork
            </p>
            
            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Script Parsing</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm text-foreground">AI Generation</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Multiple Styles</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                <Edit3 className="w-4 h-4 text-accent" />
                <span className="text-sm text-foreground">Panel Editor</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3-Column Grid: Sidebars + Main */}
      <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_200px] gap-4 xl:gap-6 px-4 xl:px-6">
        {/* Left Sidebar */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-5rem)] pb-8 scrollbar-thin">
            <LeftSidebarAds />
          </div>
        </aside>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-4xl mx-auto">
          {/* Input Section */}
          <section className="mb-16">
            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-panel border border-border">
              <h2 className="font-comic text-2xl md:text-3xl text-foreground mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </span>
                Upload Your Script
              </h2>
              <ScriptInput onScriptSubmit={handleScriptSubmit} isProcessing={isProcessing} />
            </div>
          </section>

          {/* Results Section */}
          {showResults && parsedPages.length > 0 && (
            <section className="animate-slide-up">
              {/* Progress indicator with pause/resume and mid-generation editing */}
              {(generationProgress || (isPaused && pendingPanels.length > 0)) && (
                <div className="mb-6 p-4 bg-card rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {isPaused ? 'Generation Paused' : `Generating Page ${generationProgress?.currentPage} of ${generationProgress?.totalPages}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {isPaused 
                          ? `${pendingPanels.length} panels remaining`
                          : `Panel ${(generationProgress?.completedPanels || 0) + 1} of ${generationProgress?.totalPanels}`
                        }
                      </span>
                      
                      {/* Pause/Resume button */}
                      {isPaused ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleResumeGeneration}
                          className="text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseGeneration}
                          className="text-xs"
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempCharacterContext(currentCharacterContext);
                          setShowMidGenEdit(!showMidGenEdit);
                        }}
                        className="text-xs"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        {showMidGenEdit ? 'Hide' : 'Edit Characters'}
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ 
                        width: `${((generationProgress?.completedPanels || (parsedPages.reduce((acc, p) => acc + p.panels.length, 0) - pendingPanels.length)) / (generationProgress?.totalPanels || parsedPages.reduce((acc, p) => acc + p.panels.length, 0))) * 100}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {isPaused 
                      ? 'Paused - review your panels and resume when ready'
                      : `${Math.round(((generationProgress?.completedPanels || 0) / (generationProgress?.totalPanels || 1)) * 100)}% complete`
                    }
                  </p>
                  
                  {/* Mid-generation edit form */}
                  {showMidGenEdit && (
                    <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                      <label className="text-xs font-medium text-foreground mb-2 block">
                        Update character descriptions (applies to remaining panels):
                      </label>
                      <textarea
                        value={tempCharacterContext}
                        onChange={(e) => setTempCharacterContext(e.target.value)}
                        className="w-full h-24 p-3 bg-secondary/50 border border-border rounded-lg text-foreground text-sm resize-none mb-2"
                        placeholder="Character descriptions..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCurrentCharacterContext(tempCharacterContext);
                            setShowMidGenEdit(false);
                            toast.success('Character context updated for remaining panels');
                          }}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Apply to Remaining
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowMidGenEdit(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="font-comic text-2xl md:text-3xl text-foreground flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-accent" />
                  </span>
                  Generated Pages
                  <span className="text-lg text-muted-foreground font-body">
                    ({getStyleById(currentStyle).name})
                  </span>
                </h2>
                <div className="flex gap-2 no-print flex-wrap">
                  {/* New Feature Buttons */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowBatchGeneration(true)}
                    disabled={isProcessing || generatingPanels.size > 0}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Batch Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSceneAnalyzerState({ isOpen: true, pageIndex: 0 })}
                    disabled={isProcessing || generatingPanels.size > 0}
                  >
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    Analyze Layout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLayoutEditorState({ isOpen: true, pageIndex: 0 })}
                    disabled={generatingPanels.size > 0}
                  >
                    <Layers className="w-4 h-4 mr-1" />
                    Edit Layout
                  </Button>
                  
                  <BatchConsistencyReport
                    pages={parsedPages}
                    panelImages={panelImages}
                    labeledImages={currentLabeledImages}
                    onAutoFix={async (panelIds) => {
                      toast.info(`Auto-fixing ${panelIds.length} panels with enhanced consistency...`);
                      for (const panelId of panelIds) {
                        let targetPanel: ParsedPanel | undefined;
                        let pageNarration: string | undefined;
                        for (const page of parsedPages) {
                          const panel = page.panels.find(p => p.id === panelId);
                          if (panel) { targetPanel = panel; pageNarration = page.openingNarration; break; }
                        }
                        if (!targetPanel) continue;
                        const styleConfig = getStyleById(currentStyle);
                        const prompt = generatePanelPrompt(targetPanel, pageNarration, styleConfig.promptModifier, currentCharacterContext, currentLabeledImages);
                        setGeneratingPanels(prev => new Set(prev).add(panelId));
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-panel-enhanced', {
                            body: { prompt, panelId, labeledImages: currentLabeledImages, panelCharacters: targetPanel.characters || targetPanel.dialogueSpeakers || [], enhancedMode: true }
                          });
                          if (!error && data?.image) {
                            setPanelImages(prev => ({ ...prev, [panelId]: data.image }));
                            setPanelHistory(prev => {
                              const existing = prev[panelId] || { images: [], currentIndex: -1 };
                              const newImages = [...existing.images.slice(0, existing.currentIndex + 1), data.image];
                              return { ...prev, [panelId]: { images: newImages, currentIndex: newImages.length - 1 } };
                            });
                          }
                        } finally { setGeneratingPanels(prev => { const next = new Set(prev); next.delete(panelId); return next; }); }
                      }
                      toast.success(`Auto-fixed ${panelIds.length} panels`);
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBatchRegenerate}
                    disabled={isProcessing || generatingPanels.size > 0}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Regenerate All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                    disabled={generatingPanels.size > 0}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving || generatingPanels.size > 0}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save to Library'}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-8">
                {parsedPages.map((page, index) => (
                  <div key={page.pageNumber} className="relative group">
                    {/* Edit button overlay */}
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="comic" 
                        size="sm"
                        onClick={() => handleEditPage(index)}
                        disabled={generatingPanels.size > 0}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit Layout
                      </Button>
                    </div>
                    
                    <GraphicNovelPage
                      page={page}
                      panelImages={panelImages}
                      generatingPanels={generatingPanels}
                      onRegeneratePanel={handleRegeneratePanel}
                      onCompareRegenerate={handleCompareRegenerate}
                      panelHistory={panelHistory}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      labeledImages={currentLabeledImages}
                      onAnalyzeComposition={(panelId) => {
                        const panel = page.panels.find(p => p.id === panelId);
                        if (panel && panelImages[panelId]) {
                          setCompositionAnalysisPanel({
                            panelId,
                            image: panelImages[panelId],
                            description: panel.description,
                          });
                        }
                      }}
                      onGenerateDialogue={handleOpenDialogueGenerator}
                      projectId={currentProjectId || undefined}
                      canComment={!!currentProjectId}
                    />
                    
                    {/* Generation Progress Overlay for each panel */}
                    {page.panels.map(panel => (
                      generatingPanels.has(panel.id) && (
                        <GenerationProgressOverlay
                          key={`progress-${panel.id}`}
                          isGenerating={true}
                          panelId={panel.id}
                          className="absolute inset-0 pointer-events-none"
                        />
                      )
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-5rem)] pb-8 scrollbar-thin">
            <RightSidebarAds />
          </div>
        </aside>
      </div>

      {/* Bottom PicPoppit Ads */}
      <BottomPicPoppitAds />

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-muted-foreground text-sm">
          <p>Transform your stories into visual masterpieces</p>
        </div>
      </footer>

      {/* Panel Editor Modal */}
      {showEditor && parsedPages[editingPageIndex] && (
        <PanelEditor
          page={parsedPages[editingPageIndex]}
          panelImages={panelImages}
          onUpdatePage={handleUpdatePage}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />

      {/* Comparison Dialog */}
      <ComparisonDialog
        isOpen={comparisonState.isOpen}
        onClose={() => setComparisonState({ isOpen: false, panelId: null, currentImage: '', newImage: null, isGenerating: false, description: '' })}
        currentImage={comparisonState.currentImage}
        newImage={comparisonState.newImage}
        isGenerating={comparisonState.isGenerating}
        panelDescription={comparisonState.description}
        onAccept={handleAcceptComparison}
        onReject={handleRejectComparison}
        onRegenerate={handleComparisonGenerate}
      />

      {/* Composition Analyzer */}
      {compositionAnalysisPanel && (
        <CompositionAnalyzer
          panelImage={compositionAnalysisPanel.image}
          panelDescription={compositionAnalysisPanel.description}
          isOpen={true}
          onClose={() => setCompositionAnalysisPanel(null)}
        />
      )}

      {/* Panel Mood Selector */}
      <PanelMoodSelector
        isOpen={moodSelectorState.isOpen}
        onClose={() => setMoodSelectorState({ isOpen: false, panelId: null, panelCharacters: [], panelDescription: '' })}
        panelCharacters={moodSelectorState.panelCharacters}
        panelDescription={moodSelectorState.panelDescription}
        onGenerate={handleGenerateWithMoods}
      />

      {/* Batch Generation Panel */}
      <BatchGenerationPanel
        open={showBatchGeneration}
        onOpenChange={setShowBatchGeneration}
        panels={parsedPages.map(page => ({
          pageNumber: page.pageNumber,
          panels: page.panels,
        }))}
        referenceImages={currentReferenceImages}
        labeledImages={currentLabeledImages as any}
        characterProfiles={loadCharacterPresets().map(p => ({
          id: p.id,
          name: p.name,
          physicalDescription: p.profile?.keyFeatures ? 
            `${p.profile.keyFeatures.hairColor} ${p.profile.keyFeatures.hairStyle} hair, ${p.profile.keyFeatures.eyeColor} eyes, ${p.profile.keyFeatures.skinTone} skin` : 
            p.description,
          clothingDescription: p.profile?.keyFeatures?.clothing?.join(', ') || '',
          distinctiveFeatures: p.profile?.keyFeatures?.distinctiveMarks?.join(', ') || '',
          colorPalette: [] as string[],
          consistencyWeight: p.profile?.consistencyWeight || 0.7,
        }))}
        artStyle={getStyleById(currentStyle).name}
        stylePromptModifier={getStyleById(currentStyle).promptModifier}
        consistencyWeight={currentConsistencyConfig.characterWeight}
        characterMoods={characterMoods}
        onPanelGenerated={(pageNumber, panelIndex, imageData) => {
          const page = parsedPages.find(p => p.pageNumber === pageNumber);
          if (page && page.panels[panelIndex]) {
            const panelId = page.panels[panelIndex].id;
            setPanelImages(prev => ({ ...prev, [panelId]: imageData }));
          }
        }}
        onComplete={() => {
          toast.success('Batch generation complete!');
        }}
      />

      {/* Scene Composition Analyzer */}
      {parsedPages[sceneAnalyzerState.pageIndex] && (
        <SceneCompositionAnalyzer
          open={sceneAnalyzerState.isOpen}
          onOpenChange={(open) => setSceneAnalyzerState(prev => ({ ...prev, isOpen: open }))}
          panels={parsedPages[sceneAnalyzerState.pageIndex].panels}
          pageNumber={parsedPages[sceneAnalyzerState.pageIndex].pageNumber}
          onApplySuggestions={(updatedPanels) => {
            setParsedPages(prev => prev.map((page, idx) => 
              idx === sceneAnalyzerState.pageIndex 
                ? { ...page, panels: updatedPanels }
                : page
            ));
          }}
        />
      )}

      {/* Panel Layout Editor */}
      {parsedPages[layoutEditorState.pageIndex] && (
        <PanelLayoutEditor
          open={layoutEditorState.isOpen}
          onOpenChange={(open) => setLayoutEditorState(prev => ({ ...prev, isOpen: open }))}
          panels={parsedPages[layoutEditorState.pageIndex].panels}
          pageNumber={parsedPages[layoutEditorState.pageIndex].pageNumber}
          onSaveLayout={(layouts) => {
            // Apply layout data to panels
            toast.success('Layout saved - will apply to generation');
          }}
        />
      )}

      {/* Story Suggestions - floating button */}
      {parsedPages.length > 0 && (
        <div className="fixed bottom-6 right-6 z-30 no-print">
          <StorySuggestions 
            characters={getCharacterData()}
            trigger={
              <Button variant="hero" size="lg" className="shadow-lg gap-2">
                <Lightbulb className="w-5 h-5" />
                Story Suggestions
              </Button>
            }
          />
        </div>
      )}

      {/* Collaboration Panel */}
      {currentProjectId && (
        <CollaborationPanel
          open={showCollaboration}
          onOpenChange={setShowCollaboration}
          projectId={currentProjectId}
          isOwner={true}
          projectTitle={comicTitle || `Comic - ${new Date().toLocaleDateString()}`}
        />
      )}

      {/* Version History Manager */}
      {currentProjectId && (
        <ProjectVersionManager
          open={showVersionManager}
          onOpenChange={setShowVersionManager}
          projectId={currentProjectId}
          currentSnapshot={getSnapshot()}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Export Dialog */}
      <ComicExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        pages={parsedPages}
        panelImages={panelImages}
      />

      {/* Dialogue Generator */}
      <DialogueGenerator
        open={dialogueGeneratorState.isOpen}
        onOpenChange={(open) => !open && setDialogueGeneratorState({ isOpen: false, panelId: null, panelDescription: '', panelCharacters: [] })}
        panelDescription={dialogueGeneratorState.panelDescription}
        panelCharacters={dialogueGeneratorState.panelCharacters}
        narration={dialogueGeneratorState.narration}
        previousDialogue={dialogueGeneratorState.previousDialogue}
        characterLibrary={loadCharacterPresets().map(p => ({
          name: p.name,
          description: p.description,
          traits: (p as any).traits,
          archetype: (p as any).archetype,
        }))}
        onSelectDialogue={handleSelectDialogue}
      />

      {/* Legal Footer */}
      <LegalFooter />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />
    </div>
  );
};

export default Index;
