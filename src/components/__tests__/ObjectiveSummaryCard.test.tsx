import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Objective, Task } from "../../types";
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

function renderCard(tasks: Task[]) {
  return render(
    <MemoryRouter>
      <ul>
        <ObjectiveSummaryCard objective={OBJECTIVE} tasks={tasks} />
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

  it("n'affiche pas de ligne budget si aucun budget n'est saisi", () => {
    renderCard([task({ id: "t1" })]);
    expect(screen.queryByText(/Budget :/)).not.toBeInTheDocument();
  });

  it("affiche le budget et le badge de dépassement si le réel dépasse l'estimé", () => {
    renderCard([
      task({ id: "t1", budgetEstimated: 100, budgetActual: 150 }),
    ]);

    expect(screen.getByText(/Budget : 150.00 € \/ 100.00 €/)).toBeInTheDocument();
    expect(screen.getByText("Dépassement")).toBeInTheDocument();
  });

  it("n'affiche pas le badge de dépassement si le budget est respecté", () => {
    renderCard([task({ id: "t1", budgetEstimated: 100, budgetActual: 80 })]);
    expect(screen.queryByText("Dépassement")).not.toBeInTheDocument();
  });
});
