export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

// Taille des morceaux stockés en base64 dans Firestore, bien en-dessous de la
// limite de 1 Mio par document (la base64 gonfle la taille d'environ 33%, et
// il faut laisser de la marge pour les autres champs du document).
export const CHUNK_SIZE = 700 * 1024;

export function validateFile(contentType: string, size: number): string | null {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return `Type de fichier non autorisé (${contentType}). Formats acceptés : PDF, JPG, PNG.`;
  }
  if (size > MAX_FILE_SIZE) {
    return `Fichier trop volumineux (${(size / 1024 / 1024).toFixed(1)} Mo). Taille maximale : 10 Mo.`;
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  // Convertit par blocs (au lieu d'un caractère à la fois) pour rester
  // rapide sur des morceaux de plusieurs centaines de Ko, tout en évitant de
  // dépasser la limite d'arguments de String.fromCharCode.apply.
  const BATCH = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BATCH) {
    const slice = bytes.subarray(offset, offset + BATCH);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function splitIntoChunks(
  buffer: ArrayBuffer,
  chunkSize: number = CHUNK_SIZE,
): string[] {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return [""];
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytesToBase64(bytes.subarray(offset, offset + chunkSize)));
  }
  return chunks;
}

export function joinChunks(chunks: string[]): Uint8Array {
  const parts = chunks.map(base64ToBytes);
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
