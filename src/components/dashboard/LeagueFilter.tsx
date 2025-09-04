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
    console.log('Toggle league:', league);
    console.log('Current filter:', filter);

    const isCurrentlySelected = !filter.showAll && filter.leagues.includes(league);
    console.log('Is currently selected:', isCurrentlySelected);

    if (isCurrentlySelected) {
      // Убираем лигу из выбранных
      const newLeagues = filter.leagues.filter(l => l !== league);
      console.log('New leagues after removing:', newLeagues);
      onFilterChange({
        leagues: newLeagues,
        showAll: newLeagues.length === 0
      });
    } else {
      // Добавляем лигу к выбранным (автоматически отключаем режим "Все лиги")
      const newLeagues = filter.showAll ? [league] : [...filter.leagues, league];
      console.log('New leagues after adding:', newLeagues);
      onFilterChange({
        leagues: newLeagues,
        showAll: false
      });
    }
  };

  const handleShowAllToggle = () => {
    console.log('Toggle Show All');
    // Переключаем режим "Все лиги"
    onFilterChange({
      leagues: [],
      showAll: !filter.showAll
    });
  };

  const handleSelectAll = () => {
    console.log('Toggle Select All');
    if (filter.leagues.length === availableLeagues.length) {
      // Если все выбраны, переключаем на режим "Все лиги"
      onFilterChange({
        leagues: [],
        showAll: true
      });
    } else {
      // Выбираем все лиги
      onFilterChange({
        leagues: [...availableLeagues],
        showAll: false
      });
    }
  };

  const activeFiltersCount = filter.showAll ? 0 : filter.leagues.length;

  // Определяем текст для кнопки
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

        {/* Опция "Все лиги" */}
        <DropdownMenuCheckboxItem
          checked={filter.showAll}
          onCheckedChange={handleShowAllToggle}
          className="font-medium"
        >
          Все лиги
        </DropdownMenuCheckboxItem>

        {/* Опция "Выбрать все" - показываем только когда режим "Все лиги" отключен */}
        {!filter.showAll && availableLeagues.length > 1 && (
          <>
            <DropdownMenuCheckboxItem
              checked={filter.leagues.length === availableLeagues.length}
              onCheckedChange={handleSelectAll}
              className="text-muted-foreground"
            >
            </DropdownMenuCheckboxItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Подсказка для пользователя */}
        {filter.showAll && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">
                Выберите отдельную лигу
              </p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Список лиг - теперь всегда активны */}
        <div className="max-h-[300px] overflow-y-auto">
          {availableLeagues.map((league) => (
            <DropdownMenuCheckboxItem
              key={league}
              checked={!filter.showAll && filter.leagues.includes(league)}
              onCheckedChange={() => handleLeagueToggle(league)}
              // Убрали disabled состояние
            >
              {league}
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        {/* Счетчик выбранных лиг */}
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
