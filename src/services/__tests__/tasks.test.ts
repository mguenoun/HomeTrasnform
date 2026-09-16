import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const addDocMock = vi.fn().mockResolvedValue({ id: "new-task-id" });
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const deleteDocMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ __doc: name, id })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  onSnapshot: vi.fn(),
}));

const { createTask, updateTask, changeTaskStatus, deleteTask } = await import(
  "../tasks"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTask", () => {
  it("crée une tâche au statut todo sans assigné", async () => {
    const id = await createTask({
      title: "Nettoyer le garage",
      type: "menage",
      priority: "medium",
      objectiveId: "obj1",
      createdBy: "user-1",
    });

    expect(id).toBe("new-task-id");
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Nettoyer le garage",
      status: "todo",
      assigneeIds: [],
      budgetEstimated: null,
      objectiveId: "obj1",
      createdBy: "user-1",
    });
  });

  it("enregistre le budget estimé fourni à la création", async () => {
    await createTask({
      title: "Acheter une porte",
      type: "achat",
      priority: "medium",
      objectiveId: "obj1",
      budgetEstimated: 450,
      createdBy: "user-1",
    });

    const [, payload] = addDocMock.mock.calls[0];
    expect(payload.budgetEstimated).toBe(450);
  });
});

describe("updateTask", () => {
  it("met à jour les champs et horodate la modification", async () => {
    await updateTask("task1", { title: "Nouveau titre" });
    const [ref, payload] = updateDocMock.mock.calls[0];
    expect(ref).toEqual({ __doc: "tasks", id: "task1" });
    expect(payload.title).toBe("Nouveau titre");
    expect(typeof payload.updatedAt).toBe("number");
  });

  it("retire les champs undefined avant l'écriture (Firestore les refuse et l'édition restait bloquée sans message)", async () => {
    await updateTask("task1", {
      title: "Repeindre le salon",
      dueDate: undefined,
      budgetEstimated: undefined,
    });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).not.toHaveProperty("dueDate");
    expect(payload).not.toHaveProperty("budgetEstimated");
    expect(payload.title).toBe("Repeindre le salon");
  });

  it("conserve les valeurs null (utilisées pour effacer un champ)", async () => {
    await updateTask("task1", { dueDate: null, budgetEstimated: null });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.dueDate).toBeNull();
    expect(payload.budgetEstimated).toBeNull();
  });

  it("réinitialise le rappel d'échéance quand la date change (pour qu'un nouveau rappel puisse être envoyé)", async () => {
    await updateTask("task1", { dueDate: "2026-10-01" });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.dueReminderSentAt).toBeNull();
  });

  it("ne touche pas au rappel d'échéance quand la date n'est pas modifiée", async () => {
    await updateTask("task1", { title: "Nouveau titre" });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).not.toHaveProperty("dueReminderSentAt");
  });
});

describe("changeTaskStatus", () => {
  it("applique une transition valide et fige la clôture pour done", async () => {
    await changeTaskStatus(
      { id: "task1", status: "in_progress" },
      "done",
      "user-1",
    );
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.status).toBe("done");
    expect(payload.closedBy).toBe("user-1");
    expect(typeof payload.closedAt).toBe("number");
  });

  it("rejette une transition invalide sans appeler updateDoc", async () => {
    await expect(
      changeTaskStatus({ id: "task1", status: "todo" }, "done", "user-1"),
    ).rejects.toThrow(/Transition invalide/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe("deleteTask", () => {
  it("supprime la tâche", async () => {
    await deleteTask("task1");
    expect(deleteDocMock).toHaveBeenCalledWith({ __doc: "tasks", id: "task1" });
  });
});
