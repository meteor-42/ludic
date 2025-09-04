import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Filter } from "lucide-react";
import type { LeagueFilter } from "@/types/dashboard";

interface LeagueFilterDropdownProps {
  availableLeagues: string[];
  filter: LeagueFilter;
  onFilterChange: (filter: LeagueFilter) => void;
}

export const LeagueFilterComponent = ({
  availableLeagues,
  filter,
  onFilterChange
}: LeagueFilterDropdownProps) => {
  const [open, setOpen] = useState(false);

  const handleLeagueToggle = (league: string) => {
    const isCurrentlySelected = !filter.showAll && filter.leagues.includes(league);

    if (isCurrentlySelected) {
      // Remove league from selected
      const newLeagues = filter.leagues.filter(l => l !== league);
      onFilterChange({
        leagues: newLeagues,
        showAll: newLeagues.length === 0
      });
    } else {
      // Add league to selected (automatically disable "All leagues" mode)
      const newLeagues = filter.showAll ? [league] : [...filter.leagues, league];
      onFilterChange({
        leagues: newLeagues,
        showAll: false
      });
    }
  };

  const handleShowAllToggle = () => {
    // Toggle "All leagues" mode
    onFilterChange({
      leagues: [],
      showAll: !filter.showAll
    });
  };

  const handleSelectAll = () => {
    if (filter.leagues.length === availableLeagues.length) {
      // If all are selected, switch to "All leagues" mode
      onFilterChange({
        leagues: [],
        showAll: true
      });
    } else {
      // Select all leagues
      onFilterChange({
        leagues: [...availableLeagues],
        showAll: false
      });
    }
  };

  const activeFiltersCount = filter.showAll ? 0 : filter.leagues.length;

  // Determine button text
  const buttonText = () => {
    if (filter.showAll) {
      return "Все лиги";
    } else if (filter.leagues.length === 1) {
      return filter.leagues[0];
    } else if (filter.leagues.length > 1) {
      return `${filter.leagues.length} лиг`;
    }
    return "Выберите лиги";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[140px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">{buttonText()}</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-1 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Фильтр по лигам</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "All leagues" option */}
        <DropdownMenuCheckboxItem
          checked={filter.showAll}
          onCheckedChange={handleShowAllToggle}
          className="font-medium"
        >
          Все лиги
        </DropdownMenuCheckboxItem>

        {/* "Select all" option - only shown when "All leagues" mode is off */}
        {!filter.showAll && availableLeagues.length > 1 && (
          <>
            <DropdownMenuCheckboxItem
              checked={filter.leagues.length === availableLeagues.length}
              onCheckedChange={handleSelectAll}
              className="text-muted-foreground"
            >
              Выбрать все
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* List of leagues */}
        <div className="max-h-[300px] overflow-y-auto">
          {availableLeagues.map((league) => (
            <DropdownMenuCheckboxItem
              key={league}
              checked={!filter.showAll && filter.leagues.includes(league)}
              onCheckedChange={() => handleLeagueToggle(league)}
            >
              {league}
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        {/* Selected leagues counter */}
        {!filter.showAll && filter.leagues.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">
                Выбрано: {filter.leagues.length} из {availableLeagues.length}
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
