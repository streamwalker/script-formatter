import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Move, 
  Maximize2, 
  Grid3X3,
  LayoutGrid,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { ParsedPanel } from '@/lib/scriptParser';
import { PanelSize, LAYOUT_TEMPLATES, LayoutTemplate } from '@/lib/sceneLayoutAnalysis';
import { toast } from 'sonner';

interface PanelLayout {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

interface PanelLayoutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: ParsedPanel[];
  pageNumber: number;
  onSaveLayout: (layouts: PanelLayout[]) => void;
}

const GRID_SIZE = 20;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export function PanelLayoutEditor({
  open,
  onOpenChange,
  panels,
  pageNumber,
  onSaveLayout,
}: PanelLayoutEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layouts, setLayouts] = useState<PanelLayout[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate | null>(null);

  // Initialize layouts from panels
  useEffect(() => {
    if (open && panels.length > 0 && layouts.length === 0) {
      const initialLayouts = generateDefaultLayout(panels);
      setLayouts(initialLayouts);
    }
  }, [open, panels]);

  // Generate default grid layout
  const generateDefaultLayout = (panelList: ParsedPanel[]): PanelLayout[] => {
    const cols = Math.ceil(Math.sqrt(panelList.length));
    const rows = Math.ceil(panelList.length / cols);
    const panelWidth = Math.floor((CANVAS_WIDTH - GRID_SIZE * (cols + 1)) / cols);
    const panelHeight = Math.floor((CANVAS_HEIGHT - GRID_SIZE * (rows + 1)) / rows);

    return panelList.map((panel, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        id: panel.id,
        x: GRID_SIZE + col * (panelWidth + GRID_SIZE),
        y: GRID_SIZE + row * (panelHeight + GRID_SIZE),
        width: panelWidth,
        height: panelHeight,
        description: panel.description.substring(0, 50),
      };
    });
  };

  // Apply template layout
  const applyTemplate = (template: LayoutTemplate) => {
    setSelectedTemplate(template);
    const config = LAYOUT_TEMPLATES[template];
    const sizes = config.defaultPanelSizes;
    
    let currentY = GRID_SIZE;
    const newLayouts: PanelLayout[] = [];

    panels.forEach((panel, index) => {
      const size = sizes[index % sizes.length];
      let width: number, height: number;

      switch (size) {
        case 'full':
          width = CANVAS_WIDTH - GRID_SIZE * 2;
          height = 200;
          break;
        case 'large':
          width = CANVAS_WIDTH - GRID_SIZE * 2;
          height = 150;
          break;
        case 'medium':
          width = (CANVAS_WIDTH - GRID_SIZE * 3) / 2;
          height = 120;
          break;
        case 'small':
          width = (CANVAS_WIDTH - GRID_SIZE * 4) / 3;
          height = 100;
          break;
        case 'strip':
          width = CANVAS_WIDTH - GRID_SIZE * 2;
          height = 80;
          break;
        default:
          width = (CANVAS_WIDTH - GRID_SIZE * 3) / 2;
          height = 120;
      }

      // Position panels in a flow layout
      const x = size === 'medium' || size === 'small' 
        ? (index % 2 === 0 ? GRID_SIZE : CANVAS_WIDTH / 2 + GRID_SIZE / 2)
        : GRID_SIZE;

      if (size === 'full' || size === 'large' || size === 'strip' || index % 2 === 0) {
        if (index > 0) currentY += GRID_SIZE;
      }

      newLayouts.push({
        id: panel.id,
        x,
        y: currentY,
        width,
        height,
        description: panel.description.substring(0, 50),
      });

      if (size === 'full' || size === 'large' || size === 'strip' || index % 2 === 1) {
        currentY += height;
      }
    });

    setLayouts(newLayouts);
    toast.success(`Applied ${config.name} template`);
  };

  // Snap to grid
  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent, panelId: number, isResize: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPanel(panelId);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    if (isResize) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
  };

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (selectedPanel === null) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setLayouts(prev => prev.map(layout => {
      if (layout.id !== selectedPanel) return layout;

      if (isResizing) {
        return {
          ...layout,
          width: Math.max(60, snapToGrid(layout.width + deltaX)),
          height: Math.max(40, snapToGrid(layout.height + deltaY)),
        };
      } else {
        return {
          ...layout,
          x: Math.max(0, Math.min(CANVAS_WIDTH - layout.width, snapToGrid(layout.x + deltaX))),
          y: Math.max(0, snapToGrid(layout.y + deltaY)),
        };
      }
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, selectedPanel, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Update panel size with slider
  const updatePanelSize = (dimension: 'width' | 'height', value: number) => {
    if (selectedPanel === null) return;
    setLayouts(prev => prev.map(layout => {
      if (layout.id !== selectedPanel) return layout;
      return { ...layout, [dimension]: value };
    }));
  };

  // Reset to default
  const resetLayout = () => {
    setLayouts(generateDefaultLayout(panels));
    setSelectedTemplate(null);
    toast.info('Reset to default layout');
  };

  // Get selected layout
  const selectedLayout = layouts.find(l => l.id === selectedPanel);

  // Save and close
  const handleSave = () => {
    onSaveLayout(layouts);
    toast.success('Layout saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Panel Layout Editor - Page {pageNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Drag panels to reposition • Drag corners to resize
              </span>
              <Button variant="ghost" size="sm" onClick={resetLayout}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            <div 
              ref={canvasRef}
              className="relative border-2 border-dashed border-border rounded-lg bg-muted/30 overflow-hidden"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              onClick={() => setSelectedPanel(null)}
            >
              {/* Grid lines */}
              <svg className="absolute inset-0 pointer-events-none opacity-20" width="100%" height="100%">
                <defs>
                  <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                    <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Panels */}
              {layouts.map((layout, index) => (
                <div
                  key={layout.id}
                  className={`
                    absolute rounded-md border-2 transition-colors cursor-move
                    flex items-center justify-center overflow-hidden
                    ${selectedPanel === layout.id 
                      ? 'border-primary bg-primary/20 shadow-lg z-10' 
                      : 'border-border bg-card hover:border-primary/50'
                    }
                  `}
                  style={{
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: layout.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, layout.id)}
                >
                  <div className="text-center p-2">
                    <div className="text-xs font-bold text-foreground">Panel {index + 1}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {layout.description}
                    </div>
                  </div>

                  {/* Resize handle */}
                  <div
                    className={`
                      absolute bottom-0 right-0 w-4 h-4 cursor-se-resize
                      ${selectedPanel === layout.id ? 'bg-primary' : 'bg-muted-foreground/30'}
                      rounded-tl-sm
                    `}
                    onMouseDown={(e) => handleMouseDown(e, layout.id, true)}
                  >
                    <Maximize2 className="w-3 h-3 text-background m-0.5" />
                  </div>

                  {/* Move indicator */}
                  <div className="absolute top-1 left-1">
                    <Move className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-64 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-2">
                {/* Templates */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Layout Templates</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(LAYOUT_TEMPLATES).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={selectedTemplate === key ? 'default' : 'outline'}
                        size="sm"
                        className="h-auto py-2 flex flex-col items-center"
                        onClick={() => applyTemplate(key as LayoutTemplate)}
                      >
                        <span className="text-lg mb-1">{config.icon}</span>
                        <span className="text-xs">{config.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Selected Panel Properties */}
                {selectedLayout ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium">
                        Selected: Panel {layouts.findIndex(l => l.id === selectedPanel) + 1}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {selectedLayout.description}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">
                        Width: {selectedLayout.width}px
                      </Label>
                      <Slider
                        value={[selectedLayout.width]}
                        onValueChange={([v]) => updatePanelSize('width', v)}
                        min={60}
                        max={CANVAS_WIDTH - GRID_SIZE * 2}
                        step={GRID_SIZE}
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">
                        Height: {selectedLayout.height}px
                      </Label>
                      <Slider
                        value={[selectedLayout.height]}
                        onValueChange={([v]) => updatePanelSize('height', v)}
                        min={40}
                        max={300}
                        step={GRID_SIZE}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground">X:</span> {selectedLayout.x}
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground">Y:</span> {selectedLayout.y}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Click a panel to edit its properties
                  </div>
                )}

                <Separator />

                {/* Panel List */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">All Panels</Label>
                  <div className="space-y-1">
                    {layouts.map((layout, index) => (
                      <div
                        key={layout.id}
                        className={`
                          p-2 rounded text-xs cursor-pointer transition-colors
                          ${selectedPanel === layout.id 
                            ? 'bg-primary/20 border border-primary' 
                            : 'bg-muted hover:bg-muted/80'
                          }
                        `}
                        onClick={() => setSelectedPanel(layout.id)}
                      >
                        <div className="font-medium">Panel {index + 1}</div>
                        <div className="text-muted-foreground truncate">
                          {layout.width}×{layout.height}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
