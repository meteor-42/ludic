import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";
import type { Match, Bet } from "@/types/dashboard";
import { formatMsk, statusLabel, statusClass } from "@/utils/dashboard";

interface MatchRowProps {
  match: Match;
  index?: number;
  selectedBet?: Bet;
  isSaving: boolean;
  onPick: (pick: "H" | "D" | "A") => void;
}

export const MatchRow = ({ match: m, index, selectedBet, isSaving, onPick }: MatchRowProps) => {
  const selected = selectedBet?.pick;
  const disabled = (m.is_locked ?? false) || (m.status ? m.status !== 'upcoming' : false);

  // Результат матча
  const hasResult = ['live','completed'].includes((m.status||'').toLowerCase()) && typeof m.home_score === 'number' && typeof m.away_score === 'number';
  const result = hasResult ? `${m.home_score} — ${m.away_score}` : null;

  // Прогноз пользователя
  const forecast = selected ? (selected === 'H' ? 'П1' : selected === 'D' ? 'Х' : 'П2') : '—';

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-2">
        <div className="flex flex-col gap-0">
          {/* Строка 1: Номер | Дата/Лига/Тур | Статус */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {typeof index === 'number' ? `${index + 1} • М${m.id}` : `М${m.id}`}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {formatMsk(m.starts_at)}
              </span>
              <span className="text-muted-foreground">︙</span>
              <span className="text-xs text-muted-foreground">
                {m.league}{typeof m.tour === 'number' ? ` Тур ${m.tour}` : ''}
              </span>
            </div>
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded",
              statusClass(m.status)
            )}>
              {statusLabel(m.status)}
            </span>
          </div>

          {/* Строка 2: Команды */}
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium text-center truncate">
              {m.home_team} ～ {m.away_team}
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
          <div className="flex items-center justify-center gap-1 mt-2">
            {!disabled ? (
              <>
                <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={isSaving} onClick={() => onPick('H')} />
                <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={isSaving} onClick={() => onPick('D')} />
                <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={isSaving} onClick={() => onPick('A')} />
              </>
            ) : (
              <span className="text-sm text-center text-muted-foreground">
                {forecast}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
