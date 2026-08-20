import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatMonthYear } from "./utils";
import { groupByDueDay, groupByMonth, type CurrencyTotals } from "./aggregates";
import { translate } from "./i18n";
import type { Card, CurrencyCode, Expense, LanguageCode, Person } from "./types";

type Rgb = [number, number, number];

const INDIGO: Rgb = [79, 70, 229];
const INDIGO_DARK: Rgb = [67, 56, 202];
const SLATE_900: Rgb = [15, 23, 42];
const SLATE_500: Rgb = [100, 116, 139];
const SLATE_300: Rgb = [203, 213, 225];
const SLATE_100: Rgb = [241, 245, 249];
const WHITE: Rgb = [255, 255, 255];

function totalsLabel(totals: CurrencyTotals) {
  const entries = Object.entries(totals) as [CurrencyCode, number][];
  if (entries.length === 0) return formatCurrency(0);
  return entries.map(([code, amt]) => formatCurrency(amt, code)).join(" + ");
}

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function cardMeta(card: Card | undefined) {
  if (!card) return "";
  const parts = [card.bank, card.last4 ? `•••• ${card.last4}` : null].filter(Boolean);
  return parts.join(" ");
}

/**
 * Exports a statement for `expenses` — whatever set the caller already
 * scoped (e.g. one month's worth via the month picker). Mirrors the on-screen
 * grouping: month (only shown when the export spans more than one), then due
 * day, then card — each card gets its own labeled block so it's obvious which
 * card a run of rows belongs to, with a subtotal before the next due day.
 */
export function exportPersonStatement(
  person: Person,
  expenses: Expense[],
  cards: Card[],
  generatedBy: string,
  language: LanguageCode = "en",
  periodLabel?: string
) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(language, key, vars);
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
  };

  const unpaidTotals: CurrencyTotals = {};
  for (const e of expenses) {
    if (e.paid) continue;
    unpaidTotals[e.currency] = (unpaidTotals[e.currency] ?? 0) + e.amount;
  }

  // ---- Header band ----
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(t("pdf.appName"), marginX, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(t("pdf.statement"), marginX, 23);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text(periodLabel ?? "", pageWidth - marginX, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    t("pdf.generated", { date: new Date().toLocaleDateString(language === "pt" ? "pt-BR" : "en-US") }),
    pageWidth - marginX,
    22,
    { align: "right" }
  );

  let y = 48;

  // ---- Person row: avatar + name + prepared-by ----
  const avatarColor = hexToRgb(person.color || "#4f46e5");
  const avatarR = 6.5;
  doc.setFillColor(...avatarColor);
  doc.circle(marginX + avatarR, y - avatarR + 2, avatarR, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(initials(person.name), marginX + avatarR, y - avatarR + 4.3, { align: "center" });

  doc.setTextColor(...SLATE_900);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(person.name, marginX + avatarR * 2 + 5, y - 3);
  doc.setTextColor(...SLATE_500);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(t("pdf.preparedBy", { name: generatedBy }), marginX + avatarR * 2 + 5, y + 3);

  y += 14;

  // ---- Total unpaid summary ----
  doc.setDrawColor(...SLATE_300);
  doc.setFillColor(...SLATE_100);
  doc.roundedRect(marginX, y, contentWidth, 18, 2, 2, "FD");
  doc.setTextColor(...SLATE_500);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(t("pdf.totalUnpaid").toUpperCase(), marginX + 6, y + 7);
  doc.setTextColor(...SLATE_900);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(totalsLabel(unpaidTotals), marginX + 6, y + 14.5);

  y += 28;

  if (expenses.length === 0) {
    doc.setTextColor(...SLATE_500);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(t("pdf.noExpenses"), marginX, y);
  }

  // ---- Body: month -> due day -> card ----
  const monthGroups = [...groupByMonth(expenses)].reverse();
  const showMonthHeadings = monthGroups.length > 1;

  for (const mg of monthGroups) {
    ensureSpace(16);
    if (showMonthHeadings) {
      doc.setFontSize(11.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_900);
      doc.text(formatMonthYear(mg.monthKey, language), marginX, y);
      y += 7;
    }

    const dueDayGroups = groupByDueDay(mg.expenses, cards);
    for (const dg of dueDayGroups) {
      ensureSpace(18);

      const dayLabel =
        dg.dueDay !== null ? t("cards.dueOnDay", { day: dg.dueDay }) : t("peopleDetail.noDueDay");

      doc.setFillColor(...INDIGO_DARK);
      doc.roundedRect(marginX, y, contentWidth, 8, 1.2, 1.2, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(dayLabel.toUpperCase(), marginX + 4, y + 5.5);
      y += 8 + 4;

      for (const cg of dg.cardGroups) {
        ensureSpace(18);
        const card = cardsById.get(cg.cardId);
        const meta = cardMeta(card);

        doc.setFillColor(...SLATE_100);
        doc.rect(marginX, y, contentWidth, 7.5, "F");
        doc.setTextColor(...SLATE_900);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.text(cg.cardName, marginX + 3, y + 5.1);
        if (meta) {
          const nameWidth = doc.getTextWidth(cg.cardName);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_500);
          doc.text(meta, marginX + 3 + nameWidth + 4, y + 5.1);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...SLATE_900);
        doc.text(formatCurrency(cg.total, cg.expenses[0]?.currency), pageWidth - marginX - 3, y + 5.1, {
          align: "right",
        });
        y += 7.5;

        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          head: [[t("pdf.colDate"), t("pdf.colDescription"), t("pdf.colAmount"), t("pdf.colStatus")]],
          body: cg.expenses.map((e) => [
            formatDate(e.date, language),
            e.installment
              ? `${e.description} (${e.installment.index}/${e.installment.count})`
              : e.description,
            formatCurrency(e.amount, e.currency),
            e.paid ? t("pdf.paid") : t("pdf.unpaid"),
          ]),
          styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
          headStyles: {
            fillColor: WHITE,
            textColor: SLATE_500,
            fontStyle: "normal",
            fontSize: 7.5,
            lineWidth: { bottom: 0.3 },
            lineColor: SLATE_300,
          },
          bodyStyles: { textColor: SLATE_900 },
          alternateRowStyles: { fillColor: [250, 250, 252] as Rgb },
          columnStyles: { 2: { halign: "left" }, 3: { halign: "left" } },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }

      ensureSpace(10);
      doc.setDrawColor(...SLATE_300);
      doc.line(marginX, y - 2, pageWidth - marginX, y - 2);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_500);
      const dayTotalLabel =
        dg.dueDay !== null ? t("peopleDetail.dueDayTotal", { day: dg.dueDay }) : t("peopleDetail.noDueDay");
      doc.text(dayTotalLabel, marginX, y + 3);
      doc.setTextColor(...SLATE_900);
      doc.text(totalsLabel(dg.total), pageWidth - marginX, y + 3, { align: "right" });
      y += 12;
    }
  }

  const suffix = periodLabel ? `-${periodLabel.replace(/\s+/g, "-").toLowerCase()}` : "";
  doc.save(`${person.name.replace(/\s+/g, "-").toLowerCase()}-statement${suffix}.pdf`);
}
