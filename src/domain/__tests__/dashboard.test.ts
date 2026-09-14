import { describe, expect, it } from "vitest";
import type { Task } from "../../types";
import { getBlockedTasks, getUpcomingTasks } from "../dashboard";

const REFERENCE = new Date("2026-03-10T09:00:00");

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    objectiveId: null,
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

describe("getUpcomingTasks", () => {
  it("inclut une tâche en retard (échéance déjà passée)", () => {
    const tasks = [makeTask({ id: "late", dueDate: "2026-03-01" })];
    expect(getUpcomingTasks(tasks, REFERENCE).map((t) => t.id)).toEqual([
      "late",
    ]);
  });

  it("inclut une tâche dont l'échéance tombe dans la fenêtre (7 jours par défaut)", () => {
    const tasks = [makeTask({ id: "soon", dueDate: "2026-03-14" })];
    expect(getUpcomingTasks(tasks, REFERENCE).map((t) => t.id)).toEqual([
      "soon",
    ]);
  });

  it("exclut une tâche dont l'échéance est trop lointaine", () => {
    const tasks = [makeTask({ id: "far", dueDate: "2026-04-01" })];
    expect(getUpcomingTasks(tasks, REFERENCE)).toEqual([]);
  });

  it("exclut les tâches terminées même en retard", () => {
    const tasks = [
      makeTask({ id: "done", dueDate: "2026-03-01", status: "done" }),
    ];
    expect(getUpcomingTasks(tasks, REFERENCE)).toEqual([]);
  });

  it("exclut les tâches sans échéance", () => {
    const tasks = [makeTask({ id: "no-date" })];
    expect(getUpcomingTasks(tasks, REFERENCE)).toEqual([]);
  });

  it("trie par échéance la plus proche en premier", () => {
    const tasks = [
      makeTask({ id: "later", dueDate: "2026-03-15" }),
      makeTask({ id: "earlier", dueDate: "2026-03-05" }),
    ];
    expect(getUpcomingTasks(tasks, REFERENCE).map((t) => t.id)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("respecte une fenêtre personnalisée", () => {
    const tasks = [makeTask({ id: "in-3-days", dueDate: "2026-03-13" })];
    expect(getUpcomingTasks(tasks, REFERENCE, 2)).toEqual([]);
    expect(getUpcomingTasks(tasks, REFERENCE, 3).map((t) => t.id)).toEqual([
      "in-3-days",
    ]);
  });
});

describe("getBlockedTasks", () => {
  it("ne renvoie que les tâches bloquées", () => {
    const tasks = [
      makeTask({ id: "a", status: "blocked" }),
      makeTask({ id: "b", status: "todo" }),
      makeTask({ id: "c", status: "blocked" }),
    ];
    expect(getBlockedTasks(tasks).map((t) => t.id)).toEqual(["a", "c"]);
  });
});
