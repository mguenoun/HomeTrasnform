import type { MealItem, MealSlotKey } from "../types";
import { MEALS, slotKey } from "./mealPlan";

// ---------------------------------------------------------------------------
// Import d'une liste de courses collée depuis WhatsApp (arabe/darija ou
// français). Format observé : un article par ligne, quantités libres en tête
// ("كيلو سنيدة", "5دراهم كمون", "ونصف كيلو توم"), et une ligne de montant seul
// ("361dh") qui clôt le groupe d'articles achetés ensemble.
// ---------------------------------------------------------------------------

export interface ParsedShoppingItem {
  name: string;
  quantity?: string;
}

export interface ParsedShoppingGroup {
  items: ParsedShoppingItem[];
  /** Montant payé pour ce groupe (MAD), si une ligne de montant le clôt. */
  amount?: number;
}

// Caractères de contrôle bidirectionnels ajoutés par WhatsApp autour de l'arabe.
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;

const AMOUNT_LINE =
  /^[\s—–\-•*]*(\d+(?:[.,]\d+)?)\s*(?:dhs?|mad|درهم|دراهم|د\.?\s?م)\s*$/i;

const NUM = String.raw`(?:\d+(?:[.,/]\d+)?|جوج|نصف|ربعة|ربع|ثلاثة|تلاتة)`;
// "حك" = boîte (de conserve), confirmé par l'utilisateur ("حك ماييص" = 1 boîte de maïs).
const UNIT = String.raw`(?:كيلو|كغ|غرام|لتر|دراهم|درهم|باكية|باكيات|دنون|طون|علبة|حك|kg|g|l|dhs?|paquets?|boîtes?|bottes?)`;
// nombre et/ou unité en tête, éventuellement suivi de "و نصف"/"ونصف" ("كيلو و نصف")
const QUANTITY = new RegExp(
  `^(?=[^\\s])(${NUM})?\\s*(${UNIT})?(?:\\s*و\\s*(${NUM}))?(?=\\s|$)`,
  "i",
);

// "و" = "et" collé au mot suivant ("وكيلو", "ونصف", "و5دراهم", "وليشو" = et un
// chou). Dans ce style de liste il ouvre la plupart des lignes ; on l'ôte donc
// toujours, sauf devant quelques vrais mots commençant par و.
const WORDS_STARTING_WITH_WAW = ["ورق", "ورد", "وزن", "وجبة", "وسط", "وقت"];

function stripLeadingAnd(text: string): string {
  if (!text.startsWith("و") || text.length < 3) return text;
  if (WORDS_STARTING_WITH_WAW.some((word) => text.startsWith(word))) return text;
  return text.slice(1).trimStart();
}

function tidyQuantity(raw: string): string {
  return raw
    .replace(/(\d)(?=[^\d\s/.,])/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseShoppingLine(line: string): ParsedShoppingItem | null {
  let text = line
    .replace(INVISIBLE, "")
    .replace(/^[\s—–\-•*]+/, "")
    .trim();
  if (!text) return null;
  text = stripLeadingAnd(text);

  const match = QUANTITY.exec(text);
  let quantity: string | undefined;
  let name = text;
  if (match && (match[1] || match[2]) && match[0].trim().length > 0) {
    const rest = text.slice(match[0].length).trim();
    if (rest) {
      quantity = tidyQuantity(match[0]);
      name = rest;
    }
  }
  name = name.replace(/^ديال\s+/, "").trim();
  return name ? { name, ...(quantity ? { quantity } : {}) } : null;
}

export function parseShoppingText(text: string): ParsedShoppingGroup[] {
  const groups: ParsedShoppingGroup[] = [];
  let current: ParsedShoppingItem[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(INVISIBLE, "").trim();
    if (!line) {
      // Une ligne vide sépare deux groupes (ex. herbes / poisson, achetés chez
      // deux commerçants) même sans montant ; un montant qui suit ensuite se
      // rattache au groupe précédent (branche "amount" ci-dessous).
      if (current.length > 0) {
        groups.push({ items: current });
        current = [];
      }
      continue;
    }

    const amount = AMOUNT_LINE.exec(line);
    if (amount) {
      const value = Number(amount[1].replace(",", "."));
      if (current.length > 0) {
        groups.push({ items: current, amount: value });
        current = [];
      } else if (groups.length > 0 && groups[groups.length - 1].amount === undefined) {
        groups[groups.length - 1].amount = value;
      }
      continue;
    }

    const item = parseShoppingLine(line);
    if (item) current.push(item);
  }
  if (current.length > 0) groups.push({ items: current });
  return groups;
}

// ---------------------------------------------------------------------------
// Import d'un programme de la semaine collé : une ligne par jour,
// "Samedi : snacks | déjeuner | dîner" (jour en arabe ou en français), les
// éléments d'un repas séparés par "+".
// ---------------------------------------------------------------------------

function normalizeDayName(name: string): string {
  return name
    .replace(INVISIBLE, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/^ال/, "")
    .trim();
}

const DAY_ALIASES: Record<string, string> = {
  samedi: "sat",
  سبت: "sat",
  dimanche: "sun",
  احد: "sun",
  lundi: "mon",
  اثنين: "mon",
  mardi: "tue",
  ثلاثاء: "tue",
  mercredi: "wed",
  اربعاء: "wed",
  jeudi: "thu",
  خميس: "thu",
  vendredi: "fri",
  جمعة: "fri",
};

export interface ParsedProgram {
  slots: Record<MealSlotKey, MealItem[]>;
  /** Lignes ignorées (jour non reconnu), pour les signaler à l'utilisateur. */
  ignored: string[];
}

export function parseProgramText(text: string): ParsedProgram {
  const slots: Record<MealSlotKey, MealItem[]> = {};
  const ignored: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(INVISIBLE, "").trim();
    if (!line) continue;

    const separator = line.search(/[:：]/);
    const dayKey =
      separator > 0 ? DAY_ALIASES[normalizeDayName(line.slice(0, separator))] : undefined;
    if (!dayKey) {
      ignored.push(line);
      continue;
    }

    const cells = line.slice(separator + 1).split("|");
    MEALS.forEach((meal, index) => {
      const labels = (cells[index] ?? "")
        .split("+")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      if (labels.length > 0) {
        slots[slotKey(dayKey, meal.key)] = labels.map((label) => ({ label }));
      }
    });
  }
  return { slots, ignored };
}
