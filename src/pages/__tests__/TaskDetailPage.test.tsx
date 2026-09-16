import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useAttachments } from "../../hooks/useAttachments";
import { useComments } from "../../hooks/useComments";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import { sendPushNotification } from "../../services/push";
import { updateTask } from "../../services/tasks";
import type { Objective, Task } from "../../types";
import { TaskDetailPage } from "../TaskDetailPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useAttachments", () => ({ useAttachments: vi.fn() }));
vi.mock("../../hooks/useComments", () => ({ useComments: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));
vi.mock("../../services/tasks", () => ({
  updateTask: vi.fn().mockResolvedValue(undefined),
  changeTaskStatus: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/push", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseAttachments = vi.mocked(useAttachments);
const mockedUseComments = vi.mocked(useComments);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);
const mockedUpdateTask = vi.mocked(updateTask);
const mockedSendPushNotification = vi.mocked(sendPushNotification);

const TASK: Task = {
  id: "task1",
  objectiveId: null,
  title: "Nettoyer le garage",
  type: "menage",
  priority: "medium",
  status: "todo",
  assigneeIds: ["user-1"],
  createdBy: "user-1",
  createdAt: 0,
  updatedAt: 0,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tasks/task1"]}>
      <Routes>
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TaskDetailPage — affectation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseTasks.mockReturnValue({ tasks: [TASK], loading: false });
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({
      users: [
        { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
        {
          uid: "user-2",
          displayName: "Paul",
          email: "paul@example.com",
          pushSubscriptions: [
            { endpoint: "https://push.example.com/paul", keys: { p256dh: "a", auth: "b" } },
          ],
        },
        { uid: "user-3", displayName: "Julie", email: "julie@example.com" },
      ],
      loading: false,
    });
    mockedUpdateTask.mockResolvedValue(undefined);
    mockedUseAttachments.mockReturnValue({ attachments: [], loading: false });
    mockedUseComments.mockReturnValue({ comments: [], loading: false });
  });

  it("affiche les membres de la famille et met en évidence les assignés", () => {
    renderPage();

    const marie = screen.getByRole("button", { name: "Marie" });
    const paul = screen.getByRole("button", { name: "Paul" });
    expect(marie).toHaveAttribute("aria-pressed", "true");
    expect(paul).toHaveAttribute("aria-pressed", "false");
  });

  it("ajoute un membre aux assignés au clic", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Paul" }));

    expect(mockedUpdateTask).toHaveBeenCalledWith("task1", {
      assigneeIds: ["user-1", "user-2"],
    });
  });

  it("retire un membre des assignés au clic s'il est déjà assigné", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Marie" }));

    expect(mockedUpdateTask).toHaveBeenCalledWith("task1", {
      assigneeIds: [],
    });
    expect(mockedSendPushNotification).not.toHaveBeenCalled();
  });

  it("envoie une notification push au membre nouvellement assigné", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Paul" }));

    expect(mockedSendPushNotification).toHaveBeenCalledWith(
      [{ endpoint: "https://push.example.com/paul", keys: { p256dh: "a", auth: "b" } }],
      expect.objectContaining({ url: "/tasks/task1" }),
      { uid: "user-1" },
    );
  });

  it("n'envoie pas de notification si le membre assigné n'a pas d'abonnement push", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Julie" }));

    expect(mockedSendPushNotification).not.toHaveBeenCalled();
  });
});

describe("TaskDetailPage — historique de clôture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({
      users: [
        { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
      ],
      loading: false,
    });
    mockedUseAttachments.mockReturnValue({ attachments: [], loading: false });
    mockedUseComments.mockReturnValue({ comments: [], loading: false });
  });

  it("affiche qui a clos la tâche et quand", () => {
    mockedUseTasks.mockReturnValue({
      tasks: [
        {
          ...TASK,
          status: "done",
          closedAt: Date.parse("2026-02-01"),
          closedBy: "user-1",
        },
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText(/Clôturée le/)).toHaveTextContent("par Marie");
  });
});

describe("TaskDetailPage — fil d'Ariane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
    mockedUseAttachments.mockReturnValue({ attachments: [], loading: false });
    mockedUseComments.mockReturnValue({ comments: [], loading: false });
  });

  it("relie vers l'objectif de la tâche quand elle en a un", () => {
    const objective: Objective = {
      id: "obj1",
      title: "Réaménager le salon",
      status: "active",
      createdBy: "user-1",
      createdAt: 0,
    };
    mockedUseObjectives.mockReturnValue({
      objectives: [objective],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({
      tasks: [{ ...TASK, objectiveId: "obj1" }],
      loading: false,
    });

    renderPage();

    expect(
      screen.getByRole("link", { name: "Réaménager le salon" }),
    ).toHaveAttribute("href", "/objectives/obj1");
  });

  it("relie vers la liste des tâches quand la tâche est libre", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseTasks.mockReturnValue({ tasks: [TASK], loading: false });

    renderPage();

    expect(screen.getByRole("link", { name: "Tâches" })).toHaveAttribute(
      "href",
      "/tasks",
    );
  });
});
