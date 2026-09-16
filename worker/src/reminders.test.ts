import { describe, expect, it, vi } from "vitest";
import { runDueDateReminders, shouldRemind, type ReminderTask } from "./reminders";

const ENV = {
  FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_SERVICE_ACCOUNT_EMAIL: "worker@test.iam.gserviceaccount.com",
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: "fake-key",
};

const TODAY = new Date("2026-09-16T07:00:00Z");

function baseTask(overrides: Partial<ReminderTask> = {}): ReminderTask {
  return {
    title: "Nettoyer le garage",
    status: "todo",
    dueDate: "2026-09-17",
    assigneeIds: ["user-1"],
    dueReminderSentAt: null,
    ...overrides,
  };
}

describe("shouldRemind", () => {
  it("est dû quand l'échéance est dans les 2 prochains jours", () => {
    expect(shouldRemind(baseTask({ dueDate: "2026-09-18" }), TODAY)).toBe(true);
  });

  it("est dû quand l'échéance est déjà dépassée", () => {
    expect(shouldRemind(baseTask({ dueDate: "2026-09-10" }), TODAY)).toBe(true);
  });

  it("n'est pas dû si l'échéance est trop lointaine", () => {
    expect(shouldRemind(baseTask({ dueDate: "2026-09-25" }), TODAY)).toBe(false);
  });

  it("n'est pas dû si la tâche est terminée", () => {
    expect(shouldRemind(baseTask({ status: "done" }), TODAY)).toBe(false);
  });

  it("n'est pas dû sans échéance", () => {
    expect(shouldRemind(baseTask({ dueDate: null }), TODAY)).toBe(false);
  });

  it("n'est pas dû si un rappel a déjà été envoyé", () => {
    expect(shouldRemind(baseTask({ dueReminderSentAt: 123 }), TODAY)).toBe(false);
  });
});

describe("runDueDateReminders", () => {
  function makeDeps(overrides: Partial<Parameters<typeof runDueDateReminders>[1]> = {}) {
    return {
      getAccessToken: vi.fn().mockResolvedValue("access-token"),
      listTasks: vi.fn().mockResolvedValue([
        { id: "task1", data: baseTask() },
      ]),
      getUser: vi.fn().mockResolvedValue({
        id: "user-1",
        data: {
          pushSubscriptions: [
            { endpoint: "https://push.example.com/1", keys: { p256dh: "a", auth: "b" } },
          ],
        },
      }),
      markReminded: vi.fn().mockResolvedValue(undefined),
      sendPush: vi.fn().mockResolvedValue({ ok: true }),
      now: () => TODAY,
      ...overrides,
    };
  }

  it("envoie un rappel aux assignés d'une tâche due et marque la tâche comme rappelée", async () => {
    const deps = makeDeps();

    const result = await runDueDateReminders(ENV, deps);

    expect(result.tasksReminded).toBe(1);
    expect(deps.sendPush).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/1", keys: { p256dh: "a", auth: "b" } },
      expect.stringContaining("Nettoyer le garage"),
    );
    expect(deps.markReminded).toHaveBeenCalledWith(
      "test-project",
      "task1",
      "access-token",
    );
  });

  it("marque la tâche comme rappelée même si personne n'a d'abonnement push", async () => {
    const deps = makeDeps({ getUser: vi.fn().mockResolvedValue(null) });

    const result = await runDueDateReminders(ENV, deps);

    expect(result.tasksReminded).toBe(0);
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.markReminded).toHaveBeenCalledWith(
      "test-project",
      "task1",
      "access-token",
    );
  });

  it("ignore les tâches qui ne sont pas dues", async () => {
    const deps = makeDeps({
      listTasks: vi.fn().mockResolvedValue([
        { id: "task1", data: baseTask({ dueDate: "2026-12-25" }) },
      ]),
    });

    const result = await runDueDateReminders(ENV, deps);

    expect(result.tasksReminded).toBe(0);
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.markReminded).not.toHaveBeenCalled();
  });
});
