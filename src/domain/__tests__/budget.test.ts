import { describe, expect, it } from "vitest";
import type { Task } from "../../types";
import {
  groupBudgetByObjective,
  groupBudgetByType,
  summarizeBudget,
  summarizeTaskBudget,
} from "../budget";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    objectiveId: "obj1",
    title: "Tâche",
    type: "achat",
    priority: "medium",
    status: "todo",
    assigneeIds: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("summarizeTaskBudget", () => {
  it("retourne des totaux à zéro quand aucun budget n'est saisi", () => {
    const task = makeTask({ type: "menage" });
    expect(summarizeTaskBudget(task)).toEqual({
      estimated: 0,
      actual: 0,
      overBudget: false,
    });
  });

  it("détecte un dépassement quand le réel dépasse l'estimé", () => {
    const task = makeTask({ budgetEstimated: 100, budgetActual: 150 });
    expect(summarizeTaskBudget(task).overBudget).toBe(true);
  });

  it("ne signale pas de dépassement si aucun budget estimé n'a été fixé", () => {
    const task = makeTask({ budgetActual: 150 });
    expect(summarizeTaskBudget(task).overBudget).toBe(false);
  });

  it("ne signale pas de dépassement si le réel est inférieur ou égal à l'estimé", () => {
    const task = makeTask({ budgetEstimated: 100, budgetActual: 100 });
    expect(summarizeTaskBudget(task).overBudget).toBe(false);
  });
});

describe("summarizeBudget", () => {
  it("additionne les budgets de plusieurs tâches", () => {
    const tasks = [
      makeTask({ budgetEstimated: 100, budgetActual: 90 }),
      makeTask({ budgetEstimated: 50, budgetActual: 60 }),
    ];
    const summary = summarizeBudget(tasks);
    expect(summary.estimated).toBe(150);
    expect(summary.actual).toBe(150);
    expect(summary.overBudget).toBe(true);
  });

  it("retourne des totaux à zéro pour une liste vide", () => {
    expect(summarizeBudget([])).toEqual({
      estimated: 0,
      actual: 0,
      overBudget: false,
    });
  });
});

describe("groupBudgetByObjective", () => {
  it("regroupe les tâches par objectif, y compris les tâches libres", () => {
    const tasks = [
      makeTask({ objectiveId: "obj1", budgetEstimated: 100 }),
      makeTask({ objectiveId: "obj2", budgetEstimated: 200 }),
      makeTask({ objectiveId: null, budgetEstimated: 30 }),
    ];
    const groups = groupBudgetByObjective(tasks);
    expect(groups.obj1.estimated).toBe(100);
    expect(groups.obj2.estimated).toBe(200);
    expect(groups.unassigned.estimated).toBe(30);
  });
});

describe("groupBudgetByType", () => {
  it("regroupe les tâches par type", () => {
    const tasks = [
      makeTask({ type: "achat", budgetEstimated: 100 }),
      makeTask({ type: "soustraitance", budgetEstimated: 500 }),
      makeTask({ type: "menage" }),
    ];
    const groups = groupBudgetByType(tasks);
    expect(groups.achat.estimated).toBe(100);
    expect(groups.soustraitance.estimated).toBe(500);
    expect(groups.menage.estimated).toBe(0);
  });
});
