import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Task } from "../../types";
import { TasksPage } from "../TasksPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);

function task(overrides: Partial<Task>): Task {
  return {
    id: "task-default",
    objectiveId: null,
    title: "Tâche",
    type: "menage",
    priority: "medium",
    status: "todo",
    assigneeIds: [],
    createdBy: "user-1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const MY_TASK = task({
  id: "task-mine",
  title: "Ma tâche",
  assigneeIds: ["user-1"],
});
const OTHER_TASK = task({
  id: "task-other",
  title: "Tâche de Paul",
  assigneeIds: ["user-2"],
});

describe("TasksPage — filtre Mes tâches et affichage des assignés", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseTasks.mockReturnValue({
      tasks: [MY_TASK, OTHER_TASK],
      loading: false,
    });
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({
      users: [
        { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
        { uid: "user-2", displayName: "Paul", email: "paul@example.com" },
      ],
      loading: false,
    });
  });

  it("affiche le nom des assignés sur chaque carte de tâche", () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Ma tâche")).toBeInTheDocument();
    expect(screen.getAllByText("Marie").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paul").length).toBeGreaterThan(0);
  });

  it("filtre sur les tâches de l'utilisateur courant au clic sur \"Mes tâches\"", async () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tâche de Paul")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Mes tâches" });
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Ma tâche")).toBeInTheDocument();
    expect(screen.queryByText("Tâche de Paul")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Tâche de Paul")).toBeInTheDocument();
  });
});
