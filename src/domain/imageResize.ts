export const MAX_IMAGE_DIMENSION = 1920;
export const JPEG_QUALITY = 0.82;

export const RESIZABLE_CONTENT_TYPES = ["image/jpeg", "image/png"];

/**
 * Calcule les nouvelles dimensions d'une image à réduire pour tenir dans
 * maxDimension sur son plus grand côté, en conservant le ratio. Renvoie null
 * si l'image est déjà assez petite (rien à faire).
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION,
): { width: number; height: number } | null {
  if (width <= maxDimension && height <= maxDimension) {
    return null;
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
