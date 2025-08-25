
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

  // Прогноз из ставки
  const forecast = b.pick === 'H' ? 'П1' : b.pick === 'D' ? 'Х' : 'П2';

  return (
    <Card key={b.match_id} className="transition-colors hover:bg-muted/50">
      <CardContent className="p-2">
        <div className="flex flex-col gap-0">
          {/* Строка 1: Номер | Дата/Лига/Тур | Статус */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {index + 1} • С{b.id?.slice(-6) || '—'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {m ? formatMsk(m.starts_at) : '—'}
              </span>
              <span className="text-muted-foreground">︙</span>
              <span className="text-xs text-muted-foreground">
                {(m?.league || typeof m?.tour === 'number') ?
                  `${m?.league}${typeof m?.tour === 'number' ? ` Тур ${m?.tour}` : ''}` :
                  '—'
                }
              </span>
            </div>
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded",
              m?.status ? statusClass(m.status) : "bg-slate-100 text-slate-700"
            )}>
              {m?.status ? statusLabel(m.status) : '—'}
            </span>
          </div>

          {/* Строка 2: Команды */}
          <div className="flex items-center justify-center mt-1">
            <span className="text-sm font-medium text-center truncate">
              {m?.home_team && m?.away_team ? `${m.home_team} — ${m.away_team}` : '—'}
            </span>
          </div>

          {/* Строка 3: Результат (только если есть) */}
          {hasResult && (
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-center">
                {result}
              </span>
            </div>
          )}

          {/* Строка 4: Прогноз */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-secondary text-foreground text-xs rounded">
              {forecast}
            </span>
            {typeof b.points === 'number' && b.points > 0 && (
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                +{b.points} очков
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
