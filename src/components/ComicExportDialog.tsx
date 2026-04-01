import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Download, FileText, Archive, Image, Loader2, Grid, LayoutGrid, Square } from 'lucide-react';
import {
  ExportFormat,
  ExportOptions,
  PageLayoutOptions,
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_LAYOUT_OPTIONS,
  exportComic,
  generateLayoutPreview,
  LayoutStyle,
  PageSize,
  Orientation,
} from '@/lib/comicExport';
import { ParsedPage } from '@/lib/scriptParser';

interface ComicExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: ParsedPage[];
  panelImages: Record<number, string>;
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4" />,
  cbz: <Archive className="w-4 h-4" />,
  images: <Image className="w-4 h-4" />,
};

const LAYOUT_ICONS: Record<LayoutStyle, React.ReactNode> = {
  western: <LayoutGrid className="w-4 h-4" />,
  manga: <Grid className="w-4 h-4" />,
  grid: <Grid className="w-4 h-4" />,
  single: <Square className="w-4 h-4" />,
};

export function ComicExportDialog({
  open,
  onOpenChange,
  pages,
  panelImages,
}: ComicExportDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  const updateLayout = (updates: Partial<PageLayoutOptions>) => {
    setOptions(prev => ({
      ...prev,
      layout: { ...prev.layout, ...updates },
    }));
  };

  const handleExport = async () => {
    if (pages.length === 0) {
      toast.error('No pages to export');
      return;
    }

    const imageCount = Object.keys(panelImages).length;
    if (imageCount === 0) {
      toast.error('No generated images to export');
      return;
    }

    setExporting(true);
    try {
      await exportComic(pages, panelImages, options);
      toast.success(`Exported ${pages.length} pages as ${options.format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || 'Export failed');
    }
    setExporting(false);
  };

  const layoutPreview = generateLayoutPreview(options.layout.layoutStyle, options.layout.panelsPerPage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Comic
          </DialogTitle>
          <DialogDescription>
            Export your comic as PDF, CBZ, or images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={options.title || ''}
              onChange={(e) => setOptions(prev => ({ ...prev, title: e.target.value }))}
              placeholder="My Comic"
            />
          </div>

          {/* Format Tabs */}
          <Tabs
            value={options.format}
            onValueChange={(v) => setOptions(prev => ({ ...prev, format: v as ExportFormat }))}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pdf" className="gap-1">
                {FORMAT_ICONS.pdf} PDF
              </TabsTrigger>
              <TabsTrigger value="cbz" className="gap-1">
                {FORMAT_ICONS.cbz} CBZ
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1">
                {FORMAT_ICONS.images} Images
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="space-y-4">
              {/* Page Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Page Size</Label>
                  <Select
                    value={options.layout.pageSize}
                    onValueChange={(v) => updateLayout({ pageSize: v as PageSize })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Letter (8.5×11)</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="a5">A5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Orientation</Label>
                  <Select
                    value={options.layout.orientation}
                    onValueChange={(v) => updateLayout({ orientation: v as Orientation })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Layout Style */}
              <div>
                <Label>Layout Style</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {(['western', 'manga', 'grid', 'single'] as LayoutStyle[]).map((style) => (
                    <Button
                      key={style}
                      variant={options.layout.layoutStyle === style ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLayout({ layoutStyle: style })}
                      className="gap-1"
                    >
                      {LAYOUT_ICONS[style]}
                      <span className="capitalize">{style}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Panels Per Page */}
              <div>
                <Label>Panels Per Page: {options.layout.panelsPerPage}</Label>
                <Slider
                  value={[options.layout.panelsPerPage]}
                  onValueChange={([v]) => updateLayout({ panelsPerPage: v })}
                  min={1}
                  max={6}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Layout Preview */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <Label className="text-xs">Layout Preview</Label>
                <div className="mt-2 aspect-[3/4] max-w-24 mx-auto border-2 border-foreground/20 rounded">
                  <div
                    className="w-full h-full grid gap-0.5 p-1"
                    style={{
                      gridTemplateRows: `repeat(${layoutPreview.rows}, 1fr)`,
                      gridTemplateColumns: `repeat(${layoutPreview.cols}, 1fr)`,
                    }}
                  >
                    {layoutPreview.pattern.flat().map((filled, i) => (
                      <div
                        key={i}
                        className={`border ${filled ? 'bg-primary/20 border-primary/40' : 'border-dashed border-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cbz" className="space-y-4">
              <div>
                <Label>Quality</Label>
                <Select
                  value={options.quality}
                  onValueChange={(v) => setOptions(prev => ({ ...prev, quality: v as 'high' | 'medium' | 'web' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High (best quality, larger file)</SelectItem>
                    <SelectItem value="medium">Medium (balanced)</SelectItem>
                    <SelectItem value="web">Web (smaller file)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                CBZ is a comic book archive format compatible with most comic readers.
              </p>
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download all panel images as a ZIP file, organized by page.
              </p>
            </TabsContent>
          </Tabs>

          {/* Include Options */}
          {options.format === 'pdf' && (
            <div className="space-y-3">
              <Label>Include in Export</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Narration boxes</span>
                <Switch
                  checked={options.includeNarration}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, includeNarration: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dialogue bubbles</span>
                <Switch
                  checked={options.includeDialogue}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, includeDialogue: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Page numbers</span>
                <Switch
                  checked={options.includePageNumbers}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, includePageNumbers: v }))}
                />
              </div>
            </div>
          )}

          {/* Export Stats */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {pages.length} pages · {Object.keys(panelImages).length} panels with images
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={exporting || pages.length === 0}
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export as {options.format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
