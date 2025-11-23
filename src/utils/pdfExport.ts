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
  let fontName = "times"; // fallback

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

  // Фильтруем только рассчитанные ставки (points = 1 или 3)
  const calculatedBets = bets.filter((bet) =>
    typeof bet.points === 'number' && (bet.points === 1 || bet.points === 3)
  );

  // Сортировка ставок по дате (старые сверху для правильной нумерации)
  const sortedBets = [...calculatedBets].sort((a, b) => {
    const da = a.created ? new Date(a.created).getTime() : 0;
    const db = b.created ? new Date(b.created).getTime() : 0;
    return da - db;
  });

  // Получаем даты первой и последней ставки
  const firstBetDate = sortedBets.length > 0 && sortedBets[0].created
    ? new Date(sortedBets[0].created).toLocaleDateString("ru-RU")
    : "";
  const lastBetDate = sortedBets.length > 0 && sortedBets[sortedBets.length - 1].created
    ? new Date(sortedBets[sortedBets.length - 1].created).toLocaleDateString("ru-RU")
    : "";

  // Заголовок
  doc.setFontSize(20);
  doc.setFont(fontName, "bold");

  const title = "История Ставок";
  const dateText = sortedBets.length > 0
    ? `${firstBetDate} — ${lastBetDate}`
    : `Дата: ${new Date().toLocaleDateString("ru-RU")}`;

  doc.text(title, 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(fontName, "normal");
  doc.text(dateText, 105, 22, { align: "center" });

  // Подготовка данных для таблицы
  const tableData = sortedBets
    .map((bet, index) => {
      const match = matches.find((m) => m.id === bet.match_id);
      if (!match) return null;

      // Порядковый номер
      const betNumber = (index + 1).toString();

      // Дата матча из starts_at
      const matchDate = match.starts_at
        ? new Date(match.starts_at).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "";

      // Названия команд
      const teams = `${match.home_team} — ${match.away_team}`;

      // Прогноз: П1 (Победа 1), Х (Ничья), П2 (Победа 2)
      const pickLabel = bet.pick === "H" ? "П1" : bet.pick === "D" ? "X" : "П2";

      // Результат матча
      const hasResult = typeof match.home_score === 'number' && typeof match.away_score === 'number';
      const matchResult = hasResult ? `${match.home_score} — ${match.away_score}` : "—";

      return {
        data: [
          betNumber,
          matchDate,
          match.league || "",
          teams,
          matchResult,
          pickLabel,
        ],
        isWon: bet.points === 3, // true если выиграно, false если проиграно
      };
    })
    .filter(Boolean);

  // Создание таблицы с правильным шрифтом и цветовым кодированием
  autoTable(doc, {
    startY: 30,
    head: [["№", "Дата", "Лига", "Команды", "Результат", "Прогноз"]],
    body: tableData.map(item => item!.data) as string[][],
    theme: "grid",
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      font: fontName,
      halign: "center", // Центрируем все заголовки
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: fontName,
      fontStyle: "normal",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" }, // №
      1: { cellWidth: 25, halign: "center" }, // Дата
      2: { cellWidth: 30, halign: "center" }, // Лига
      3: { cellWidth: 60, halign: "center" }, // Команды
      4: { cellWidth: 20, halign: "center" }, // Результат
      5: { cellWidth: 20, halign: "center" }, // Прогноз
    },
    margin: { left: (210 - 165) / 2 }, // Центрируем таблицу горизонтально (210mm - ширина A4, 165 - сумма ширин столбцов)
    didParseCell: function (data) {
      // Устанавливаем фон для строк данных
      if (data.section === 'body' && data.row.index < tableData.length) {
        const rowData = tableData[data.row.index];
        if (rowData && !rowData.isWon) {
          // Светло-серый фон для проигрышей
          data.cell.styles.fillColor = [220, 220, 220];
        } else {
          // Белый фон для выигрышей
          data.cell.styles.fillColor = [255, 255, 255];
        }
      }
    },
  });

  // Сохранение PDF (без статистики и легенды)
  doc.save(`ludic-bets-${new Date().toISOString().split("T")[0]}.pdf`);
};
