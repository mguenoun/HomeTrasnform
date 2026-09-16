import { describe, expect, it } from "vitest";
import { docIdFromName, parseFirestoreFields, parseFirestoreValue } from "./firestoreDocs";

describe("parseFirestoreValue", () => {
  it("convertit les types scalaires", () => {
    expect(parseFirestoreValue({ stringValue: "salut" })).toBe("salut");
    expect(parseFirestoreValue({ integerValue: "42" })).toBe(42);
    expect(parseFirestoreValue({ doubleValue: 3.5 })).toBe(3.5);
    expect(parseFirestoreValue({ booleanValue: true })).toBe(true);
    expect(parseFirestoreValue({ nullValue: null })).toBeNull();
    expect(parseFirestoreValue({ timestampValue: "2026-09-01T00:00:00Z" })).toBe(
      "2026-09-01T00:00:00Z",
    );
  });

  it("convertit les tableaux et objets imbriqués", () => {
    expect(
      parseFirestoreValue({
        arrayValue: { values: [{ stringValue: "a" }, { integerValue: "1" }] },
      }),
    ).toEqual(["a", 1]);

    expect(
      parseFirestoreValue({
        mapValue: { fields: { p256dh: { stringValue: "key1" } } },
      }),
    ).toEqual({ p256dh: "key1" });
  });

  it("retourne undefined pour une valeur absente", () => {
    expect(parseFirestoreValue(undefined)).toBeUndefined();
  });
});

describe("parseFirestoreFields", () => {
  it("convertit un ensemble de champs Firestore en objet JS classique", () => {
    expect(
      parseFirestoreFields({
        title: { stringValue: "Nettoyer le garage" },
        status: { stringValue: "todo" },
        assigneeIds: { arrayValue: { values: [{ stringValue: "user-1" }] } },
        dueReminderSentAt: { nullValue: null },
      }),
    ).toEqual({
      title: "Nettoyer le garage",
      status: "todo",
      assigneeIds: ["user-1"],
      dueReminderSentAt: null,
    });
  });
});

describe("docIdFromName", () => {
  it("extrait l'identifiant final d'un chemin de document Firestore", () => {
    expect(
      docIdFromName(
        "projects/p/databases/(default)/documents/tasks/task1",
      ),
    ).toBe("task1");
  });
});
