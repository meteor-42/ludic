import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Countdown } from "./Countdown";
import type { Match, Bet } from "@/types/dashboard";
import { formatMsk, statusLabel, statusClass } from "@/utils/dashboard";
import { useMemo, useState } from "react";

interface MatchRowProps {
  match: Match;
  index?: number;
  selectedBet?: Bet;
  isSaving: boolean;
  onPick: (pick: "H" | "D" | "A") => void;
}

// Экспорт компонента как named export
export const MatchRow = ({ match: m, index, selectedBet, isSaving, onPick }: MatchRowProps) => {
  const selected = selectedBet?.pick;
  const [hidden, setHidden] = useState(false);
  // ✅ Блокируем ставки если матч не в статусе "upcoming" или идет сохранение
  const disabled = isSaving || m.status !== 'upcoming';

  // Если матч не upcoming, не рендерим строку вовсе (доп. защита)
  if (m.status !== 'upcoming' || hidden) {
    return null;
  }

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          {/* Строка 1: Дата/Лига/Тур | Статус */}
          <div className="flex items-center justify-between h-5">
            <div className="flex items-center gap-2 h-5">
              <span className="text-xs font-medium text-muted-foreground flex items-center h-5">
                {formatMsk(m.starts_at)}
              </span>
              <span className="text-muted-foreground flex items-center h-5">•</span>
              <span className="text-xs text-muted-foreground flex items-center h-5">
                {m.league}{typeof m.tour === 'number' ? ` - Тур ${m.tour}` : ''}
              </span>
            </div>
            <span className={cn(
              "px-2 py-1 text-[10px] font-medium rounded h-5 flex items-center justify-center",
              statusClass(m.status)
            )}>
              {statusLabel(m.status)}
            </span>
          </div>

          {/* Строка 2: Команды (слева) и выбор ставки (справа) */}
          <div className="flex items-center justify-between gap-2">
            {/* Команды - прижаты к левому краю */}
            <div className="flex flex-col flex-1">
              {/* Мобильная версия: в две строки, без разделителя */}
              <span className="text-sm font-medium leading-tight break-words sm:hidden">
                {m.home_team}
              </span>
              <span className="text-sm font-medium leading-tight break-words sm:hidden">
                {m.away_team}
              </span>
              {/* Десктоп: в одну строку, без иконки между командами */}
              <span className="text-sm font-medium truncate hidden sm:inline">
                {m.home_team} — {m.away_team}
              </span>
            </div>

            {/* Выбор ставки - прижат к правому краю с рамкой */}
            <div className="flex items-stretch gap-1 border border-border rounded-md p-1 bg-background">
              <button
                type="button"
                onClick={() => !disabled && onPick('H')}
                className={cn(
                  "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center cursor-pointer leading-tight",
                  "transition-colors",
                  selected === 'H'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">П1</span>
                <span className={cn(
                  "text-[11px] mt-0.5",
                  selected === 'H' ? "text-primary-foreground/90" : "text-foreground/60"
                )}>
                  {typeof m.odd_home === 'number' ? m.odd_home.toFixed(2) : '—'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => !disabled && onPick('D')}
                className={cn(
                  "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center cursor-pointer leading-tight",
                  "transition-colors",
                  selected === 'D'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">Х</span>
                <span className={cn(
                  "text-[11px] mt-0.5",
                  selected === 'D' ? "text-primary-foreground/90" : "text-foreground/60"
                )}>
                  {typeof m.odd_draw === 'number' ? m.odd_draw.toFixed(2) : '—'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => !disabled && onPick('A')}
                className={cn(
                  "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center cursor-pointer leading-tight",
                  "transition-colors",
                  selected === 'A'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">П2</span>
                <span className={cn(
                  "text-[11px] mt-0.5",
                  selected === 'A' ? "text-primary-foreground/90" : "text-foreground/60"
                )}>
                  {typeof m.odd_away === 'number' ? m.odd_away.toFixed(2) : '—'}
                </span>
              </button>
            </div>
          </div>

          {/* Индикация для не-upcoming удалена как ненужная */}

          {/* Строка 3: Номер матча и обратный отсчет */}
          <div className="flex items-center justify-between h-5">
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              {typeof index === 'number' ? `${index + 1} • М${m.id}` : `М${m.id}`}
            </span>
            <Countdown targetDate={m.starts_at} onElapsed={() => setHidden(true)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
