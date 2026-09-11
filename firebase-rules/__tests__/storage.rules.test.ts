import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

const SMALL_PDF = new Uint8Array([1, 2, 3, 4]);
const TOO_LARGE = new Uint8Array(10 * 1024 * 1024 + 1);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "hometransform-test",
    firestore: {
      rules: readFileSync("firebase-rules/firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync("firebase-rules/storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "familyMembers/member@example.com"), {
      uid: "member-uid",
    });
  });
});

describe("Storage security rules", () => {
  it("refuse l'upload à un utilisateur non authentifié", async () => {
    const unauth = testEnv.unauthenticatedContext();
    const fileRef = ref(unauth.storage(), "tasks/task1/devis.pdf");
    await assertFails(
      uploadBytes(fileRef, SMALL_PDF, { contentType: "application/pdf" }),
    );
  });

  it("refuse l'upload à un utilisateur authentifié non membre", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid", {
      email: "outsider@example.com",
    });
    const fileRef = ref(outsider.storage(), "tasks/task1/devis.pdf");
    await assertFails(
      uploadBytes(fileRef, SMALL_PDF, { contentType: "application/pdf" }),
    );
  });

  it("autorise un membre à uploader un PDF de taille correcte", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    const fileRef = ref(member.storage(), "tasks/task1/devis.pdf");
    await assertSucceeds(
      uploadBytes(fileRef, SMALL_PDF, { contentType: "application/pdf" }),
    );
  });

  it("refuse un fichier de plus de 10 Mo", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    const fileRef = ref(member.storage(), "tasks/task1/trop-lourd.pdf");
    await assertFails(
      uploadBytes(fileRef, TOO_LARGE, { contentType: "application/pdf" }),
    );
  }, 30000);

  it("refuse un type de fichier non autorisé", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    const fileRef = ref(member.storage(), "tasks/task1/script.js");
    await assertFails(
      uploadBytes(fileRef, SMALL_PDF, { contentType: "application/javascript" }),
    );
  });

  it("autorise un membre à supprimer une pièce jointe uploadée par un autre", async () => {
    const uploader = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "familyMembers/other@example.com"), {
        uid: "other-uid",
      });
    });
    const uploaderRef = ref(uploader.storage(), "tasks/task1/devis.pdf");
    await uploadBytes(uploaderRef, SMALL_PDF, { contentType: "application/pdf" });

    const otherMember = testEnv.authenticatedContext("other-uid", {
      email: "other@example.com",
    });
    const otherRef = ref(otherMember.storage(), "tasks/task1/devis.pdf");
    await assertSucceeds(deleteObject(otherRef));
  });
});
