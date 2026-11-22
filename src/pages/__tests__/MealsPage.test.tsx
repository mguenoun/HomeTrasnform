import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MealPlan, ShoppingList } from "../../types";

vi.mock("../../hooks/useMeals", () => ({
  useMealPlan: vi.fn(),
  useShoppingList: vi.fn(),
}));

vi.mock("../../services/meals", () => ({
  saveMealSlot: vi.fn().mockResolvedValue(undefined),
  addShoppingItem: vi.fn().mockResolvedValue("id"),
  setShoppingItemChecked: vi.fn().mockResolvedValue(undefined),
  setVendorAmount: vi.fn().mockResolvedValue(undefined),
  removeShoppingItem: vi.fn().mockResolvedValue(undefined),
}));

import { useMealPlan, useShoppingList } from "../../hooks/useMeals";
import { addShoppingItem, saveMealSlot } from "../../services/meals";
import { MealsPage } from "../MealsPage";

const mockedUseMealPlan = vi.mocked(useMealPlan);
const mockedUseShoppingList = vi.mocked(useShoppingList);

function setup(plan: Partial<MealPlan> = {}, list: Partial<ShoppingList> = {}) {
  mockedUseMealPlan.mockReturnValue({
    plan: { weekId: "2026-11-21", defaultDiners: 4, slots: {}, ...plan },
    loading: false,
  });
  mockedUseShoppingList.mockReturnValue({
    list: { weekId: "2026-11-21", items: {}, vendorAmounts: {}, ...list },
    loading: false,
  });
  render(
    <MemoryRouter>
      <MealsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MealsPage", () => {
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

  it("affiche les courses par point de vente avec le montant payé", async () => {
    setup(
      {},
      {
        items: {
          a: { id: "a", name: "شعرية", vendor: "Épicier", checked: false, createdAt: 1 },
          b: { id: "b", name: "Poulet", vendor: "Boucher", checked: false, createdAt: 2 },
        },
        vendorAmounts: { Boucher: 300, Épicier: 50 },
      },
    );
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));

    expect(screen.getByRole("heading", { name: "Boucher" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Épicier" })).toBeInTheDocument();
    expect(screen.getByLabelText("Montant payé, Boucher")).toHaveValue(300);
    expect(screen.getByText(/Total payé/)).toHaveTextContent("350,00 MAD");
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
});
