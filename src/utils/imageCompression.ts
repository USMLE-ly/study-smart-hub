/**
 * Image Compression Utility
 * Uses browser canvas API to optimize images before storage
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  format?: 'jpeg' | 'png' | 'webp';
  preserveAspectRatio?: boolean;
}

interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'webp',
  preserveAspectRatio: true,
};

/**
 * Load an image from a File or Blob
 */
export const loadImage = (source: File | Blob | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
};

/**
 * Calculate new dimensions while preserving aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  preserveAspectRatio: boolean
): { width: number; height: number } => {
  if (!preserveAspectRatio) {
    return {
      width: Math.min(originalWidth, maxWidth),
      height: Math.min(originalHeight, maxHeight),
    };
  }

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if exceeds max dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Compress an image using canvas
 */
export const compressImage = async (
  source: File | Blob | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Load the image
  const img = await loadImage(source);
  
  // Get original size
  let originalSize = 0;
  if (source instanceof File || source instanceof Blob) {
    originalSize = source.size;
  }
  
  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth!,
    opts.maxHeight!,
    opts.preserveAspectRatio!
  );
  
  // Create canvas and context
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Apply image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw image on canvas
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to blob
  const mimeType = `image/${opts.format}`;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }
        
        // Create data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          
          resolve({
            blob,
            dataUrl,
            originalSize,
            compressedSize: blob.size,
            compressionRatio: originalSize > 0 ? (1 - blob.size / originalSize) * 100 : 0,
            width,
            height,
          });
        };
        reader.onerror = () => reject(new Error('Failed to create data URL'));
        reader.readAsDataURL(blob);
      },
      mimeType,
      opts.quality
    );
  });
};

/**
 * Compress multiple images in batch
 */
export const compressImages = async (
  sources: (File | Blob | string)[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> => {
  return Promise.all(sources.map((source) => compressImage(source, options)));
};

/**
 * Compress image with automatic format selection based on content
 */
export const compressImageAuto = async (
  source: File | Blob | string,
  options: Omit<CompressionOptions, 'format'> = {}
): Promise<CompressionResult> => {
  // Try WebP first (best compression)
  const webpResult = await compressImage(source, { ...options, format: 'webp' });
  
  // If source was PNG, compare with PNG compression
  if (source instanceof File && source.type === 'image/png') {
    const pngResult = await compressImage(source, { ...options, format: 'png' });
    
    // Use whichever is smaller
    if (pngResult.compressedSize < webpResult.compressedSize) {
      return pngResult;
    }
  }
  
  return webpResult;
};

/**
 * Get optimized image for display (lazy loading ready)
 */
export const getOptimizedImageUrl = async (
  source: File | Blob | string,
  targetWidth: number = 800
): Promise<string> => {
  const result = await compressImage(source, {
    maxWidth: targetWidth,
    maxHeight: targetWidth,
    quality: 0.8,
    format: 'webp',
  });
  
  return result.dataUrl;
};

/**
 * Create thumbnail from image
 */
export const createThumbnail = async (
  source: File | Blob | string,
  size: number = 150
): Promise<CompressionResult> => {
  return compressImage(source, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'jpeg',
  });
};

/**
 * Validate image before compression
 */
export const validateImage = async (source: File | Blob): Promise<{
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}> => {
  try {
    // Check file size (max 50MB)
    if (source.size > 50 * 1024 * 1024) {
      return { valid: false, error: 'Image size exceeds 50MB limit' };
    }
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(source.type)) {
      return { valid: false, error: 'Invalid image format. Supported: JPEG, PNG, WebP, GIF' };
    }
    
    // Load and check dimensions
    const img = await loadImage(source);
    
    // Check minimum dimensions
    if (img.naturalWidth < 10 || img.naturalHeight < 10) {
      return { valid: false, error: 'Image too small (minimum 10x10 pixels)' };
    }
    
    return {
      valid: true,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    return { valid: false, error: 'Failed to load image' };
  }
};

export default {
  compressImage,
  compressImages,
  compressImageAuto,
  createThumbnail,
  getOptimizedImageUrl,
  loadImage,
  validateImage,
};
