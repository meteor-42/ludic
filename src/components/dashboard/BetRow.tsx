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
  const isWon = typeof b.points === 'number' && b.points > 0;

  return (
    <Card key={b.match_id} className={cn(
      "transition-colors hover:bg-muted/50",
      isWon && "bg-green-50 border-green-200"
    )}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          {/* Строка 1: Дата/Лига/Тур | Статус - такая же высота как нижняя */}
          <div className="flex items-center justify-between h-5"> {/* Добавлена высота h-5 */}
            <div className="flex items-center gap-2 h-5"> {/* Добавлена высота h-5 */}
              <span className="text-xs font-medium text-muted-foreground flex items-center h-5"> {/* Добавлена высота h-5 */}
                {m ? formatMsk(m.starts_at) : '—'}
              </span>
              <span className="text-muted-foreground flex items-center h-5">•</span> {/* Добавлена высота h-5 */}
              <span className="text-xs text-muted-foreground flex items-center h-5"> {/* Добавлена высота h-5 */}
                {(m?.league || typeof m?.tour === 'number') ?
                  `${m?.league}${typeof m?.tour === 'number' ? ` Тур ${m?.tour}` : ''}` :
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

          {/* Строка 2: Команды и счет */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-center truncate">
              {m?.home_team && m?.away_team ? `${m.home_team} ～ ${m.away_team}` : '～'}
            </span>
            {hasResult && (
              <span className="text-sm font-bold text-muted-foreground">
                ({result})
              </span>
            )}
          </div>

          {/* Строка 3: Прогноз и номер ставки */}
          <div className="flex items-center justify-between h-5"> {/* Добавлена высота h-5 */}
            {/* Бейдж с номером и ID ставки */}
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              {index + 1} • С{b.id?.slice(-6) || '—'}
            </span>

            {/* Прогноз - ВСЕГДА показываем все варианты */}
            <div className="flex items-center gap-1 h-5"> {/* Добавлена высота h-5 */}
              <span className={cn(
                "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                b.pick === 'H' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground opacity-50"
              )}>
                П1
              </span>
              <span className={cn(
                "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                b.pick === 'D' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground opacity-50"
              )}>
                Х
              </span>
              <span className={cn(
                "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                b.pick === 'A' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground opacity-50"
              )}>
                П2
              </span>
              
              {isWon && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium h-5 flex items-center justify-center">
                  +{b.points}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};