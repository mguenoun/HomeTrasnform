import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BudgetItem } from "../../types";
import { BudgetItemsTable } from "../BudgetItemsTable";

function item(overrides: Partial<BudgetItem>): BudgetItem {
  return {
    id: "b1",
    title: "Carrelage salon",
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

function renderTable(items: BudgetItem[]) {
  return render(
    <MemoryRouter>
      <BudgetItemsTable title="Rubriques" items={items} addHref="/budget/new" />
    </MemoryRouter>,
  );
}

describe("BudgetItemsTable", () => {
  it("affiche le bouton d'ajout au-dessus de la liste", () => {
    renderTable([]);
    expect(
      screen.getByRole("link", { name: "Ajouter une rubrique" }),
    ).toHaveAttribute("href", "/budget/new");
  });

  it("affiche désignation, budget (révisé si renseigné), payé, reste à payer et statut", () => {
    renderTable([
      item({
        id: "b1",
        title: "Carrelage salon",
        budgeted: 1000,
        revisedBudget: 1200,
        payments: [
          { id: "p1", date: "2026-03-01", amount: 300, status: "paye", createdBy: "u1" },
        ],
      }),
    ]);

    expect(screen.getByRole("link", { name: "Carrelage salon" })).toHaveAttribute(
      "href",
      "/budget/b1",
    );
    expect(screen.getByText("1 200")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    // Reste à payer = budget révisé (1200) - réalisé (300) = 900.
    expect(screen.getByText("900")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Dans les clous" })).toBeInTheDocument();
  });

  it("affiche le reste à payer négatif en rouge quand le réalisé dépasse le budget", () => {
    renderTable([
      item({
        budgeted: 500,
        payments: [
          { id: "p1", date: "2026-03-01", amount: 800, status: "paye", createdBy: "u1" },
        ],
      }),
    ]);

    const remaining = screen.getByText("-300");
    expect(remaining).toHaveClass("text-[var(--ht-danger)]");
    expect(screen.getByRole("img", { name: "Dépassé" })).toBeInTheDocument();
  });

  it("affiche l'avancement du dernier paiement renseigné", () => {
    renderTable([
      item({
        payments: [
          { id: "p1", date: "2026-01-01", amount: 100, status: "paye", createdBy: "u1", progress: 30 },
          { id: "p2", date: "2026-02-01", amount: 100, status: "paye", createdBy: "u1", progress: 70 },
        ],
      }),
    ]);
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("affiche un message quand la liste est vide", () => {
    renderTable([]);
    expect(
      screen.getByText("Aucune rubrique budgétaire pour le moment."),
    ).toBeInTheDocument();
  });
});
