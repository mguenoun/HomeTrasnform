import type {
  MealItem,
  MealPlan,
  MealSlot,
  MealSlotKey,
  ShoppingItem,
} from "../types";

/** Index `Date.getDay()` : 0 = dimanche. */
const DAY_BY_JS_INDEX = [
  { key: "sun", fr: "Dimanche", ar: "الأحد" },
  { key: "mon", fr: "Lundi", ar: "الاثنين" },
  { key: "tue", fr: "Mardi", ar: "الثلاثاء" },
  { key: "wed", fr: "Mercredi", ar: "الأربعاء" },
  { key: "thu", fr: "Jeudi", ar: "الخميس" },
  { key: "fri", fr: "Vendredi", ar: "الجمعة" },
  { key: "sat", fr: "Samedi", ar: "السبت" },
] as const;

/**
 * Trois colonnes, comme le cahier de la famille : les snacks (préparés pour
 * quelques jours) servent indifféremment au petit-déjeuner et au goûter.
 */
export const MEALS = [
  { key: "snack", fr: "Petit-déj & goûter", ar: "فطور / كوتي" },
  { key: "lunch", fr: "Déjeuner", ar: "الغداء" },
  { key: "dinner", fr: "Dîner", ar: "العشاء" },
] as const;

export const DEFAULT_DINERS = 4;

/** La semaine de la famille commence le samedi (0 = dimanche … 6 = samedi). */
export const WEEK_STARTS_ON = 6;

/** Points de vente proposés par défaut ; la saisie reste libre. */
export const DEFAULT_VENDORS = [
  "Épicier",
  "Boucher",
  "Volailler",
  "Fruits et légumes",
  "Herbes",
  "Poissonnier",
  "Œufs",
] as const;

export function slotKey(dayKey: string, mealKey: string): MealSlotKey {
  return `${dayKey}_${mealKey}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toId(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Identifiant d'une semaine = date de son premier jour ("2026-11-21"), pas un
 * numéro de semaine ISO : la semaine démarre un samedi et chevaucherait deux
 * semaines ISO. Arithmétique en dates locales (setDate) : sans décalage lors
 * des changements d'heure.
 */
export function weekIdOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() - WEEK_STARTS_ON + 7) % 7));
  return toId(d);
}

/** Premier jour de la semaine, en `Date` locale à minuit. */
export function startOfWeekId(weekId: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekId);
  if (!match) throw new Error(`Identifiant de semaine invalide : ${weekId}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function shiftWeek(weekId: string, delta: number): string {
  const start = startOfWeekId(weekId);
  start.setDate(start.getDate() + delta * 7);
  return toId(start);
}

export interface WeekDay {
  key: string;
  fr: string;
  ar: string;
  date: Date;
}

/** Les 7 jours de la semaine, dans l'ordre (samedi → vendredi). */
export function daysOfWeek(weekId: string): WeekDay[] {
  const start = startOfWeekId(weekId);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { ...DAY_BY_JS_INDEX[date.getDay()], date };
  });
}

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function formatWeekRange(weekId: string): string {
  const days = daysOfWeek(weekId);
  return `${SHORT_DATE.format(days[0].date)} – ${LONG_DATE.format(days[6].date)}`;
}

export function emptyPlan(weekId: string): MealPlan {
  return { weekId, defaultDiners: DEFAULT_DINERS, slots: {} };
}

export function dinersOf(plan: MealPlan, slot: MealSlot | undefined): number {
  return slot?.diners ?? plan.defaultDiners;
}

export interface EffectiveSnacks {
  items: MealItem[];
  /** Jour dont les snacks sont reportés ; absent si le jour a les siens. */
  inheritedFrom?: WeekDay;
}

/**
 * Snacks d'un jour : les siens s'il en a, sinon ceux du premier jour non vide
 * qui précède dans la semaine (le cake du mardi sert encore le mercredi). Calculé
 * à la lecture, jamais copié : un snack préparé une fois reste saisi une fois
 * (ses ingrédients ne seront comptés qu'une fois), et saisir quelque chose le
 * jour même remplace le report.
 */
