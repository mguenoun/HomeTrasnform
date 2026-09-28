import { describe, expect, it } from "vitest";
import { applyStatusChange, canTransition } from "../taskStatus";

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
