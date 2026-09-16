import { describe, expect, it } from "vitest";
import type { FamilyUser, Objective, Task } from "../../types";
import {
  countClosedObjectives,
  countClosedTasks,
  getBlockedTasks,
  getTaskKpisByPerson,
  getUpcomingTasks,
  isTaskOverdue,
} from "../dashboard";

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

function makeObjective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: "o1",
    title: "Objectif",
    status: "active",
    createdBy: "u1",
    createdAt: 0,
    ...overrides,
  };
}

function makeUser(overrides: Partial<FamilyUser> = {}): FamilyUser {
  return {
    uid: "u1",
    displayName: "Alice",
    email: "alice@example.com",
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

describe("countClosedObjectives", () => {
  it("compte les objectifs archivés sur le total", () => {
    const objectives = [
      makeObjective({ id: "a", status: "archived" }),
      makeObjective({ id: "b", status: "active" }),
      makeObjective({ id: "c", status: "archived" }),
    ];
    expect(countClosedObjectives(objectives)).toEqual({ closed: 2, total: 3 });
  });
});

describe("countClosedTasks", () => {
  it("compte les tâches terminées sur le total", () => {
    const tasks = [
      makeTask({ id: "a", status: "done" }),
      makeTask({ id: "b", status: "todo" }),
    ];
    expect(countClosedTasks(tasks)).toEqual({ closed: 1, total: 2 });
  });
});

describe("isTaskOverdue", () => {
  it("est vraie pour une tâche non terminée dont l'échéance est passée", () => {
    const task = makeTask({ dueDate: "2026-03-01", status: "in_progress" });
    expect(isTaskOverdue(task, REFERENCE)).toBe(true);
  });

  it("est fausse pour une tâche terminée même en retard", () => {
    const task = makeTask({ dueDate: "2026-03-01", status: "done" });
    expect(isTaskOverdue(task, REFERENCE)).toBe(false);
  });

  it("est fausse pour une tâche sans échéance", () => {
    const task = makeTask({ status: "in_progress" });
    expect(isTaskOverdue(task, REFERENCE)).toBe(false);
  });

  it("est fausse pour une tâche dont l'échéance n'est pas encore passée", () => {
    const task = makeTask({ dueDate: "2026-03-15", status: "in_progress" });
    expect(isTaskOverdue(task, REFERENCE)).toBe(false);
  });
});

describe("getTaskKpisByPerson", () => {
  it("calcule le retard, la clôture et le total par personne", () => {
    const users = [
      makeUser({ uid: "u1", displayName: "Bob" }),
      makeUser({ uid: "u2", displayName: "Alice" }),
    ];
    const tasks = [
      makeTask({
        id: "t1",
        assigneeIds: ["u1"],
        status: "in_progress",
        dueDate: "2026-03-01",
      }),
      makeTask({ id: "t2", assigneeIds: ["u1"], status: "done" }),
      makeTask({ id: "t3", assigneeIds: ["u2"], status: "todo" }),
    ];
    expect(getTaskKpisByPerson(tasks, users, REFERENCE)).toEqual([
      { uid: "u2", displayName: "Alice", overdue: 0, closed: 0, total: 1 },
      { uid: "u1", displayName: "Bob", overdue: 1, closed: 1, total: 2 },
    ]);
  });

  it("compte une tâche pour chacun de ses assignés multiples", () => {
    const users = [makeUser({ uid: "u1" }), makeUser({ uid: "u2", displayName: "Bob" })];
    const tasks = [makeTask({ id: "t1", assigneeIds: ["u1", "u2"], status: "todo" })];
    const kpis = getTaskKpisByPerson(tasks, users, REFERENCE);
    expect(kpis.find((k) => k.uid === "u1")?.total).toBe(1);
    expect(kpis.find((k) => k.uid === "u2")?.total).toBe(1);
  });
});
