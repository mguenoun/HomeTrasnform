export type TaskType = "menage" | "travaux" | "achat" | "soustraitance";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type ThemePreference = "light" | "dark";

export interface FamilyUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  colorTag?: string;
  pushSubscriptions?: PushSubscriptionRecord[];
  // Absent = pas encore choisi explicitement -> sombre par défaut (voir
  // ThemeContext). Synchronisé entre appareils via le profil Firestore,
  // pas seulement en local.
  themePreference?: ThemePreference;
}

/**
 * Entrée de la liste blanche `familymembers` (autorise l'accès à l'app).
 * Existe indépendamment de `FamilyUser` : une personne peut y figurer sans
 * jamais s'être encore connectée (donc sans profil `users`).
 */
export interface FamilyMemberRecord {
  email: string;
  uid?: string;
}

export type ObjectiveStatus = "active" | "archived";

/**
 * "shared" (par défaut) : visible par toute la famille, comme avant cette
 * fonctionnalité. "private" : visible uniquement par `createdBy`, ainsi que
 * ses tâches, rubriques budgétaires, commentaires et pièces jointes — la
 * règle Firestore applique cette restriction, ce n'est pas qu'un filtre
 * d'affichage. Absent sur les objectifs créés avant cette fonctionnalité,
 * traité comme "shared" partout (client et règles).
 */
export type ObjectiveVisibility = "shared" | "private";

export interface Objective {
  id: string;
  title: string;
  description?: string;
  targetDate?: string | null;
  status: ObjectiveStatus;
  visibility?: ObjectiveVisibility;
  createdBy: string;
  createdAt: number;
}

export interface Task {
  id: string;
  objectiveId: string | null;
  // Recopié depuis l'objectif référencé (ou "shared" si pas d'objectif) —
  // voir ObjectiveVisibility et la note dans firebase-rules/firestore.rules
  // sur pourquoi ce n'est pas qu'un confort : c'est ce qui permet à Firestore
  // de sécuriser une requête de liste. Absent sur les tâches créées avant
  // cette dénormalisation, traité comme "shared" par les règles.
  visibility?: ObjectiveVisibility;
  title: string;
  description?: string;
  type: TaskType;
  room?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeIds: string[];
  dueDate?: string | null;
  dueReminderSentAt?: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  closedBy?: string;
}

export type BudgetCategory =
  | "materiaux"
  | "main_oeuvre"
  | "equipement"
  | "mobilier"
  | "transport"
  | "honoraires"
  | "etudes"
  | "imprevus"
  | "autre";

export type BudgetPaymentStatus = "prevu" | "paye";

export interface BudgetPayment {
  id: string;
  date: string;
  amount: number;
  comment?: string;
  progress?: number;
  status: BudgetPaymentStatus;
  createdBy: string;
}

export interface BudgetForecastRevision {
  date: number;
  previousEstimate: number;
  newEstimate: number;
  comment?: string;
  userId: string;
}

/**
 * Rubrique budgétaire : budget prévu, éventuellement engagé (devis signé,
 * commande passée), et suivi des paiements dans le temps. Le montant réalisé
 * n'est jamais stocké : il se déduit toujours de la somme des paiements
 * `payé` (voir src/domain/budgetItems.ts).
 */
