import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

// Экспорт компонента как named export
export const MatchRow = ({ match: m, index, selectedBet, isSaving, onPick }: MatchRowProps) => {
  const selected = selectedBet?.pick;
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

          {/* Строка 2: Команды (слева) и выбор ставки (справа) */}
          <div className="flex items-center justify-between gap-2">
            {/* Команды - прижаты к левому краю */}
            <span className="text-sm font-medium truncate flex-1">
              {m.home_team} ～ {m.away_team}
            </span>
            
            {/* Выбор ставки - прижат к правому краю с рамкой */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1 bg-white">
              <span
                onClick={() => !disabled && onPick('H')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center cursor-pointer",
                  selected === 'H' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground opacity-70",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                П1
              </span>
              <span
                onClick={() => !disabled && onPick('D')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center cursor-pointer",
                  selected === 'D' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground opacity-70",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                Х
              </span>
              <span
                onClick={() => !disabled && onPick('A')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center cursor-pointer",
                  selected === 'A' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground opacity-70",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                П2
              </span>
            </div>
          </div>

          {/* Строка 3: Номер матча и обратный отсчет */}
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