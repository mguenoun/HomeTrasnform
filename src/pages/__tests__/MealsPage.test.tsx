import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseholdExpense, MealPlan, ShoppingList } from "../../types";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMealPlan: vi.fn(),
  useShoppingList: vi.fn(),
  useExpenses: vi.fn(),
}));

vi.mock("../../services/meals", () => ({
  HELPER_DAILY_RATE: 200,
  saveMealSlot: vi.fn().mockResolvedValue(undefined),
  saveMealSlots: vi.fn().mockResolvedValue(undefined),
  addShoppingItem: vi.fn().mockResolvedValue("id"),
  addShoppingItems: vi.fn().mockResolvedValue([]),
  setShoppingItemChecked: vi.fn().mockResolvedValue(undefined),
  setShoppingItemPrice: vi.fn().mockResolvedValue(undefined),
  removeShoppingItem: vi.fn().mockResolvedValue(undefined),
  addExpense: vi.fn().mockResolvedValue(undefined),
  removeExpense: vi.fn().mockResolvedValue(undefined),
}));

import { useExpenses, useMealPlan, useShoppingList } from "../../hooks/useMeals";
import {
  addExpense,
  addShoppingItem,
  addShoppingItems,
  saveMealSlot,
  saveMealSlots,
} from "../../services/meals";
import { MealsPage } from "../MealsPage";

const mockedUseMealPlan = vi.mocked(useMealPlan);
const mockedUseShoppingList = vi.mocked(useShoppingList);
const mockedUseExpenses = vi.mocked(useExpenses);

function setup(
  plan: Partial<MealPlan> = {},
  list: Partial<ShoppingList> = {},
  expenses: HouseholdExpense[] = [],
) {
  mockedUseMealPlan.mockReturnValue({
    plan: { weekId: "2026-11-21", defaultDiners: 4, slots: {}, ...plan },
    loading: false,
  });
  mockedUseShoppingList.mockReturnValue({
    list: { weekId: "2026-11-21", items: {}, ...list },
    loading: false,
  });
  mockedUseExpenses.mockReturnValue({ expenses, loading: false });
  render(
    <MemoryRouter>
      <MealsPage />
    </MemoryRouter>,
  );
}

const expense = (
  over: Partial<HouseholdExpense> & Pick<HouseholdExpense, "type" | "amount">,
): HouseholdExpense => ({
  id: Math.random().toString(),
  date: "2026-11-21",
  weekId: "2026-11-21",
  createdBy: "u1",
  createdAt: 1,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MealsPage — programme", () => {
  it("permet d'ajouter un repas en texte libre dans un créneau", async () => {
    setup();
    const input = screen.getAllByLabelText(/Ajouter un plat, Déjeuner/)[0];
    await userEvent.type(input, "Restes{enter}");

    expect(saveMealSlot).toHaveBeenCalledWith(expect.any(String), "sat_lunch", {
      items: [{ label: "Restes" }],
    });
  });

  it("découpe un repas composé « A + B » en deux éléments, en arabe comme en français", async () => {
    setup();
    const input = screen.getAllByLabelText(/Ajouter un plat, Déjeuner/)[0];
    await userEvent.type(input, "كسكسو + سلاض فروي{enter}");

    expect(saveMealSlot).toHaveBeenCalledWith(expect.any(String), "sat_lunch", {
      items: [{ label: "كسكسو" }, { label: "سلاض فروي" }],
    });
  });

  it("affiche les repas déjà planifiés et propose l'envoi WhatsApp", () => {
    setup({
      slots: { sat_lunch: { diners: 6, items: [{ label: "Tajine" }] } },
    });
    expect(screen.getByText("Tajine")).toBeInTheDocument();
    expect(screen.getByText("6 p.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Envoyer sur WhatsApp" }),
    ).toHaveAttribute("href", expect.stringContaining("https://wa.me/?text="));
  });

  it("n'affiche pas le bouton WhatsApp quand il n'y a rien à envoyer", () => {
    setup();
    expect(
      screen.queryByRole("link", { name: "Envoyer sur WhatsApp" }),
    ).not.toBeInTheDocument();
  });

  it("importe un programme collé (jours en arabe)", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Coller le programme" }),
    );
    await userEvent.type(
      screen.getByLabelText("Programme à importer"),
      "السبت : شينز كيك | كسكسو + سلاض | شعرية الحليب",
    );
    await userEvent.click(screen.getByRole("button", { name: "Importer" }));

    expect(saveMealSlots).toHaveBeenCalledWith("2026-11-21", {
      sat_snack: [{ label: "شينز كيك" }],
      sat_lunch: [{ label: "كسكسو" }, { label: "سلاض" }],
      sat_dinner: [{ label: "شعرية الحليب" }],
    });
    expect(screen.getByRole("status")).toHaveTextContent("3 créneaux importés");
  });

  it("explique le format quand le programme collé n'est pas reconnu", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Coller le programme" }),
    );
    await userEvent.type(screen.getByLabelText("Programme à importer"), "n'importe quoi");
    await userEvent.click(screen.getByRole("button", { name: "Importer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Aucun repas reconnu");
    expect(saveMealSlots).not.toHaveBeenCalled();
  });
});

