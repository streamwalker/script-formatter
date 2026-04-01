import { useState, useRef, useCallback } from 'react';
import { ParsedPanel, ParsedPage } from '@/lib/scriptParser';
import { Move, Maximize2, Type, Check, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PanelEditorProps {
  page: ParsedPage;
  panelImages: Record<number, string>;
  onUpdatePage: (page: ParsedPage) => void;
  onClose: () => void;
}

interface PanelLayout {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextBoxPosition {
  panelId: number;
  type: 'narration' | 'dialogue';
  x: number;
  y: number;
}

export function PanelEditor({ page, panelImages, onUpdatePage, onClose }: PanelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panels, setPanels] = useState<ParsedPanel[]>(page.panels);
  const [draggedPanel, setDraggedPanel] = useState<number | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'arrange' | 'resize' | 'text'>('arrange');
  const [textPositions, setTextPositions] = useState<TextBoxPosition[]>([]);

  // Drag and drop for rearranging
  const handleDragStart = (index: number) => {
    setDraggedPanel(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPanel === null || draggedPanel === index) return;
    
    const newPanels = [...panels];
    const draggedItem = newPanels[draggedPanel];
    newPanels.splice(draggedPanel, 1);
    newPanels.splice(index, 0, draggedItem);
    
    // Update IDs to match new order
    const reorderedPanels = newPanels.map((panel, i) => ({
      ...panel,
      id: i + 1,
    }));
    
    setPanels(reorderedPanels);
    setDraggedPanel(index);
  };

  const handleDragEnd = () => {
    setDraggedPanel(null);
  };

  const handleSave = () => {
    onUpdatePage({
      ...page,
      panels,
    });
    onClose();
  };

  const moveTextBox = (panelId: number, type: 'narration' | 'dialogue', direction: 'up' | 'down' | 'left' | 'right') => {
    const existing = textPositions.find(t => t.panelId === panelId && t.type === type);
    const current = existing || { panelId, type, x: 50, y: type === 'narration' ? 10 : 90 };
    
    const delta = 10;
    let newX = current.x;
    let newY = current.y;
    
    switch (direction) {
      case 'up': newY = Math.max(5, current.y - delta); break;
      case 'down': newY = Math.min(95, current.y + delta); break;
      case 'left': newX = Math.max(5, current.x - delta); break;
      case 'right': newX = Math.min(95, current.x + delta); break;
    }
    
    setTextPositions(prev => {
      const filtered = prev.filter(t => !(t.panelId === panelId && t.type === type));
      return [...filtered, { panelId, type, x: newX, y: newY }];
    });
  };

  const getTextPosition = (panelId: number, type: 'narration' | 'dialogue') => {
    const pos = textPositions.find(t => t.panelId === panelId && t.type === type);
    if (pos) return { left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' };
    return type === 'narration' 
      ? { left: '50%', top: '10%', transform: 'translate(-50%, 0)' }
      : { left: '50%', bottom: '10%', transform: 'translate(-50%, 0)' };
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h2 className="font-comic text-2xl text-foreground">Panel Editor</h2>
          
          {/* Mode selector */}
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setEditMode('arrange')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                editMode === 'arrange' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GripVertical className="w-4 h-4" />
              Arrange
            </button>
            <button
              onClick={() => setEditMode('resize')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                editMode === 'resize' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Maximize2 className="w-4 h-4" />
              Resize
            </button>
            <button
              onClick={() => setEditMode('text')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                editMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Type className="w-4 h-4" />
              Text Boxes
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSave}>
            <Check className="w-4 h-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </header>
      
      {/* Editor content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              {editMode === 'arrange' && '🔀 Drag and drop panels to rearrange their order.'}
              {editMode === 'resize' && '📐 Click a panel to select it, then use the controls below to adjust size.'}
              {editMode === 'text' && '📝 Select a panel to reposition its text boxes using the arrow controls.'}
            </p>
          </div>
          
          {/* Panel grid */}
          <div 
            ref={containerRef}
            className="bg-speech rounded-lg p-4 shadow-panel"
          >
            <div className="grid grid-cols-2 gap-3">
              {panels.map((panel, index) => (
                <div
                  key={panel.id}
                  draggable={editMode === 'arrange'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedPanel(panel.id)}
                  className={cn(
                    'relative panel-border overflow-hidden aspect-[4/3] cursor-pointer transition-all',
                    editMode === 'arrange' && 'cursor-grab active:cursor-grabbing',
                    draggedPanel === index && 'opacity-50 scale-95',
                    selectedPanel === panel.id && 'ring-4 ring-primary ring-offset-2 ring-offset-speech'
                  )}
                >
                  {/* Drag handle */}
                  {editMode === 'arrange' && (
                    <div className="absolute top-2 left-2 z-20 bg-background/80 rounded p-1">
                      <GripVertical className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                  
                  {/* Panel number badge */}
                  <div className="absolute top-2 right-2 z-20 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  
                  {/* Panel image */}
                  <div className="w-full h-full bg-secondary">
                    {panelImages[panel.id] ? (
                      <img 
                        src={panelImages[panel.id]} 
                        alt={panel.description}
                        className={cn('w-full h-full object-cover', panel.isBlackAndWhite && 'grayscale')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
                        {panel.description.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Text boxes preview */}
                  {panel.narration && (
                    <div 
                      className="absolute z-10 narration-box max-w-[80%] text-xs"
                      style={getTextPosition(panel.id, 'narration')}
                    >
                      {panel.narration.substring(0, 30)}...
                    </div>
                  )}
                  
                  {panel.dialogue && (
                    <div 
                      className="absolute z-10 speech-bubble max-w-[80%] text-xs"
                      style={getTextPosition(panel.id, 'dialogue')}
                    >
                      {panel.dialogue.substring(0, 30)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Text position controls */}
          {editMode === 'text' && selectedPanel && (
            <div className="mt-6 p-4 bg-card rounded-lg border border-border">
              <h3 className="font-medium text-foreground mb-4">
                Adjust Text Position - Panel {selectedPanel}
              </h3>
              
              <div className="flex gap-8">
                {panels.find(p => p.id === selectedPanel)?.narration && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Narration Box</p>
                    <div className="grid grid-cols-3 gap-1 w-24">
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'narration', 'up')} className="p-2 bg-secondary rounded hover:bg-secondary/80">↑</button>
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'narration', 'left')} className="p-2 bg-secondary rounded hover:bg-secondary/80">←</button>
                      <div className="p-2 bg-narration rounded text-xs">N</div>
                      <button onClick={() => moveTextBox(selectedPanel, 'narration', 'right')} className="p-2 bg-secondary rounded hover:bg-secondary/80">→</button>
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'narration', 'down')} className="p-2 bg-secondary rounded hover:bg-secondary/80">↓</button>
                      <div />
                    </div>
                  </div>
                )}
                
                {panels.find(p => p.id === selectedPanel)?.dialogue && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dialogue Bubble</p>
                    <div className="grid grid-cols-3 gap-1 w-24">
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'dialogue', 'up')} className="p-2 bg-secondary rounded hover:bg-secondary/80">↑</button>
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'dialogue', 'left')} className="p-2 bg-secondary rounded hover:bg-secondary/80">←</button>
                      <div className="p-2 bg-speech text-speech-foreground rounded text-xs">D</div>
                      <button onClick={() => moveTextBox(selectedPanel, 'dialogue', 'right')} className="p-2 bg-secondary rounded hover:bg-secondary/80">→</button>
                      <div />
                      <button onClick={() => moveTextBox(selectedPanel, 'dialogue', 'down')} className="p-2 bg-secondary rounded hover:bg-secondary/80">↓</button>
                      <div />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
