import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ParsedPage } from './scriptParser';

export type ExportFormat = 'pdf' | 'cbz' | 'images';

export type PageSize = 'letter' | 'a4' | 'a5' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type LayoutStyle = 'grid' | 'manga' | 'single' | 'western';

export interface PageLayoutOptions {
  pageSize: PageSize;
  orientation: Orientation;
  customWidth?: number;
  customHeight?: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gutter: number;
  panelsPerPage: number;
  layoutStyle: LayoutStyle;
}

export interface ExportOptions {
  format: ExportFormat;
  layout: PageLayoutOptions;
  quality: 'high' | 'medium' | 'web';
  includeNarration: boolean;
  includeDialogue: boolean;
  includePageNumbers: boolean;
  title?: string;
}

export const DEFAULT_LAYOUT_OPTIONS: PageLayoutOptions = {
  pageSize: 'letter',
  orientation: 'portrait',
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 20,
  marginRight: 20,
  gutter: 10,
  panelsPerPage: 4,
  layoutStyle: 'western',
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'pdf',
  layout: DEFAULT_LAYOUT_OPTIONS,
  quality: 'high',
  includeNarration: true,
  includeDialogue: true,
  includePageNumbers: true,
  title: 'My Comic',
};

// Get page dimensions in pixels (at 72 DPI)
export function getPageDimensions(options: PageLayoutOptions): { width: number; height: number } {
  const sizes: Record<PageSize, { width: number; height: number }> = {
    letter: { width: 612, height: 792 },
    a4: { width: 595, height: 842 },
    a5: { width: 420, height: 595 },
    custom: { 
      width: options.customWidth || 612, 
      height: options.customHeight || 792 
    },
  };

  const dims = sizes[options.pageSize];
  
  return options.orientation === 'landscape'
    ? { width: dims.height, height: dims.width }
    : dims;
}

// Generate printable HTML for PDF export
export function generatePrintableHTML(
  pages: ParsedPage[],
  panelImages: Record<number, string>,
  options: ExportOptions
): string {
  const dims = getPageDimensions(options.layout);
  const { marginTop, marginBottom, marginLeft, marginRight, gutter } = options.layout;
  
  const contentWidth = dims.width - marginLeft - marginRight;
  const contentHeight = dims.height - marginTop - marginBottom;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title || 'Comic Export'}</title>
  <style>
    @page {
      size: ${options.layout.pageSize === 'custom' 
        ? `${options.layout.customWidth}pt ${options.layout.customHeight}pt`
        : options.layout.pageSize} ${options.layout.orientation};
      margin: ${marginTop}pt ${marginRight}pt ${marginBottom}pt ${marginLeft}pt;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Comic Sans MS', cursive, sans-serif;
      background: white;
    }
    
    .comic-page {
      width: ${contentWidth}pt;
      height: ${contentHeight}pt;
      page-break-after: always;
      display: grid;
      gap: ${gutter}pt;
      position: relative;
    }
    
    .comic-page:last-child {
      page-break-after: avoid;
    }
    
    .panel {
      background: #f0f0f0;
      border: 2pt solid #000;
      border-radius: 4pt;
      overflow: hidden;
      position: relative;
    }
    
    .panel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .panel-text {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.9);
      padding: 4pt;
      font-size: 8pt;
    }
    
    .narration {
      font-style: italic;
      background: #ffffd0;
      padding: 4pt;
      margin-bottom: 4pt;
      font-size: 9pt;
    }
    
    .dialogue {
      background: white;
      border: 1pt solid #000;
      border-radius: 8pt;
      padding: 4pt 8pt;
      margin: 2pt;
      font-size: 10pt;
    }
    
    .page-number {
      position: absolute;
      bottom: 5pt;
      right: 10pt;
      font-size: 10pt;
      color: #666;
    }
    
    .page-header {
      text-align: center;
      font-size: 12pt;
      margin-bottom: 10pt;
    }
    
    /* Grid layouts */
    .grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
    .grid-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
    .grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
    .grid-6 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
`;

  for (const page of pages) {
    const gridClass = `grid-${Math.min(options.layout.panelsPerPage, 6)}`;
    
    html += `
  <div class="comic-page ${gridClass}">`;
    
    if (options.includeNarration && page.openingNarration) {
      html += `
    <div class="narration">${escapeHtml(page.openingNarration)}</div>`;
    }
    
    for (const panel of page.panels) {
      const imageData = panelImages[panel.id];
      
      html += `
    <div class="panel">
      ${imageData ? `<img src="${imageData}" alt="Panel ${panel.id}" />` : `<div style="padding: 20pt; text-align: center;">Panel ${panel.id}</div>`}`;
      
      if (options.includeDialogue && panel.dialogue) {
        html += `
      <div class="dialogue">${escapeHtml(panel.dialogue)}</div>`;
      }
      
      html += `
    </div>`;
    }
    
    if (options.includePageNumbers) {
      html += `
    <div class="page-number">Page ${page.pageNumber}</div>`;
    }
    
    html += `
  </div>`;
  }

  html += `
