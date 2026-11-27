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
  /** Point de vente, si une ligne « # Boucher » le précède. */
  vendor?: string;
}

// Caractères de contrôle bidirectionnels ajoutés par WhatsApp autour de l'arabe.
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;

const AMOUNT_LINE =
  /^[\s—–\-•*]*(\d+(?:[.,]\d+)?)\s*(?:dhs?|mad|درهم|دراهم|د\.?\s?م)\s*$/i;

const NUM = String.raw`(?:\d+(?:[.,/]\d+)?|جوج|نصف|ربعة|ربع|ثلاثة|تلاتة)`;
// "حك" = boîte (de conserve), confirmé par l'utilisateur ("حك ماييص" = 1 boîte de maïs).
// "طون" n'est PAS une unité : c'est le thon ("جوج طون زيت" = 2 boîtes de thon à l'huile).
const UNIT = String.raw`(?:كيلو|كغ|غرام|ليتر|لتر|دراهم|درهم|باكية|باكيات|دنون|علبة|حك|kg|g|l|dhs?|paquets?|boîtes?|bottes?)`;
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

// "# Boucher" ou "### اللحوم" : nomme le point de vente des groupes qui suivent
// (jusqu'au prochain titre). Permet de préparer un import sans avoir à classer à la main.
const VENDOR_HEADER = /^[#＃]+\s*(.+)$/;

// Titres en arabe (liste envoyée par la personne de ménage) → points de vente de l'app,
// pour que les paiements et passages se rattachent aux mêmes commerçants. Un titre
// inconnu est gardé tel quel (il reste modifiable avant l'import).
const VENDOR_ALIASES: Array<[RegExp, string]> = [
  [/^(ال)?(لحوم|لحم|جزار|كزار)$/, "Boucher"],
  [/^(ال)?(دواجن|دجاج|فراخ|فروج)$/, "Volailler"],
  [/^(ال)?(خضروات|خضرة|خضر|خضرا|فواكه)$/, "Fruits et légumes"],
  [/^(ال)?(بقال|حانوت|مول الحانوت)$/, "Épicier"],
  [/^(ال)?(حوت|سمك|حواتي)$/, "Poissonnier"],
  [/^(ال)?(بيض)$/, "Œufs"],
  [/^(ال)?(ربيع|قزبر|نعناع)$/, "Herbes"],
];

export function vendorFromHeader(header: string): string {
  const name = header.replace(INVISIBLE, "").replace(/[:：]\s*$/, "").trim();
  const key = name.replace(/\s+/g, " ");
  return VENDOR_ALIASES.find(([pattern]) => pattern.test(key))?.[1] ?? name;
}

// Ligne d'article en liste à puces ("- كيلو لحم").
// Seul un tiret court suivi d'une espace compte : le tiret long collé ("—كيلو") des
// listes WhatsApp ordinaires n'est pas une puce.
const BULLET = /^[-•*]\s+/;

export function parseShoppingText(text: string): ParsedShoppingGroup[] {
  const groups: ParsedShoppingGroup[] = [];
  let current: ParsedShoppingItem[] = [];
  let vendor: string | undefined;
  // Liste à puces : une ligne sans puce (hors titre et montant) est un intitulé
  // (« تقضية الأسبوع - من يوم السبت »), pas un article.
  // On ne passe dans ce mode que si la plupart des articles ont une puce : un tiret
  // isolé dans une liste ordinaire ne doit pas faire ignorer les autres lignes.
  const candidates = text
    .split(/\r?\n/)
    .map((l) => l.replace(INVISIBLE, "").trim())
    .filter((l) => l && !VENDOR_HEADER.test(l) && !AMOUNT_LINE.test(l));
  const bulletCount = candidates.filter((l) => BULLET.test(l)).length;
  const bulleted = bulletCount >= 2 && bulletCount * 2 >= candidates.length;

  const flush = (amount?: number) => {
    if (current.length === 0) return;
    groups.push({
      items: current,
      ...(amount !== undefined ? { amount } : {}),
      ...(vendor ? { vendor } : {}),
    });
    current = [];
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(INVISIBLE, "").trim();
    if (!line) {
      // Une ligne vide sépare deux groupes (ex. herbes / poisson, achetés chez
      // deux commerçants) même sans montant ; un montant qui suit ensuite se
      // rattache au groupe précédent (branche "amount" ci-dessous).
      flush();
      continue;
    }

    const header = VENDOR_HEADER.exec(line);
    if (header) {
      flush();
      vendor = vendorFromHeader(header[1]);
      continue;
    }

    const amount = AMOUNT_LINE.exec(line);
    if (amount) {
      const value = Number(amount[1].replace(",", "."));
      if (current.length > 0) {
        flush(value);
      } else if (groups.length > 0 && groups[groups.length - 1].amount === undefined) {
        groups[groups.length - 1].amount = value;
      }
      continue;
    }

    if (bulleted && !BULLET.test(line)) continue;

    const item = parseShoppingLine(line);
    if (item) current.push(item);
  }
  flush();
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
    // « السبت 21 », « Samedi 21/11 » : la date et la ponctuation ne font pas partie du nom.
    .replace(/[\d/.\-–,]+/g, " ")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/^ال/, "") ?? "";
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
