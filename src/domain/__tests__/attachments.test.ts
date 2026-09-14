import { describe, expect, it } from "vitest";
import {
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  joinChunks,
  splitIntoChunks,
  validateFile,
} from "../attachments";

describe("validateFile", () => {
  it("accepte un PDF de taille correcte", () => {
    expect(validateFile("application/pdf", 1024)).toBeNull();
  });

  it("accepte une image JPEG ou PNG", () => {
    expect(validateFile("image/jpeg", 1024)).toBeNull();
    expect(validateFile("image/png", 1024)).toBeNull();
  });

  it("refuse un type de fichier non autorisé", () => {
    expect(validateFile("application/zip", 1024)).toMatch(/non autorisé/);
  });

  it("refuse un fichier de plus de 10 Mo", () => {
    expect(validateFile("application/pdf", MAX_FILE_SIZE + 1)).toMatch(
      /volumineux/,
    );
  });

  it("accepte un fichier exactement à la limite", () => {
    expect(validateFile("application/pdf", MAX_FILE_SIZE)).toBeNull();
  });
});

describe("splitIntoChunks / joinChunks", () => {
  it("reconstitue un petit fichier à l'identique après découpage/réassemblage", () => {
    const original = new TextEncoder().encode("Bonjour la famille !");
    const chunks = splitIntoChunks(original.buffer as ArrayBuffer);
    expect(chunks).toHaveLength(1);

    const rebuilt = joinChunks(chunks);
    expect(new TextDecoder().decode(rebuilt)).toBe("Bonjour la famille !");
  });

  it("découpe un fichier dépassant la taille de morceau et le reconstitue à l'identique", () => {
    // chunkSize réduit à 10 : teste la même logique de découpage/bornes que
    // le vrai CHUNK_SIZE (700 Ko), mais sans passer des Mo dans atob/btoa —
    // nettement plus lent sous le polyfill jsdom des tests que dans un vrai
    // navigateur.
    const original = new Uint8Array(25);
    for (let i = 0; i < original.length; i++) {
      original[i] = i;
    }

    const chunks = splitIntoChunks(original.buffer as ArrayBuffer, 10);
    expect(chunks).toHaveLength(3); // 10 + 10 + 5

    const rebuilt = joinChunks(chunks);
    expect(rebuilt).toEqual(original);
  });

  it("gère un fichier vide sans planter", () => {
    const chunks = splitIntoChunks(new ArrayBuffer(0));
    const rebuilt = joinChunks(chunks);
    expect(rebuilt.length).toBe(0);
  });

  it("respecte la taille de morceau demandée", () => {
    const original = new Uint8Array(45);
    const chunks = splitIntoChunks(original.buffer as ArrayBuffer, 20);
    for (const chunk of chunks) {
      // taille brute réelle (décodée), le padding base64 fausserait une
      // simple estimation par longueur * 3/4.
      expect(atob(chunk).length).toBeLessThanOrEqual(20);
    }
  });

  it("CHUNK_SIZE reste bien en-dessous de la limite Firestore de 1 Mio par document", () => {
    expect(CHUNK_SIZE).toBe(700 * 1024);
  });
});
