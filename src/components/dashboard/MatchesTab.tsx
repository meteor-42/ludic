import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MatchRow } from './MatchRow';
import type { Match, Bet } from "@/types/dashboard";
import { useMemo, useState } from "react";

interface MatchesTabProps {
  matches: Match[];
  bets: Record<string, Bet>;
  saving: Record<string, boolean>;
  loading: boolean;
  leagueFilter: string;
  page: number;
  itemsPerPage: number;
  onLeagueFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPick: (match: Match, pick: "H" | "D" | "A") => void;
}

export const MatchesTab = ({
  matches,
  bets,
  saving,
  loading,
  leagueFilter,
  page,
  itemsPerPage,
  onLeagueFilterChange,
  onPageChange,
  onPick
}: MatchesTabProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Группировка матчей
  const upcomingMatches = useMemo(() => matches.filter(m => m.status === 'upcoming'), [matches]);
  const groups: Record<string, Match[]> = {};
  for (const m of upcomingMatches) {
    const k = `${m.league} • Тур ${m.tour}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(m);
  }

  // Получаем уникальные лиги и туры
  const uniqueLeagues = Array.from(new Set(upcomingMatches.map(m => m.league))).sort();

  // Фильтруем группы
  const filteredGroups = Object.fromEntries(
    Object.entries(groups).filter(([key]) => {
      if (leagueFilter !== "all" && !key.includes(leagueFilter)) return false;
      return true;
    })
  );

  // Пагинация с сортировкой по времени начала матчей (ближайшие наверху)
  const allMatches = Object.values(filteredGroups)
    .flat()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const totalPages = Math.ceil(allMatches.length / itemsPerPage);
  const paginatedMatches = allMatches.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-6">
          Загрузка…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Фильтр по лиге и туру */}
      <div className="flex items-center justify-between h-9 mb-3">
        <Label className="text-lg font-semibold leading-none">Выбор</Label>
        <div className="flex gap-2 justify-end">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="inline-flex h-9 w-auto min-w-0 px-3 py-2 text-sm font-normal items-center justify-between"
              >
                <span className="truncate">{leagueFilter === "all" ? "Все лиги" : leagueFilter}</span>
                <ChevronDown className="h-4 w-4 ml-3 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem] p-1">
              <DropdownMenuRadioGroup
                value={leagueFilter}
                onValueChange={onLeagueFilterChange}
              >
                <DropdownMenuRadioItem value="all">Все лиги</DropdownMenuRadioItem>
                <div className="max-h-[300px] overflow-y-auto">
                  {uniqueLeagues.map((league) => (
                    <DropdownMenuRadioItem key={league} value={league}>
                      {league}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {Object.keys(filteredGroups).length === 0 && (
        <Card>
          <CardContent className="text-center text-muted-foreground py-6">
            Нет матчей в выбранной лиге.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {paginatedMatches.map((m, idx) => (
          <MatchRow
            key={m.id}
            match={m}
            index={idx}
            selectedBet={bets[m.id]}
            isSaving={!!saving[m.id]}
            onPick={(pick) => onPick(m, pick)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === page}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
