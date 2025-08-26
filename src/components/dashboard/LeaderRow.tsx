import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaderData } from "@/types/dashboard";

interface LeaderRowProps {
  row: LeaderData;
  index: number;
}

export const LeaderRow = ({ row, index }: LeaderRowProps) => (
  <Card className="transition-colors hover:bg-muted/50">
    <CardContent className="p-3">
      <div className="flex flex-col gap-2">
        {/* Строка 1: Номер порядковый | Очки */}
        <div className="flex items-center justify-between h-5">
          <span className="text-xs font-medium text-muted-foreground flex items-center h-5">
           № {index + 1}
          </span>
          <span className="text-xs font-medium text-green-600 flex items-center h-5">
            ОЧКИ - {row.points}
          </span>
        </div>

        {/* Строка 2: Имя игрока по центру */}
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-center truncate">
            {row.name || `Игрок ${row.user_id.slice(-6)}`}
          </span>
        </div>

        {/* Строка 3: Статистика справа внизу | ID слева внизу */}
        <div className="flex items-center justify-between h-5">
          {/* ID игрока слева */}
          <span className="text-xs text-muted-foreground flex items-center h-5">
            ID: {row.user_id.slice(-6)}
          </span>

          {/* Бейджи со статистикой справа */}
          <div className="flex items-center gap-1 h-5">
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium h-5 flex items-center justify-center">
              {row.totalBets} - СТАВОК
            </span>
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium h-5 flex items-center justify-center">
              {row.guessedBets} - ВЕРНО
            </span>
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium h-5 flex items-center justify-center">
              {row.successRate}% - ТОЧНОСТЬ
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
