import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Objective, Task } from "../../types";
import { BudgetPage } from "../BudgetPage";

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
    objectiveId: "obj1",
    title: "Tâche",
    type: "achat",
    priority: "medium",
    status: "todo",
    assigneeIds: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("BudgetPage", () => {
  beforeEach(() => {
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
  });

  it("affiche le total engagé/dépensé global et signale un dépassement", () => {
    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "t1", budgetEstimated: 100, budgetActual: 150 }),
        task({
          id: "t2",
          objectiveId: null,
          type: "travaux",
          budgetEstimated: 50,
          budgetActual: 20,
        }),
      ],
      loading: false,
    });

    render(
      <MemoryRouter>
        <BudgetPage />
      </MemoryRouter>,
    );

    // "170.00 €" (global dépensé) et "150.00 €" (global engagé, aussi le
    // dépensé de l'objectif obj1) peuvent apparaître dans plusieurs blocs.
    expect(screen.getAllByText(/170.00 €/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/150.00 €/).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Au moins une tâche dépasse son budget estimé"),
    ).toBeInTheDocument();
  });

  it("regroupe le budget par objectif (y compris les tâches libres) et par type", () => {
    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "t1", objectiveId: "obj1", type: "achat", budgetEstimated: 100 }),
        task({ id: "t2", objectiveId: null, type: "travaux", budgetEstimated: 200 }),
      ],
      loading: false,
    });

    render(
      <MemoryRouter>
        <BudgetPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Réaménager le salon")).toBeInTheDocument();
    expect(screen.getByText("Tâches libres")).toBeInTheDocument();
    expect(screen.getByText("Achat")).toBeInTheDocument();
    expect(screen.getByText("Travaux")).toBeInTheDocument();
  });
});