describe("MealsPage — courses", () => {
  it("permet une liste de courses 100 % manuelle, sans programme", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.type(screen.getByLabelText("Article"), "Piles");
    await userEvent.type(screen.getByLabelText("Quantité"), "4");
    await userEvent.type(screen.getByLabelText("Point de vente"), "Épicier");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(addShoppingItem).toHaveBeenCalledWith(expect.any(String), {
      name: "Piles",
      quantity: "4",
      vendor: "Épicier",
    });
  });

  it("groupe par point de vente prévu et affiche ce qui a été payé, paiements cumulés", async () => {
    setup(
      {},
      {
        items: {
          a: { id: "a", name: "شعرية", vendor: "Épicier", checked: false, createdAt: 1 },
          b: { id: "b", name: "Poulet", vendor: "Boucher", price: 120, checked: false, createdAt: 2 },
        },
      },
      [
        expense({ type: "groceries", amount: 361, vendor: "Épicier" }),
        expense({ type: "groceries", amount: 26, vendor: "Épicier", date: "2026-11-22" }),
        expense({ type: "groceries", amount: 300, vendor: "Boucher" }),
      ],
    );
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));

    const epicier = screen.getByRole("heading", { name: "Épicier" }).closest("section")!;
    expect(within(epicier).getByText(/Payé 387,00 MAD \(2 paiements\)/)).toBeInTheDocument();
    const boucher = screen.getByRole("heading", { name: "Boucher" }).closest("section")!;
    expect(within(boucher).getByText(/Payé 300,00 MAD/)).toBeInTheDocument();
    expect(within(boucher).getByText(/détail articles 120,00 MAD/)).toBeInTheDocument();
  });

  it("indique « pas encore payé » pour un point de vente sans paiement", async () => {
    setup({}, {
      items: {
        a: { id: "a", name: "Lait", vendor: "Épicier", checked: false, createdAt: 1 },
      },
    });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByText("Pas encore payé")).toBeInTheDocument();
  });

  it("importe une liste collée : points de vente et montants à confirmer avant écriture", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Coller une liste WhatsApp" }),
    );
    await userEvent.type(
      screen.getByLabelText("Liste à importer"),
      "—البيض{enter}84dh{enter}—نصف كيلو توم{enter}—5دراهم كمون{enter}72dh",
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyser" }));

    // Rien n'est écrit avant confirmation ; les montants du texte sont pré-remplis.
    expect(addShoppingItems).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Montant payé, groupe 1")).toHaveValue(84);
    expect(screen.getByLabelText("Montant payé, groupe 2")).toHaveValue(72);

    await userEvent.type(screen.getByLabelText("Point de vente, groupe 1"), "Œufs");
    await userEvent.type(screen.getByLabelText("Point de vente, groupe 2"), "Épicier");
    await userEvent.click(screen.getByRole("button", { name: /Importer 3 articles/ }));

    expect(addShoppingItems).toHaveBeenCalledWith("2026-11-21", [
      { name: "البيض", vendor: "Œufs" },
      { name: "توم", quantity: "نصف كيلو", vendor: "Épicier" },
      { name: "كمون", quantity: "5 دراهم", vendor: "Épicier" },
    ]);
    expect(addExpense).toHaveBeenCalledTimes(2);
    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ type: "groceries", amount: 84, vendor: "Œufs", weekId: "2026-11-21" }),
    );
  });

  it("refuse d'enregistrer un montant sans point de vente, sans rien écrire", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Coller une liste WhatsApp" }),
    );
    await userEvent.type(screen.getByLabelText("Liste à importer"), "Lait{enter}26dh");
    await userEvent.click(screen.getByRole("button", { name: "Analyser" }));
    await userEvent.click(screen.getByRole("button", { name: /Importer 1 article/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("point de vente");
    expect(addShoppingItems).not.toHaveBeenCalled();
    expect(addExpense).not.toHaveBeenCalled();
  });
});

describe("MealsPage — dépenses", () => {
  it("résume courses et honoraires, et liste les paiements", async () => {
    setup({}, {}, [
      expense({ type: "groceries", amount: 361, vendor: "Épicier" }),
      expense({ type: "groceries", amount: 26, vendor: "Épicier", note: "lait et yaourt", date: "2026-11-22" }),
      expense({ type: "helper", amount: 200 }),
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Dépenses" }));

    expect(screen.getByText("587,00 MAD")).toBeInTheDocument(); // total
    // courses : carte de synthèse + ligne du point de vente (361 + 26 cumulés)
    expect(screen.getAllByText("387,00 MAD")).toHaveLength(2);
    expect(screen.getAllByText("200,00 MAD").length).toBeGreaterThan(0); // ménage
    expect(screen.getByText(/lait et yaourt/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Envoyer sur WhatsApp" }),
    ).not.toBeInTheDocument();
  });

  it("pré-remplit le tarif journalier pour un paiement de la femme de ménage", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Dépenses" }));
    await userEvent.click(screen.getByLabelText("Femme de ménage"));
    expect(screen.getByLabelText("Montant")).toHaveValue(200);

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ type: "helper", amount: 200, weekId: "2026-11-21", createdBy: "u1" }),
    );
  });
});
