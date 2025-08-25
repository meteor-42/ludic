import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { BetRow } from "./BetRow";
import type { Bet, Match } from "@/types/dashboard";

interface AllBetsTabProps {
  bets: Bet[];
  matches: Match[];
  loading: boolean;
  filter: string;
  showAllBets: boolean;
  page: number;
  itemsPerPage: number;
  onFilterChange: (value: string) => void;
  onShowAllBetsToggle: () => void;
  onPageChange: (page: number) => void;
}

export const AllBetsTab = ({
  bets,
  matches,
  loading,
  filter,
  showAllBets,
  page,
  itemsPerPage,
  onFilterChange,
  onShowAllBetsToggle,
  onPageChange
}: AllBetsTabProps) => {
  // Фильтрация ставок
  const filteredBets = bets.filter((b) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const m = matches.find(mm => mm.id === b.match_id);
    const teamMatch = m ? (
      (m.home_team || '').toLowerCase().includes(q) ||
      (m.away_team || '').toLowerCase().includes(q) ||
      (m.league || '').toLowerCase().includes(q)
    ) : false;
    return teamMatch;
  }).sort((a, b) => {
    const ma = matches.find(mm => mm.id === a.match_id);
    const mb = matches.find(mm => mm.id === b.match_id);
    const da = ma ? new Date(ma.starts_at).getTime() : 0;
    const db = mb ? new Date(mb.starts_at).getTime() : 0;
    return db - da; // сортировка по убыванию (сначала новые)
  });

  const totalPages = Math.ceil(filteredBets.length / itemsPerPage);
  const paginatedBets = filteredBets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <>
      <div className="flex justify-between items-center mb-3 gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Поиск по командам"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary h-9"
        />
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Все игроки:</Label>
          <Button
            variant={showAllBets ? "default" : "outline"}
            size="sm"
            onClick={onShowAllBetsToggle}
            className="h-9"
          >
            {showAllBets ? "Да" : "Нет"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="text-muted-foreground py-6 text-center">
              Загрузка всех ставок…
            </CardContent>
          </Card>
        ) : filteredBets.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-6 text-center">
              Пока нет ставок.
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedBets.map((b, idx) => {
              const m = matches.find(mm => mm.id === b.match_id);
              return <BetRow key={`${b.id}-${b.user_id}`} bet={b} index={idx} match={m} />;
            })}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
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
    </>
  );
};
