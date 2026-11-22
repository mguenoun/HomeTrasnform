import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CatalogIngredient,
  Dish,
  HouseholdExpense,
  MealPlan,
  ShoppingList,
} from "../../types";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMealPlan: vi.fn(),
  useShoppingList: vi.fn(),
  useExpenses: vi.fn(),
  useDishes: vi.fn(),
  useIngredients: vi.fn(),
}));

vi.mock("../../services/meals", () => ({
  HELPER_DAILY_RATE: 200,
  saveMealSlot: vi.fn().mockResolvedValue(undefined),
  saveMealSlots: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock("../../services/translate", () => ({
  suggestTranslations: vi.fn(),
}));

import {
  useDishes,
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
  saveDish,
  deleteDish,
} from "../../services/meals";
import { suggestTranslations } from "../../services/translate";
import { MealsPage } from "../MealsPage";

const mockedUseMealPlan = vi.mocked(useMealPlan);
const mockedUseShoppingList = vi.mocked(useShoppingList);
const mockedUseExpenses = vi.mocked(useExpenses);
const mockedUseDishes = vi.mocked(useDishes);
const mockedUseIngredients = vi.mocked(useIngredients);

function setup(
  plan: Partial<MealPlan> = {},
  list: Partial<ShoppingList> = {},
  expenses: HouseholdExpense[] = [],
  ingredients: CatalogIngredient[] = [],
  dishes: Dish[] = [],
) {
  mockedUseDishes.mockReturnValue(dishes);
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
      screen.queryByRole("link", { name: "Envoyer sur WhatsApp" }),
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
      { name: "مطيشة", translation: "", quantity: "3 كيلو", vendor: "Fruits et légumes" },
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

    expect(saveMealSlot).toHaveBeenCalledWith("2026-11-21", "sat_lunch", {
      items: [{ label: "كسكسو", translation: "Couscous" }],
    });
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