export function snacksForDay(plan: MealPlan, dayKey: string): EffectiveSnacks {
  const days = daysOfWeek(plan.weekId);
  const index = days.findIndex((d) => d.key === dayKey);
  for (let i = index; i >= 0; i--) {
    const slot = plan.slots[slotKey(days[i].key, "snack")];
    if (slot && slot.items.length > 0) {
      return i === index
        ? { items: slot.items }
        : { items: slot.items, inheritedFrom: days[i] };
    }
  }
  return { items: [] };
}

/**
 * Découpe une saisie "A + B" en plusieurs éléments (la plupart des repas du
 * cahier sont composés : "couscous + salade").
 */
export function splitMealText(text: string): string[] {
  return text
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** "Nom — traduction", ou le nom seul sans traduction. */
function withTranslation(name: string, translation?: string): string {
  return translation ? `${name} — ${translation}` : name;
}

/** Message WhatsApp du programme de la semaine. */
export function buildPlanMessage(plan: MealPlan): string {
  const lines: string[] = [
    "*Programme de la semaine — برنامج الأسبوع*",
    formatWeekRange(plan.weekId),
  ];
  for (const day of daysOfWeek(plan.weekId)) {
    const dayLines: string[] = [];
    for (const meal of MEALS) {
      if (meal.key === "snack") {
        const snacks = snacksForDay(plan, day.key);
        if (snacks.items.length === 0) continue;
        const items = snacks.items
          .map((it) => withTranslation(it.label, it.translation))
          .join(", ");
        dayLines.push(
          `${meal.fr} / ${meal.ar} : ${items}${snacks.inheritedFrom ? " (suite)" : ""}`,
        );
        continue;
      }
      const slot = plan.slots[slotKey(day.key, meal.key)];
      if (!slot || slot.items.length === 0) continue;
      const items = slot.items
        .map((it) => withTranslation(it.label, it.translation))
        .join(", ");
      dayLines.push(
        `${meal.fr} / ${meal.ar} (${dinersOf(plan, slot)}) : ${items}`,
      );
    }
    if (dayLines.length === 0) continue;
    lines.push(
      "",
      `*${day.fr} ${day.date.getDate()} — ${day.ar}*`,
      ...dayLines,
    );
  }
  return lines.join("\n");
}

export interface VendorGroup {
  vendor: string;
  /** Passage chez ce point de vente (1 = premier). */
  round: number;
  items: ShoppingItem[];
}

export function roundOf(entry: { round?: number }): number {
  return entry.round && entry.round > 1 ? entry.round : 1;
}

/** "Épicier", ou "Épicier — 2e passage" à partir du deuxième. */
export function describeGroup(vendor: string, round: number): string {
  const name = vendor || "Sans point de vente";
  return round > 1 ? `${name} — ${round}e passage` : name;
}

/**
 * Articles regroupés par (point de vente, passage) : un même point de vente peut
 * être visité plusieurs fois, chaque passage ayant son propre paiement. Sans
 * point de vente en dernier.
 */
export function groupByVendor(items: ShoppingItem[]): VendorGroup[] {
  const groups = new Map<string, VendorGroup>();
  for (const item of items) {
    const vendor = item.vendor ?? "";
    const round = roundOf(item);
    const key = `${vendor}\u0000${round}`;
    const group = groups.get(key) ?? { vendor, round, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => {
      if (a.vendor !== b.vendor) {
        return a.vendor === "" ? 1 : b.vendor === "" ? -1 : a.vendor.localeCompare(b.vendor, "fr");
      }
      return a.round - b.round;
    })
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (x, y) => Number(x.checked) - Number(y.checked) || x.createdAt - y.createdAt,
      ),
    }));
}

/** Message WhatsApp de la liste de courses, par point de vente. */
export function buildShoppingMessage(items: ShoppingItem[]): string {
  const lines = ["*Liste de courses — لائحة المشتريات*"];
  for (const group of groupByVendor(items)) {
    lines.push(
      "",
      `*${group.vendor ? describeGroup(group.vendor, group.round) : "Autres — أخرى"}*`,
    );
    for (const item of group.items) {
      const qty = item.quantity ? ` (${item.quantity})` : "";
      lines.push(
        `${item.checked ? "✅" : "▫️"} ${withTranslation(item.name, item.translation)}${qty}`,
      );
    }
  }
  return lines.join("\n");
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
