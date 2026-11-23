import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CatalogIngredient,
  Dish,
  HouseholdExpense,
  MealPlan,
  PantryItem,
  ShoppingList,
} from "../../types";

vi.mock("../../services/tableImage", () => ({
  shareTableImage: vi.fn().mockResolvedValue("shared"),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMealPlan: vi.fn(),
  useShoppingList: vi.fn(),
  useExpenses: vi.fn(),
  useDishes: vi.fn(),
  useIngredients: vi.fn(),
  useAllMealPlans: vi.fn(),
  usePantry: vi.fn(),
  useAllExpenses: vi.fn(() => []),
}));

vi.mock("../../services/meals", () => ({
  HELPER_DAILY_RATE: 200,
  saveMealSlot: vi.fn().mockResolvedValue(undefined),
  saveMealSlots: vi.fn().mockResolvedValue(undefined),
  setDishTranslation: vi.fn().mockResolvedValue(undefined),
  addShoppingItem: vi.fn().mockResolvedValue("id"),
  addShoppingItems: vi.fn().mockResolvedValue([]),
  setShoppingItemChecked: vi.fn().mockResolvedValue(undefined),
  setShoppingItemPrice: vi.fn().mockResolvedValue(undefined),
  payVendorRound: vi.fn().mockResolvedValue(undefined),
  updateShoppingItem: vi.fn().mockResolvedValue(undefined),
  removeShoppingItem: vi.fn().mockResolvedValue(undefined),
  addExpense: vi.fn().mockResolvedValue(undefined),
  removeExpense: vi.fn().mockResolvedValue(undefined),
  saveDish: vi.fn().mockResolvedValue("id"),
  deleteDish: vi.fn().mockResolvedValue(undefined),
  moveMealItem: vi.fn().mockResolvedValue(undefined),
  saveWholeSlots: vi.fn().mockResolvedValue(undefined),
  setInPantry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/translate", () => ({
  suggestTranslations: vi.fn(),
}));

import {
  useDishes,
  useAllMealPlans,
  usePantry,
  useExpenses,
  useIngredients,
  useMealPlan,
  useShoppingList,
} from "../../hooks/useMeals";
import {
  addExpense,
  addShoppingItem,
  addShoppingItems,
  payVendorRound,
  updateShoppingItem,
  saveMealSlot,
  saveMealSlots,
  saveWholeSlots,
  moveMealItem,
  setInPantry,
  setDishTranslation,
  saveDish,
  deleteDish,
} from "../../services/meals";
import { suggestTranslations } from "../../services/translate";
import { weekIdOf } from "../../domain/mealPlan";
import { MealsPage } from "../MealsPage";

const mockedUseMealPlan = vi.mocked(useMealPlan);
const mockedUseShoppingList = vi.mocked(useShoppingList);
const mockedUseExpenses = vi.mocked(useExpenses);
const mockedUseDishes = vi.mocked(useDishes);
const mockedUseAllMealPlans = vi.mocked(useAllMealPlans);
const mockedUsePantry = vi.mocked(usePantry);
// Ingrédients en stock : à renseigner avant setup().
let pantryForTest: PantryItem[] = [];
// Toutes les semaines (statistiques de la bibliothèque) : à renseigner avant setup().
let allPlansForTest: MealPlan[] = [];
const mockedUseIngredients = vi.mocked(useIngredients);

