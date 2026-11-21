import type { MealPlan, MealSlot, MealSlotKey, ShoppingItem } from "../types";

export const DAYS = [
  { key: "mon", fr: "Lundi", ar: "الاثنين" },
  { key: "tue", fr: "Mardi", ar: "الثلاثاء" },
  { key: "wed", fr: "Mercredi", ar: "الأربعاء" },
  { key: "thu", fr: "Jeudi", ar: "الخميس" },
  { key: "fri", fr: "Vendredi", ar: "الجمعة" },
  { key: "sat", fr: "Samedi", ar: "السبت" },
  { key: "sun", fr: "Dimanche", ar: "الأحد" },
] as const;

export const MEALS = [
  { key: "breakfast", fr: "Petit-déjeuner", ar: "الفطور" },
  { key: "lunch", fr: "Déjeuner", ar: "الغدا" },
  { key: "snack", fr: "Goûter", ar: "الكوتي" },
  { key: "dinner", fr: "Dîner", ar: "العشا" },
] as const;

export const DEFAULT_DINERS = 4;

export function slotKey(dayKey: string, mealKey: string): MealSlotKey {
  return `${dayKey}_${mealKey}`;
}

/** Lundi (UTC midi) de la semaine contenant `date` — UTC midi pour que les
 *  changements d'heure ne décalent jamais d'un jour. */
function mondayOf(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12),
  );
  const isoWeekday = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - isoWeekday);
  return d;
}

/** Identifiant de semaine ISO-8601 ("2026-W47"), semaine commençant le lundi. */
export function weekIdOf(date: Date): string {
  const monday = mondayOf(date);
  // L'année ISO est celle du jeudi de la semaine.
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1, 12);
  const dayOfYear = Math.round((thursday.getTime() - jan1) / 86_400_000);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Lundi de la semaine `weekId`, en `Date` locale à minuit. */
export function mondayOfWeekId(weekId: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) throw new Error(`Identifiant de semaine invalide : ${weekId}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  // Le 4 janvier est toujours dans la semaine ISO 1.
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  week1Monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return new Date(
    week1Monday.getUTCFullYear(),
    week1Monday.getUTCMonth(),
    week1Monday.getUTCDate(),
  );
}

export function shiftWeek(weekId: string, delta: number): string {
  const monday = mondayOfWeekId(weekId);
  monday.setDate(monday.getDate() + delta * 7);
  return weekIdOf(monday);
}

/** Les 7 dates (locales) de la semaine, du lundi au dimanche. */
export function datesOfWeek(weekId: string): Date[] {
  const monday = mondayOfWeekId(weekId);
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
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
  const dates = datesOfWeek(weekId);
  return `${SHORT_DATE.format(dates[0])} – ${LONG_DATE.format(dates[6])}`;
}

export function emptyPlan(weekId: string): MealPlan {
  return { weekId, defaultDiners: DEFAULT_DINERS, slots: {} };
}

export function dinersOf(plan: MealPlan, slot: MealSlot | undefined): number {
  return slot?.diners ?? plan.defaultDiners;
}

/** "Français — عربي", ou le français seul si pas de nom arabe. */
function bilingual(fr: string, ar?: string): string {
  return ar ? `${fr} — ${ar}` : fr;
}

/** Message WhatsApp du programme de la semaine (français + darija). */
export function buildPlanMessage(plan: MealPlan): string {
  const dates = datesOfWeek(plan.weekId);
  const lines: string[] = [
    "*Programme de la semaine — برنامج الأسبوع*",
    formatWeekRange(plan.weekId),
  ];
  DAYS.forEach((day, i) => {
    const dayLines: string[] = [];
    for (const meal of MEALS) {
      const slot = plan.slots[slotKey(day.key, meal.key)];
      if (!slot || slot.items.length === 0) continue;
      const items = slot.items
        .map((it) => bilingual(it.label, it.labelAr))
        .join(", ");
      dayLines.push(
        `${meal.fr} / ${meal.ar} (${dinersOf(plan, slot)}) : ${items}`,
      );
    }
    if (dayLines.length === 0) return;
    lines.push("", `*${day.fr} ${dates[i].getDate()} — ${day.ar}*`, ...dayLines);
  });
  return lines.join("\n");
}

/** Message WhatsApp de la liste de courses (articles non cochés d'abord). */
export function buildShoppingMessage(items: ShoppingItem[]): string {
  const sorted = [...items].sort(
    (a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt,
  );
  const lines = ["*Liste de courses — لائحة المشتريات*", ""];
  for (const item of sorted) {
    const qty = item.quantity ? ` (${item.quantity})` : "";
    lines.push(
      `${item.checked ? "✅" : "▫️"} ${bilingual(item.name, item.nameAr)}${qty}`,
    );
  }
  return lines.join("\n");
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
