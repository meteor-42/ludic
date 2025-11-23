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

export const generateBetsPDF = (bets: Bet[], matches: Match[], playerName?: string) => {
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

  // Получаем имя игрока из ставок или используем переданное
  const displayPlayerName = playerName || (sortedBets.length > 0 ? sortedBets[0].display_name : "") || "";

  // Заголовок
  doc.setFontSize(13);
  doc.setFont(fontName, "bold");

  const title = "История Ставок";
  const titleLine = displayPlayerName ? `${title} — ${displayPlayerName}` : title;
  const dateText = sortedBets.length > 0
    ? `${firstBetDate} — ${lastBetDate}`
    : `Дата: ${new Date().toLocaleDateString("ru-RU")}`;

  doc.text(titleLine, 105, 15, { align: "center" });

  // Даты меньшим размером
  doc.setFontSize(10);
  doc.setFont(fontName, "normal");
  doc.text(dateText, 105, 21, { align: "center" });

  // Группируем ставки по лигам
  const betsByLeague: Record<string, Array<{ bet: Bet; match: Match; globalIndex: number }>> = {};

  sortedBets.forEach((bet, globalIndex) => {
    const match = matches.find((m) => m.id === bet.match_id);
    if (!match) return;

    const league = match.league || "Без лиги";
    if (!betsByLeague[league]) {
      betsByLeague[league] = [];
    }
    betsByLeague[league].push({ bet, match, globalIndex });
  });

  // Получаем отсортированный список лиг
  const leagues = Object.keys(betsByLeague).sort();

  // Начальная позиция для первой таблицы
  let currentY = 26;

  // Создаем таблицу для каждой лиги
  leagues.forEach((league, leagueIndex) => {
    const leagueBets = betsByLeague[league];

    // Добавляем заголовок лиги
    doc.setFontSize(11);
    doc.setFont(fontName, "bold");
    doc.text(league, 105, currentY, { align: "center" });
    currentY += 5;

    // Подготовка данных для таблицы этой лиги
    const tableData = leagueBets.map(({ bet, match, globalIndex }, localIndex) => {
      // Порядковый номер (локальный для каждой лиги, начинается с 1)
      const betNumber = (localIndex + 1).toString();

      // ID ставки из базы (берем последние 6 символов для компактности)
      const betId = bet.id.substring(bet.id.length - 6).toUpperCase();

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
        data: [betNumber, betId, matchDate, teams, matchResult, pickLabel],
        isWon: bet.points === 3,
      };
    });

    // Создание таблицы для этой лиги
    autoTable(doc, {
      startY: currentY,
      head: [["№", "ID", "Дата", "Команды", "Результат", "Прогноз"]],
      body: tableData.map(item => item.data) as string[][],
      theme: "grid",
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
        font: fontName,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        font: fontName,
        fontStyle: "normal",
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" }, // №
        1: { cellWidth: 15, halign: "center" }, // ID ставки
        2: { cellWidth: 20, halign: "center" }, // Дата
        3: { cellWidth: 60, halign: "center" }, // Команды (шире, т.к. нет колонки Лига)
        4: { cellWidth: 20, halign: "center" }, // Результат
        5: { cellWidth: 20, halign: "center" }, // Прогноз
      },
      margin: {
        left: (210 - 150) / 2, // Центрируем таблицу
        bottom: 15
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index < tableData.length) {
          const rowData = tableData[data.row.index];
          if (rowData && !rowData.isWon) {
            data.cell.styles.fillColor = [220, 220, 220];
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }
      },
      didDrawPage: function (data) {
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setFont(fontName, "bold");
        doc.text("лудик.рф", 105, pageHeight - 10, { align: "center" });
      },
    });

    // Обновляем currentY для следующей таблицы
    if (doc.lastAutoTable) {
      currentY = doc.lastAutoTable.finalY + 8; // 8mm отступ между таблицами
    }

    // Проверка на необходимость новой страницы
    const pageHeight = doc.internal.pageSize.height;
    if (currentY > pageHeight - 30 && leagueIndex < leagues.length - 1) {
      doc.addPage();
      currentY = 20; // Начинаем с верха новой страницы
    }
  });

  // Сохранение PDF (без статистики и легенды)
  doc.save(`ludic-bets-${new Date().toISOString().split("T")[0]}.pdf`);
};
