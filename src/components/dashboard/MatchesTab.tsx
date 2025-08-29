import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MatchRow } from './MatchRow';
import type { Match, Bet } from "@/types/dashboard";
import { useMemo } from "react";

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

  // Пагинация
  const allMatches = Object.values(filteredGroups).flat();
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
      <div className="flex items-center justify-between mb-3">
        <Label className="text-lg font-semibold">Выбор</Label>
        <div className="flex gap-2">
          <Select value={leagueFilter} onValueChange={onLeagueFilterChange}>
            <SelectTrigger className="h-9 inline-flex w-auto min-w-0">
              <SelectValue placeholder="Лига" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все лиги</SelectItem>
              {uniqueLeagues.map(league => (
                <SelectItem key={league} value={league}>
                  {league}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
