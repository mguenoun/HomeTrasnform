import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
    await setDoc(doc(context.firestore(), "familymembers/member@example.com"), {
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
    await assertSucceeds(
      setDoc(doc(member.firestore(), "tasks/task1/attachments/a1/chunks/0"), {
        index: 0,
        data: "base64...",
      }),
    );
  });

  it("refuse la lecture des morceaux d'une pièce jointe à un non-membre", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "tasks/task1/attachments/a1/chunks/0"),
        { index: 0, data: "base64..." },
      );
    });
    const outsider = testEnv.authenticatedContext("outsider-uid", {
      email: "outsider@example.com",
    });
    await assertFails(
      getDoc(doc(outsider.firestore(), "tasks/task1/attachments/a1/chunks/0")),
    );
  });

  it("autorise un membre à créer et lire une rubrique budgétaire", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await assertSucceeds(
      setDoc(doc(member.firestore(), "budgetItems/b1"), {
        title: "Carrelage",
        budgeted: 1000,
      }),
    );
    await assertSucceeds(getDoc(doc(member.firestore(), "budgetItems/b1")));
  });

  it("refuse la lecture d'une rubrique budgétaire à un non-membre", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "budgetItems/b1"), {
        title: "Carrelage",
        budgeted: 1000,
      });
    });
    const outsider = testEnv.authenticatedContext("outsider-uid", {
      email: "outsider@example.com",
    });
    await assertFails(getDoc(doc(outsider.firestore(), "budgetItems/b1")));
  });

  it("empêche un membre d'écrire directement dans familymembers", async () => {
    const member = testEnv.authenticatedContext("member-uid", {
      email: "member@example.com",
    });
    await assertFails(
      setDoc(doc(member.firestore(), "familymembers/new@example.com"), {
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

  describe("objectifs privés", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "familymembers/member2@example.com"), {
          uid: "member2-uid",
        });
        await setDoc(doc(context.firestore(), "objectives/private-obj"), {
          title: "Cadeau surprise",
          visibility: "private",
          createdBy: "member-uid",
        });
      });
    });

    function asOwner() {
      return testEnv.authenticatedContext("member-uid", {
        email: "member@example.com",
      });
    }

    function asOtherMember() {
      return testEnv.authenticatedContext("member2-uid", {
        email: "member2@example.com",
      });
    }

    it("autorise le créateur à lire son objectif privé", async () => {
      await assertSucceeds(
        getDoc(doc(asOwner().firestore(), "objectives/private-obj")),
      );
    });

    it("refuse la lecture d'un objectif privé à un autre membre de la famille", async () => {
      await assertFails(
        getDoc(doc(asOtherMember().firestore(), "objectives/private-obj")),
      );
    });

    it("refuse la modification d'un objectif privé par un autre membre", async () => {
      await assertFails(
        updateDoc(doc(asOtherMember().firestore(), "objectives/private-obj"), {
          title: "Détourné",
        }),
      );
    });

    it("un objectif partagé (visibility absente) reste lisible par tous les membres", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "objectives/shared-obj"), {
          title: "Objectif commun",
          createdBy: "member-uid",
        });
      });
      await assertSucceeds(
        getDoc(doc(asOtherMember().firestore(), "objectives/shared-obj")),
      );
    });

    it("refuse la lecture d'une tâche liée à un objectif privé à un autre membre", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "tasks/private-task"), {
          title: "Réserver le restaurant",
          objectiveId: "private-obj",
        });
      });
      await assertSucceeds(
        getDoc(doc(asOwner().firestore(), "tasks/private-task")),
      );
      await assertFails(
        getDoc(doc(asOtherMember().firestore(), "tasks/private-task")),
      );
    });

    it("une tâche libre (sans objectif) reste lisible par tous les membres", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "tasks/free-task"), {
          title: "Tâche libre",
          objectiveId: null,
        });
      });
      await assertSucceeds(
        getDoc(doc(asOtherMember().firestore(), "tasks/free-task")),
      );
    });

    it("refuse la lecture d'une rubrique budgétaire liée à un objectif privé à un autre membre", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "budgetItems/private-budget"), {
          title: "Bijou",
          objectiveId: "private-obj",
          budgeted: 500,
        });
      });
      await assertSucceeds(
        getDoc(doc(asOwner().firestore(), "budgetItems/private-budget")),
      );
      await assertFails(
        getDoc(doc(asOtherMember().firestore(), "budgetItems/private-budget")),
      );
    });

    it("refuse la lecture des commentaires et pièces jointes d'une tâche privée à un autre membre", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "tasks/private-task"), {
          title: "Réserver le restaurant",
          objectiveId: "private-obj",
        });
        await setDoc(
          doc(context.firestore(), "tasks/private-task/comments/c1"),
          { text: "Chut" },
        );
        await setDoc(
          doc(context.firestore(), "tasks/private-task/attachments/a1"),
          { fileName: "devis.pdf" },
        );
      });

      await assertSucceeds(
        getDoc(doc(asOwner().firestore(), "tasks/private-task/comments/c1")),
      );
      await assertFails(
        getDoc(
          doc(asOtherMember().firestore(), "tasks/private-task/comments/c1"),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            asOtherMember().firestore(),
            "tasks/private-task/attachments/a1",
          ),
        ),
      );
    });

    it("refuse la création d'une tâche sur l'objectif privé d'un autre membre", async () => {
      await assertFails(
        setDoc(doc(asOtherMember().firestore(), "tasks/sneaky-task"), {
          title: "Intrus",
          objectiveId: "private-obj",
        }),
      );
    });
  });
});
