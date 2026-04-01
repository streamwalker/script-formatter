import { ParsedPage, LabeledReferenceImage } from '@/lib/scriptParser';
import { ComicPanel } from './ComicPanel';

interface PanelHistory {
  images: string[];
  currentIndex: number;
}

interface GraphicNovelPageProps {
  page: ParsedPage;
  panelImages: Record<number, string>;
  generatingPanels: Set<number>;
  onRegeneratePanel?: (panelId: number) => void;
  onCompareRegenerate?: (panelId: number) => void;
  panelHistory?: Record<number, PanelHistory>;
  onUndo?: (panelId: number) => void;
  onRedo?: (panelId: number) => void;
  labeledImages?: LabeledReferenceImage[];
  onAnalyzeComposition?: (panelId: number) => void;
  onGenerateDialogue?: (panelId: number) => void;
  projectId?: string;
  canComment?: boolean;
}

export function GraphicNovelPage({ 
  page, 
  panelImages, 
  generatingPanels,
  onRegeneratePanel,
  onCompareRegenerate,
  panelHistory = {},
  onUndo,
  onRedo,
  labeledImages = [],
  onAnalyzeComposition,
  onGenerateDialogue,
  projectId,
  canComment = false,
}: GraphicNovelPageProps) {
  const { panels, openingNarration, pageNumber } = page;
  
  // Determine layout based on panel count
  const getLayoutClass = () => {
    switch (panels.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 [&>*:first-child]:md:col-span-2';
      case 4:
        return 'grid-cols-2';
      case 5:
        return 'grid-cols-2 [&>*:nth-child(5)]:col-span-2';
      case 6:
        return 'grid-cols-2 md:grid-cols-3';
      default:
        return 'grid-cols-2';
    }
  };

  // Get panel aspect ratio based on position and total count
  const getPanelClass = (index: number) => {
    const total = panels.length;
    
    if (total === 4) {
      // 4-panel layout: varied heights for dynamic feel
      if (index === 0) return 'aspect-[16/9]'; // Wide top
      if (index === 1) return 'aspect-square'; // Square
      if (index === 2) return 'aspect-[3/4]'; // Tall
      if (index === 3) return 'aspect-[4/3]'; // Standard
    }
    
    if (total === 3) {
      if (index === 0) return 'aspect-[21/9]'; // Panoramic top
      return 'aspect-[4/3]';
    }
    
    return 'aspect-[4/3]';
  };

  return (
    <div className="comic-page-export bg-speech rounded-lg shadow-panel overflow-hidden max-w-4xl mx-auto">
      {/* Page border frame */}
      <div className="p-2 md:p-3 bg-panel-border">
        <div className="bg-speech p-3 md:p-4">
          {/* Opening narration */}
          {openingNarration && (
            <div className="mb-4 p-4 bg-narration rounded">
              <p className="comic-text text-sm md:text-base text-narration-foreground leading-relaxed">
                {openingNarration}
              </p>
            </div>
          )}

          {/* Panels grid */}
          <div className={`grid gap-2 md:gap-3 ${getLayoutClass()}`}>
            {panels.map((panel, index) => {
              const history = panelHistory[panel.id];
              return (
                <ComicPanel
                  key={panel.id}
                  panel={panel}
                  imageUrl={panelImages[panel.id]}
                  isGenerating={generatingPanels.has(panel.id)}
                  className={getPanelClass(index)}
                  onRegenerate={onRegeneratePanel}
                  onCompareRegenerate={onCompareRegenerate}
                  canRegenerate={!!onRegeneratePanel}
                  historyIndex={history?.currentIndex ?? 0}
                  historyLength={history?.images.length ?? 0}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  labeledImages={labeledImages}
                  onAnalyzeComposition={onAnalyzeComposition}
                  onGenerateDialogue={onGenerateDialogue}
                  projectId={projectId}
                  canComment={canComment}
                />
              );
            })}
          </div>

          {/* Page number */}
          <div className="mt-4 text-center">
            <span className="font-comic text-lg text-panel-border">
              PAGE {pageNumber}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