function setup(
  plan: Partial<MealPlan> = {},
  list: Partial<ShoppingList> = {},
  expenses: HouseholdExpense[] = [],
  ingredients: CatalogIngredient[] = [],
  dishes: Dish[] = [],
) {
  mockedUseDishes.mockReturnValue(dishes);
  mockedUseAllMealPlans.mockReturnValue(allPlansForTest);
  mockedUsePantry.mockReturnValue(pantryForTest);
  mockedUseIngredients.mockReturnValue(ingredients);
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
      <MealsPage initialPlanView="detail" />
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

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  // .env.local réserve le statut au gestionnaire : les tests partent de « tout le monde ».
  vi.stubEnv("VITE_MEAL_STATUS_EDITORS", "");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 23, 12));
  allPlansForTest = [];
  pantryForTest = [];
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
      screen.getByRole("link", { name: "Envoyer le programme sur WhatsApp" }),
    ).toHaveAttribute("href", expect.stringContaining("https://wa.me/?text="));
  });

  it("n'affiche pas le bouton WhatsApp quand il n'y a rien à envoyer", () => {
    setup();
    expect(
      screen.queryByRole("link", { name: /WhatsApp/ }),
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

    const epicier = screen.getByRole("heading", { name: /Épicier/ }).closest("section")!;
    expect(within(epicier).getByText(/Payé 387,00 MAD \(2 paiements\)/)).toBeInTheDocument();
    const boucher = screen.getByRole("heading", { name: /Boucher/ }).closest("section")!;
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
      { name: "البيض", vendor: "Œufs", round: 1 },
      { name: "توم", quantity: "نصف كيلو", vendor: "Épicier", round: 1 },
      { name: "كمون", quantity: "5 دراهم", vendor: "Épicier", round: 1 },
    ]);
    expect(addExpense).toHaveBeenCalledTimes(2);
    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ type: "groceries", amount: 84, vendor: "Œufs", weekId: "2026-11-21" }),
    );
  });

  it("pré-remplit le point de vente donné par un titre « # » du texte collé", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Coller une liste WhatsApp" }),
    );
    await userEvent.type(
      screen.getByLabelText("Liste à importer"),
      "# Boucher{enter}كفتة{enter}300dh",
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyser" }));

    expect(screen.getByLabelText("Point de vente, groupe 1")).toHaveValue("Boucher");
    expect(screen.getByLabelText("Montant payé, groupe 1")).toHaveValue(300);
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
      screen.queryByRole("link", { name: /WhatsApp/ }),
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

describe("MealsPage — snacks reportés", () => {
  it("affiche en grisé les snacks du dernier jour non vide sur les jours vides", () => {
    setup({ slots: { tue_snack: { items: [{ label: "Cake citron" }] } } });
    const blocks = screen.getAllByTestId("inherited-snacks");
    // mercredi, jeudi, vendredi reprennent le cake du mardi (samedi→lundi : rien avant)
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toHaveTextContent("Suite de mardi : Cake citron");
  });

  it("ne reporte rien sur un jour qui a ses propres snacks", () => {
    setup({
      slots: {
        tue_snack: { items: [{ label: "Cake" }] },
        wed_snack: { items: [{ label: "Crêpes" }] },
      },
    });
    const blocks = screen.getAllByTestId("inherited-snacks");
    // jeudi et vendredi reprennent mercredi
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveTextContent("Suite de mercredi : Crêpes");
  });
});

describe("MealsPage — mode courses par point de vente", () => {
  const shoppingItems = {
    a: { id: "a", name: "Poulet", vendor: "Boucher", checked: true, createdAt: 1 },
    b: { id: "b", name: "Kefta", vendor: "Boucher", checked: false, price: 60, createdAt: 2 },
    c: { id: "c", name: "Lait", vendor: "Épicier", checked: false, createdAt: 3 },
  };

  async function openShopping() {
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
  }

  it("affiche à tout instant ce qui est acheté et ce qui reste, global et par point de vente", async () => {
    setup({}, { items: shoppingItems });
    await openShopping();

    expect(screen.getByText("1 acheté · 2 restants")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    const boucher = screen.getByRole("heading", { name: /Boucher/ });
    expect(boucher).toHaveTextContent("1/2 pris");
    expect(screen.getByRole("heading", { name: /Épicier/ })).toHaveTextContent("0/1 pris");
  });

  it("masque ce qui est déjà pris sur demande", async () => {
    setup({}, { items: shoppingItems });
    await openShopping();
    expect(screen.getByText("Poulet")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Masquer ce qui est pris"));
    expect(screen.queryByText("Poulet")).not.toBeInTheDocument();
    expect(screen.getByText("Kefta")).toBeInTheDocument();
  });

  it("enregistre le montant payé à la fin d'un point de vente, même s'il reste des articles", async () => {
    setup({}, { items: shoppingItems });
    await openShopping();

    await userEvent.click(
      screen.getByRole("button", { name: "Payer Boucher (il reste 1)" }),
    );
    // Le détail des prix saisis (60) pré-remplit le montant, modifiable.
    const amount = screen.getByLabelText("Montant payé chez Boucher");
    expect(amount).toHaveValue(60);
    await userEvent.clear(amount);
    await userEvent.type(amount, "300");
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    // Le paiement et le report de l'article non pris (Kefta) partent ensemble.
    expect(payVendorRound).toHaveBeenCalledWith(
      "2026-11-21",
      expect.objectContaining({
        vendor: "Boucher",
        round: 1,
        amount: 300,
        createdBy: "u1",
        leftoverItemIds: ["b"],
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 article non pris reporté vers « Boucher — 2e passage »",
    );
  });

  it("refuse un paiement sans montant et n'écrit rien", async () => {
    vi.mocked(payVendorRound).mockRejectedValueOnce(
      new Error("Le montant doit être un nombre positif."),
    );
    setup({}, { items: shoppingItems });
    await openShopping();
    await userEvent.click(screen.getByRole("button", { name: /Payer Épicier/ }));
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    expect(screen.getByRole("alert")).toHaveTextContent("montant");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reprend le dernier point de vente et la dernière quantité d'un article déjà connu", async () => {
    setup({}, {}, [], [
      { id: "lait", name: "Lait", vendor: "Épicier", quantity: "2 L" },
    ]);
    await openShopping();
    await userEvent.type(screen.getByLabelText("Article"), "lait");

    expect(screen.getByLabelText("Point de vente")).toHaveValue("Épicier");
    expect(screen.getByLabelText("Quantité")).toHaveValue("2 L");
  });

  it("n'écrase pas ce qui est déjà saisi quand l'article est connu", async () => {
    setup({}, {}, [], [
      { id: "lait", name: "Lait", vendor: "Épicier", quantity: "2 L" },
    ]);
    await openShopping();
    await userEvent.type(screen.getByLabelText("Point de vente"), "Supermarché");
    await userEvent.type(screen.getByLabelText("Article"), "Lait");

    expect(screen.getByLabelText("Point de vente")).toHaveValue("Supermarché");
  });
});

describe("MealsPage — bibliothèque de plats", () => {
  const tajine: Dish = {
    id: "tajine",
    name: "Tajine",
    asMeal: true,
    basis: "persons",
    variants: [
      { n: 4, ingredients: [{ name: "Poulet", quantity: "1 kg" }] },
      { n: 2, ingredients: [{ name: "Poulet", quantity: "500 g" }] },
    ],
  };
  const soupe: Dish = { id: "soupe", name: "سوبا", asMeal: true };

  async function openLibrary() {
    await userEvent.click(screen.getByRole("tab", { name: "Bibliothèque" }));
  }

  it("liste les plats et signale ceux qui n'ont pas encore d'ingrédients", async () => {
    setup({}, {}, [], [], [tajine, soupe]);
    await openLibrary();

    expect(screen.getByText("2 plats · 1 avec ingrédients")).toBeInTheDocument();
    expect(screen.getByText("2, 4 pers.")).toBeInTheDocument();
    expect(screen.getByText("sans ingrédients")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /WhatsApp/ }),
    ).not.toBeInTheDocument();
  });

  it("filtre par nom, en arabe comme en français", async () => {
    setup({}, {}, [], [], [tajine, soupe]);
    await openLibrary();
    await userEvent.type(screen.getByLabelText("Rechercher un plat"), "سوب");

    expect(screen.getByText("سوبا")).toBeInTheDocument();
    expect(screen.queryByText("Tajine")).not.toBeInTheDocument();
  });

  it("crée un plat avec ses ingrédients pour 4 personnes, puis les copie vers 2 personnes", async () => {
    setup();
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: "Nouveau plat" }));
    await userEvent.type(screen.getByLabelText("Nom du plat"), "شعرية الحليب");
    await userEvent.click(screen.getByRole("button", { name: "+ 4 pers." }));
    await userEvent.type(screen.getByLabelText("Ingrédient 1, 4 pers."), "شعرية");
    await userEvent.type(screen.getByLabelText("Quantité 1, 4 pers."), "2 باكية");
    await userEvent.click(screen.getByRole("button", { name: "+ 2 pers." }));
    await userEvent.selectOptions(
      screen.getByLabelText("Copier les ingrédients vers 2 pers."),
      "0",
    );
    expect(screen.getByLabelText("Ingrédient 1, 2 pers.")).toHaveValue("شعرية");

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(saveDish).toHaveBeenCalledWith(null, {
      name: "شعرية الحليب",
      translation: "",
      basis: "persons",
      unitLabel: "",
      variants: [
        { n: 4, ingredients: [{ name: "شعرية", quantity: "2 باكية" }] },
        { n: 2, ingredients: [{ name: "شعرية", quantity: "2 باكية" }] },
      ],
      asSnack: undefined,
      asMeal: undefined,
    });
  });

  it("crée un snack par quantité avec son unité", async () => {
    setup();
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: "Nouveau plat" }));
    await userEvent.type(screen.getByLabelText("Nom du plat"), "Pizza");
    await userEvent.click(screen.getByLabelText(/Snack \(quantités/));
    await userEvent.type(screen.getByLabelText("Unité du snack"), "petite pizza");
    await userEvent.type(screen.getByLabelText("Nouvelle taille"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter cette taille" }));
    await userEvent.type(screen.getByLabelText("Ingrédient 1, 10 petite pizza"), "Farine");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(saveDish).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        basis: "units",
        unitLabel: "petite pizza",
        variants: [{ n: 10, ingredients: [{ name: "Farine", quantity: "" }] }],
      }),
    );
  });

  it("refuse un nom déjà pris et n'écrit rien", async () => {
    setup({}, {}, [], [], [tajine]);
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: "Nouveau plat" }));
    await userEvent.type(screen.getByLabelText("Nom du plat"), "  TAJINE ");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("existe déjà");
    expect(saveDish).not.toHaveBeenCalled();
  });

  it("refuse une taille en double", async () => {
    setup();
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: "Nouveau plat" }));
    await userEvent.type(screen.getByLabelText("Nom du plat"), "X");
    await userEvent.click(screen.getByRole("button", { name: "+ 4 pers." }));
    await userEvent.type(screen.getByLabelText("Nouvelle taille"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter cette taille" }));

    expect(screen.getByRole("alert")).toHaveTextContent("existe déjà");
  });

  it("modifie un plat existant en passant son id (renommage possible)", async () => {
    setup({}, {}, [], [], [tajine]);
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: /Tajine/ }));
    const name = screen.getByLabelText("Nom du plat");
    expect(name).toHaveValue("Tajine");
    await userEvent.clear(name);
    await userEvent.type(name, "Tajine poulet");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(saveDish).toHaveBeenCalledWith(
      "tajine",
      expect.objectContaining({
        name: "Tajine poulet",
        asMeal: true,
        variants: [
          { n: 4, ingredients: [{ name: "Poulet", quantity: "1 kg" }] },
          { n: 2, ingredients: [{ name: "Poulet", quantity: "500 g" }] },
        ],
      }),
    );
  });

  it("demande confirmation avant de supprimer un plat", async () => {
    setup({}, {}, [], [], [tajine]);
    await openLibrary();
    await userEvent.click(screen.getByRole("button", { name: /Tajine/ }));
    await userEvent.click(screen.getByRole("button", { name: "Supprimer le plat" }));
    expect(deleteDish).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    expect(deleteDish).toHaveBeenCalledWith("tajine");
  });

  it("la liste de courses reste utilisable sans aucun plat détaillé", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.type(screen.getByLabelText("Article"), "Piles");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(addShoppingItem).toHaveBeenCalled();
  });
});

describe("MealsPage — vue calendrier du programme", () => {
  const plan = {
    slots: {
      sat_snack: { items: [{ label: "Cheesecake" }] },
      sat_lunch: { diners: 6, items: [{ label: "Couscous" }, { label: "Salade" }] },
      sat_dinner: { items: [{ label: "شعرية الحليب", translation: "Vermicelles au lait" }] },
      tue_snack: { items: [{ label: "Cake" }] },
    },
  };

  it("affiche un jour par ligne et trois colonnes, comme le cahier", async () => {
    setup(plan);
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));

    expect(screen.getByRole("columnheader", { name: "Petit-déj & goûter" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Déjeuner" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Dîner" })).toBeInTheDocument();
    expect(within(screen.getByTestId("cell-sat-lunch")).getByText("Couscous")).toBeInTheDocument();
    expect(within(screen.getByTestId("cell-sat-lunch")).getByText("6 p.")).toBeInTheDocument();
    expect(within(screen.getByTestId("cell-sat-dinner")).getByText("Vermicelles au lait")).toBeInTheDocument();
  });

  it("reporte les snacks sur les jours vides (en italique) et laisse vides déjeuner/dîner", async () => {
    setup(plan);
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));

    // dimanche : pas de snack propre -> reprend Cheesecake du samedi
    expect(within(screen.getByTestId("cell-sun-snack")).getByText("Cheesecake")).toBeInTheDocument();
    // mercredi reprend le cake du mardi
    expect(within(screen.getByTestId("cell-wed-snack")).getByText("Cake")).toBeInTheDocument();
    // un déjeuner vide n'est jamais reporté
    expect(within(screen.getByTestId("cell-sun-lunch")).getByText("—")).toBeInTheDocument();
  });

  it("un tap sur un jour ouvre le détail de la semaine", async () => {
    setup(plan);
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    await userEvent.click(screen.getByRole("button", { name: /Détail du mardi/ }));

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Ajouter un plat, Déjeuner/).length).toBe(7);
  });

  it("le calendrier reste proposé même sans aucun repas", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    expect(screen.getAllByText("—").length).toBeGreaterThan(10);
  });
});

