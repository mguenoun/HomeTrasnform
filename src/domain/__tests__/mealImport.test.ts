import { describe, expect, it } from "vitest";
import {
  parseProgramText,
  parseShoppingLine,
  parseShoppingText,
} from "../mealImport";

// Liste réelle de la famille (semaine du 2026-11-21), telle que reçue sur
// WhatsApp : arabe/darija, quantités libres, sous-totaux par point d'achat.
const REAL_LIST = `
—البيض
84dh
—كيلو سنيدة
—باكية خمرات حمرين
—باكية فاني
—وباكية ككاو غ٠ط٠
—وباكية ديال شنتييية
—10دراهم شكلاط اسود
‎—كيلو طحين فوص احرش
—وكيلو طحين فينو
—ونصف كيلو طحين بنخالة
—70درهم فرماج احمر
‎  —باكية ديال نصف سباكيتي
—حك مطيشة كبير جاجة من وزن 2كيلو
—كيلو سميدة رقيقة ديال الحرشة
—وكيلو كسكس
—وربعة زبدة بدوية
—5دراهم كمون
—و5دراهم خرقوم
—جوج كيلو طحين الفورص ديال الحلويات
—باكية خميرة الخبز رافعة
—جوج طون زيت
—وحك ماييص
361dh
و2دنون جيرفي مسوس
2لتر ونصف حليب
26dh

‎—4كيلو بطاطة
—كيلو دنجال
—وكيلو لوبية خضراء
—وكيلو خزو
—وكيلو فلفلة خضراء حمراء سفراء
—جوج كيلو مطيشة
—وكيلو كرعة كرجيك
—وكيلو لفت
—وليشو
 —جوج كيلو بصل
187dh
—و5دراهم زيتون احمر
—وجوج حمضات مصيريين
—10دراهم سمن
—نصف كيلو توم
—3دراهم زيتون مقطع
—و3دراهم هريسة
72dh

—ونصف كيلو تقاطع ديال لحم
—كيلو و نصف بروشيط دجاج
—3/4 كيلو كفتة
300dh
—و5دراهم ربيع مخلط
—و5دراهم نعناع
—و3دراهم كرافص
—5دراهم بقولة

 —وكيلو سردين
—كيلو صطيك ديال الحوت سومو
250dh

—مقلات طيفال للبغرير
50dh
—دجاجة بلدية
`;

describe("parseShoppingLine", () => {
  it("sépare quantité et nom (kilo en tête)", () => {
    expect(parseShoppingLine("—كيلو طحين فوص احرش")).toEqual({
      name: "طحين فوص احرش",
      quantity: "كيلو",
    });
  });

  it("ôte le « و » (et) collé devant une quantité", () => {
    expect(parseShoppingLine("—وكيلو طحين فينو")).toEqual({
      name: "طحين فينو",
      quantity: "كيلو",
    });
    expect(parseShoppingLine("—ونصف كيلو طحين بنخالة")).toEqual({
      name: "طحين بنخالة",
      quantity: "نصف كيلو",
    });
  });

  it("gère les achats « à la valeur » collés au chiffre (5 dirhams de cumin)", () => {
    expect(parseShoppingLine("—5دراهم كمون")).toEqual({
      name: "كمون",
      quantity: "5 دراهم",
    });
    expect(parseShoppingLine("—و5دراهم خرقوم")).toEqual({
      name: "خرقوم",
      quantity: "5 دراهم",
    });
    expect(parseShoppingLine("—70درهم فرماج احمر")).toEqual({
      name: "فرماج احمر",
      quantity: "70 درهم",
    });
  });

  it("gère « kilo et demi », les fractions et « 2 litres et demi »", () => {
    expect(parseShoppingLine("—كيلو و نصف بروشيط دجاج")).toEqual({
      name: "بروشيط دجاج",
      quantity: "كيلو و نصف",
    });
    expect(parseShoppingLine("—3/4 كيلو كفتة")).toEqual({
      name: "كفتة",
      quantity: "3/4 كيلو",
    });
    expect(parseShoppingLine("2لتر ونصف حليب")).toEqual({
      name: "حليب",
      quantity: "2 لتر ونصف",
    });
  });

  it("gère paquets, cannettes et « jouj » (2)", () => {
    expect(parseShoppingLine("—باكية خمرات حمرين")).toEqual({
      name: "خمرات حمرين",
      quantity: "باكية",
    });
    expect(parseShoppingLine("و2دنون جيرفي مسوس")).toEqual({
      name: "جيرفي مسوس",
      quantity: "2 دنون",
    });
    expect(parseShoppingLine("—وجوج حمضات مصيريين")).toEqual({
      name: "حمضات مصيريين",
      quantity: "جوج",
    });
  });

  it("retire le « ديال » (de) en tête du nom", () => {
    expect(parseShoppingLine("—باكية ديال نصف سباكيتي")?.name).toBe("نصف سباكيتي");
  });

  it("garde la ligne entière comme nom quand aucune quantité n'est reconnue", () => {
    expect(parseShoppingLine("—دجاجة بلدية")).toEqual({ name: "دجاجة بلدية" });
    expect(parseShoppingLine("—مقلات طيفال للبغرير")).toEqual({
      name: "مقلات طيفال للبغرير",
    });
  });

  it("comprend aussi une liste en français", () => {
    expect(parseShoppingLine("- 2 kg tomates")).toEqual({
      name: "tomates",
      quantity: "2 kg",
    });
    expect(parseShoppingLine("Lait")).toEqual({ name: "Lait" });
  });

  it("ignore les lignes vides", () => {
    expect(parseShoppingLine("  —  ")).toBeNull();
  });
});

