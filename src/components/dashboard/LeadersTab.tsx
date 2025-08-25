import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { LeaderRow } from "./LeaderRow";
import type { LeaderData } from "@/types/dashboard";

interface LeadersTabProps {
  leaders: LeaderData[];
  loading: boolean;
  onRefresh: () => void;
}

export const LeadersTab = ({ leaders, loading, onRefresh }: LeadersTabProps) => {
  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Таблица</h3>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="h-9"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Обновление..." : "Обновить"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">
            Загрузка лидеров…
          </CardContent>
        </Card>
      ) : leaders.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-6">
            Пока нет данных по лидерам
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaders.map((row, idx) => (
            <LeaderRow key={row.user_id} row={row} index={idx} />
          ))}
        </div>
      )}
    </>
  );
};
