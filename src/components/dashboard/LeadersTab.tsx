import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { LeaderRow } from "./LeaderRow";
import { LeagueFilterComponent } from "./LeagueFilter";
import type { LeaderData, LeagueFilter } from "@/types/dashboard";
import { LeagueService } from "@/services/leagueService";

interface LeadersTabProps {
  leaders: LeaderData[];
  loading: boolean;
  onRefresh: () => void;
}

export const LeadersTab = ({ leaders, loading, onRefresh }: LeadersTabProps) => {
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>({ leagues: [], showAll: true });
  const [filteredLeaders, setFilteredLeaders] = useState<LeaderData[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  // Загружаем доступные лиги при монтировании
  useEffect(() => {
    const loadLeagues = async () => {
      try {
        setLoadingLeagues(true);
        const leagues = await LeagueService.getAvailableLeagues();
        setAvailableLeagues(leagues);

        // Загружаем сохраненный фильтр
        const savedFilter = LeagueService.loadLeagueFilter();
        setLeagueFilter(savedFilter);
      } catch (error) {
        console.error('Error loading leagues:', error);
      } finally {
        setLoadingLeagues(false);
      }
    };

    loadLeagues();
  }, []);

  // Применяем фильтр при изменении лидеров или фильтра
  useEffect(() => {
    if (leaders.length > 0) {
      const filtered = LeagueService.filterLeadersByLeagues(leaders, leagueFilter);
      setFilteredLeaders(filtered);
    } else {
      setFilteredLeaders([]);
    }
  }, [leaders, leagueFilter]);

  const handleFilterChange = (newFilter: LeagueFilter) => {
    setLeagueFilter(newFilter);
    LeagueService.saveLeagueFilter(newFilter);
  };

  const displayedLeaders = filteredLeaders;

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Таблица лидеров</h3>
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

      {/* Фильтр лиг */}
      {!loadingLeagues && availableLeagues.length > 0 && (
        <LeagueFilterComponent
          availableLeagues={availableLeagues}
          filter={leagueFilter}
          onFilterChange={handleFilterChange}
        />
      )}

      {loading ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">
            Загрузка лидеров…
          </CardContent>
        </Card>
      ) : displayedLeaders.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-6">
            {leagueFilter.showAll ?
              "Пока нет данных по лидерам" :
              "Нет лидеров в выбранных лигах"
            }
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedLeaders.map((row, idx) => (
            <LeaderRow key={row.user_id} row={row} index={idx} />
          ))}
        </div>
      )}

      {/* Информация о фильтрации */}
      {!leagueFilter.showAll && displayedLeaders.length > 0 && (
        <Card className="mt-4">
          <CardContent className="text-center text-sm text-muted-foreground py-3">
            Показано {displayedLeaders.length} игроков из {leagueFilter.leagues.length} лиг: {leagueFilter.leagues.join(", ")}
          </CardContent>
        </Card>
      )}
    </>
  );
};
