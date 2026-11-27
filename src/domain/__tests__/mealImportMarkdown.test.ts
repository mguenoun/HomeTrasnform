import { describe, expect, it } from "vitest";
import { parseShoppingText, vendorFromHeader } from "../mealImport";

// Liste réelle envoyée par la personne de ménage (titres « ### », articles à puces).
const LIST = `تقضية الأسبوع - من يوم السبت

### اللحوم
- جوج كيلو لحم
- كيلو لحم قطبان
- كيلو كفتة

### دواجن
- دجاجة من وزن جوج كيلو

### الخضروات
- كيلو ونصف خيزو
- جوج كيلو بصل
- جوج كيلو بطاطة
- كيلو خيار
- نصف كيلو طماطم سوغيز
- كيلو دنجال
- نصف كيلو لفت
- نصف كيلو كرعة كرجيط
- نصف كيلو كرعة حمراء
- ليشو صغير
- 2 دراهم كرافص
- 5 دراهم ربيع مخلط
- 2 دراهم نعناع مخلط
- الخص
- كيلو حامض
- كيلو جلبانة
- كيلو قوق

### البقال
- 2 كيلو فورص
- قرعة خل كبيرة
- قرعة خل أبيض
- البيض
- ليتر زيت
- 40 درهم فرماج أحمر
- لتر حليب
- نصف كيلو شعرية

### العطار
- 10 دراهم سكين جبير
- 10 دراهم خرقوم
- 10 دراهم تحميرة
- 10 دراهم كمون
- 10 دراهم لابزار`;

describe("import d'une liste à titres et à puces", () => {
  const groups = parseShoppingText(LIST);

  it("fait un groupe par titre, avec le point de vente correspondant", () => {
    expect(groups.map((g) => g.vendor)).toEqual([
      "Boucher",
      "Volailler",
      "Fruits et légumes",
      "Épicier",
      "العطار",
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([3, 1, 17, 8, 5]);
  });

  it("ignore l'intitulé de la liste (ce n'est pas un article)", () => {
    const names = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(names.some((n) => n.includes("تقضية"))).toBe(false);
    expect(names).toHaveLength(34);
  });

  it("sépare quantité et article, puces retirées", () => {
    const [meat, , veg, grocery, spices] = groups;
    expect(meat.items[0]).toEqual({ name: "لحم", quantity: "جوج كيلو" });
    expect(veg.items[0]).toEqual({ name: "خيزو", quantity: "كيلو ونصف" });
    expect(veg.items[4]).toEqual({ name: "طماطم سوغيز", quantity: "نصف كيلو" });
    expect(veg.items[10]).toEqual({ name: "كرافص", quantity: "2 دراهم" });
    expect(veg.items[13]).toEqual({ name: "الخص" });
    expect(grocery.items[4]).toEqual({ name: "زيت", quantity: "ليتر" });
    expect(grocery.items[5]).toEqual({ name: "فرماج أحمر", quantity: "40 درهم" });
    expect(spices.items[0]).toEqual({ name: "سكين جبير", quantity: "10 دراهم" });
  });

  it("une liste ordinaire avec un tiret isolé n'ignore pas les autres lignes", () => {
    const parsed = parseShoppingText("كيلو لحم\n- كيلو بصل\nطماطم\nخيار");
    expect(parsed[0].items).toHaveLength(4);
  });

  it("garde le format « # Boucher » d'avant", () => {
    expect(parseShoppingText("# Boucher\nكيلو لحم")[0].vendor).toBe("Boucher");
  });
});

describe("vendorFromHeader", () => {
  it("reconnaît les titres arabes courants, avec ou sans article", () => {
    expect(vendorFromHeader("اللحوم")).toBe("Boucher");
    expect(vendorFromHeader("دواجن")).toBe("Volailler");
    expect(vendorFromHeader("الخضرة")).toBe("Fruits et légumes");
    expect(vendorFromHeader("بقال")).toBe("Épicier");
    expect(vendorFromHeader("الحوت")).toBe("Poissonnier");
  });

  it("garde tel quel un titre inconnu", () => {
    expect(vendorFromHeader("العطار")).toBe("العطار");
    expect(vendorFromHeader("Droguerie")).toBe("Droguerie");
  });
});

// Format réel tel qu'envoyé sur WhatsApp : titres de section sans « # », puces « • ».
const WHATSAPP_LIST = `تقضية الأسبوع - من يوم السبت

اللحوم
• جوج كيلو لحم
• كيلو لحم قطبان
• كيلو كفتة

دواجن
• دجاجة من وزن جوج كيلو

الخضروات
• كيلو ونصف خيزو
• جوج كيلو بصل

الربيع
• 2 دراهم كرافص
• 5 دراهم ربيع مخلط
• 2 دراهم نعناع مخلط
• الخص

البقال
• ليتر زيت
• نصف كيلو شعرية

العطار
• 10 دراهم كمون`;

describe("import d'une liste WhatsApp à titres simples et puces « • »", () => {
  const groups = parseShoppingText(WHATSAPP_LIST);

  it("prend les titres de section comme points de vente, et ignore l'intitulé", () => {
    expect(groups.map((g) => g.vendor)).toEqual([
      "Boucher",
      "Volailler",
      "Fruits et légumes",
      "Herbes",
      "Épicier",
      "العطار",
    ]);
    expect(groups.flatMap((g) => g.items.map((i) => i.name))).not.toContain(
      "تقضية الأسبوع - من يوم السبت",
    );
  });

  it("lit les articles derrière la puce", () => {
    expect(groups[0].items[0]).toEqual({ name: "لحم", quantity: "جوج كيلو" });
    expect(groups[3].items.map((i) => i.name)).toEqual(["كرافص", "ربيع مخلط", "نعناع مخلط", "الخص"]);
    expect(groups[4].items[0]).toEqual({ name: "زيت", quantity: "ليتر" });
  });

  it("accepte une puce collée au texte (« •كيلو »)", () => {
    const parsed = parseShoppingText("اللحوم\n•كيلو لحم\n•كيلو كفتة");
    expect(parsed[0].vendor).toBe("Boucher");
    expect(parsed[0].items).toHaveLength(2);
  });
});
