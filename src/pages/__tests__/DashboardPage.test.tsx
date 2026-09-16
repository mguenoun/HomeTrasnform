import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Objective, Task } from "../../types";
import { DashboardPage } from "../DashboardPage";

vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));

const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);

const OBJECTIVE: Objective = {
  id: "obj1",
  title: "Réaménager le salon",
  status: "active",
  createdBy: "u1",
  createdAt: 0,
};

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
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

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  it("affiche les objectifs actifs avec leur avancement", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });

    renderPage();

    expect(screen.getByText("Réaménager le salon")).toBeInTheDocument();
  });

  it("affiche les tâches à échéance proche et les tâches bloquées", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const soonDate = soon.toISOString().slice(0, 10);

    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "upcoming", title: "Payer l'acompte", dueDate: soonDate }),
        task({ id: "blocked", title: "Attendre le plombier", status: "blocked" }),
        task({ id: "done", title: "Déjà fait", status: "done", dueDate: soonDate }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Payer l'acompte")).toBeInTheDocument();
    expect(screen.getByText("Attendre le plombier")).toBeInTheDocument();
    expect(screen.queryByText("Déjà fait")).not.toBeInTheDocument();
  });

  it("affiche des messages vides quand il n'y a rien à montrer", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });

    renderPage();

    expect(screen.getByText("Aucun objectif pour le moment.")).toBeInTheDocument();
    expect(
      screen.getByText("Aucune tâche à échéance proche."),
    ).toBeInTheDocument();
    expect(screen.getByText("Aucune tâche bloquée.")).toBeInTheDocument();
  });
});
