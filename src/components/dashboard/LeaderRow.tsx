import { Card, CardContent } from "@/components/ui/card";
import type { LeaderData } from "@/types/dashboard";

interface LeaderRowProps {
  row: LeaderData;
  index: number;
}

export const LeaderRow = ({ row, index }: LeaderRowProps) => (
  <Card className="transition-colors hover:bg-muted/50">
    <CardContent className="p-2">
      <div className="flex flex-col gap-0">
        {/* Строка 1: Имя игрока | Номер | Очки */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {row.name || `Игрок ${row.user_id.slice(-6)}`}
          </span>
          <span className="text-xs text-muted-foreground">
            #{index + 1}
          </span>
          <span className="text-xs font-medium text-green-600">
            {row.points} очков
          </span>
        </div>

        {/* Строка 2: ID игрока */}
        <div className="flex items-center justify-center">
          <span className="text-xs text-center text-muted-foreground">
            ID: {row.user_id.slice(-6)}
          </span>
        </div>

        {/* Строка 3: Статистика */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
            {row.totalBets} ставок
          </span>
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
            {row.guessedBets} точных
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
            {row.successRate}%
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);
