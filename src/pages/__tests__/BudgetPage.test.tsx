import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useBudgetItems } from "../../hooks/useBudgetItems";
import { useObjectives } from "../../hooks/useObjectives";
import type { BudgetItem, Objective } from "../../types";
import { BudgetPage } from "../BudgetPage";

vi.mock("../../hooks/useBudgetItems", () => ({ useBudgetItems: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));

const mockedUseBudgetItems = vi.mocked(useBudgetItems);
const mockedUseObjectives = vi.mocked(useObjectives);

const OBJECTIVE: Objective = {
  id: "obj1",
  title: "Réaménager le salon",
  status: "active",
  createdBy: "u1",
  createdAt: 0,
};

function item(overrides: Partial<BudgetItem>): BudgetItem {
  return {
    id: "b1",
    title: "Rubrique",
    category: "materiaux",
    objectiveId: null,
    taskId: null,
    budgeted: 1000,
    forecastHistory: [],
    payments: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BudgetPage />
    </MemoryRouter>,
  );
}

describe("BudgetPage", () => {
  it("affiche les totaux globaux (budget, engagé, réalisé, prévision, écart)", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseBudgetItems.mockReturnValue({
      items: [
        item({
          id: "a",
          budgeted: 1000,
          committed: 300,
          payments: [
            { id: "p1", date: "2026-03-01", amount: 200, status: "paye", createdBy: "u1" },
          ],
        }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Engagé")).toBeInTheDocument();
    expect(screen.getAllByText("300,00 MAD").length).toBeGreaterThan(0);
    expect(screen.getByText("Réalisé")).toBeInTheDocument();
    expect(screen.getAllByText("200,00 MAD").length).toBeGreaterThan(0);
  });

  it("affiche les rubriques avec le nom de leur objectif et met en avant celles en dépassement", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
    mockedUseBudgetItems.mockReturnValue({
      items: [
        item({ id: "ok", title: "Peinture", objectiveId: "obj1", budgeted: 1000 }),
        item({
          id: "over",
          title: "Carrelage",
          budgeted: 500,
          payments: [
            { id: "p1", date: "2026-03-01", amount: 800, status: "paye", createdBy: "u1" },
          ],
        }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Peinture")).toBeInTheDocument();
    expect(screen.getByText(/Réaménager le salon/)).toBeInTheDocument();
    expect(screen.getByText("Carrelage")).toBeInTheDocument();
    expect(screen.getByText("Dépassé")).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune rubrique", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseBudgetItems.mockReturnValue({ items: [], loading: false });

    renderPage();

    expect(
      screen.getByText("Aucune rubrique pour le moment."),
    ).toBeInTheDocument();
  });
});
