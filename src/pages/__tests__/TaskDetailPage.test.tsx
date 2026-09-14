import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import { updateTask } from "../../services/tasks";
import type { Task } from "../../types";
import { TaskDetailPage } from "../TaskDetailPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));
vi.mock("../../services/tasks", () => ({
  updateTask: vi.fn().mockResolvedValue(undefined),
  changeTaskStatus: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);
const mockedUpdateTask = vi.mocked(updateTask);

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
        { uid: "user-2", displayName: "Paul", email: "paul@example.com" },
      ],
      loading: false,
    });
    mockedUpdateTask.mockResolvedValue(undefined);
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
  });
});