</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export to PDF using print dialog
export async function exportToPDF(
  pages: ParsedPage[],
  panelImages: Record<number, string>,
  options: ExportOptions
): Promise<void> {
  const html = generatePrintableHTML(pages, panelImages, options);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  printWindow.print();
}

// Export to CBZ (ZIP archive of images)
export async function exportToCBZ(
  pages: ParsedPage[],
  panelImages: Record<number, string>,
  options: ExportOptions
): Promise<void> {
  const zip = new JSZip();
  
  let panelNumber = 0;
  
  for (const page of pages) {
    for (const panel of page.panels) {
      const imageData = panelImages[panel.id];
      if (!imageData) continue;
      
      panelNumber++;
      const fileName = `page_${String(page.pageNumber).padStart(3, '0')}_panel_${String(panelNumber).padStart(4, '0')}.jpg`;
      
      // Extract base64 data
      const base64Data = imageData.split(',')[1];
      if (base64Data) {
        zip.file(fileName, base64Data, { base64: true });
      }
    }
  }
  
  // Add metadata file
  const metadata = {
    title: options.title,
    pages: pages.length,
    totalPanels: panelNumber,
    exportDate: new Date().toISOString(),
    layout: options.layout,
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  
  // Generate and download
  const blob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: options.quality === 'high' ? 9 : options.quality === 'medium' ? 6 : 3 },
  });
  
  saveAs(blob, `${options.title || 'comic'}.cbz`);
}

// Export as individual images
export async function exportToImages(
  pages: ParsedPage[],
  panelImages: Record<number, string>,
  options: ExportOptions
): Promise<void> {
  const zip = new JSZip();
  
  let panelNumber = 0;
  
  for (const page of pages) {
    const folder = zip.folder(`page_${String(page.pageNumber).padStart(3, '0')}`);
    if (!folder) continue;
    
    for (const panel of page.panels) {
      const imageData = panelImages[panel.id];
      if (!imageData) continue;
      
      panelNumber++;
      const fileName = `panel_${String(panel.id).padStart(4, '0')}.jpg`;
      
      const base64Data = imageData.split(',')[1];
      if (base64Data) {
        folder.file(fileName, base64Data, { base64: true });
      }
    }
  }
  
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${options.title || 'comic'}_images.zip`);
}

// Main export function
export async function exportComic(
  pages: ParsedPage[],
  panelImages: Record<number, string>,
  options: ExportOptions
): Promise<void> {
  switch (options.format) {
    case 'pdf':
      return exportToPDF(pages, panelImages, options);
    case 'cbz':
      return exportToCBZ(pages, panelImages, options);
    case 'images':
      return exportToImages(pages, panelImages, options);
  }
}

// Calculate optimal layout based on panel count
export function getOptimalLayout(panelCount: number): number {
  if (panelCount <= 1) return 1;
  if (panelCount <= 2) return 2;
  if (panelCount <= 4) return 4;
  return 6;
}

// Generate preview data for layout selection
export function generateLayoutPreview(
  layoutStyle: LayoutStyle,
  panelsPerPage: number
): { rows: number; cols: number; pattern: boolean[][] } {
  const patterns: Record<LayoutStyle, Record<number, boolean[][]>> = {
    western: {
      1: [[true]],
      2: [[true], [true]],
      4: [[true, true], [true, true]],
      6: [[true, true], [true, true], [true, true]],
    },
    manga: {
      1: [[true]],
      2: [[true], [true]],
      4: [[true, true], [true, true]],
      6: [[true, true, true], [true, true, true]],
    },
    grid: {
      1: [[true]],
      2: [[true, true]],
      4: [[true, true], [true, true]],
      6: [[true, true, true], [true, true, true]],
    },
    single: {
      1: [[true]],
      2: [[true]],
      4: [[true]],
      6: [[true]],
    },
  };
  
  const pattern = patterns[layoutStyle]?.[panelsPerPage] || [[true]];
  
  return {
    rows: pattern.length,
    cols: Math.max(...pattern.map(row => row.length)),
    pattern,
  };
}
