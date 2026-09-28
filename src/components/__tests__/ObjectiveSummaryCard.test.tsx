import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BudgetItem, Objective, Task } from "../../types";
import { ObjectiveSummaryCard } from "../ObjectiveSummaryCard";

const OBJECTIVE: Objective = {
  id: "obj1",
  title: "Réaménager le salon",
  description: "Peinture + nouvelle porte-fenêtre",
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

function budgetItem(overrides: Partial<BudgetItem>): BudgetItem {
  return {
    id: "b1",
    title: "Rubrique",
    category: "materiaux",
    objectiveId: "obj1",
    taskId: null,
    budgeted: 100,
    forecastHistory: [],
    payments: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function renderCard(tasks: Task[], budgetItems: BudgetItem[] = []) {
  return render(
    <MemoryRouter>
      <ul>
        <ObjectiveSummaryCard
          objective={OBJECTIVE}
          tasks={tasks}
          budgetItems={budgetItems}
        />
      </ul>
    </MemoryRouter>,
  );
}

describe("ObjectiveSummaryCard", () => {
  it("affiche le titre, la description et l'avancement", () => {
    renderCard([
      task({ id: "t1", status: "done" }),
      task({ id: "t2", status: "todo" }),
    ]);

    expect(screen.getByText("Réaménager le salon")).toBeInTheDocument();
    expect(
      screen.getByText("Peinture + nouvelle porte-fenêtre"),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2 tâches terminées (50%)")).toBeInTheDocument();
  });

  it("n'affiche pas de ligne budget si aucune rubrique n'est liée", () => {
    renderCard([task({ id: "t1" })], []);
    expect(screen.queryByText(/Budget :/)).not.toBeInTheDocument();
  });

  it("affiche le budget et le badge de dépassement si le réalisé dépasse le budgété", () => {
    renderCard(
      [task({ id: "t1" })],
      [
        budgetItem({
          budgeted: 100,
          payments: [
            { id: "p1", date: "2026-03-01", amount: 150, status: "paye", createdBy: "u1" },
          ],
        }),
      ],
    );

    expect(screen.getByText(/Budget : 150,00 MAD \/ 100,00 MAD/)).toBeInTheDocument();
    expect(screen.getByText("Dépassement")).toBeInTheDocument();
  });

  it("n'affiche pas le badge de dépassement si le budget est respecté", () => {
    renderCard(
      [task({ id: "t1" })],
      [
        budgetItem({
          budgeted: 100,
          payments: [
            { id: "p1", date: "2026-03-01", amount: 80, status: "paye", createdBy: "u1" },
          ],
        }),
      ],
    );
    expect(screen.queryByText("Dépassement")).not.toBeInTheDocument();
  });
});
