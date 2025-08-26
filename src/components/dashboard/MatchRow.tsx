import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";
import { Countdown } from "./Countdown";
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
  // Только проверка на процесс сохранения
  const disabled = isSaving;

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

          {/* Строка 2: Команды */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-center truncate">
              {m.home_team} ～ {m.away_team}
            </span>
          </div>

          {/* Строка 3: Выбор игрока - интерактивные чипсы */}
          <div className="flex items-center justify-center gap-1">
            <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={disabled} onClick={() => onPick('H')} />
            <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={disabled} onClick={() => onPick('D')} />
            <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={disabled} onClick={() => onPick('A')} />
          </div>

          {/* Строка 4: Номер матча и обратный отсчет */}
          <div className="flex items-center justify-between h-5">
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              {typeof index === 'number' ? `${index + 1} • М${m.id}` : `М${m.id}`}
            </span>
            <Countdown targetDate={m.starts_at} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
