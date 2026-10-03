import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetItems } from "../../hooks/useBudgetItems";
import { useObjectives } from "../../hooks/useObjectives";
import type { BudgetItem, Objective } from "../../types";
import { BudgetPage } from "../BudgetPage";

vi.mock("../../hooks/useBudgetItems", () => ({ useBudgetItems: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));

const mockedUseBudgetItems = vi.mocked(useBudgetItems);
const mockedUseObjectives = vi.mocked(useObjectives);

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
  beforeEach(() => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
  });

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
    expect(screen.getByRole("img", { name: "Dépassé" })).toBeInTheDocument();
    // "Reste à payer" négatif pour la rubrique en dépassement (aussi affiché
    // comme écart global dans les KPI, d'où au moins deux occurrences).
    expect(screen.getAllByText("-300,00 MAD").length).toBeGreaterThan(0);
  });

  it("affiche un message quand il n'y a aucune rubrique", () => {
    mockedUseBudgetItems.mockReturnValue({ items: [], loading: false });

    renderPage();

    expect(
      screen.getByText("Aucune rubrique budgétaire partagée pour le moment."),
    ).toBeInTheDocument();
  });

  it("sépare les rubriques et les totaux en blocs partagé/privé", () => {
    const sharedObjective: Objective = {
      id: "shared1",
      title: "Objectif partagé",
      status: "active",
      createdBy: "u1",
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
    mockedUseBudgetItems.mockReturnValue({
      items: [
        item({ id: "s1", title: "Peinture", objectiveId: "shared1", budgeted: 1000 }),
        item({ id: "p1", title: "Coffre-fort", objectiveId: "priv1", budgeted: 500 }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Budget partagé")).toBeInTheDocument();
    expect(screen.getByText("Budget privé")).toBeInTheDocument();
    expect(screen.getByText("Rubriques partagées")).toBeInTheDocument();
    expect(screen.getByText("Rubriques privées")).toBeInTheDocument();
    expect(screen.getByText("Peinture")).toBeInTheDocument();
    expect(screen.getByText("Coffre-fort")).toBeInTheDocument();

    const privateBudgetSection = screen
      .getByText("Budget privé")
      .closest("section") as HTMLElement;
    expect(
      within(privateBudgetSection).getAllByText("500,00 MAD").length,
    ).toBeGreaterThan(0);
  });

  it("n'affiche pas de bloc privé quand aucune rubrique n'est privée", () => {
    mockedUseBudgetItems.mockReturnValue({
      items: [item({ id: "s1", title: "Peinture", budgeted: 1000 })],
      loading: false,
    });

    renderPage();

    expect(screen.queryByText("Budget privé")).not.toBeInTheDocument();
    expect(screen.queryByText("Rubriques privées")).not.toBeInTheDocument();
  });
});
