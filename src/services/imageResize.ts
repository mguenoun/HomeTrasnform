import {
  JPEG_QUALITY,
  MAX_IMAGE_DIMENSION,
  RESIZABLE_CONTENT_TYPES,
  computeTargetDimensions,
} from "../domain/imageResize";

/**
 * Réduit une photo trop grande (ex: 4000x3000 prise au téléphone) avant
 * envoi, pour économiser du stockage Firestore. Renvoie le fichier original
 * tel quel si :
 * - ce n'est pas une image (PDF...),
 * - l'image est déjà assez petite,
 * - le redimensionnement échoue ou n'apporte aucun gain de taille.
 * Ne bloque jamais l'upload : en cas de doute, on envoie l'original.
 */
export async function resizeImageIfNeeded(file: File): Promise<File> {
  if (!RESIZABLE_CONTENT_TYPES.includes(file.type)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const target = computeTargetDimensions(
      bitmap.width,
      bitmap.height,
      MAX_IMAGE_DIMENSION,
    );
    if (!target) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        file.type,
        file.type === "image/jpeg" ? JPEG_QUALITY : undefined,
      );
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
