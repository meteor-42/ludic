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
import { ChevronDown } from "lucide-react";
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
      // Убираем лигу из выбранных
      const newLeagues = filter.leagues.filter(l => l !== league);
      onFilterChange({
        leagues: newLeagues,
        showAll: newLeagues.length === 0
      });
    } else {
      // Добавляем лигу к выбранным (автоматически отключаем режим "Все лиги")
      const newLeagues = filter.showAll ? [league] : [...filter.leagues, league];
      onFilterChange({
        leagues: newLeagues,
        showAll: false
      });
    }
  };

  const handleShowAllToggle = () => {
    // Переключаем режим "Все лиги"
    onFilterChange({
      leagues: [],
      showAll: !filter.showAll
    });
  };

  const activeFiltersCount = filter.showAll ? 0 : filter.leagues.length;

  // Определяем текст для кнопки
  const buttonText = () => {
    if (filter.showAll) {
      return "Все лиги";
    } else if (filter.leagues.length === 1) {
      return filter.leagues[0];
    } else if (filter.leagues.length > 1) {
      return "Выбрано лиг"; // Изменено: убрали отображение количества
    }
    return "Выберите лиги";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="inline-flex h-9 w-auto min-w-0 px-3 py-2 text-sm font-normal items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {/* Убрали иконку фильтра */}
            <span className="text-sm">{buttonText()}</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFiltersCount} {/* Оставили только число */}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] p-1">
        <DropdownMenuLabel className="px-3 py-2 text-sm font-normal">Фильтр:</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Опция "Все лиги" */}
        <DropdownMenuCheckboxItem
          checked={filter.showAll}
          onCheckedChange={handleShowAllToggle}
          className="font-medium"
        >
          Все лиги
        </DropdownMenuCheckboxItem>

        {/* Постоянный разделитель после "Все лиги" */}
        <DropdownMenuSeparator />

        {/* Список лиг */}
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
