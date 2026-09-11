import { describe, expect, it } from "vitest";
import type { Task } from "../../types";
import { filterTasks, sortTasks } from "../taskFilters";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    objectiveId: "obj1",
    title: "Tâche",
    type: "menage",
    priority: "medium",
    status: "todo",
    assigneeIds: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("filterTasks", () => {
  it("filtre par objectif, y compris les tâches libres (null)", () => {
    const tasks = [
      makeTask({ id: "a", objectiveId: "obj1" }),
      makeTask({ id: "b", objectiveId: "obj2" }),
      makeTask({ id: "c", objectiveId: null }),
    ];
    expect(filterTasks(tasks, { objectiveId: "obj1" }).map((t) => t.id)).toEqual([
      "a",
    ]);
    expect(filterTasks(tasks, { objectiveId: null }).map((t) => t.id)).toEqual([
      "c",
    ]);
  });

  it("filtre par statut, type et pièce", () => {
    const tasks = [
      makeTask({ id: "a", status: "todo", type: "menage", room: "salon" }),
      makeTask({ id: "b", status: "done", type: "achat", room: "cuisine" }),
    ];
    expect(filterTasks(tasks, { status: "done" }).map((t) => t.id)).toEqual([
      "b",
    ]);
    expect(filterTasks(tasks, { type: "menage" }).map((t) => t.id)).toEqual([
      "a",
    ]);
    expect(filterTasks(tasks, { room: "cuisine" }).map((t) => t.id)).toEqual([
      "b",
    ]);
  });

  it("filtre par assigné", () => {
    const tasks = [
      makeTask({ id: "a", assigneeIds: ["u1"] }),
      makeTask({ id: "b", assigneeIds: ["u2"] }),
    ];
    expect(filterTasks(tasks, { assigneeId: "u1" }).map((t) => t.id)).toEqual([
      "a",
    ]);
  });

  it("ne filtre rien quand aucun critère n'est fourni", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b" })];
    expect(filterTasks(tasks, {})).toHaveLength(2);
  });
});

describe("sortTasks", () => {
  it("trie par priorité (haute en premier)", () => {
    const tasks = [
      makeTask({ id: "low", priority: "low" }),
      makeTask({ id: "high", priority: "high" }),
      makeTask({ id: "medium", priority: "medium" }),
    ];
    expect(sortTasks(tasks, "priority").map((t) => t.id)).toEqual([
      "high",
      "medium",
      "low",
    ]);
  });

  it("trie par échéance (les tâches sans échéance en dernier)", () => {
    const tasks = [
      makeTask({ id: "none" }),
      makeTask({ id: "later", dueDate: "2026-12-01" }),
      makeTask({ id: "soon", dueDate: "2026-09-15" }),
    ];
    expect(sortTasks(tasks, "dueDate").map((t) => t.id)).toEqual([
      "soon",
      "later",
      "none",
    ]);
  });

  it("trie par budget estimé décroissant", () => {
    const tasks = [
      makeTask({ id: "small", budgetEstimated: 50 }),
      makeTask({ id: "big", budgetEstimated: 500 }),
      makeTask({ id: "none" }),
    ];
    expect(sortTasks(tasks, "budgetEstimated").map((t) => t.id)).toEqual([
      "big",
      "small",
      "none",
    ]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const tasks = [
      makeTask({ id: "a", priority: "low" }),
      makeTask({ id: "b", priority: "high" }),
    ];
    sortTasks(tasks, "priority");
    expect(tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
