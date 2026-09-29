import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Objective, Task } from "../../types";
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

describe("TasksPage — séparation partagé/privé", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
  });

  it("sépare les tâches partagées et privées dans deux blocs, le bloc privé seulement s'il y a des tâches privées", () => {
    const sharedObjective: Objective = {
      id: "shared1",
      title: "Objectif partagé",
      status: "active",
      createdBy: "user-1",
      createdAt: 0,
    };
    const privateObjective: Objective = {
      ...sharedObjective,
      id: "priv1",
      visibility: "private",
    };
    mockedUseObjectives.mockReturnValue({
      objectives: [sharedObjective, privateObjective],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "s1", title: "Tâche partagée", objectiveId: "shared1" }),
        task({ id: "p1", title: "Tâche privée", objectiveId: "priv1" }),
      ],
      loading: false,
    });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tâches partagées")).toBeInTheDocument();
    expect(screen.getByText("Tâches privées")).toBeInTheDocument();

    const sharedSection = screen
      .getByText("Tâches partagées")
      .closest("section") as HTMLElement;
    expect(within(sharedSection).getByText("Tâche partagée")).toBeInTheDocument();
    expect(
      within(sharedSection).queryByText("Tâche privée"),
    ).not.toBeInTheDocument();

    const privateSection = screen
      .getByText("Tâches privées")
      .closest("section") as HTMLElement;
    expect(within(privateSection).getByText("Tâche privée")).toBeInTheDocument();
  });

  it("n'affiche pas le bloc privé quand il n'y a aucune tâche privée", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseTasks.mockReturnValue({
      tasks: [task({ id: "s1", title: "Tâche partagée" })],
      loading: false,
    });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Tâches privées")).not.toBeInTheDocument();
  });
});
