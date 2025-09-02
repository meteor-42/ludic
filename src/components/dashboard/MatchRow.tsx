import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderData, LeagueStats } from "@/types/dashboard";

interface LeaderRowProps {
  row: LeaderData;
  index: number;
}

export const LeaderRow = ({ row, index }: LeaderRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Форматирование даты регистрации
  const formatCreatedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    } catch {
      return dateString;
    }
  };

  const hasLeagueStats = row.leagueStats && row.leagueStats.length > 0;

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          {/* Строка 1: Номер порядковый | Очки */}
          <div className="flex items-center justify-between h-5">
            {/* Черный бейдж для порядкового номера */}
            <span className="px-2 py-1 bg-black text-white text-xs font-medium rounded h-5 flex items-center justify-center">
              № {index + 1}
            </span>
            <span className="px-2 py-1 text-[10px] font-medium rounded h-5 flex items-center justify-center">
              ОЧКИ - {row.points}
            </span>
          </div>

          {/* Строка 2: Имя игрока (слева) и статистика (справа) */}
          <div className="flex items-center justify-between gap-2">
            {/* Имя игрока - прижато к левому краю */}
            <span className="text-sm font-medium truncate flex-1">
              {row.name || `Игрок ${row.user_id.slice(-6)}`}
            </span>

            {/* Статистика - прижата к правому краю с рамкой */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1 bg-white">
              {/* Рассчитанные ставки (1 или 3 очка) | все ставки - черный фон */}
              <span className="px-3 py-2 text-sm font-medium rounded min-w-[70px] flex items-center justify-center bg-black text-white">
                {row.totalBets}/{row.allBets ?? row.totalBets}
              </span>
              {/* Угаданные ставки (только 3 очка) - зеленый фон */}
              <span className="px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center bg-green-50 text-green-900">
                {row.guessedBets}
              </span>
              {/* Процент угаданных от рассчитанных - серый фон */}
              <span className="px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center bg-muted text-gray-900">
                {row.successRate}%
              </span>
            </div>
          </div>

          {/* Строка 3: ID в бейдже и дата регистрации */}
          <div className="flex items-center justify-between h-5">
            {/* Бейдж с ID игрока */}
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded h-5 flex items-center justify-center">
              ID : {row.user_id.slice(-6)}
            </span>

            <div className="flex items-center gap-2">
              {/* Дата регистрации */}
              <span className="text-xs text-muted-foreground">
                Зарегистрирован: {row.created ? formatCreatedDate(row.created) : '—'}
              </span>

              {/* Кнопка разворота статистики по лигам */}
              {hasLeagueStats && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-5 w-5 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Развернутая статистика по лигам */}
          {isExpanded && hasLeagueStats && (
            <div className="border-t pt-3 mt-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Статистика по лигам:
              </div>
              <div className="space-y-2">
                {row.leagueStats!.map((league: LeagueStats) => (
                  <div
                    key={league.league}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{league.league}</span>
                      <span className="text-xs text-muted-foreground">
                        {league.points} очков
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Статистика ставок */}
                      <span className="px-2 py-1 text-xs bg-black text-white rounded min-w-[50px] flex items-center justify-center">
                        {league.totalBets}/{league.allBets}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-50 text-green-900 rounded min-w-[35px] flex items-center justify-center">
                        {league.guessedBets}
                      </span>
                      <span className="px-2 py-1 text-xs bg-muted text-gray-900 rounded min-w-[40px] flex items-center justify-center">
                        {league.successRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
