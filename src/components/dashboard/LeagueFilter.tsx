import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import type { LeagueFilter } from "@/types/dashboard";

interface LeagueFilterProps {
  availableLeagues: string[];
  filter: LeagueFilter;
  onFilterChange: (filter: LeagueFilter) => void;
}

export const LeagueFilterComponent = ({
  availableLeagues,
  filter,
  onFilterChange
}: LeagueFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLeagueToggle = (league: string, checked: boolean) => {
    const newLeagues = checked
      ? [...filter.leagues, league]
      : filter.leagues.filter(l => l !== league);

    onFilterChange({
      leagues: newLeagues,
      showAll: newLeagues.length === 0
    });
  };

  const handleShowAllToggle = (checked: boolean) => {
    onFilterChange({
      leagues: checked ? [] : availableLeagues,
      showAll: checked
    });
  };

  const clearFilters = () => {
    onFilterChange({
      leagues: [],
      showAll: true
    });
  };

  const activeFiltersCount = filter.showAll ? 0 : filter.leagues.length;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Фильтр по лигам
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Очистить
          </Button>
        )}
      </div>

      {isExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Выберите лиги для отображения</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Показать все */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-all"
                  checked={filter.showAll}
                  onCheckedChange={(checked) => handleShowAllToggle(checked as boolean)}
                />
                <label
                  htmlFor="show-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Все лиги
                </label>
              </div>

              {/* Отдельные лиги */}
              <div className="pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableLeagues.map((league) => (
                    <div key={league} className="flex items-center space-x-2">
                      <Checkbox
                        id={`league-${league}`}
                        checked={!filter.showAll && filter.leagues.includes(league)}
                        disabled={filter.showAll}
                        onCheckedChange={(checked) =>
                          handleLeagueToggle(league, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`league-${league}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {league}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Активные фильтры */}
      {activeFiltersCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-1 mt-2">
          {filter.leagues.map((league) => (
            <Badge key={league} variant="outline" className="text-xs">
              {league}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => handleLeagueToggle(league, false)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
