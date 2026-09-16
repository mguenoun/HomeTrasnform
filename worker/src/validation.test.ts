import { describe, expect, it } from "vitest";
import { isAllowedEmail, validateNotifyBody } from "./validation";

describe("isAllowedEmail", () => {
  it("autorise un email présent dans la liste, insensible à la casse", () => {
    expect(
      isAllowedEmail("Marie@Example.com", "paul@example.com, marie@example.com"),
    ).toBe(true);
  });

  it("refuse un email absent de la liste", () => {
    expect(isAllowedEmail("intrus@example.com", "marie@example.com")).toBe(false);
  });
});

const VALID_SUB = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "key1", auth: "key2" },
};

describe("validateNotifyBody", () => {
  it("accepte un corps valide", () => {
    const result = validateNotifyBody({
      subscriptions: [VALID_SUB],
      title: "Nouvelle tâche",
      body: "Repeindre le salon vous a été assignée.",
      url: "/tasks/task1",
    });
    expect(result.valid).toBe(true);
  });

  it("refuse un corps sans abonnement", () => {
    const result = validateNotifyBody({
      subscriptions: [],
      title: "t",
      body: "b",
    });
    expect(result.valid).toBe(false);
  });

  it("refuse un abonnement mal formé", () => {
    const result = validateNotifyBody({
      subscriptions: [{ endpoint: "https://x" }],
      title: "t",
      body: "b",
    });
    expect(result.valid).toBe(false);
  });

  it("refuse un titre ou un message vide", () => {
    expect(
      validateNotifyBody({ subscriptions: [VALID_SUB], title: "", body: "b" })
        .valid,
    ).toBe(false);
    expect(
      validateNotifyBody({ subscriptions: [VALID_SUB], title: "t", body: "" })
        .valid,
    ).toBe(false);
  });

  it("refuse un corps qui n'est pas un objet", () => {
    expect(validateNotifyBody(null).valid).toBe(false);
    expect(validateNotifyBody("x").valid).toBe(false);
  });
});
