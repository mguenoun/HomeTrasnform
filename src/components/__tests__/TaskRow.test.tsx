import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BudgetItem, Task } from "../../types";
import { TaskRow } from "../TaskRow";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    objectiveId: null,
    title: "Acheter le carrelage",
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

function budgetItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "b1",
    title: "Rubrique",
    category: "materiaux",
    objectiveId: null,
    taskId: "t1",
    budgeted: 500,
    forecastHistory: [],
    payments: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function renderRow(props: Partial<Parameters<typeof TaskRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <TaskRow task={task()} meta="2026-10-01" {...props} />
    </MemoryRouter>,
  );
}

describe("TaskRow", () => {
  it("affiche le titre, un lien vers la tâche et le méta fourni", () => {
    renderRow();
    const link = screen.getByRole("link", { name: /Acheter le carrelage/ });
    expect(link).toHaveAttribute("href", "/tasks/t1");
    expect(screen.getByText("2026-10-01")).toBeInTheDocument();
  });

  it("n'affiche aucune ligne budget si aucune rubrique n'est liée", () => {
    renderRow();
    expect(screen.queryByText(/Budget /)).not.toBeInTheDocument();
  });

  it("affiche budget, payé, reste et avancement quand des rubriques sont liées", () => {
    renderRow({
      budgetItems: [
        budgetItem({
          budgeted: 500,
          payments: [
            {
              id: "p1",
              date: "2026-03-01",
              amount: 200,
              status: "paye",
              createdBy: "u1",
              progress: 40,
            },
          ],
        }),
      ],
    });

    expect(screen.getByText("Budget 500,00 MAD")).toBeInTheDocument();
    expect(screen.getByText("Avancement 40%")).toBeInTheDocument();
    expect(screen.getByText("Payé 200,00 MAD")).toBeInTheDocument();
    expect(screen.getByText("Reste 300,00 MAD")).toBeInTheDocument();
  });

  it("affiche le reste en rouge quand le payé dépasse le budget", () => {
    renderRow({
      budgetItems: [
        budgetItem({
          budgeted: 100,
          payments: [
            { id: "p1", date: "2026-03-01", amount: 150, status: "paye", createdBy: "u1" },
          ],
        }),
      ],
    });

    const remaining = screen.getByText("Reste -50,00 MAD");
    expect(remaining).toHaveClass("text-red-700");
  });

  it("affiche un badge Privé quand isPrivate est vrai", () => {
    renderRow({ isPrivate: true });
    expect(screen.getByText("Privé")).toBeInTheDocument();
  });

  it("n'affiche pas de badge Privé par défaut", () => {
    renderRow();
    expect(screen.queryByText("Privé")).not.toBeInTheDocument();
  });
});
