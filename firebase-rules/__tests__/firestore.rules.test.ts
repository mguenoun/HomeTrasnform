import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "hometransform-test",
    firestore: {
      rules: readFileSync("firebase-rules/firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
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

describe("Firestore security rules", () => {
  it("refuse la lecture à un utilisateur non authentifié", async () => {
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(unauth.firestore(), "objectives/obj1")));
  });

  it("refuse la lecture à un utilisateur authentifié mais non membre", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid", {
      email: "outsider@example.com",
    });
    await assertFails(getDoc(doc(outsider.firestore(), "objectives/obj1")));
  });

  it("autorise un membre de la famille à créer et lire un objectif", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await assertSucceeds(
      setDoc(doc(member.firestore(), "objectives/obj1"), { title: "Test" }),
    );
    await assertSucceeds(getDoc(doc(member.firestore(), "objectives/obj1")));
  });

  it("autorise un membre à créer une tâche et ses sous-collections", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await assertSucceeds(
      setDoc(doc(member.firestore(), "tasks/task1"), { title: "Tâche" }),
    );
    await assertSucceeds(
      setDoc(doc(member.firestore(), "tasks/task1/comments/c1"), {
        text: "Bonjour",
      }),
    );
    await assertSucceeds(
      setDoc(doc(member.firestore(), "tasks/task1/attachments/a1"), {
        fileName: "devis.pdf",
      }),
    );
  });

  it("empêche un membre d'écrire directement dans familyMembers", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await assertFails(
      setDoc(doc(member.firestore(), "familyMembers/new@example.com"), {
        uid: "x",
      }),
    );
  });

  it("refuse l'écriture d'une tâche par un non-membre", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid", {
      email: "outsider@example.com",
    });
    await assertFails(
      setDoc(doc(outsider.firestore(), "tasks/task1"), { title: "Intrus" }),
    );
  });
});