describe("parseShoppingText sur la liste réelle", () => {
  const groups = parseShoppingText(REAL_LIST);

  it("reconnaît les montants de groupe, y compris le second épicier (26 MAD)", () => {
    // Les herbes (sans montant) forment un groupe à part : une ligne vide les
    // sépare du poisson (250 MAD) dans la liste d'origine.
    expect(groups.map((g) => g.amount)).toEqual([
      84, 361, 26, 187, 72, 300, undefined, 250, 50, undefined,
    ]);
  });

  it("isole les herbes du poisson", () => {
    expect(groups[6].items.map((i) => i.name)).toEqual(["ربيع مخلط", "نعناع", "كرافص", "بقولة"]);
    expect(groups[7].items.map((i) => i.name)).toEqual(["سردين", "صطيك ديال الحوت سومو"]);
  });

  it("rattache chaque article au groupe qui le précède le montant", () => {
    expect(groups[0].items.map((i) => i.name)).toEqual(["البيض"]);
    expect(groups[2].items).toEqual([
      { name: "جيرفي مسوس", quantity: "2 دنون" },
      { name: "حليب", quantity: "2 لتر ونصف" },
    ]);
    expect(groups[5].items.map((i) => i.name)).toEqual([
      "تقاطع ديال لحم",
      "بروشيط دجاج",
      "كفتة",
    ]);
  });

  it("garde le dernier article sans montant (poulet fermier)", () => {
    expect(groups[9]).toEqual({ items: [{ name: "دجاجة بلدية" }] });
  });

  it("n'oublie aucune ligne : 51 articles au total", () => {
    // 1 (œufs) + 21 + 2 + 10 + 6 + 3 + 6 (herbes + poisson) + 1 + 1, recompté à la main.
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(51);
  });
});

describe("parseShoppingText, cas simples", () => {
  it("un montant après une ligne vide se rattache au groupe précédent", () => {
    expect(parseShoppingText("Lait\n\n26dh")).toEqual([
      { items: [{ name: "Lait" }], amount: 26 },
    ]);
  });

  it("un montant en tête, sans groupe précédent, est ignoré", () => {
    expect(parseShoppingText("50dh\nLait")).toEqual([{ items: [{ name: "Lait" }] }]);
  });

  it("accepte le montant à la française (virgule, MAD)", () => {
    expect(parseShoppingText("Lait\n12,5 MAD")).toEqual([
      { items: [{ name: "Lait" }], amount: 12.5 },
    ]);
  });

  it("renvoie une liste vide pour un texte vide", () => {
    expect(parseShoppingText("  \n ")).toEqual([]);
  });
});

describe("parseProgramText", () => {
  const PROGRAM = `
السبت : شينز كيك | كسكسو + سلاض فروي | شعرية الحليب
الأحد : رغيفات خليع + تارت بالتفاح | الملوخية + سلاطة | باط بولونيز
الاثنين : رغيفات خليع | طاجين دجاج بطاطا زيتون حمر | كيش + سوبا
الثلاثاء : كيكا بالحامض + كيكا مالحة | العدس + سردين مشوي بالشرمولة | شعرية بالتقاطع + سلاطة فلفلة خضراء مشوية بالحامض والكمون
الأربعاء : | ستيك حوت (سومون) + خضرة مخلطة | بيتزا + سوبا
الخميس : بغرير + حرشة | بروشيط دجاج + تكتوكة + بقولة | سوبا + بروشيط دجاج
الجمعة : | كسكس | كراطان بطاطا دنجال
`;
  const { slots, ignored } = parseProgramText(PROGRAM);

  it("range chaque cellule dans le bon créneau (samedi → vendredi)", () => {
    expect(slots.sat_snack).toEqual([{ label: "شينز كيك" }]);
    expect(slots.sat_lunch).toEqual([
      { label: "كسكسو" },
      { label: "سلاض فروي" },
    ]);
    expect(slots.fri_dinner).toEqual([{ label: "كراطان بطاطا دنجال" }]);
  });

  it("garde « رغيفات خليع » comme UN seul plat, pas deux", () => {
    expect(slots.sun_snack).toEqual([
      { label: "رغيفات خليع" },
      { label: "تارت بالتفاح" },
    ]);
    expect(slots.mon_snack).toEqual([{ label: "رغيفات خليع" }]);
  });

  it("découpe le déjeuner de jeudi en brochettes + 2 salades", () => {
    expect(slots.thu_lunch?.map((i) => i.label)).toEqual([
      "بروشيط دجاج",
      "تكتوكة",
      "بقولة",
    ]);
  });

  it("laisse vides les cellules vides (cake et baghrir sur 2 jours)", () => {
    expect(slots.wed_snack).toBeUndefined();
    expect(slots.fri_snack).toBeUndefined();
  });

  it("n'ignore aucune ligne et remplit 19 créneaux", () => {
    expect(ignored).toEqual([]);
    expect(Object.keys(slots)).toHaveLength(19);
  });

  it("reconnaît aussi les jours en français", () => {
    const parsed = parseProgramText("Samedi : Cheesecake | Couscous | Soupe");
    expect(parsed.slots.sat_dinner).toEqual([{ label: "Soupe" }]);
  });

  it("signale les lignes dont le jour n'est pas reconnu", () => {
    const parsed = parseProgramText("Blabla : a | b | c");
    expect(parsed.ignored).toEqual(["Blabla : a | b | c"]);
    expect(parsed.slots).toEqual({});
  });
});
