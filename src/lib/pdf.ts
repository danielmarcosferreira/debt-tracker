import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";
import { translate } from "./i18n";
import type { Expense, LanguageCode, Person } from "./types";

export function exportPersonStatement(
  person: Person,
  expenses: Expense[],
  generatedBy: string,
  language: LanguageCode = "en"
) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(language, key, vars);

  const doc = new jsPDF();
  const unpaid = expenses.filter((e) => !e.paid);
  const totalOwed = unpaid.reduce((sum, e) => sum + e.amount, 0);
  const currency = expenses[0]?.currency ?? "USD";

  doc.setFontSize(18);
  doc.text(t("pdf.statement"), 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${person.name}`, 14, 28);
  doc.text(t("pdf.from", { name: generatedBy }), 14, 34);
  doc.text(t("pdf.generated", { date: new Date().toLocaleDateString() }), 14, 40);

  autoTable(doc, {
    startY: 48,
    head: [
      [
        t("pdf.colDate"),
        t("pdf.colDescription"),
        t("pdf.colCard"),
        t("pdf.colAmount"),
        t("pdf.colStatus"),
      ],
    ],
    body: expenses.map((e) => [
      formatDate(e.date, language),
      e.installment
        ? `${e.description} (${e.installment.index}/${e.installment.count})`
        : e.description,
      e.cardName,
      formatCurrency(e.amount, e.currency),
      e.paid ? t("pdf.paid") : t("pdf.unpaid"),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY ?? 60;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(t("pdf.totalOwed", { amount: formatCurrency(totalOwed, currency) }), 14, finalY + 12);

  doc.save(`${person.name.replace(/\s+/g, "-").toLowerCase()}-statement.pdf`);
}