describe("MealsPage — passages multiples chez un point de vente", () => {
  it("affiche le passage 2 comme un groupe à part, avec son propre paiement", async () => {
    setup(
      {},
      {
        items: {
          a: { id: "a", name: "Farine", vendor: "Épicier", checked: true, createdAt: 1 },
          b: { id: "b", name: "Lait", vendor: "Épicier", round: 2, checked: false, createdAt: 2 },
        },
      },
      [
        expense({ type: "groceries", amount: 361, vendor: "Épicier" }),
        expense({ type: "groceries", amount: 26, vendor: "Épicier", round: 2 }),
      ],
    );
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));

    const first = screen.getByRole("heading", { name: /^Épicier 1\/1/ }).closest("section")!;
    expect(within(first).getByText(/Payé 361,00 MAD/)).toBeInTheDocument();
    const second = screen.getByRole("heading", { name: /Épicier — 2e passage/ }).closest("section")!;
    expect(within(second).getByText("Lait")).toBeInTheDocument();
    expect(within(second).getByText(/Payé 26,00 MAD/)).toBeInTheDocument();
  });

  it("annonce avant de payer où iront les articles non pris", async () => {
    setup({}, {
      items: {
        a: { id: "a", name: "Farine", vendor: "Épicier", checked: true, createdAt: 1 },
        b: { id: "b", name: "Lait", vendor: "Épicier", checked: false, createdAt: 2 },
      },
    });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: /Payer Épicier/ }));

    expect(
      screen.getByText(/Les 1 articles non pris iront dans « Épicier — 2e passage »/),
    ).toBeInTheDocument();
  });

  it("un point de vente répété dans la liste collée devient un passage 2", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: "Coller une liste WhatsApp" }));
    await userEvent.type(
      screen.getByLabelText("Liste à importer"),
      "# Épicier{enter}فارينة{enter}361dh{enter}{enter}# Épicier{enter}حليب{enter}26dh",
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyser" }));
    await userEvent.click(screen.getByRole("button", { name: /Importer 2 articles/ }));

    expect(addShoppingItems).toHaveBeenCalledWith("2026-11-21", [
      { name: "فارينة", vendor: "Épicier", round: 1 },
      { name: "حليب", vendor: "Épicier", round: 2 },
    ]);
    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 26, vendor: "Épicier", round: 2 }),
    );
  });
});

describe("MealsPage — correction et traduction", () => {
  const mockedSuggest = vi.mocked(suggestTranslations);
  const shopping = {
    items: {
      a: { id: "a", name: "طماطم", vendor: "Fruits et légumes", quantity: "2 كيلو", checked: false, createdAt: 1 },
    },
  };

  it("corrige un article de courses : nom, quantité, point de vente", async () => {
    setup({}, shopping);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: "Modifier طماطم" }));

    const name = screen.getByLabelText("Nom de l'article");
    expect(name).toHaveValue("طماطم");
    await userEvent.clear(name);
    await userEvent.type(name, "مطيشة");
    await userEvent.clear(screen.getByLabelText("Quantité de l'article"));
    await userEvent.type(screen.getByLabelText("Quantité de l'article"), "3 كيلو");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateShoppingItem).toHaveBeenCalledWith(
      "2026-11-21",
      expect.objectContaining({ id: "a" }),
      { name: "مطيشة", translation: "", initialTranslation: "", quantity: "3 كيلو", vendor: "Fruits et légumes" },
    );
  });

  it("propose des traductions, qu'on choisit avant d'enregistrer (rien n'est écrit tout seul)", async () => {
    mockedSuggest.mockResolvedValueOnce(["Tomate", "Tomates"]);
    setup({}, shopping);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: "Modifier طماطم" }));
    await userEvent.click(screen.getByRole("button", { name: "Suggérer" }));

    expect(mockedSuggest).toHaveBeenCalledWith("طماطم");
    expect(updateShoppingItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Tomate" }));
    expect(screen.getByLabelText("Traduction")).toHaveValue("Tomate");
    expect(updateShoppingItem).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(updateShoppingItem).toHaveBeenCalledWith(
      "2026-11-21",
      expect.anything(),
      expect.objectContaining({ translation: "Tomate" }),
    );
  });

  it("dit quand le service ne trouve rien de fiable, et laisse saisir à la main", async () => {
    mockedSuggest.mockResolvedValueOnce([]);
    setup({}, shopping);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: "Modifier طماطم" }));
    await userEvent.click(screen.getByRole("button", { name: "Suggérer" }));

    expect(screen.getByText(/Aucune suggestion fiable/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Traduction"), "Tomates");
    expect(screen.getByLabelText("Traduction")).toHaveValue("Tomates");
  });

  it("affiche l'erreur du service de traduction sans bloquer l'édition", async () => {
    mockedSuggest.mockRejectedValueOnce(new Error("Quota gratuit de traduction épuisé pour aujourd'hui."));
    setup({}, shopping);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    await userEvent.click(screen.getByRole("button", { name: "Modifier طماطم" }));
    await userEvent.click(screen.getByRole("button", { name: "Suggérer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Quota");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  });

  it("corrige et traduit un plat du programme", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "كسكسو" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier كسكسو" }));
    await userEvent.type(screen.getByLabelText("Traduction"), "Couscous");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    // Le libellé reste sur l'élément ; la traduction part dans le référentiel,
    // où elle vaudra pour toutes les occurrences de ce nom.
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "كسكسو" }],
    });
    expect(setDishTranslation).toHaveBeenCalledWith("كسكسو", "Couscous");
  });

  it("renommer un plat sans toucher à la traduction n'efface pas celle du nouveau nom", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "كسكس" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier كسكس" }));
    const name = screen.getByLabelText("Nom, Déjeuner");
    await userEvent.clear(name);
    await userEvent.type(name, "كسكسو");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(setDishTranslation).not.toHaveBeenCalled();
  });

  it("vider volontairement une traduction affichée l'efface", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "كسكسو", translation: "Couscous" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier كسكسو" }));
    await userEvent.clear(screen.getByLabelText("Traduction"));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(setDishTranslation).toHaveBeenCalledWith("كسكسو", "");
  });

  it("refuse de vider le nom d'un plat du programme", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "كسكسو" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier كسكسو" }));
    await userEvent.clear(screen.getByLabelText("Nom, Déjeuner"));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("vide");
  });

  it("annuler une correction n'écrit rien", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "كسكسو" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier كسكسو" }));
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
  });
});

describe("MealsPage — partage WhatsApp", () => {
  it("le bouton de partage est sur sa propre ligne, sous les onglets", () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    const share = screen.getByRole("link", { name: "Envoyer le programme sur WhatsApp" });
    const tablist = screen.getByRole("tablist");
    expect(tablist).not.toContainElement(share);
    expect(tablist.parentElement).not.toContainElement(share);
  });

  it("propose l'envoi de la liste complète dans l'onglet Courses", async () => {
    setup({}, { items: { a: { id: "a", name: "Lait", checked: false, createdAt: 1 } } });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(
      screen.getByRole("link", { name: "Envoyer toute la liste sur WhatsApp" }),
    ).toBeInTheDocument();
  });

  it("chaque point de vente a son envoi : seulement ses articles non pris", async () => {
    setup({}, {
      items: {
        a: { id: "a", name: "Poulet", quantity: "1 kg", vendor: "Boucher", checked: false, createdAt: 1 },
        b: { id: "b", name: "Kefta", vendor: "Boucher", checked: true, createdAt: 2 },
        c: { id: "c", name: "Lait", vendor: "Épicier", checked: false, createdAt: 3 },
      },
    });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));

    const link = screen.getByRole("link", { name: "Envoyer à Boucher sur WhatsApp" });
    const text = decodeURIComponent(link.getAttribute("href")!.split("text=")[1]);
    expect(text).toBe("*Boucher*\n▫️ Poulet (1 kg)");
    expect(text).not.toContain("Kefta");
    expect(text).not.toContain("Lait");
    expect(screen.getByRole("link", { name: "Envoyer à Épicier sur WhatsApp" })).toBeInTheDocument();
  });

  it("n'envoie rien à un point de vente dont tout est pris", async () => {
    setup({}, {
      items: { a: { id: "a", name: "Poulet", vendor: "Boucher", checked: true, createdAt: 1 } },
    });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.queryByRole("link", { name: /Envoyer à Boucher/ })).not.toBeInTheDocument();
  });
});

