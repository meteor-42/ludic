import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Match, Bet } from "@/types/dashboard";

interface MatchRowProps {
  match: Match;
  index: number;
  selectedBet?: Bet;
  isSaving: boolean;
  onPick: (pick: "H" | "D" | "A") => void;
}

export const MatchRow = ({ match, selectedBet, isSaving, onPick }: MatchRowProps) => {
  // Форматирование времени начала матча
  const formatMatchTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dd}.${mm} ${hh}:${min}`;
    } catch {
      return dateString;
    }
  };

  const isMatchFinished = match.status === 'finished';
  const isMatchLive = match.status === 'live';
  const canBet = match.status === 'upcoming';

  return (
    <Card className={cn(
      "transition-colors hover:bg-muted/50",
      isMatchLive && "border-green-500 bg-green-50",
      isMatchFinished && "bg-gray-50"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Заголовок матча */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {match.league} • Тур {match.tour}
              </span>
              {isMatchLive && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                  LIVE
                </span>
              )}
              {isMatchFinished && (
                <Trophy className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatMatchTime(match.starts_at)}
            </div>
          </div>

          {/* Команды и счет */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium">{match.home_team}</div>
              <div className="text-sm text-muted-foreground">VS</div>
              <div className="font-medium">{match.away_team}</div>
            </div>

            {/* Счет (если матч завершен) */}
            {(isMatchFinished || isMatchLive) && (
              <div className="text-center">
                <div className="text-lg font-bold">
                  {match.home_score ?? 0} : {match.away_score ?? 0}
                </div>
              </div>
            )}
          </div>

          {/* Кнопки ставок или выбранная ставка */}
          {canBet && (
            <div className="flex gap-2">
              <Button
                variant={selectedBet?.pick === "H" ? "default" : "outline"}
                size="sm"
                onClick={() => onPick("H")}
                disabled={isSaving}
                className="flex-1"
              >
                П1 {match.odd_home && `(${match.odd_home})`}
              </Button>
              <Button
                variant={selectedBet?.pick === "D" ? "default" : "outline"}
                size="sm"
                onClick={() => onPick("D")}
                disabled={isSaving}
                className="flex-1"
              >
                X {match.odd_draw && `(${match.odd_draw})`}
              </Button>
              <Button
                variant={selectedBet?.pick === "A" ? "default" : "outline"}
                size="sm"
                onClick={() => onPick("A")}
                disabled={isSaving}
                className="flex-1"
              >
                П2 {match.odd_away && `(${match.odd_away})`}
              </Button>
            </div>
          )}

          {/* Показать выбранную ставку для завершенных матчей */}
          {!canBet && selectedBet && (
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">
                Ваша ставка: <strong>
                  {selectedBet.pick === "H" ? "П1" : selectedBet.pick === "D" ? "X" : "П2"}
                </strong>
              </span>
              {selectedBet.points !== undefined && (
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded",
                  selectedBet.points === 3 ? "bg-green-100 text-green-800" :
                  selectedBet.points === 1 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {selectedBet.points} очков
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
