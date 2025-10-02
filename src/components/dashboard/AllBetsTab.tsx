import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
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

    // Поиск по командам и лиге
    const teamMatch = m ? (
      (m.home_team || '').toLowerCase().includes(q) ||
      (m.away_team || '').toLowerCase().includes(q) ||
      (m.league || '').toLowerCase().includes(q)
    ) : false;

    // Поиск по имени игрока
    const playerMatch = (b.display_name || '').toLowerCase().includes(q) ||
                       (b.user_id || '').toLowerCase().includes(q);

    return teamMatch || playerMatch;
  }).sort((a, b) => {
    // Сортировка по времени создания ставки (сначала самые новые)
    const da = a.created ? new Date(a.created).getTime() : 0;
    const db = b.created ? new Date(b.created).getTime() : 0;
    return db - da; // сортировка по убыванию (сначала новые ставки)
  });

  const totalPages = Math.ceil(filteredBets.length / itemsPerPage);
  const paginatedBets = filteredBets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Компактная разметка страниц с троеточиями
  const getCompactPages = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    if (left > 2) pages.push("ellipsis");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < total - 1) pages.push("ellipsis");
    pages.push(total);
    return pages;
  };

  const pagesToRender = getCompactPages(page, totalPages);

  return (
    <>
      <div className="flex justify-between items-center mb-3 gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Поиск по командам или игроку"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary h-9"
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="all-players-switch" className="text-sm whitespace-nowrap cursor-pointer">
            Все игроки
          </Label>
          <Switch
            id="all-players-switch"
            checked={showAllBets}
            onCheckedChange={onShowAllBetsToggle}
          />
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

            {pagesToRender.map((p, idx) => (
              <PaginationItem key={`${p}-${idx}`}>
                {p === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => onPageChange(p as number)}
                  >
                    {p as number}
                  </PaginationLink>
                )}
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