describe("MealsPage — texte long et défilement", () => {
  const long =
    "شعرية بالتقاطع + سلاطة فلفلة خضراء مشوية بالحامض والكمون مع الزيتون والطماطم";

  it("une pastille longue passe à la ligne au lieu de déborder du cadre", () => {
    setup({ slots: { tue_dinner: { items: [{ label: long }] } } });
    const chip = screen.getByRole("button", { name: `Modifier ${long}` }).closest("li")!;
    expect(chip).toHaveStyle({ whiteSpace: "normal" });
    expect(chip.className).toContain("w-full");
  });

  it("une ligne de courses longue passe à la ligne", async () => {
    setup({}, { items: { a: { id: "a", name: long, vendor: "Épicier", checked: false, createdAt: 1 } } });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByText(long).className).toContain("break-words");
  });

  it("le calendrier a des flèches qui font défiler le tableau", async () => {
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy as unknown as typeof HTMLElement.prototype.scrollBy;
    setup({ slots: { sat_lunch: { items: [{ label: long }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    const scroller = screen.getByRole("table").parentElement!;
    Object.defineProperty(scroller, "clientWidth", { value: 300, configurable: true });

    await userEvent.click(screen.getByRole("button", { name: "Défiler le calendrier vers la droite" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 210, behavior: "smooth" });
    await userEvent.click(screen.getByRole("button", { name: "Défiler le calendrier vers la gauche" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -210, behavior: "smooth" });
  });

  it("le calendrier met l'arabe sur une ligne et la traduction dessous", async () => {
    setup(
      { slots: { sat_dinner: { items: [{ label: "شعرية الحليب" }] } } },
      {},
      [],
      [],
      [{ id: "x", name: "شعرية الحليب", translation: "Vermicelles au lait" }],
    );
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    const cell = screen.getByTestId("cell-sat-dinner");
    const arabic = within(cell).getByText("شعرية الحليب");
    const french = within(cell).getByText("Vermicelles au lait");
    expect(arabic.className).toContain("block");
    expect(french.className).toContain("block");
    expect(arabic.compareDocumentPosition(french) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("MealsPage — une traduction vaut pour tous les noms identiques", () => {
  const dishes: Dish[] = [
    { id: "cheesecake", name: "Cheesecake", asSnack: true, translation: "شينز كيك" },
  ];

  it("un snack répété affiche la traduction du référentiel, sans la retaper", () => {
    setup(
      {
        slots: {
          sat_snack: { items: [{ label: "Cheesecake" }] },
          wed_snack: { items: [{ label: "cheesecake" }] },
        },
      },
      {},
      [],
      [],
      dishes,
    );
    // les deux occurrences (casse différente) affichent la traduction
    expect(screen.getAllByText("شينز كيك").length).toBe(2);
  });

  it("une traduction saisie sur un plat d'un jour sert aux autres semaines et au référentiel", () => {
    setup({ slots: { sat_snack: { items: [{ label: "Cake", translation: "كيك" }] },
                     tue_snack: { items: [{ label: "cake" }] } } });
    expect(screen.getAllByText("كيك").length).toBe(2);
  });

  it("l'éditeur propose la traduction déjà connue quand on change le nom", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Riz" }] } } }, {}, [], [], dishes);
    await userEvent.click(screen.getByRole("button", { name: "Modifier Riz" }));
    const name = screen.getByLabelText("Nom, Déjeuner");
    await userEvent.clear(name);
    await userEvent.type(name, "Cheesecake");

    expect(screen.getByText(/Déjà traduit ailleurs/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "شينز كيك" }));
    expect(screen.getByLabelText("Traduction")).toHaveValue("شينز كيك");
  });

  it("l'éditeur ouvre un plat déjà traduit avec sa traduction pré-remplie, sans appel au service", async () => {
    setup({ slots: { sat_snack: { items: [{ label: "Cheesecake" }] } } }, {}, [], [], dishes);
    await userEvent.click(screen.getByRole("button", { name: "Modifier Cheesecake" }));
    expect(screen.getByLabelText("Traduction")).toHaveValue("شينز كيك");
    expect(vi.mocked(suggestTranslations)).not.toHaveBeenCalled();
  });

  it("la traduction d'un article de courses est reprise d'un article déjà traduit", async () => {
    setup(
      {},
      { items: { a: { id: "a", name: "Lait", vendor: "Épicier", checked: false, createdAt: 1 } } },
      [],
      [{ id: "lait", name: "lait", translation: "حليب" }],
    );
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByText("حليب")).toBeInTheDocument();
  });
});

describe("MealsPage — suivi préparé / non préparé", () => {
  const slots = {
    sat_lunch: {
      items: [
        { label: "Couscous" },
        { label: "Tarte" },
      ],
    },
  };

  it("marque un plat comme préparé", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme préparé" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous", status: "prepared" }, { label: "Tarte" }],
    });
  });

  it("un second appui sur ✓ demande confirmation avant de revenir à planifié", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous", status: "prepared" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme préparé" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.getByText(/« Couscous » est déjà préparé\. Le remettre à planifié \?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le changement de statut de Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous" }],
    });
  });

  it("marque un plat non préparé avec un motif choisi", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Tarte comme non préparé" }));
    // rien n'est écrit tant qu'on n'a pas choisi : le motif est demandé d'abord
    expect(saveMealSlot).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Pas le temps" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous" }, { label: "Tarte", status: "skipped", skipReason: "Pas le temps" }],
    });
  });

  it("le motif « Ingrédient manquant » est proposé aussi, et « Sans motif » reste possible", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Tarte comme non préparé" }));
    expect(screen.getByRole("button", { name: "Ingrédient manquant" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sans motif" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous" }, { label: "Tarte", status: "skipped" }],
    });
  });

  it("annuler le choix du motif n'écrit rien", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Tarte comme non préparé" }));
    await userEvent.click(within(screen.getByRole("group", { name: "Motif, Tarte" })).getByRole("button", { name: "Annuler" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Motif, Tarte" })).not.toBeInTheDocument();
  });

  it("un plat non préparé affiche son motif, et ✗ le remet à planifié après confirmation", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Tarte", status: "skipped", skipReason: "Pas le temps" }] } } });
    expect(screen.getByText("Non préparé · Pas le temps")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Marquer Tarte comme non préparé" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le changement de statut de Tarte" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Tarte" }],
    });
  });

  it("« Tout préparé » ne marque que les plats encore planifiés", async () => {
    setup({
      slots: {
        sat_lunch: {
          items: [
            { label: "A" },
            { label: "B", status: "skipped", skipReason: "Pas le temps" },
            { label: "C", status: "prepared" },
          ],
        },
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "Tout marquer préparé, Déjeuner" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [
        { label: "A", status: "prepared" },
        { label: "B", status: "skipped", skipReason: "Pas le temps" },
        { label: "C", status: "prepared" },
      ],
    });
  });

  it("« Tout préparé » disparaît quand plus rien n'est planifié", () => {
    setup({ slots: { sat_lunch: { items: [{ label: "A", status: "prepared" }] } } });
    expect(screen.queryByRole("button", { name: "Tout marquer préparé, Déjeuner" })).not.toBeInTheDocument();
  });

  it("corriger le nom d'un plat conserve son statut et son motif", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Tarte", status: "skipped", skipReason: "Pas le temps" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier Tarte" }));
    const name = screen.getByLabelText("Nom, Déjeuner");
    await userEvent.clear(name);
    await userEvent.type(name, "Tarte aux pommes");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Tarte aux pommes", status: "skipped", skipReason: "Pas le temps" }],
    });
  });
});

