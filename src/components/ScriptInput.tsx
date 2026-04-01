import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Sparkles, FileImage, Loader2, Eye, ChevronDown, Settings2 } from 'lucide-react';
import { StyleSelector } from './StyleSelector';
import { CharacterContext, LabeledReferenceImage } from './CharacterContext';
import { CharacterMappingDialog } from './CharacterMappingDialog';
import { ScriptPreviewDialog } from './ScriptPreviewDialog';
import { ScriptTemplateSelector } from './ScriptTemplateSelector';
import { ConsistencySettings } from './ConsistencySettings';
import { ArtStyle, getStyleById } from '@/lib/artStyles';
import { parseScript, ParsedPage } from '@/lib/scriptParser';
import { detectTemplateWithConfidence } from '@/lib/scriptTemplates';
import { ConsistencyConfig, DEFAULT_CONSISTENCY_CONFIG } from '@/lib/characterConsistencyModel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ScriptInputProps {
  onScriptSubmit: (script: string, style: ArtStyle, characterContext: string, referenceImages: string[], labeledImages: LabeledReferenceImage[], consistencyConfig?: ConsistencyConfig) => void;
  isProcessing: boolean;
}

const EXAMPLE_SCRIPT = `PAGE 10

Reads: An ascended™ human from Earth named Poseidon is ruler of the Constreyan land of Neptune. Poseidon believes that only humans should rule on Earth and the Tri-Planetary Coalition is an affront challenging everything he stands for. To that end, Poseidon takes every available opportunity to further his attempts at world domination under the guise of taking it back for humankind, but in reality, he wants it all for himself. Poseidon controls water, which covers over three quarters of the Planet Earth...making him a considerable threat.

1 - Image of Poseidon and his troops during their incursion into Constreya.

2 - Poseidon riding in on a massive tidal wave, flanked by his warcraft, ready to do some damage.

3 - We see Poseidon closing in on his target, the Kingdom of Olympia.

4 - Bottom of the panel in black and white.
Reads: ...and this is where our story begins....`;

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const SUPPORTED_TEXT_TYPES = ['text/plain'];
const SUPPORTED_PDF_TYPES = ['application/pdf'];

