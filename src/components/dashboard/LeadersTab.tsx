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
        console.log('Available leagues loaded:', leagues);
        setAvailableLeagues(leagues);

        // Загружаем сохраненный фильтр
        const savedFilter = LeagueService.loadLeagueFilter();
        console.log('Saved filter loaded:', savedFilter);
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
    console.log('Applying filter:', leagueFilter);
    console.log('Leaders before filter:', leaders);

    if (leaders.length > 0) {
      const filtered = LeagueService.filterLeadersByLeagues(leaders, leagueFilter);
      console.log('Filtered leaders:', filtered);
      setFilteredLeaders(filtered);
    } else {
      setFilteredLeaders([]);
    }
  }, [leaders, leagueFilter]);

  const handleFilterChange = (newFilter: LeagueFilter) => {
    console.log('Filter changed to:', newFilter);
    setLeagueFilter(newFilter);
    LeagueService.saveLeagueFilter(newFilter);
  };

  const displayedLeaders = filteredLeaders;

  return (
    <>
      <div className="flex items-center justify-between h-9 mb-3">
        <h3 className="text-lg font-semibold leading-none">Таблица лидеров</h3>
        <div className="flex items-center gap-2 w-[160px] justify-end">
          {/* Фильтр лиг (резервируем место, чтобы не было прыжка) */}
          {!loadingLeagues && availableLeagues.length > 0 ? (
            <LeagueFilterComponent
              availableLeagues={availableLeagues}
              filter={leagueFilter}
              onFilterChange={handleFilterChange}
            />
          ) : (
            <div className="h-9 w-[160px]" aria-hidden="true" />
          )}
        </div>
      </div>

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