describe("MealsPage — vue filtrée par statut", () => {
  const slots = {
    sat_lunch: {
      items: [
        { label: "Couscous", status: "prepared" as const },
        { label: "Salade" },
        { label: "Tarte", status: "skipped" as const, skipReason: "Pas le temps" },
      ],
    },
    sun_dinner: { items: [{ label: "Shaaria", status: "skipped" as const }] },
  };

  it("affiche le nombre de plats par statut", () => {
    setup({ slots });
    expect(screen.getByRole("button", { name: "Tout (4)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planifié (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Préparé (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Non préparé (2)" })).toBeInTheDocument();
  });

  it("n'affiche pas de filtre quand le programme est vide", () => {
    setup();
    expect(screen.queryByRole("group", { name: "Filtrer le programme par statut" })).not.toBeInTheDocument();
  });

  it("ne montre que ce qui a été réellement préparé", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Préparé (1)" }));
    expect(screen.getByText("Couscous")).toBeInTheDocument();
    expect(screen.queryByText("Salade")).not.toBeInTheDocument();
    expect(screen.queryByText("Tarte")).not.toBeInTheDocument();
    // les jours sans plat préparé disparaissent
    expect(screen.queryByText(/^Dimanche/)).not.toBeInTheDocument();
  });

  it("ne montre que les plats non préparés, avec leur motif, sur tous les jours", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Non préparé (2)" }));
    expect(screen.getByText("Tarte")).toBeInTheDocument();
    expect(screen.getByText("Shaaria")).toBeInTheDocument();
    expect(screen.getByText("Non préparé · Pas le temps")).toBeInTheDocument();
    expect(screen.queryByText("Couscous")).not.toBeInTheDocument();
  });

  it("la vue « Planifié » ne garde que ce qui n'est pas encore marqué", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Planifié (1)" }));
    expect(screen.getByText("Salade")).toBeInTheDocument();
    expect(screen.queryByText("Couscous")).not.toBeInTheDocument();
  });

  it("sous un filtre, la saisie est masquée (on consulte)", async () => {
    setup({ slots });
    expect(screen.getAllByLabelText(/Ajouter un plat/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Préparé (1)" }));
    expect(screen.queryByLabelText(/Ajouter un plat/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Moins de convives/)).not.toBeInTheDocument();
  });

  it("retirer un plat sous un filtre vise bien ce plat, pas un autre (index d'origine)", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "A" }, { label: "B", status: "prepared" as const }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Préparé (1)" }));
    await userEvent.click(screen.getByRole("button", { name: "Retirer B" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la suppression de B" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "A" }],
    });
  });

  it("signale quand aucun plat ne correspond, et « Tout » ramène la vue complète", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "A" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Préparé (0)" }));
    expect(screen.getByText("Aucun plat ne correspond à ce filtre.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tout (1)" }));
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("le calendrier suit le filtre et marque préparé ✓ / non préparé ✗", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    const lunch = screen.getByTestId("cell-sat-lunch");
    expect(within(lunch).getByLabelText("préparé")).toBeInTheDocument();
    expect(within(lunch).getByLabelText("non préparé")).toBeInTheDocument();
    expect(within(lunch).getByText("Pas le temps")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Préparé (1)" }));
    const filtered = screen.getByTestId("cell-sat-lunch");
    expect(within(filtered).getByText("Couscous")).toBeInTheDocument();
    expect(within(filtered).queryByText("Tarte")).not.toBeInTheDocument();
  });
});

describe("MealsPage — disposition et suppression sécurisée", () => {
  const slots = { sat_lunch: { items: [{ label: "Couscous" }] } };

  it("les boutons de statut sont à gauche du nom, la suppression à droite", () => {
    setup({ slots });
    const row = screen.getByRole("button", { name: "Modifier Couscous" }).parentElement!;
    const order = [...row.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(order).toEqual([
      "Marquer Couscous comme préparé",
      "Marquer Couscous comme non préparé",
      "Modifier Couscous",
      "Retirer Couscous",
    ]);
  });

  it("le bouton de suppression est rouge", () => {
    setup({ slots });
    expect(screen.getByRole("button", { name: "Retirer Couscous" }).className).toContain(
      "text-[var(--ht-danger)]",
    );
  });

  it("un premier appui sur × ne supprime rien : il demande confirmation", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Retirer Couscous" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer « Couscous » du programme ?")).toBeInTheDocument();
  });

  it("confirmer supprime le plat", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }, { label: "Salade" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Retirer Couscous" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la suppression de Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Salade" }],
    });
  });

  it("annuler n'écrit rien et referme la confirmation", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Retirer Couscous" }));
    await userEvent.click(
      within(screen.getByRole("group", { name: "Confirmer la suppression, Couscous" })).getByRole("button", { name: "Annuler" }),
    );
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.queryByText("Supprimer « Couscous » du programme ?")).not.toBeInTheDocument();
  });

  it("ouvrir le choix du motif ferme la confirmation de suppression (jamais les deux)", async () => {
    setup({ slots });
    await userEvent.click(screen.getByRole("button", { name: "Retirer Couscous" }));
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme non préparé" }));
    expect(screen.queryByText("Supprimer « Couscous » du programme ?")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Motif, Couscous" })).toBeInTheDocument();
  });

  it("confirme la suppression du bon plat quand il y en a plusieurs", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "A" }, { label: "B" }, { label: "C" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Retirer B" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la suppression de B" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "A" }, { label: "C" }],
    });
  });
});

describe("MealsPage — retour 👍/👎 sur les plats préparés", () => {
  const prepared = (extra = {}) => ({
    sat_lunch: { items: [{ label: "Couscous", status: "prepared" as const, ...extra }] },
  });

  it("n'offre le retour que sur un plat préparé", () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }, { label: "Tarte", status: "skipped" as const }] } } });
    expect(screen.queryByRole("button", { name: /Retour positif/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retour négatif/ })).not.toBeInTheDocument();
  });

  it("enregistre le 👍 de la personne connectée, avec le compte entre parenthèses", async () => {
    setup({ slots: prepared() });
    expect(screen.getByRole("button", { name: "Retour positif sur Couscous" })).toHaveTextContent("(0)");
    await userEvent.click(screen.getByRole("button", { name: "Retour positif sur Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous", status: "prepared", votes: { u1: "up" } }],
    });
  });

  it("affiche les votes de tous, et mon vote en appuyé", () => {
    setup({ slots: prepared({ votes: { u1: "up", u2: "up", u3: "down" } }) });
    const up = screen.getByRole("button", { name: "Retour positif sur Couscous" });
    const down = screen.getByRole("button", { name: "Retour négatif sur Couscous" });
    expect(up).toHaveTextContent("(2)");
    expect(down).toHaveTextContent("(1)");
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(down).toHaveAttribute("aria-pressed", "false");
  });

  it("le pouce opposé est bloqué tant que mon vote n'est pas annulé", () => {
    setup({ slots: prepared({ votes: { u1: "up" } }) });
    expect(screen.getByRole("button", { name: "Retour négatif sur Couscous" })).toBeDisabled();
  });

  it("un second appui sur le même pouce annule mon vote, pas celui des autres", async () => {
    setup({ slots: prepared({ votes: { u1: "up", u2: "up" } }) });
    await userEvent.click(screen.getByRole("button", { name: "Retour positif sur Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous", status: "prepared", votes: { u2: "up" } }],
    });
  });

  it("annuler le dernier vote efface aussi la remarque", async () => {
    setup({ slots: prepared({ votes: { u1: "up" }, feedbackNote: "délicieux" }) });
    await userEvent.click(screen.getByRole("button", { name: "Retour positif sur Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous", status: "prepared" }],
    });
  });

  it("la remarque n'apparaît qu'une fois un retour donné, et s'enregistre en quittant le champ", async () => {
    setup({ slots: prepared({ feedback: "down" }) });
    const note = screen.getByLabelText("Remarque sur Couscous");
    await userEvent.type(note, "trop salé");
    expect(saveMealSlot).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous", status: "prepared", feedback: "down", feedbackNote: "trop salé" }],
    });
  });

  it("pas de champ de remarque sans retour, et rien n'est écrit si la remarque ne change pas", async () => {
    setup({ slots: prepared() });
    expect(screen.queryByLabelText("Remarque sur Couscous")).not.toBeInTheDocument();
  });

  it("quitter un champ de remarque inchangé n'écrit rien", async () => {
    setup({ slots: prepared({ feedback: "up", feedbackNote: "ok" }) });
    await userEvent.click(screen.getByLabelText("Remarque sur Couscous"));
    await userEvent.tab();
    expect(saveMealSlot).not.toHaveBeenCalled();
  });

  it("repasser un plat à « planifié » efface son retour, après avoir prévenu et demandé confirmation", async () => {
    setup({ slots: prepared({ feedback: "up", feedbackNote: "ok" }) });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme préparé" }));
    expect(screen.getByText(/Les votes seront effacés/)).toBeInTheDocument();
    expect(saveMealSlot).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le changement de statut de Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "Couscous" }],
    });
  });

  it("le calendrier affiche le retour", async () => {
    setup({ slots: prepared({ feedback: "up" }) });
    await userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
    expect(within(screen.getByTestId("cell-sat-lunch")).getByLabelText("apprécié")).toBeInTheDocument();
  });
});