export function ScriptInput({ onScriptSubmit, isProcessing }: ScriptInputProps) {
  const [script, setScript] = useState('');
  const [characterContext, setCharacterContext] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [labeledImages, setLabeledImages] = useState<LabeledReferenceImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('western');
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('comic-script');
  
  // Consistency settings
  const [consistencyConfig, setConsistencyConfig] = useState<ConsistencyConfig>(DEFAULT_CONSISTENCY_CONFIG);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Auto-detection state
  const [detectedFormat, setDetectedFormat] = useState<{ name: string; confidence: number } | null>(null);
  const [showFormatBanner, setShowFormatBanner] = useState(false);
  
  // Preview workflow state
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Auto-detect format when script changes significantly
  useEffect(() => {
    if (script.trim().length > 50) {
      const result = detectTemplateWithConfidence(script);
      if (result.confidence > 60) {
        setDetectedFormat({ name: result.template.name, confidence: result.confidence });
        if (selectedTemplateId !== result.template.id) {
          setShowFormatBanner(true);
        }
      }
    } else {
      setDetectedFormat(null);
      setShowFormatBanner(false);
    }
  }, [script]);

  // Parse script for preview using selected template
  const parsedPages = useMemo(() => {
    if (!script.trim()) return [];
    return parseScript(script, selectedTemplateId);
  }, [script, selectedTemplateId]);

  // Extract all detected characters from parsed pages
  const detectedCharacters = useMemo(() => {
    const allCharacters = new Set<string>();
    parsedPages.forEach(page => {
      page.panels.forEach(panel => {
        panel.characters?.forEach(char => allCharacters.add(char));
        panel.dialogueSpeakers?.forEach(speaker => allCharacters.add(speaker));
      });
    });
    return Array.from(allCharacters);
  }, [parsedPages]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const extractTextFromImages = async (images: string[], fileName: string, mimeType = 'image/png') => {
    setIsExtracting(true);
    setUploadedFileName(fileName);
    
    try {
      setExtractionProgress(`Extracting text from ${images.length} page(s)...`);
      toast.info(`Extracting script from ${images.length} page(s)...`);
      
      const { data, error } = await supabase.functions.invoke('extract-script', {
        body: { 
          images,
          mimeType,
          fileName 
        }
      });

      if (error) {
        console.error('Error extracting script:', error);
        if (error.message?.includes('402') || error.message?.includes('Usage limit')) {
          toast.error('AI credits exhausted. Please add credits to your Lovable account to continue.', {
            duration: 8000,
          });
        } else if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Rate limit reached. Please wait a moment and try again.');
        } else {
          toast.error(`Failed to extract script: ${error.message}`);
        }
        return;
      }

      if (data?.text) {
        setScript(data.text);
        toast.success(`Script extracted from ${data.pageCount || 1} page(s)!`);
      } else {
        toast.error('No text could be extracted');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process the uploaded file');
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (SUPPORTED_TEXT_TYPES.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.fountain')) {
      const text = await file.text();
      setScript(text);
      setUploadedFileName(file.name);
      
      // Auto-detect and apply template
      const detection = detectTemplateWithConfidence(text);
      if (detection.confidence > 70) {
        setSelectedTemplateId(detection.template.id);
        toast.success(`Script loaded! Detected format: ${detection.template.name} (${detection.confidence}%)`);
      } else {
        toast.success('Script loaded successfully!');
      }
    } else if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setIsExtracting(true);
      setUploadedFileName(file.name);
      const base64Data = await fileToBase64(file);
      await extractTextFromImages([base64Data], file.name, file.type);
    } else if (SUPPORTED_PDF_TYPES.includes(file.type)) {
      setIsExtracting(true);
      setUploadedFileName(file.name);
      setExtractionProgress('Processing PDF...');
      const base64Data = await fileToBase64(file);
      await extractTextFromImages([base64Data], file.name, 'application/pdf');
    } else {
      toast.error('Unsupported file type. Please upload .txt, .png, .jpg, or .pdf files.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const loadExample = () => {
    setScript(EXAMPLE_SCRIPT);
    setUploadedFileName(null);
  };

  const clearScript = () => {
    setScript('');
    setUploadedFileName(null);
  };

  // Handle the transform button click - start preview workflow
  const handleTransformClick = () => {
    if (!script.trim()) return;
    
    // Check if we have reference images that need labeling
    const hasUnlabeledImages = referenceImages.length > 0 && 
      (labeledImages.length === 0 || labeledImages.some(img => !img.characterName.trim()));
    
    if (hasUnlabeledImages) {
      setShowMappingDialog(true);
    } else {
      // Skip mapping, go straight to preview
      setShowPreviewDialog(true);
    }
  };

  // Handle character mapping confirmation
  const handleMappingConfirm = (newLabeledImages: LabeledReferenceImage[], generatedDescriptions?: string) => {
    setLabeledImages(newLabeledImages);
    
    // If AI generated descriptions, append them to character context
    if (generatedDescriptions) {
      setCharacterContext(prev => {
        if (prev.trim()) {
          return `${prev.trim()}\n\n${generatedDescriptions}`;
        }
        return generatedDescriptions;
      });
      toast.success('AI-generated character descriptions added!');
    }
    
    setShowMappingDialog(false);
    // Now show preview
    setShowPreviewDialog(true);
  };

  // Handle preview confirmation - start generation
  const handlePreviewConfirm = () => {
    setShowPreviewDialog(false);
    onScriptSubmit(script, selectedStyle, characterContext, referenceImages, labeledImages, consistencyConfig);
  };

  // Quick preview button handler
  const handleQuickPreview = () => {
    if (!script.trim()) {
      toast.error('Please enter a script first');
      return;
    }
    setShowPreviewDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
          }
          ${isExtracting ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          type="file"
          accept=".txt,.fountain,.png,.jpg,.jpeg,.webp,.pdf"
          onChange={handleFileSelect}
          disabled={isExtracting}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {isExtracting ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">
              {extractionProgress || 'Extracting script text...'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              AI is reading your script from {uploadedFileName}
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-4">
              <Upload className="w-10 h-10 text-primary" />
              <FileImage className="w-10 h-10 text-accent" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Drop your script file here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports .txt, .fountain, .png, .jpg, .pdf (multi-page)
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <span className="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground">TXT</span>
              <span className="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground">PNG</span>
              <span className="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground">JPG</span>
              <span className="px-2 py-1 bg-primary/20 rounded text-xs text-primary font-medium">PDF ✨</span>
            </div>
          </>
        )}
      </div>

      {/* File indicator */}
      {uploadedFileName && !isExtracting && (
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">{uploadedFileName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearScript} className="text-xs">
            Clear
          </Button>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-sm">or paste your script</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Script Format Selector */}
      <ScriptTemplateSelector
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={setSelectedTemplateId}
        scriptContent={script}
        disabled={isExtracting}
      />

      {/* Text area */}
      <div className="relative">
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="PAGE 1&#10;&#10;Reads: Your opening narration...&#10;&#10;1 - Description of panel 1&#10;&#10;2 - Description of panel 2"
          className="w-full h-64 p-4 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
          disabled={isExtracting}
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickPreview}
            disabled={isExtracting || !script.trim()}
            className="text-xs"
            title="Preview parsed script"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadExample}
            disabled={isExtracting}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Load Example
          </Button>
        </div>
      </div>

      {/* Auto-detect format banner */}
      {showFormatBanner && detectedFormat && (
        <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20 animate-slide-up">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-foreground">
              Format detected: <strong>{detectedFormat.name}</strong> ({detectedFormat.confidence}% confidence)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const result = detectTemplateWithConfidence(script);
                setSelectedTemplateId(result.template.id);
                setShowFormatBanner(false);
                toast.success(`Applied ${result.template.name} format`);
              }}
              className="text-xs h-7"
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFormatBanner(false)}
              className="text-xs h-7"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Parsing stats indicator */}
      {script.trim() && parsedPages.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground p-2 bg-secondary/30 rounded-lg">
          <span>
            📄 {parsedPages.length} page{parsedPages.length !== 1 ? 's' : ''}
          </span>
          <span>
            🖼️ {parsedPages.reduce((acc, p) => acc + p.panels.length, 0)} panels
          </span>
          {detectedCharacters.length > 0 && (
            <span>
              👥 {detectedCharacters.length} character{detectedCharacters.length !== 1 ? 's' : ''} detected
            </span>
          )}
        </div>
      )}

      {/* Character Context */}
      <CharacterContext
        value={characterContext}
        onChange={setCharacterContext}
        referenceImages={referenceImages}
        onReferenceImagesChange={setReferenceImages}
        labeledImages={labeledImages}
        onLabeledImagesChange={setLabeledImages}
        disabled={isExtracting}
      />

      {/* Style selector */}
      <StyleSelector
        selectedStyle={selectedStyle}
        onStyleSelect={setSelectedStyle}
        disabled={isProcessing || isExtracting}
      />

      {/* Advanced Consistency Settings */}
      <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span>Consistency Settings</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <ConsistencySettings
            config={consistencyConfig}
            onChange={setConsistencyConfig}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Submit button */}
      <Button
        variant="hero"
        size="xl"
        onClick={handleTransformClick}
        disabled={!script.trim() || isProcessing || isExtracting}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Sparkles className="w-5 h-5 animate-spin" />
            Generating Graphic Novel...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Transform to Graphic Novel
          </>
        )}
      </Button>

      {/* Character Mapping Dialog */}
      <CharacterMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        onConfirm={handleMappingConfirm}
        referenceImages={referenceImages}
        initialLabeledImages={labeledImages}
        detectedCharacters={detectedCharacters}
      />

      {/* Script Preview Dialog */}
      <ScriptPreviewDialog
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        onConfirm={handlePreviewConfirm}
        parsedPages={parsedPages}
        detectedCharacters={detectedCharacters}
        artStyle={getStyleById(selectedStyle).name}
      />
    </div>
  );
}
