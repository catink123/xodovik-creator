import jsPDF from "jspdf";
import type { Publication, DataSection } from "./types";

const SQ_COUNT = 6;
const MIN_TABLE_ROWS = 5;

const COL1_W = 15;
const SQ_W = 10;
const ROW_H = 10;
const TABLE_MARGIN_TOP = 5;
const TABLE_MARGIN_BOTTOM = 5;
const TITLE_MARGIN = 1;
const TITLE_HEIGHT = 7;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const TITLE_INDENT = 15;

export function generatePDF(data: DataSection[], publications: Publication[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("times", "normal");

  const pageW = 210;
  const usableW = pageW - MARGIN_LEFT - MARGIN_RIGHT;
  const COL2_W = usableW - COL1_W - SQ_COUNT * SQ_W;

  let y = MARGIN_TOP;

  function checkPage(needed: number) {
    if (y + needed > 297 - MARGIN_TOP) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  }

  for (const section of data) {
    checkPage(TITLE_HEIGHT + TITLE_MARGIN * 2);

    doc.setFontSize(18);
    doc.setFont("times", "bold");
    doc.text(section.title, MARGIN_LEFT + TITLE_INDENT, y + TITLE_MARGIN + 5);
    y += TITLE_MARGIN + TITLE_HEIGHT + TITLE_MARGIN;

    for (const table of section.tables) {
      const pubCount = table.publications.length;
      const totalRows = Math.max(MIN_TABLE_ROWS, 1 + pubCount);
      const tableH = totalRows * ROW_H;

      checkPage(tableH + TABLE_MARGIN_TOP + TABLE_MARGIN_BOTTOM + 5);
      y += TABLE_MARGIN_TOP;

      const tableX = MARGIN_LEFT;
      const tableW = usableW;

      let rowY = y;

      for (let r = 0; r < totalRows; r++) {
        const isFirstRow = r === 0;
        const col1Text = isFirstRow ? table.houseID : "";
        const col2Text = isFirstRow
          ? table.surnames.join(", ")
          : r <= pubCount
            ? (() => {
                const pubId = table.publications[r - 1];
                return publications.find((p) => p.id === pubId)?.title ?? "";
              })()
            : "";

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(tableX, rowY, tableW, ROW_H);

        let cx = tableX;
        doc.setLineWidth(0.2);

        doc.line(cx + COL1_W, rowY, cx + COL1_W, rowY + ROW_H);
        doc.line(cx + COL1_W + COL2_W, rowY, cx + COL1_W + COL2_W, rowY + ROW_H);

        for (let s = 0; s < SQ_COUNT; s++) {
          const sx = cx + COL1_W + COL2_W + s * SQ_W;
          doc.line(sx + SQ_W, rowY, sx + SQ_W, rowY + ROW_H);
        }

        doc.setFont("times", isFirstRow ? "bold" : "normal");
        doc.setFontSize(isFirstRow ? 18 : 12);

        if (col1Text) {
          const textW = doc.getTextWidth(col1Text);
          doc.text(col1Text, tableX + (COL1_W - textW) / 2, rowY + ROW_H / 2 + 1.5);
        }

        if (col2Text) {
          doc.setFont("times", "normal");
          doc.setFontSize(12);
          doc.text(col2Text, tableX + COL1_W + 2.5, rowY + ROW_H / 2 + 1.5);
        }

        rowY += ROW_H;
      }

      y = rowY + TABLE_MARGIN_BOTTOM;
    }
  }

  return doc;
}

export function pdfToBlob(doc: jsPDF): Blob {
  const arr = doc.output("arraybuffer");
  return new Blob([arr], { type: "application/pdf" });
}