describe("MealsPage — message de fin de semaine", () => {
  const week = {
    sat_lunch: {
      items: [
        { label: "Couscous", status: "prepared" as const, feedback: "up" as const, feedbackNote: "délicieux" },
        { label: "Tarte", status: "skipped" as const, skipReason: "Pas le temps" },
      ],
    },
  };

  it("n'est proposé qu'une fois des plats marqués préparés ou non préparés", () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    expect(screen.queryByRole("button", { name: "Retour de fin de semaine" })).not.toBeInTheDocument();
  });

  it("s'ouvre pré-rempli avec les retours de la semaine", async () => {
    setup({ slots: week });
    await userEvent.click(screen.getByRole("button", { name: "Retour de fin de semaine" }));
    const text = (screen.getByLabelText("Message de fin de semaine") as HTMLTextAreaElement).value;
    expect(text).toContain("👍 Couscous (samedi) : délicieux");
    expect(text).toContain("❌ Tarte (samedi) : Pas le temps");
  });

  it("reste modifiable, et le lien WhatsApp envoie le texte modifié", async () => {
    setup({ slots: week });
    await userEvent.click(screen.getByRole("button", { name: "Retour de fin de semaine" }));
    const area = screen.getByLabelText("Message de fin de semaine");
    await userEvent.clear(area);
    await userEvent.type(area, "Merci beaucoup");
    const href = screen.getByRole("link", { name: "Envoyer le retour sur WhatsApp" }).getAttribute("href")!;
    expect(decodeURIComponent(href.split("text=")[1])).toBe("Merci beaucoup");
  });

  it("« Régénérer » restaure le message généré", async () => {
    setup({ slots: week });
    await userEvent.click(screen.getByRole("button", { name: "Retour de fin de semaine" }));
    const area = screen.getByLabelText("Message de fin de semaine") as HTMLTextAreaElement;
    await userEvent.clear(area);
    await userEvent.click(screen.getByRole("button", { name: "Régénérer" }));
    expect(area.value).toContain("Couscous");
  });
});

describe("MealsPage — statistiques par plat dans la bibliothèque", () => {
  const dishes: Dish[] = [
    { id: "couscous", name: "Couscous", asMeal: true },
    { id: "tajine", name: "Tajine", asMeal: true },
    { id: "soupe", name: "Soupe", asMeal: true },
  ];
  const plans: MealPlan[] = [
    {
      weekId: "2026-11-14",
      defaultDiners: 4,
      slots: {
        sat_lunch: { items: [{ label: "Couscous", status: "prepared", feedback: "up" }, { label: "Tajine", status: "prepared", feedback: "down" }] },
      },
    },
    {
      weekId: "2026-11-21",
      defaultDiners: 4,
      slots: {
        sat_lunch: { items: [{ label: "Couscous", status: "prepared", feedback: "up" }, { label: "Tajine", status: "skipped" }] },
      },
    },
  ];

  it("affiche combien de fois le plat a été servi et ses retours, toutes semaines confondues", async () => {
    allPlansForTest = plans;
    setup({}, {}, [], [], dishes);
    await userEvent.click(screen.getByRole("tab", { name: "Bibliothèque" }));
    expect(screen.getByText(/servi 2× · 👍 2 · 👎 0/)).toBeInTheDocument();
    expect(screen.getByText(/servi 1× · 👍 0 · 👎 1/)).toBeInTheDocument();
  });

  it("n'affiche rien pour un plat jamais préparé", async () => {
    allPlansForTest = plans;
    setup({}, {}, [], [], dishes);
    await userEvent.click(screen.getByRole("tab", { name: "Bibliothèque" }));
    const soupe = screen.getByRole("button", { name: /Soupe/ });
    expect(soupe).not.toHaveTextContent("servi");
  });

  it("trie par « mieux notés »", async () => {
    allPlansForTest = plans;
    setup({}, {}, [], [], dishes);
    await userEvent.click(screen.getByRole("tab", { name: "Bibliothèque" }));
    await userEvent.selectOptions(screen.getByLabelText("Trier les plats"), "approval");
    const names = screen.getAllByRole("button", { name: /Couscous|Tajine|Soupe/ }).map((b) => b.textContent ?? "");
    expect(names[0]).toContain("Couscous");
    expect(names[1]).toContain("Tajine");
    expect(names[2]).toContain("Soupe");
  });
});