export interface BudgetItem {
  id: string;
  title: string;
  category: BudgetCategory;
  objectiveId: string | null;
  // Même logique de dénormalisation que Task.visibility — voir ce commentaire.
  visibility?: ObjectiveVisibility;
  taskId: string | null;
  vendor?: string;
  budgeted: number;
  revisedBudget?: number | null;
  committed?: number | null;
  remainingEstimate?: number | null;
  forecastHistory: BudgetForecastRevision[];
  notes?: string;
  payments: BudgetPayment[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  size: number;
  chunkCount: number;
  uploadedBy: string;
  uploadedAt: number;
}

export interface ObjectiveAttachment {
  id: string;
  objectiveId: string;
  fileName: string;
  contentType: string;
  size: number;
  chunkCount: number;
  uploadedBy: string;
  uploadedAt: number;
}

export interface BudgetItemAttachment {
  id: string;
  budgetItemId: string;
  fileName: string;
  contentType: string;
  size: number;
  chunkCount: number;
  uploadedBy: string;
  uploadedAt: number;
}

// ---------------------------------------------------------------------------
// Module Repas & Courses (voir documents/05-module-repas-courses.md)
// ---------------------------------------------------------------------------

/** Clé d'un créneau dans `MealPlan.slots`, ex. "mon_lunch" (jour_repas). */
export type MealSlotKey = string;

/** Suivi de réalisation : absent = planifié, pas encore marqué. */
export type MealStatus = "prepared" | "skipped";

export interface MealItem {
  /** Texte libre, dans la langue de saisie (arabe ou français). */
  label: string;
  /** Préparé ou non préparé ; absent = planifié. */
  status?: MealStatus;
  /** Pourquoi ce plat n'a pas été préparé (« Pas le temps »…), seulement si non préparé. */
  skipReason?: string;
  /** Traduction dans l'autre langue, facultative. */
  translation?: string;
}

export interface MealSlot {
  /** Nombre de convives de ce repas ; absent = `MealPlan.defaultDiners`. */
  diners?: number;
  items: MealItem[];
}

export interface MealPlan {
  /** Date du premier jour de la semaine, ex. "2026-11-21" (id du document). */
  weekId: string;
  defaultDiners: number;
  slots: Record<MealSlotKey, MealSlot>;
}

export interface ShoppingItem {
  id: string;
  /** Dans la langue de saisie (arabe ou français). */
  name: string;
  translation?: string;
  /** Texte libre : "2 kg", "5 DH", "1 paquet", "1/4 kg"… */
  quantity?: string;
  /** Point de vente prévu (boucher, épicier…) ; absent = non classé. */
  vendor?: string;
  /** Prix payé pour cet article (MAD), facultatif : détail, pas la source de vérité. */
  price?: number;
  /**
   * Passage chez ce point de vente (absent = 1). Les articles non pris quand on
   * paie passent au passage suivant, pour garder les paiements séparés.
   */
  round?: number;
  checked: boolean;
  createdAt: number;
}

export interface ShoppingList {
  weekId: string;
  /** Map par id : permet de cocher un article sans réécrire toute la liste. */
  items: Record<string, ShoppingItem>;
}

export type ExpenseType = "groceries" | "helper";

/**
 * Un paiement réel. Distinct du point de vente *prévu* sur un article : un même
 * point de vente peut donner lieu à plusieurs paiements (ex. lait et yaourt
 * achetés plus tard chez un autre épicier), à des dates différentes.
 */
export interface HouseholdExpense {
  id: string;
  type: ExpenseType;
  /** MAD. */
  amount: number;
  /** "YYYY-MM-DD". */
  date: string;
  /** Semaine du programme à laquelle le paiement est rattaché. */
  weekId: string;
  /** Point de vente (courses uniquement). */
  vendor?: string;
  /** Passage chez ce point de vente (absent = 1). */
  round?: number;
  note?: string;
  createdBy: string;
  createdAt: number;
}

/**
 * Référentiel appris au fil des saisies (programme et courses) : sert à
 * l'autocomplétion et, plus tard, de support aux ingrédients par plat.
 */
export interface Dish {
  /** Clé normalisée (voir `catalogKey`). */
  id: string;
  name: string;
  /** Traduction dans l'autre langue (arabe/français), facultative. */
  translation?: string;
  /** A déjà été planifié comme snack / comme repas : filtre les suggestions. */
  asSnack?: boolean;
  asMeal?: boolean;
  /**
   * Ce que mesure la taille d'une variante : des personnes (plat, salade…) ou
   * des unités produites (snack : « 10 petites pizzas »). Absent = plat
   * appris par l'usage, pas encore détaillé.
   */
  basis?: "persons" | "units";
  /** Nom de l'unité d'un snack (« petite pizza »). */
  unitLabel?: string;
  /** Ingrédients par taille : les quantités ne sont pas proportionnelles. */
  variants?: DishVariant[];
}

export interface DishIngredient {
  name: string;
  /** Texte libre, comme dans la liste de courses : « 2 kg », « 5 DH », « 1 boîte ». */
  quantity?: string;
}

export interface DishVariant {
  /** Nombre de personnes (basis = persons) ou d'unités (basis = units). */
  n: number;
  ingredients: DishIngredient[];
}

export interface CatalogIngredient {
  id: string;
  name: string;
  /** Traduction du nom, partagée par tous les articles de ce nom. */
  translation?: string;
  /** Dernier point de vente utilisé pour cet article. */
  vendor?: string;
  /** Dernière quantité saisie. */
  quantity?: string;
}
