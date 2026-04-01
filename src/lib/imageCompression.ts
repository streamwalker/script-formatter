/**
 * Lossless-first image compression utility
 * Attempts to reduce file size while maintaining quality
 */

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
}

const DEFAULT_MAX_SIZE_MB = 20;
const QUALITY_STEPS = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];

/**
 * Compress an image file to meet size requirements
 * Uses canvas-based compression with progressive quality reduction
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = { maxSizeMB: DEFAULT_MAX_SIZE_MB }
): Promise<CompressionResult> {
  const originalSize = file.size;
  const maxSizeBytes = options.maxSizeMB * 1024 * 1024;

  // If already under limit, return as-is
  if (file.size <= maxSizeBytes) {
    return {
      file,
      originalSize,
      compressedSize: file.size,
      compressionRatio: 1,
      wasCompressed: false,
    };
  }

  // Load image
  const img = await loadImage(file);
  
  // Calculate target dimensions if max dimension specified
  let { width, height } = img;
  if (options.maxWidthOrHeight) {
    const ratio = Math.min(
      options.maxWidthOrHeight / width,
      options.maxWidthOrHeight / height
    );
    if (ratio < 1) {
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
  }

  // Determine output format - prefer original format if supported
  const originalType = file.type;
  const outputType = ['image/jpeg', 'image/webp', 'image/png'].includes(originalType)
    ? originalType
    : 'image/jpeg';

  // For PNG, try converting to WebP first for better compression
  if (originalType === 'image/png') {
    const webpResult = await compressWithQuality(img, width, height, 'image/webp', 1);
    if (webpResult.size <= maxSizeBytes) {
      return {
        file: new File([webpResult], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }),
        originalSize,
        compressedSize: webpResult.size,
        compressionRatio: webpResult.size / originalSize,
        wasCompressed: true,
      };
    }
  }

  // Progressive quality reduction
  for (const quality of QUALITY_STEPS) {
    const blob = await compressWithQuality(img, width, height, outputType, quality);
    
    if (blob.size <= maxSizeBytes) {
      const extension = outputType.split('/')[1];
      const newName = file.name.replace(/\.[^.]+$/, `.${extension}`);
      
      return {
        file: new File([blob], newName, { type: outputType }),
        originalSize,
        compressedSize: blob.size,
        compressionRatio: blob.size / originalSize,
        wasCompressed: true,
      };
    }
  }

  // If still too large, reduce dimensions progressively
  let scale = 0.9;
  while (scale > 0.3) {
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    
    const blob = await compressWithQuality(img, scaledWidth, scaledHeight, outputType, 0.8);
    
    if (blob.size <= maxSizeBytes) {
      const extension = outputType.split('/')[1];
      const newName = file.name.replace(/\.[^.]+$/, `.${extension}`);
      
      return {
        file: new File([blob], newName, { type: outputType }),
        originalSize,
        compressedSize: blob.size,
        compressionRatio: blob.size / originalSize,
        wasCompressed: true,
      };
    }
    
    scale -= 0.1;
  }

  // Return best effort compression
  const finalBlob = await compressWithQuality(
    img,
    Math.round(width * 0.5),
    Math.round(height * 0.5),
    outputType,
    0.7
  );
  
  const extension = outputType.split('/')[1];
  const newName = file.name.replace(/\.[^.]+$/, `.${extension}`);
  
  return {
    file: new File([finalBlob], newName, { type: outputType }),
    originalSize,
    compressedSize: finalBlob.size,
    compressionRatio: finalBlob.size / originalSize,
    wasCompressed: true,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function compressWithQuality(
  img: HTMLImageElement,
  width: number,
  height: number,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Use better image smoothing for downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, width, height);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not create blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (isImageFile(file)) {
      const result = await compressImage(file, options);
      results.push(result);
    } else {
      results.push({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        wasCompressed: false,
      });
    }
    
    onProgress?.(i + 1, files.length);
  }
  
  return results;
}
