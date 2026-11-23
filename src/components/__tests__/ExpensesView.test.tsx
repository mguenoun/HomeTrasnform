import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseholdExpense } from "../../types";
import { ExpensesView } from "../ExpensesView";

vi.mock("../../services/meals", () => ({
  HELPER_DAILY_RATE: 200,
  addExpense: vi.fn().mockResolvedValue(undefined),
  removeExpense: vi.fn().mockResolvedValue(undefined),
}));

import { addExpense } from "../../services/meals";

const WEDNESDAY = new Date(2026, 10, 25);

function expense(partial: Partial<HouseholdExpense>): HouseholdExpense {
  return {
    id: "x",
    type: "groceries",
    amount: 100,
    date: "2026-11-21",
    weekId: "2026-11-21",
    vendor: "Épicier",
    createdBy: "u1",
    createdAt: 1,
    ...partial,
  };
}

function renderView(
  expenses: HouseholdExpense[] = [],
  allExpenses: HouseholdExpense[] = [],
) {
  render(
    <ExpensesView
      weekId="2026-11-21"
      userId="u1"
      expenses={expenses}
      allExpenses={allExpenses}
      today={WEDNESDAY}
    />,
  );
}

beforeEach(() => {
  vi.mocked(addExpense).mockClear();
});

describe("ExpensesView — rappel des jours de ménage", () => {
  it("propose les jours habituels passés sans paiement", () => {
    renderView();
    const section = screen.getByRole("region", { name: "Jours de ménage à enregistrer" });
    expect(section).toHaveTextContent("Samedi 21");
    expect(section).toHaveTextContent("Mardi 24");
    expect(section).not.toHaveTextContent("Jeudi");
  });

  it("enregistre le tarif journalier d'un tap, à la date du jour concerné", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: /Mardi 24 : ajouter/ }));
    expect(addExpense).toHaveBeenCalledWith({
      type: "helper",
      amount: 200,
      date: "2026-11-24",
      weekId: "2026-11-21",
      createdBy: "u1",
    });
  });

  it("ne propose plus un jour déjà payé", () => {
    renderView([expense({ type: "helper", date: "2026-11-21", vendor: undefined })]);
    const section = screen.getByRole("region", { name: "Jours de ménage à enregistrer" });
    expect(section).not.toHaveTextContent("Samedi");
    expect(section).toHaveTextContent("Mardi 24");
  });

  it("disparaît quand tout est enregistré", () => {
    renderView([
      expense({ type: "helper", date: "2026-11-21", vendor: undefined }),
      expense({ type: "helper", date: "2026-11-24", vendor: undefined }),
    ]);
    expect(screen.queryByRole("region", { name: "Jours de ménage à enregistrer" })).not.toBeInTheDocument();
  });
});

describe("ExpensesView — dépenses par mois", () => {
  it("affiche un message quand il n'y a aucune dépense", () => {
    renderView();
    expect(screen.getByText(/Aucune dépense sur les 6 derniers mois/)).toBeInTheDocument();
  });

  it("résume chaque mois avec courses et ménage", () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-05`;
    renderView([], [
      expense({ amount: 300, date: thisMonth }),
      expense({ type: "helper", amount: 200, date: thisMonth, vendor: undefined }),
    ]);
    const section = screen.getByRole("region", { name: "Dépenses par mois" });
    expect(section).toHaveTextContent("500,00 MAD");
    expect(section).toHaveTextContent(/courses 300,00 MAD/);
    expect(section).toHaveTextContent(/ménage 200,00 MAD/);
  });
});
