import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useBudgetItems } from "../../hooks/useBudgetItems";
import type { BudgetItem } from "../../types";
import { BudgetPage } from "../BudgetPage";

vi.mock("../../hooks/useBudgetItems", () => ({ useBudgetItems: vi.fn() }));

const mockedUseBudgetItems = vi.mocked(useBudgetItems);

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

  it("affiche les rubriques en liste et met en avant celles en dépassement", () => {
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
    expect(screen.getByText("Carrelage")).toBeInTheDocument();
    expect(screen.getByText("Dépassé")).toBeInTheDocument();
    // "Reste à payer" négatif pour la rubrique en dépassement (aussi affiché
    // comme écart global dans les KPI, d'où au moins deux occurrences).
    expect(screen.getAllByText("-300,00 MAD").length).toBeGreaterThan(0);
  });

  it("affiche un message quand il n'y a aucune rubrique", () => {
    mockedUseBudgetItems.mockReturnValue({ items: [], loading: false });

    renderPage();

    expect(
      screen.getByText("Aucune rubrique budgétaire pour le moment."),
    ).toBeInTheDocument();
  });
});
