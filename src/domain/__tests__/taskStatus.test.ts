import { describe, expect, it } from "vitest";
import {
  applyStatusChange,
  canTransition,
  isBudgetRequired,
  isTaskValid,
} from "../taskStatus";

describe("canTransition", () => {
  it("autorise todo -> in_progress", () => {
    expect(canTransition("todo", "in_progress")).toBe(true);
  });

  it("autorise todo -> blocked", () => {
    expect(canTransition("todo", "blocked")).toBe(true);
  });

  it("autorise in_progress -> done", () => {
    expect(canTransition("in_progress", "done")).toBe(true);
  });

  it("autorise blocked -> in_progress", () => {
    expect(canTransition("blocked", "in_progress")).toBe(true);
  });

  it("refuse blocked -> done directement", () => {
    expect(canTransition("blocked", "done")).toBe(false);
  });

  it("refuse todo -> done directement", () => {
    expect(canTransition("todo", "done")).toBe(false);
  });

  it("refuse de sortir de done", () => {
    expect(canTransition("done", "todo")).toBe(false);
  });

  it("refuse une transition vers le même statut", () => {
    expect(canTransition("todo", "todo")).toBe(false);
  });
});

describe("applyStatusChange", () => {
  it("fige la date et l'auteur de clôture en passant à done", () => {
    const result = applyStatusChange(
      { status: "in_progress" },
      "done",
      "user-1",
      1234,
    );
    expect(result).toEqual({ status: "done", closedAt: 1234, closedBy: "user-1" });
  });

  it("ne fige pas de date pour une transition qui ne clôture pas", () => {
    const result = applyStatusChange({ status: "todo" }, "blocked", "user-1");
    expect(result).toEqual({ status: "blocked" });
  });

  it("lève une erreur pour une transition invalide", () => {
    expect(() =>
      applyStatusChange({ status: "todo" }, "done", "user-1"),
    ).toThrow(/Transition invalide/);
  });
});

describe("isBudgetRequired", () => {
  it("requiert un budget pour achat et sous-traitance", () => {
    expect(isBudgetRequired("achat")).toBe(true);
    expect(isBudgetRequired("soustraitance")).toBe(true);
  });

  it("ne requiert pas de budget pour ménage et travaux", () => {
    expect(isBudgetRequired("menage")).toBe(false);
    expect(isBudgetRequired("travaux")).toBe(false);
  });
});

describe("isTaskValid", () => {
  it("refuse un titre vide", () => {
    const result = isTaskValid({ title: "  ", type: "menage" });
    expect(result.valid).toBe(false);
  });

  it("refuse un achat sans budget estimé", () => {
    const result = isTaskValid({ title: "Acheter une porte", type: "achat" });
    expect(result.valid).toBe(false);
  });

  it("refuse un budget estimé à zéro pour un achat", () => {
    const result = isTaskValid({
      title: "Acheter une porte",
      type: "achat",
      budgetEstimated: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("accepte un ménage sans budget", () => {
    const result = isTaskValid({ title: "Nettoyer le garage", type: "menage" });
    expect(result.valid).toBe(true);
  });

  it("accepte un achat avec budget estimé positif", () => {
    const result = isTaskValid({
      title: "Acheter une porte",
      type: "achat",
      budgetEstimated: 450,
    });
    expect(result.valid).toBe(true);
  });
});
