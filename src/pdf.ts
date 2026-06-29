import { PDFDocument, rgb, PageSizes } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Publication, DataSection } from "./types";

const MM = 2.83465;

const SQ_COUNT = 6;
const MIN_TABLE_ROWS = 5;
const COL1_W = 15 * MM;
const SQ_W = 10 * MM;
const ROW_H = 10 * MM;
const TABLE_MARGIN_TOP = 5 * MM;
const TABLE_MARGIN_BOTTOM = 5 * MM;
const TITLE_MARGIN = 5 * MM;
const MARGIN_LEFT = 15 * MM;
const MARGIN_RIGHT = 15 * MM;
const MARGIN_TOP = 15 * MM;
const TITLE_INDENT = 15 * MM;

const [PAGE_W, PAGE_H] = PageSizes.A4;
const USABLE_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const COL2_W = USABLE_W - COL1_W - SQ_COUNT * SQ_W;

let fontsCached: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function ensureFonts() {
  if (fontsCached) return fontsCached;
  const base = import.meta.env.BASE_URL;
  const [regular, bold] = await Promise.all([
    fetch(base + "fonts/PTSerif-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch(base + "fonts/PTSerif-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);
  fontsCached = { regular, bold };
  return fontsCached;
}

export async function generatePDF(data: DataSection[], publications: Publication[]) {
  const fonts = await ensureFonts();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regular = await pdfDoc.embedFont(fonts.regular);
  const bold = await pdfDoc.embedFont(fonts.bold);

  let page = pdfDoc.addPage(PageSizes.A4);
  let y = PAGE_H - MARGIN_TOP;

  function checkPage(needed: number) {
    if (y - needed < MARGIN_TOP) {
      page = pdfDoc.addPage(PageSizes.A4);
      y = PAGE_H - MARGIN_TOP;
    }
  }

  for (const section of data) {
    const titleSize = 18;
    const titleH = bold.heightAtSize(titleSize);
    const totalTitleBlock = TITLE_MARGIN + titleH + TITLE_MARGIN;

    checkPage(totalTitleBlock);

    const titleY = y - TITLE_MARGIN - titleH / 2 - titleSize * 0.15;
    page.drawText(section.title || "", { x: MARGIN_LEFT + TITLE_INDENT, y: titleY, font: bold, size: titleSize });
    y -= totalTitleBlock;

    let firstTable = true;
    for (const table of section.tables) {
      const pubCount = table.publications.length;
      const totalRows = Math.max(MIN_TABLE_ROWS, 1 + pubCount);
      const tableH = totalRows * ROW_H;

      checkPage(tableH + TABLE_MARGIN_TOP + TABLE_MARGIN_BOTTOM + 5 * MM);
      if (!firstTable) y -= TABLE_MARGIN_TOP;
      firstTable = false;

      let rowY = y;

      for (let r = 0; r < totalRows; r++) {
        const isFirstRow = r === 0;
        const cellBottom = rowY - ROW_H;
        const font = isFirstRow ? bold : regular;
        const fontSize = isFirstRow ? 16 : 12;

        page.drawRectangle({
          x: MARGIN_LEFT,
          y: cellBottom,
          width: USABLE_W,
          height: ROW_H,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawLine({
          start: { x: MARGIN_LEFT + COL1_W, y: rowY },
          end: { x: MARGIN_LEFT + COL1_W, y: cellBottom },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: MARGIN_LEFT + COL1_W + COL2_W, y: rowY },
          end: { x: MARGIN_LEFT + COL1_W + COL2_W, y: cellBottom },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });

        for (let s = 0; s < SQ_COUNT; s++) {
          const sx = MARGIN_LEFT + COL1_W + COL2_W + s * SQ_W;
          page.drawLine({
            start: { x: sx + SQ_W, y: rowY },
            end: { x: sx + SQ_W, y: cellBottom },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }

        const col1Text = isFirstRow ? table.houseID : "";
        const col2Text = isFirstRow
          ? table.surnames.join(", ")
          : r <= pubCount
            ? publications.find((p) => p.id === table.publications[r - 1])?.title ?? ""
            : "";

        if (col1Text) {
          const tw = bold.widthOfTextAtSize(col1Text, fontSize);
          page.drawText(col1Text, {
            x: MARGIN_LEFT + (COL1_W - tw) / 2,
            y: cellBottom + ROW_H / 2 - fontSize / 3,
            font,
            size: fontSize,
          });
        }

        if (col2Text) {
          page.drawText(col2Text, {
            x: MARGIN_LEFT + COL1_W + 2.5 * MM,
            y: cellBottom + ROW_H / 2 - 12 / 3,
            font: regular,
            size: 12,
          });
        }

        rowY -= ROW_H;
      }

      y = rowY - TABLE_MARGIN_BOTTOM;
    }
  }

  return pdfDoc;
}

export async function pdfToBlob(pdfDoc: ReturnType<typeof PDFDocument.create>) {
  const doc = await pdfDoc;
  const bytes = await doc.save();
  return new Blob([bytes], { type: "application/pdf" });
}
