import { describe, expect, it } from "vitest";
import type { Task } from "../../types";
import { computeProgress } from "../progress";

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

describe("computeProgress", () => {
  it("retourne 0% pour une liste vide", () => {
    expect(computeProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });

  it("calcule le pourcentage de tâches terminées", () => {
    const tasks = [
      makeTask({ status: "done" }),
      makeTask({ status: "done" }),
      makeTask({ status: "todo" }),
      makeTask({ status: "in_progress" }),
    ];
    expect(computeProgress(tasks)).toEqual({ total: 4, done: 2, percent: 50 });
  });

  it("arrondit le pourcentage", () => {
    const tasks = [
      makeTask({ status: "done" }),
      makeTask({ status: "todo" }),
      makeTask({ status: "todo" }),
    ];
    expect(computeProgress(tasks).percent).toBe(33);
  });
});
