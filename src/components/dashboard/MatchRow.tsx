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
  const isMatchStarted = m.status && ['live', 'completed'].includes(m.status.toLowerCase());

  // Результат матча
  const hasResult = ['live','completed'].includes((m.status||'').toLowerCase()) && typeof m.home_score === 'number' && typeof m.away_score === 'number';
  const result = hasResult ? `${m.home_score} — ${m.away_score}` : null;

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
                {m.league}{typeof m.tour === 'number' ? ` Тур ${m.tour}` : ''}
              </span>
            </div>
            <span className={cn(
              "px-2 py-1 text-[10px] font-medium rounded h-5 flex items-center justify-center",
              statusClass(m.status)
            )}>
              {statusLabel(m.status)}
            </span>
          </div>

          {/* Строка 2: Команды и счет */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-center truncate">
              {m.home_team} ～ {m.away_team}
            </span>
            {hasResult && (
              <span className="text-sm font-bold text-muted-foreground">
                ({result})
              </span>
            )}
          </div>

          {/* Строка 3: Выбор игрока - всегда по центру */}
          <div className="flex items-center justify-center gap-1">
            {!disabled ? (
              // До начала матча - интерактивные чипсы
              <>
                <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={isSaving} onClick={() => onPick('H')} />
                <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={isSaving} onClick={() => onPick('D')} />
                <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={isSaving} onClick={() => onPick('A')} />
              </>
            ) : isMatchStarted && selected ? (
              // После начала матча - все варианты с выделением
              <>
                <span className={cn(
                  "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                  selected === 'H' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground opacity-50"
                )}>
                  П1
                </span>
                <span className={cn(
                  "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                  selected === 'D' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground opacity-50"
                )}>
                  Х
                </span>
                <span className={cn(
                  "px-2 py-1 text-xs rounded h-5 flex items-center justify-center",
                  selected === 'A' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground opacity-50"
                )}>
                  П2
                </span>
              </>
            ) : (
              // Заблокировано без выбора
              <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded h-5 flex items-center justify-center">
                {selected ? (selected === 'H' ? 'П1' : selected === 'D' ? 'Х' : 'П2') : '—'}
              </span>
            )}
          </div>

          {/* Строка 4: Номер матча */}
          <div className="flex items-center justify-between h-5">
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              {typeof index === 'number' ? `${index + 1} • М${m.id}` : `М${m.id}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};