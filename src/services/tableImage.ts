import type { ShareTable } from "../domain/shareTable";

const SCALE = 2;
const PAD = 14;
const LINE = 20;
const FONT = "15px system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_BOLD = "bold 15px system-ui, -apple-system, 'Segoe UI', sans-serif";
const TITLE_FONT = "bold 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
const WIDTH = 760;

const ARABIC = /[؀-ۿ]/;

/** Coupe un texte en lignes qui tiennent dans `maxWidth` (mots, sinon caractères). */
export function wrapLines(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = word;
      // Mot plus large que la colonne : découpe par caractères.
      while (measure(line) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut -= 1;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line);
  }
  return out;
}

const COLORS = {
  bg: "#ffffff",
  text: "#13213d",
  head: "#e3ebfb",
  line: "#c4d0ea",
  alt: "#f5f8fe",
};

/** Dessine le tableau et renvoie une image PNG. */
export async function renderTableImage(table: ShareTable): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer l'image.");

  const measure = (text: string) => ctx.measureText(text).width;
  const innerWidth = WIDTH - 2 * PAD;

  type Laid = { lines: string[][]; height: number };
  const layouts = table.sections.map((section) => {
    const total = section.widths.reduce((a, b) => a + b, 0);
    const colW = section.widths.map((w) => (innerWidth * w) / total);
    const rowLayout = (cells: string[], bold: boolean): Laid => {
      ctx.font = bold ? FONT_BOLD : FONT;
      const lines = cells.map((c, i) => wrapLines(measure, c, colW[i] - 2 * 8));
      const rows = Math.max(1, ...lines.map((l) => l.length));
      return { lines, height: rows * LINE + 12 };
    };
    return {
      colW,
      head: rowLayout(section.columns, true),
      rows: section.rows.map((r) => rowLayout(r, false)),
    };
  });

  let height = PAD + 34 + (table.subtitle ? 24 : 0);
  table.sections.forEach((section, i) => {
    if (section.heading) height += 30;
    height +=
      layouts[i].head.height +
      layouts[i].rows.reduce((a, r) => a + r.height, 0) +
      16;
  });
  height += PAD;

  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height) * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "top";

  const drawText = (text: string, x: number, y: number, w: number, font: string) => {
    ctx.font = font;
    ctx.fillStyle = COLORS.text;
    if (ARABIC.test(text)) {
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.fillText(text, x + w - 8, y);
    } else {
      ctx.direction = "ltr";
      ctx.textAlign = "left";
      ctx.fillText(text, x + 8, y);
    }
  };

  let y = PAD;
  drawText(table.title, PAD - 8, y, innerWidth, TITLE_FONT);
  y += 34;
  if (table.subtitle) {
    drawText(table.subtitle, PAD - 8, y, innerWidth, FONT);
    y += 24;
  }

  table.sections.forEach((section, si) => {
    const { colW, head, rows } = layouts[si];
    if (section.heading) {
      drawText(section.heading, PAD - 8, y + 4, innerWidth, FONT_BOLD);
      y += 30;
    }
    const drawRow = (laid: Laid, fill: string, bold: boolean) => {
      ctx.fillStyle = fill;
      ctx.fillRect(PAD, y, innerWidth, laid.height);
      ctx.strokeStyle = COLORS.line;
      ctx.strokeRect(PAD, y, innerWidth, laid.height);
      let x = PAD;
      laid.lines.forEach((lines, ci) => {
        if (ci > 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + laid.height);
          ctx.stroke();
        }
        lines.forEach((line, li) =>
          drawText(line, x, y + 6 + li * LINE, colW[ci], bold ? FONT_BOLD : FONT),
        );
        x += colW[ci];
      });
      y += laid.height;
    };
    drawRow(head, COLORS.head, true);
    rows.forEach((row, ri) => drawRow(row, ri % 2 ? COLORS.alt : COLORS.bg, false));
    y += 16;
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Impossible de créer l'image.")),
      "image/png",
    ),
  );
}

/**
 * Partage l'image : feuille de partage du téléphone quand elle accepte les
 * fichiers (WhatsApp y figure), sinon téléchargement de l'image.
 */
export async function shareTableImage(
  table: ShareTable,
  filename: string,
): Promise<"shared" | "downloaded"> {
  const blob = await renderTableImage(table);
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: table.title });
      return "shared";
    } catch (err) {
      // Fermer la feuille de partage n'est pas une erreur.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
