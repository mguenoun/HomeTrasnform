import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const resizeImageIfNeededMock = vi.fn(async (file: File) => file);
vi.mock("../imageResize", () => ({
  resizeImageIfNeeded: (file: File) => resizeImageIfNeededMock(file),
}));

const setDocMock = vi.fn();
const deleteDocMock = vi.fn();
const onSnapshotMock = vi.fn();
const getDocsMock = vi.fn();
const batchSetMock = vi.fn();
const batchDeleteMock = vi.fn();
const batchCommitMock = vi.fn().mockResolvedValue(undefined);

let docCounter = 0;

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...segments: string[]) => ({
    __collection: segments.join("/"),
  })),
  doc: vi.fn((collectionRef, id?: string) => ({
    __doc: collectionRef.__collection,
    id: id ?? `auto-${++docCounter}`,
  })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: vi.fn((collectionRef) => collectionRef),
  orderBy: vi.fn((field) => ({ field })),
  writeBatch: vi.fn(() => ({
    set: batchSetMock,
    delete: batchDeleteMock,
    commit: batchCommitMock,
  })),
}));

const {
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  subscribeToAttachments,
} = await import("../attachments");

const fakeUser = { uid: "user-1" } as unknown as User;

beforeEach(() => {
  vi.clearAllMocks();
  docCounter = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });
});

describe("uploadAttachment", () => {
  it("valide le fichier avant tout découpage/écriture", async () => {
    const file = new File(["x"], "archive.zip", { type: "application/zip" });
    await expect(uploadAttachment("task1", file, fakeUser)).rejects.toThrow(
      /non autorisé/,
    );
    expect(batchCommitMock).not.toHaveBeenCalled();
  });

  it("découpe le fichier et écrit métadonnées + morceaux dans un même batch", async () => {
    const file = new File(["contenu du devis"], "devis.pdf", {
      type: "application/pdf",
    });

    await uploadAttachment("task1", file, fakeUser);

    // 1 doc de métadonnées + 1 morceau (fichier petit ici)
    expect(batchSetMock).toHaveBeenCalledTimes(2);
    const [metaRef, metaPayload] = batchSetMock.mock.calls[0];
    expect(metaRef.__doc).toBe("tasks/task1/attachments");
    expect(metaPayload).toMatchObject({
      fileName: "devis.pdf",
      contentType: "application/pdf",
      chunkCount: 1,
      uploadedBy: "user-1",
    });

    const [chunkRef, chunkPayload] = batchSetMock.mock.calls[1];
    expect(chunkRef.__doc).toBe(
      `tasks/task1/attachments/${metaRef.id}/chunks`,
    );
    expect(chunkPayload).toMatchObject({ index: 0 });
    expect(typeof chunkPayload.data).toBe("string");

    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("passe le fichier par resizeImageIfNeeded et utilise le résultat pour les métadonnées", async () => {
    const originalFile = new File([new Uint8Array(1000)], "photo.jpg", {
      type: "image/jpeg",
    });
    const resizedFile = new File([new Uint8Array(200)], "photo.jpg", {
      type: "image/jpeg",
    });
    resizeImageIfNeededMock.mockResolvedValueOnce(resizedFile);

    await uploadAttachment("task1", originalFile, fakeUser);

    expect(resizeImageIfNeededMock).toHaveBeenCalledWith(originalFile);
    const [, metaPayload] = batchSetMock.mock.calls[0];
    expect(metaPayload.size).toBe(200);
  });
});

describe("deleteAttachment", () => {
  it("supprime tous les morceaux puis le document de métadonnées, dans un même batch", async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ ref: { __chunk: "0" } }, { ref: { __chunk: "1" } }],
    });
    const attachment = {
      id: "att1",
      taskId: "task1",
      fileName: "devis.pdf",
      contentType: "application/pdf",
      size: 100,
      chunkCount: 2,
      uploadedBy: "user-1",
      uploadedAt: 0,
    };

    await deleteAttachment("task1", attachment);

    expect(batchDeleteMock).toHaveBeenCalledTimes(3); // 2 morceaux + 1 métadonnées
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });
});

describe("subscribeToAttachments", () => {
  it("transforme les documents en TaskAttachment[]", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_collectionRef, callback) => {
      callback({
        docs: [
          { id: "att1", data: () => ({ fileName: "devis.pdf" }) },
        ],
      });
      return () => {};
    });

    subscribeToAttachments("task1", onChange);

    expect(onChange).toHaveBeenCalledWith([
      { id: "att1", fileName: "devis.pdf" },
    ]);
  });
});

describe("downloadAttachment", () => {
  it("réassemble les morceaux dans l'ordre et déclenche le téléchargement", async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => ({ index: 0, data: btoa("Bonjour ") }) },
        { data: () => ({ index: 1, data: btoa("la famille") }) },
      ],
    });
    const attachment = {
      id: "att1",
      taskId: "task1",
      fileName: "devis.pdf",
      contentType: "application/pdf",
      size: 100,
      chunkCount: 2,
      uploadedBy: "user-1",
      uploadedAt: 0,
    };

    await downloadAttachment("task1", attachment);

    expect(getDocsMock).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
