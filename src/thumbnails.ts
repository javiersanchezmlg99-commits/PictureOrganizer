import { nativeImage, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const THUMB_SIZE = 200;
let thumbDir: string;

export function initThumbnails(): void {
  thumbDir = path.join(app.getPath('userData'), 'thumbnails');
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
}

/**
 * Get thumbnail path for a photo ID.
 * Returns existing thumb path or null if not cached.
 */
export function getThumbPath(photoId: string): string | null {
  const thumbPath = path.join(thumbDir, `${photoId}.jpg`);
  return fs.existsSync(thumbPath) ? thumbPath : null;
}

/**
 * Generate thumbnail for a photo. Returns the thumbnail file path.
 * Uses Electron's nativeImage for resizing — no external deps.
 */
export function generateThumbnail(photoId: string, originalPath: string): string {
  const thumbPath = path.join(thumbDir, `${photoId}.jpg`);

  // Skip if already cached
  if (fs.existsSync(thumbPath)) return thumbPath;

  try {
    const image = nativeImage.createFromPath(originalPath);
    if (image.isEmpty()) {
      console.warn(`[thumbnails] Failed to load image: ${originalPath}`);
      return originalPath; // Fallback to original
    }

    const size = image.getSize();
    // Only resize if larger than thumb size
    if (size.width > THUMB_SIZE || size.height > THUMB_SIZE) {
      const resized = image.resize({
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        quality: 'good',
      });
      fs.writeFileSync(thumbPath, resized.toJPEG(80));
    } else {
      fs.writeFileSync(thumbPath, image.toJPEG(80));
    }

    return thumbPath;
  } catch (err) {
    console.warn(`[thumbnails] Error generating thumbnail:`, err);
    return originalPath; // Fallback to original
  }
}

/**
 * Delete thumbnail for a photo.
 */
export function deleteThumbnail(photoId: string): void {
  const thumbPath = path.join(thumbDir, `${photoId}.jpg`);
  if (fs.existsSync(thumbPath)) {
    fs.unlinkSync(thumbPath);
  }
}
