import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Bet, Match } from "@/types/dashboard";
import { robotoFont } from "./roboto-font";

interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
  addFileToVFS?: (fileName: string, base64String: string) => void;
  addFont?: (fileName: string, fontName: string, fontStyle: string) => void;
}

export const generateBetsPDF = (bets: Bet[], matches: Match[]) => {
  const doc = new jsPDF() as ExtendedJsPDF;

  // Добавляем кириллический шрифт Roboto (normal и bold)
  let fontName = "helvetica"; // fallback

  try {
    if (doc.addFileToVFS && doc.addFont) {
      // Добавляем шрифт в VFS
      doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);

      // Регистрируем шрифт для normal и bold стилей
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");

      fontName = "Roboto";
      doc.setFont("Roboto", "normal");
    }
  } catch (e) {
    console.warn("Font loading error:", e);
    fontName = "helvetica";
  }

  // Заголовок
  doc.setFontSize(20);
  doc.setFont(fontName, "bold");

  const title = "ЛУДИК.РФ - История Ставок";
  const dateText = `Дата: ${new Date().toLocaleDateString("ru-RU")}`;

  doc.text(title, 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(fontName, "normal");
  doc.text(dateText, 105, 22, { align: "center" });

  // Сортировка ставок по дате (новые сверху)
  const sortedBets = [...bets].sort((a, b) => {
    const da = a.created ? new Date(a.created).getTime() : 0;
    const db = b.created ? new Date(b.created).getTime() : 0;
    return db - da;
  });

  // Подготовка данных для таблицы
  const tableData = sortedBets
    .map((bet) => {
      const match = matches.find((m) => m.id === bet.match_id);
      if (!match) return null;

      const pickLabel = bet.pick === "H" ? "П1" : bet.pick === "D" ? "Х" : "П2";
      const result =
        bet.result === "win" ? "✓" : bet.result === "loss" ? "✗" : "-";
      const matchDate = match.fixture_date
        ? new Date(match.fixture_date).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
          })
        : "";

      return [
        matchDate,
        `${match.home_team} - ${match.away_team}`,
        match.league || "",
        pickLabel,
        result,
      ];
    })
    .filter(Boolean);

  // Создание таблицы с правильным шрифтом
  autoTable(doc, {
    startY: 30,
    head: [["Дата", "Матч", "Лига", "Выбор", "Результат"]],
    body: tableData as string[][],
    theme: "grid",
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      font: fontName,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: fontName,
      fontStyle: "normal",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 40 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
    },
  });

  // Статистика внизу
  const totalBets = bets.length;
  const wins = bets.filter((b) => b.result === "win").length;
  const losses = bets.filter((b) => b.result === "loss").length;
  const pending = bets.filter((b) => !b.result || b.result === "pending").length;
  const successRate =
    totalBets > 0 && wins + losses > 0
      ? ((wins / (wins + losses)) * 100).toFixed(1)
      : "0.0";

  const finalY = doc.lastAutoTable?.finalY || 30;
  doc.setFontSize(11);
  doc.setFont(fontName, "bold");
  doc.text("Статистика:", 14, finalY + 15);
  doc.setFont(fontName, "normal");
  doc.setFontSize(10);
  doc.text(`Всего ставок: ${totalBets}`, 14, finalY + 22);
  doc.text(`Выиграно: ${wins}`, 14, finalY + 28);
  doc.text(`Проиграно: ${losses}`, 14, finalY + 34);
  doc.text(`В ожидании: ${pending}`, 14, finalY + 40);
  doc.text(`Точность: ${successRate}%`, 14, finalY + 46);

  // Сохранение PDF
  doc.save(`ludic-bets-${new Date().toISOString().split("T")[0]}.pdf`);
};
