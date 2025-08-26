import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaderData } from "@/types/dashboard";

interface LeaderRowProps {
  row: LeaderData;
  index: number;
}

export const LeaderRow = ({ row, index }: LeaderRowProps) => {
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
              {/* Всего ставок - черный фон */}
              <span className="px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center bg-black text-white">
                {row.totalBets}
              </span>
              {/* Угаданные ставки - салатовый фон */}
              <span className="px-3 py-2 text-sm font-medium rounded min-w-[50px] flex items-center justify-center bg-green-50 text-green-900">
                {row.guessedBets}
              </span>
              {/* Процент угаданных - светло-серый фон */}
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

            {/* Дата регистрации */}
            <span className="text-xs text-muted-foreground">
              Зарегистрирован: {row.created ? formatCreatedDate(row.created) : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};