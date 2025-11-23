import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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

  const selectedLeague = !filter.showAll && filter.leagues.length > 0 ? filter.leagues[0] : "";

  const handleSelect = (value: string) => {
    if (value === "__all__") {
      onFilterChange({ leagues: [], showAll: true });
    } else {
      onFilterChange({ leagues: [value], showAll: false });
    }
  };

  const buttonText = filter.showAll ? "Все лиги" : (selectedLeague || "Все лиги");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="inline-flex h-9 w-auto min-w-0 px-3 py-2 text-sm font-normal items-center justify-between"
        >
          <span className="truncate">{buttonText}</span>
          <ChevronDown className="h-4 w-4 ml-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem] p-1">
        <DropdownMenuRadioGroup
          value={filter.showAll ? "__all__" : (selectedLeague || "__all__")}
          onValueChange={handleSelect}
        >
          <DropdownMenuRadioItem value="__all__">Все лиги</DropdownMenuRadioItem>
          <div className="max-h-[300px] overflow-y-auto">
            {availableLeagues.map((league) => (
              <DropdownMenuRadioItem key={league} value={league}>
                {league}
              </DropdownMenuRadioItem>
            ))}
          </div>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