describe("MealsPage — quantité d'un snack", () => {
  it("permet de préciser la quantité préparée d'un snack", async () => {
    setup({ slots: { sat_snack: { items: [{ label: "Pizza" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier Pizza" }));
    await userEvent.type(screen.getByLabelText("Quantité du snack"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_snack", {
      items: [{ label: "Pizza", n: 10 }],
    });
  });

  it("n'offre pas ce champ pour un déjeuner ou un dîner", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Modifier Couscous" }));
    expect(screen.queryByLabelText("Quantité du snack")).not.toBeInTheDocument();
  });

  it("affiche la quantité sur la pastille", () => {
    setup({ slots: { sat_snack: { items: [{ label: "Pizza", n: 10 }] } } });
    expect(screen.getByText("Pizza ×10")).toBeInTheDocument();
  });
});

describe("MealsPage — contrôle des oublis", () => {
  const shaaria: Dish = {
    id: "شعرية الحليب",
    name: "شعرية الحليب",
    asMeal: true,
    basis: "persons",
    variants: [
      {
        n: 4,
        ingredients: [
          { name: "شعرية", quantity: "1 باكية" },
          { name: "حليب", quantity: "1 لتر" },
          { name: "سكر" },
        ],
      },
    ],
  };
  const planned = { sat_dinner: { items: [{ label: "شعرية الحليب" }] } };
  const lait = {
    items: { a: { id: "a", name: "حليب", vendor: "Épicier", checked: false, createdAt: 1 } },
  };

  async function openShopping() {
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
  }

  it("signale les ingrédients d'un plat planifié absents de la liste (le cha3ria oublié)", async () => {
    setup({ slots: planned }, lait, [], [], [shaaria]);
    await openShopping();

    const panel = screen.getByRole("region", { name: "Contrôle des oublis" });
    expect(within(panel).getByText(/1 plat avec des ingrédients absents de la liste/)).toBeInTheDocument();
    expect(within(panel).getByText(/Samedi · Dîner — شعرية الحليب \(4 p\.\)/)).toBeInTheDocument();
    expect(within(panel).getByText("شعرية")).toBeInTheDocument();
    expect(within(panel).getByText("سكر")).toBeInTheDocument();
    // le lait est déjà dans la liste : pas signalé
    expect(within(panel).queryByText("حليب")).not.toBeInTheDocument();
  });

  it("confirme que rien n'est oublié quand la liste est complète", async () => {
    setup(
      { slots: planned },
      {
        items: {
          a: { id: "a", name: "شعرية", checked: false, createdAt: 1 },
          b: { id: "b", name: "حليب", checked: false, createdAt: 2 },
          c: { id: "c", name: "سكر", checked: false, createdAt: 3 },
        },
      },
      [],
      [],
      [shaaria],
    );
    await openShopping();
    expect(screen.getByText(/Rien d'oublié/)).toBeInTheDocument();
  });

  it("ajoute un ingrédient manquant à la liste, avec sa quantité et son point de vente habituel", async () => {
    setup({ slots: planned }, lait, [], [{ id: "شعرية", name: "شعرية", vendor: "Épicier" }], [shaaria]);
    await openShopping();
    await userEvent.click(screen.getByRole("button", { name: "Ajouter شعرية à la liste" }));

    expect(addShoppingItem).toHaveBeenCalledWith("2026-11-21", {
      name: "شعرية",
      quantity: "1 باكية",
      vendor: "Épicier",
    });
  });

  it("ajoute d'un coup tout ce qui manque", async () => {
    setup({ slots: planned }, lait, [], [], [shaaria]);
    await openShopping();
    await userEvent.click(screen.getByRole("button", { name: "Ajouter tout ce qui manque (2)" }));

    expect(addShoppingItems).toHaveBeenCalledWith("2026-11-21", [
      { name: "شعرية", quantity: "1 باكية", vendor: undefined },
      { name: "سكر", quantity: undefined, vendor: undefined },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("2 ingrédients ajoutés à la liste.");
  });

  it("met un ingrédient en stock pour ne plus le signaler", async () => {
    setup({ slots: planned }, lait, [], [], [shaaria]);
    await openShopping();
    await userEvent.click(screen.getByRole("button", { name: "سكر est en stock" }));
    expect(setInPantry).toHaveBeenCalledWith("سكر", true);
  });

  it("ne signale pas un ingrédient déjà en stock, et permet de le remettre à contrôler", async () => {
    pantryForTest = [{ id: "سكر", name: "سكر" }];
    setup({ slots: planned }, lait, [], [], [shaaria]);
    await openShopping();

    const panel = screen.getByRole("region", { name: "Contrôle des oublis" });
    // سكر n'apparaît plus que dans la liste « en stock », pas comme manquant
    expect(within(panel).queryByRole("button", { name: "سكر est en stock" })).not.toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: "Retirer سكر du stock" }));
    expect(setInPantry).toHaveBeenCalledWith("سكر", false);
  });

  it("ne contrôle pas un plat déjà préparé ou non préparé", async () => {
    setup(
      { slots: { sat_dinner: { items: [{ label: "شعرية الحليب", status: "prepared" }] } } },
      lait,
      [],
      [],
      [shaaria],
    );
    await openShopping();
    expect(screen.queryByRole("region", { name: "Contrôle des oublis" })).not.toBeInTheDocument();
  });

  it("n'affiche rien quand le programme est vide", async () => {
    setup({}, lait, [], [], [shaaria]);
    await openShopping();
    expect(screen.queryByRole("region", { name: "Contrôle des oublis" })).not.toBeInTheDocument();
  });

  it("signale les plats sans recette comme non contrôlés, au lieu de les ignorer", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }, { label: "Tajine" }] } } }, lait, [], [], [
      { id: "couscous", name: "Couscous", asMeal: true },
    ]);
    await openShopping();
    expect(screen.getByText(/Ingrédients non définis, donc non contrôlés/)).toBeInTheDocument();
    expect(screen.getByText("Couscous, Tajine")).toBeInTheDocument();
  });

  it("choisit la recette selon les convives du repas et marque une taille estimée", async () => {
    const riz: Dish = {
      id: "riz",
      name: "Riz",
      asMeal: true,
      basis: "persons",
      variants: [
        { n: 2, ingredients: [{ name: "riz", quantity: "200 g" }] },
        { n: 4, ingredients: [{ name: "riz", quantity: "400 g" }] },
      ],
    };
    // 6 convives = 4 + 2 : quantités additionnées, pas estimées
    setup({ slots: { sat_lunch: { diners: 6, items: [{ label: "Riz" }] } } }, {}, [], [], [riz]);
    await openShopping();
    expect(screen.getByText(/400 g \+ 200 g/)).toBeInTheDocument();
    expect(screen.queryByText("taille estimée, à vérifier")).not.toBeInTheDocument();
  });

  it("marque « taille estimée » quand aucune combinaison n'est exacte", async () => {
    const riz: Dish = {
      id: "riz",
      name: "Riz",
      asMeal: true,
      basis: "persons",
      variants: [{ n: 2, ingredients: [{ name: "riz", quantity: "200 g" }] }, { n: 4, ingredients: [{ name: "riz", quantity: "400 g" }] }],
    };
    setup({ slots: { sat_lunch: { diners: 3, items: [{ label: "Riz" }] } } }, {}, [], [], [riz]);
    await openShopping();
    expect(screen.getByText("taille estimée, à vérifier")).toBeInTheDocument();
    expect(screen.getByText(/300 g/)).toBeInTheDocument();
  });

  it("affiche une erreur sans rien casser quand l'ajout échoue", async () => {
    vi.mocked(addShoppingItems).mockRejectedValueOnce(new Error("Hors ligne"));
    setup({ slots: planned }, lait, [], [], [shaaria]);
    await openShopping();
    await userEvent.click(screen.getByRole("button", { name: "Ajouter tout ce qui manque (2)" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Hors ligne");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("compare aussi par traduction : un ingrédient français déjà présent en arabe n'est pas signalé", async () => {
    const dish: Dish = {
      id: "soupe",
      name: "Soupe",
      asMeal: true,
      basis: "persons",
      variants: [{ n: 4, ingredients: [{ name: "Lait" }] }],
    };
    setup(
      { slots: { sat_dinner: { items: [{ label: "Soupe" }] } } },
      lait,
      [],
      [{ id: "lait", name: "Lait", translation: "حليب" }],
      [dish],
    );
    await openShopping();
    expect(screen.getByText(/Rien d'oublié/)).toBeInTheDocument();
  });
});

describe("MealsPage — partage en tableau", () => {
  it("propose le programme en texte ou en tableau (image)", async () => {
    const { shareTableImage } = await import("../../services/tableImage");
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    expect(screen.getByRole("link", { name: "Envoyer le programme sur WhatsApp" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer le programme en tableau (image)" }));
    const [table, filename] = vi.mocked(shareTableImage).mock.calls.at(-1)!;
    expect(filename).toBe("programme-2026-11-21.png");
    expect(table.sections[0].rows[0][2]).toBe("Couscous");
  });

  it("envoie à chaque commerçant sa liste en tableau, seulement ce qu'il reste à acheter", async () => {
    const { shareTableImage } = await import("../../services/tableImage");
    setup(
      {},
      {
        items: {
          a: { id: "a", name: "Lait", vendor: "Épicier", checked: false, createdAt: 1 },
          b: { id: "b", name: "Sel", vendor: "Épicier", checked: true, createdAt: 2 },
          c: { id: "c", name: "Thym", vendor: "Herbes", checked: false, createdAt: 3 },
        },
      },
    );
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.queryByRole("button", { name: "Envoyer la liste en tableau (image)" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer à Épicier en tableau (image)" }));
    const [table] = vi.mocked(shareTableImage).mock.calls.at(-1)!;
    expect(table.title).toBe("Épicier");
    expect(table.sections[0].rows).toEqual([["Lait", ""]]);
  });

  it("affiche l'erreur si l'image ne peut pas être créée", async () => {
    const { shareTableImage } = await import("../../services/tableImage");
    vi.mocked(shareTableImage).mockRejectedValueOnce(new Error("Pas de canvas"));
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Envoyer le programme en tableau (image)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pas de canvas");
  });
});

describe("MealsPage — paiement d'un point de vente", () => {
  const items = {
    a: { id: "a", name: "Lait", vendor: "Épicier", checked: true, createdAt: 1 },
    b: { id: "b", name: "Sel", vendor: "Épicier", checked: true, createdAt: 2 },
  };

  it("propose de payer quand tout est pris mais pas encore payé", async () => {
    setup({}, { items });
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByRole("button", { name: "Payer Épicier" })).toBeInTheDocument();
  });

  it("ne propose plus rien quand tout est pris et déjà payé", async () => {
    setup({}, { items }, [
      { id: "e1", weekId: "2026-11-21", type: "groceries", amount: 120, vendor: "Épicier", date: "2026-11-21", createdBy: "u1", createdAt: 1 },
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.queryByRole("button", { name: /Payer Épicier|paiement chez Épicier/ })).not.toBeInTheDocument();
  });

  it("propose d'ajouter un paiement si un article repasse à « non pris » après paiement", async () => {
    setup({}, { items: { ...items, b: { ...items.b, checked: false } } }, [
      { id: "e1", weekId: "2026-11-21", type: "groceries", amount: 120, vendor: "Épicier", date: "2026-11-21", createdBy: "u1", createdAt: 1 },
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByRole("button", { name: /Ajouter un paiement chez Épicier/ })).toBeInTheDocument();
  });
});

describe("MealsPage — vue d'ouverture et glisser-déposer", () => {
  const week = { sat_lunch: { items: [{ label: "Couscous" }, { label: "Salade" }] } };

  function openCalendar() {
    return userEvent.click(screen.getByRole("button", { name: "Calendrier" }));
  }

  function drag(label: string, targetTestId: string, pointerType = "mouse") {
    const item = screen.getByText(label).closest("li")!;
    const target = screen.getByTestId(targetTestId);
    document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;
    fireEvent.pointerDown(item, { pointerType, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { pointerType, clientX: 40, clientY: 40 });
    fireEvent.pointerUp(window, { pointerType, clientX: 40, clientY: 40 });
  }

  it("s'ouvre par défaut sur le calendrier", () => {
    mockedUseMealPlan.mockReturnValue({ plan: { weekId: "2026-11-21", defaultDiners: 4, slots: week }, loading: false });
    mockedUseShoppingList.mockReturnValue({ list: { weekId: "2026-11-21", items: {} }, loading: false });
    mockedUseExpenses.mockReturnValue({ expenses: [], loading: false });
    render(
      <MemoryRouter>
        <MealsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Calendrier" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("cell-sat-lunch")).toBeInTheDocument();
  });

  it("déplace un plat vers une autre case par glisser-déposer, en une seule écriture", async () => {
    setup({ slots: week });
    await openCalendar();
    drag("Couscous", "cell-sun-dinner");
    expect(moveMealItem).toHaveBeenCalledWith(
      "2026-11-21",
      { key: "sat_lunch", slot: { items: [{ label: "Salade" }] } },
      { key: "sun_dinner", slot: { items: [{ label: "Couscous" }] } },
    );
  });

  it("ne déplace rien si on lâche dans la case d'origine", async () => {
    setup({ slots: week });
    await openCalendar();
    drag("Couscous", "cell-sat-lunch");
    expect(moveMealItem).not.toHaveBeenCalled();
  });

  it("un simple clic sans glisser ne déplace rien", async () => {
    setup({ slots: week });
    await openCalendar();
    const item = screen.getByText("Couscous").closest("li")!;
    fireEvent.pointerDown(item, { pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(window, { pointerType: "mouse", clientX: 5, clientY: 5 });
    expect(moveMealItem).not.toHaveBeenCalled();
  });

  it("au doigt, un appui long saisit le plat", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      setup({ slots: week });
      await openCalendar();
      const item = screen.getByText("Couscous").closest("li")!;
      const target = screen.getByTestId("cell-mon-dinner");
      document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;
      fireEvent.pointerDown(item, { pointerType: "touch", clientX: 5, clientY: 5 });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      fireEvent.pointerMove(window, { pointerType: "touch", clientX: 6, clientY: 6 });
      fireEvent.pointerUp(window, { pointerType: "touch", clientX: 6, clientY: 6 });
      expect(moveMealItem).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("au doigt, glisser tout de suite fait défiler : rien n'est saisi", async () => {
    setup({ slots: week });
    await openCalendar();
    const item = screen.getByText("Couscous").closest("li")!;
    const target = screen.getByTestId("cell-mon-dinner");
    document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;
    fireEvent.pointerDown(item, { pointerType: "touch", clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { pointerType: "touch", clientX: 5, clientY: 60 });
    fireEvent.pointerUp(window, { pointerType: "touch", clientX: 5, clientY: 60 });
    expect(moveMealItem).not.toHaveBeenCalled();
  });

  it("pas de déplacement quand le programme est filtré (positions différentes)", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous", status: "prepared" }, { label: "Salade" }] } } });
    await openCalendar();
    await userEvent.click(screen.getByRole("button", { name: "Préparé (1)" }));
    expect(screen.queryByText(/Pour déplacer un plat/)).not.toBeInTheDocument();
  });

  it("affiche une erreur si l'écriture du déplacement échoue", async () => {
    vi.mocked(moveMealItem).mockRejectedValueOnce(new Error("réseau"));
    setup({ slots: week });
    await openCalendar();
    drag("Couscous", "cell-sun-dinner");
    expect(await screen.findByRole("alert")).toHaveTextContent("déplacement");
  });
});

describe("MealsPage — confirmation et réserve du statut", () => {
  const prepared = { sat_lunch: { items: [{ label: "Couscous", status: "prepared" as const, votes: { u2: "up" as const } }] } };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("annuler la confirmation ne change rien, votes compris", async () => {
    setup({ slots: prepared });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme non préparé" }));
    expect(screen.getByText(/est déjà préparé\. Le marquer non préparé \?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: /Confirmer le changement de statut/ })).not.toBeInTheDocument();
  });

  it("passer de préparé à non préparé confirme, puis demande le motif", async () => {
    setup({ slots: prepared });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme non préparé" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le changement de statut de Couscous" }));
    expect(saveMealSlot).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Motif, Couscous" })).toBeInTheDocument();
  });

  it("un plat encore planifié change tout de suite, sans confirmation", async () => {
    setup({ slots: { sat_lunch: { items: [{ label: "Couscous" }] } } });
    await userEvent.click(screen.getByRole("button", { name: "Marquer Couscous comme préparé" }));
    expect(saveMealSlot).toHaveBeenCalledTimes(1);
  });

  it("les comptes non autorisés ont les boutons de statut grisés, mais peuvent encore voter", async () => {
    vi.stubEnv("VITE_MEAL_STATUS_EDITORS", "gestionnaire@example.com");
    setup({ slots: prepared });
    expect(screen.getByRole("button", { name: "Marquer Couscous comme préparé" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Marquer Couscous comme non préparé" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retour positif sur Couscous" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Retour négatif sur Couscous" }));
    expect(saveMealSlot).toHaveBeenCalledTimes(1);
  });

  it("« Tout préparé » est aussi réservé", () => {
    vi.stubEnv("VITE_MEAL_STATUS_EDITORS", "gestionnaire@example.com");
    setup({ slots: { sat_lunch: { items: [{ label: "A" }] } } });
    expect(screen.getByRole("button", { name: /Tout marquer préparé/ })).toBeDisabled();
  });
});

describe("MealsPage — import sans perte et recopie de la semaine", () => {
  const rated = {
    sat_lunch: {
      items: [
        { label: "Couscous", status: "prepared" as const, votes: { u2: "up" as const } },
        { label: "Tarte", status: "skipped" as const },
      ],
    },
  };

  async function openImport(text: string) {
    await userEvent.click(screen.getByRole("button", { name: "Coller le programme" }));
    await userEvent.type(screen.getByLabelText("Programme à importer"), text);
    await userEvent.click(screen.getByRole("button", { name: "Importer" }));
  }

  it("un plat déjà en place garde son statut et ses votes quand on réimporte", async () => {
    setup({ slots: rated });
    await openImport("السبت : | Couscous + Tarte + Salade |");
    expect(saveMealSlots).toHaveBeenCalledWith("2026-11-21", {
      sat_lunch: [
        { label: "Couscous", status: "prepared", votes: { u2: "up" } },
        { label: "Tarte", status: "skipped" },
        { label: "Salade" },
      ],
    });
    expect(screen.getByRole("status")).toHaveTextContent("2 plat(s) déjà en place conservé(s)");
  });

  it("demande confirmation quand l'import fait disparaître des plats, en prévenant des statuts", async () => {
    setup({ slots: rated });
    await openImport("السبت : | Couscous |");
    expect(saveMealSlots).not.toHaveBeenCalled();
    const group = screen.getByRole("group", { name: "Confirmer l'import" });
    expect(group).toHaveTextContent("retire 1 plat déjà saisi dans 1 créneau");
    expect(group).toHaveTextContent("1 déjà marqué préparé ou non préparé");
    await userEvent.click(screen.getByRole("button", { name: "Importer quand même" }));
    expect(saveMealSlots).toHaveBeenCalledWith("2026-11-21", {
      sat_lunch: [{ label: "Couscous", status: "prepared", votes: { u2: "up" } }],
    });
  });

  it("annuler la confirmation n'écrit rien", async () => {
    setup({ slots: rated });
    await openImport("السبت : | Couscous |");
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(saveMealSlots).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Confirmer l'import" })).not.toBeInTheDocument();
  });

  it("accepte un jour écrit avec sa date", async () => {
    setup();
    await openImport("السبت 21 : | Couscous |");
    expect(saveMealSlots).toHaveBeenCalledWith("2026-11-21", { sat_lunch: [{ label: "Couscous" }] });
  });

  describe("recopie de la semaine précédente", () => {
    const previous = {
      weekId: "2026-11-14",
      defaultDiners: 4,
      slots: {
        sat_lunch: { diners: 6, items: [{ label: "Couscous", status: "prepared" as const, votes: { u1: "up" as const } }] },
        sun_dinner: { items: [{ label: "Tajine" }] },
      },
    };

    function setupCopy(currentSlots = {}) {
      setup({ slots: currentSlots });
      cleanup();
      mockedUseMealPlan.mockImplementation((id: string) =>
        id === weekIdOf(new Date())
          ? { plan: { weekId: "2026-11-21", defaultDiners: 4, slots: currentSlots }, loading: false }
          : { plan: previous, loading: false },
      );
      render(
        <MemoryRouter>
          <MealsPage initialPlanView="detail" />
        </MemoryRouter>,
      );
    }

    it("propose de recopier la semaine précédente quand il y a quelque chose à recopier", () => {
      setupCopy();
      expect(screen.getByRole("button", { name: /Recopier la semaine du/ })).toBeInTheDocument();
      expect(screen.getByText(/2 créneaux à recopier/)).toBeInTheDocument();
    });

    it("recopie plats et convives, sans statut ni votes", async () => {
      setupCopy();
      await userEvent.click(screen.getByRole("button", { name: /Recopier la semaine du/ }));
      expect(saveWholeSlots).toHaveBeenCalledWith("2026-11-21", {
        sat_lunch: { diners: 6, items: [{ label: "Couscous" }] },
        sun_dinner: { items: [{ label: "Tajine" }] },
      });
    });

    it("ne remplace jamais un créneau déjà rempli", async () => {
      setupCopy({ sat_lunch: { items: [{ label: "Pâtes" }] } });
      expect(screen.getByText(/1 créneau à recopier/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /Recopier la semaine du/ }));
      expect(saveWholeSlots).toHaveBeenCalledWith("2026-11-21", {
        sun_dinner: { items: [{ label: "Tajine" }] },
      });
    });

    it("ne propose rien quand la semaine précédente est vide", () => {
      setup();
      expect(screen.queryByRole("button", { name: /Recopier la semaine du/ })).not.toBeInTheDocument();
    });
  });
});
