import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "hometransform-test-meals",
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
    await setDoc(doc(context.firestore(), "familymembers/member@example.com"), {
      uid: "member-uid",
    });
    await setDoc(doc(context.firestore(), "mealPlans/2026-W47"), {
      weekId: "2026-W47",
      defaultDiners: 4,
      slots: {},
    });
    await setDoc(doc(context.firestore(), "shoppingLists/2026-W47"), {
      weekId: "2026-W47",
      items: {},
    });
    for (const name of ["dishes", "ingredients", "pantry"]) {
      await setDoc(doc(context.firestore(), `${name}/2026-W47`), { name: "x" });
    }
    await setDoc(doc(context.firestore(), "householdExpenses/2026-W47"), {
      weekId: "2026-W47",
      type: "groceries",
      amount: 10,
    });
  });
});

function asMember() {
  return testEnv.authenticatedContext("member-uid", {
    email: "member@example.com",
  });
}

function asOutsider() {
  return testEnv.authenticatedContext("outsider-uid", {
    email: "outsider@example.com",
  });
}

describe.each([
  "mealPlans",
  "shoppingLists",
  "householdExpenses",
  "dishes",
  "ingredients",
  "pantry",
])("règles %s", (name) => {
  it("autorise un membre à lire, lister et écrire", async () => {
    const db = asMember().firestore();
    await assertSucceeds(getDoc(doc(db, `${name}/2026-W47`)));
    await assertSucceeds(getDocs(collection(db, name)));
    await assertSucceeds(
      setDoc(doc(db, `${name}/2026-W48`), { weekId: "2026-W48" }),
    );
    await assertSucceeds(
      updateDoc(doc(db, `${name}/2026-W47`), { weekId: "2026-W47" }),
    );
  });

  it("refuse tout à un non-membre authentifié", async () => {
    const db = asOutsider().firestore();
    await assertFails(getDoc(doc(db, `${name}/2026-W47`)));
    await assertFails(getDocs(collection(db, name)));
    await assertFails(setDoc(doc(db, `${name}/2026-W49`), { weekId: "x" }));
  });

  it("refuse tout à un utilisateur non authentifié", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `${name}/2026-W47`)));
    await assertFails(getDocs(collection(db, name)));
  });
});
