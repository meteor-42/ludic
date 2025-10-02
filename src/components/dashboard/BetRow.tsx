import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Bet, Match } from "@/types/dashboard";
import { formatMsk, statusLabel, statusClass } from "@/utils/dashboard";

interface BetRowProps {
  bet: Bet;
  index: number;
  match?: Match;
}

export const BetRow = ({ bet: b, index, match: m }: BetRowProps) => {
  // Результат матча
  const hasResult = ['completed'].includes((m?.status||'').toLowerCase()) && typeof m?.home_score === 'number' && typeof m?.away_score === 'number';
  const result = hasResult ? `${m?.home_score} — ${m?.away_score}` : null;

  // Проверка на выигрыш ставки
  const isWon = typeof b.points === 'number' && b.points === 3;
  const isLost = typeof b.points === 'number' && b.points === 1;
  const hasPoints = typeof b.points === 'number';

  return (
    <Card key={b.match_id} className={cn(
      // Базовые состояния строки
      "transition-colors",
      // Более сочный hover, чем базовое отображение
      "hover:bg-primary/10",
      isWon && "bg-green-50 border-green-200 hover:bg-green-100",
      isLost && "bg-rose-50 border-rose-200 hover:bg-rose-100"
    )}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          {/* Строка 1: Дата/Лига/Тур | Статус */}
          <div className="flex items-center justify-between h-5">
            <div className="flex items-center gap-2 h-5">
              <span className="text-xs font-medium text-muted-foreground flex items-center h-5">
                {m ? formatMsk(m.starts_at) : '—'}
              </span>
              <span className="text-muted-foreground flex items-center h-5">•</span>
              <span className="text-xs text-muted-foreground flex items-center h-5">
                {(m?.league || typeof m?.tour === 'number') ?
                  `${m?.league}${typeof m?.tour === 'number' ? ` - Тур ${m?.tour}` : ''}` :
                  '—'
                }
              </span>
            </div>
            <span className={cn(
              "px-2 py-1 text-[10px] font-medium rounded h-5 flex items-center justify-center",
              m?.status ? statusClass(m.status) : "bg-slate-100 text-slate-700"
            )}>
              {m?.status ? statusLabel(m.status) : '—'}
            </span>
          </div>

          {/* Строка 2: Команды (слева) и выбор ставки (справа) */}
          <div className="flex items-start md:items-center justify-between gap-2">
            {/* Команды - прижаты к левому краю */}
            <div className="flex flex-col flex-1">
              {/* Мобильная версия: в две строки, без разделителя */}
              <span className="text-sm font-medium leading-tight break-words sm:hidden">
                {m?.home_team}
              </span>
              <span className="text-sm font-medium leading-tight break-words sm:hidden">
                {m?.away_team}
              </span>
              {/* Десктоп: в одну строку */}
              <span className="text-sm font-medium truncate hidden sm:inline">
                {m?.home_team && m?.away_team ? `${m.home_team} ${m.away_team}` : ' '}
              </span>
              {hasResult && (
                <span className="text-xs font-bold text-muted-foreground mt-1">
                  Результат: {result}
                </span>
              )}
            </div>

            {/* Выбор ставки - прижат к правому краю с более заметной рамкой */}
            <div className="flex items-stretch gap-1 border border-border rounded-md p-1 bg-background">
              <div className={cn(
                "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center leading-tight",
                b.pick === 'H' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <span className="text-sm font-medium">П1</span>
                <span className={cn("text-[11px] mt-0.5", b.pick === 'H' ? "text-primary-foreground/90" : "text-foreground/60")}>{typeof m?.odd_home === 'number' ? m.odd_home.toFixed(2) : '—'}</span>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center leading-tight",
                b.pick === 'D' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <span className="text-sm font-medium">Х</span>
                <span className={cn("text-[11px] mt-0.5", b.pick === 'D' ? "text-primary-foreground/90" : "text-foreground/60")}>{typeof m?.odd_draw === 'number' ? m.odd_draw.toFixed(2) : '—'}</span>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded min-w-[56px] flex flex-col items-center justify-center leading-tight",
                b.pick === 'A' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <span className="text-sm font-medium">П2</span>
                <span className={cn("text-[11px] mt-0.5", b.pick === 'A' ? "text-primary-foreground/90" : "text-foreground/60")}>{typeof m?.odd_away === 'number' ? m.odd_away.toFixed(2) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Строка 3: Номер ставки (слева) и очки (справа) */}
          <div className="flex items-center justify-between h-5">
            {/* Бейдж с номером и ID ставки */}
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              {index + 1} • С{b.id?.slice(-6) || '—'}
            </span>

            {/* Отображение очков с именем игрока */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {b.display_name|| `Игрок ${b.user_id?.slice(-6) || '—'}`} |
              </span>
              {hasPoints ? (
                b.points === 3 ? (
                  <span className="text-green-600 text-xs font-medium">
                    +3
                  </span>
                ) : b.points === 1 ? (
                  <span className="text-rose-600 text-xs font-bold">
                    Проигрыш
                  </span>
                ) : (
                  <span className="text-foreground text-xs font-medium">
                    Не рассчитано
                  </span>
                )
              ) : (
                <span className="text-foreground text-xs font-medium">
                  Не рассчитано
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
