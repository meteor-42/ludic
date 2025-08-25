import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { User, List, LogOut, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');
pb.autoCancellation(false);

const formatMsk = (iso: string) => {
  try {
    const d = new Date(iso);
    const mskDate = new Date(d.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const wd = weekdays[mskDate.getDay()];
    const dd = String(mskDate.getDate()).padStart(2, '0');
    const mm = String(mskDate.getMonth() + 1).padStart(2, '0');
    const hh = String(mskDate.getHours()).padStart(2, '0');
    const min = String(mskDate.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch {
    return '';
  }
};

const statusLabel = (s?: string) => {
  switch ((s || '').toLowerCase()) {
    case 'live':
      return 'LIVE';
    case 'completed':
      return 'ЗАВЕРШЕНО';
    case 'cancelled':
      return 'ОТМЕНЕН';
    case 'upcoming':
    default:
      return 'ОЖИДАЕТСЯ';
  }
};

const statusClass = (s?: string) => {
  const v = (s || '').toLowerCase();
  if (v === 'live') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  if (v === 'upcoming') return 'bg-emerald-50 text-emerald-700';
  if (v === 'cancelled') return 'bg-rose-50 text-rose-700';
  if (v === 'completed') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

type Match = {
  id: string;
  league: string;
  tour: number;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  is_locked: boolean;
  is_visible?: boolean;
  home_score?: number;
  away_score?: number;
  odd_home?: number;
  odd_draw?: number;
  odd_away?: number;
};

type Bet = {
  id: string; // PB record id
  match_id: string;
  user_id: string;
  pick: "H" | "D" | "A";
  points?: number;
};

type PBUser = { id: string; email?: string; display_name?: string; displayed_name?: string };
type PBUserRecord = { id: string; email?: string; display_name?: string; displayed_name?: string };
type AuthUser = PBUser | null;

type Stats = {
  users: number;
  matches: number;
  liveMatches: number;
  bets: number;
  correctBets: number;
  successRate: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser>(null);
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('activeTab') || "matches");
  const [bets, setBets] = useState<Record<string, Bet>>(() => {
    try {
      const raw = localStorage.getItem('bets');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<Record<string, Match[]>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaders, setLeaders] = useState<Array<{ user_id: string; points: number; name: string; totalBets: number; guessedBets: number; successRate: number }>>([]);
  const [leadersLoading, setLeadersLoading] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historySortDesc, setHistorySortDesc] = useState<boolean>(true);
  const [stats, setStats] = useState<Stats>({ users: 0, matches: 0, liveMatches: 0, bets: 0, correctBets: 0, successRate: 0 });
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [matchesPage, setMatchesPage] = useState<number>(1);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [showAllBets, setShowAllBets] = useState<boolean>(false);
  const itemsPerPage = 8;

  const { toast } = useToast();

  const loadUserBets = async (uid: string) => {
    try {
      // fetch all bets for this user
      const list = await pb.collection('bets').getList<Bet>(1, 200, {
        filter: `user_id = "${uid}"`,
      });
      const mapped: Record<string, Bet> = {};
      for (const it of list.items as any[]) {
        if (it.match_id) mapped[it.match_id] = {
          id: it.id as string,
          match_id: it.match_id as string,
          user_id: it.user_id as string,
          pick: it.pick as "H" | "D" | "A",
          points: it.points as number | undefined,
        };
      }
      setBets(mapped);
      localStorage.setItem('bets', JSON.stringify(mapped));
    } catch (e) {
      console.error(e);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const [usersList, matchesList, betsList] = await Promise.all([
        pb.collection('users').getList(1, 1),
        pb.collection('matches').getList(1, 1000),
        pb.collection('bets').getList(1, 1000)
      ]);

      const liveMatches = matchesList.items.filter(match => match.status === 'live').length;
      const correctBets = betsList.items.filter(bet => (bet.points || 0) > 0).length;
      const successRate = betsList.totalItems > 0 ? Math.round((correctBets / betsList.totalItems) * 100) : 0;

      setStats({
        users: usersList.totalItems,
        matches: matchesList.totalItems,
        liveMatches,
        bets: betsList.totalItems,
        correctBets,
        successRate
      });
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadLeaders = async () => {
    try {
      setLeadersLoading(true);
      const betsList = await pb.collection('bets').getList<Bet>(1, 1000, {});
      const aggPoints = new Map<string, number>();
      const aggTotal = new Map<string, number>();
      const aggGuessed = new Map<string, number>();

      for (const it of betsList.items) {
        const uid = it.user_id as string;
        const pts = Number(it.points || 0);
        aggPoints.set(uid, (aggPoints.get(uid) || 0) + pts);
        aggTotal.set(uid, (aggTotal.get(uid) || 0) + 1);
        if (pts > 0) aggGuessed.set(uid, (aggGuessed.get(uid) || 0) + 1);
      }

      // load all users and merge, show 0 points if absent
      const usersList = await pb.collection('users').getList<PBUserRecord>(1, 1000, {});
      const merged = usersList.items.map((u) => {
        const totalBets = aggTotal.get(u.id) || 0;
        const guessedBets = aggGuessed.get(u.id) || 0;
        const successRate = totalBets > 0 ? Math.round((guessedBets / totalBets) * 100) : 0;

        return {
          user_id: u.id,
          points: aggPoints.get(u.id) || 0,
          name: (u.display_name || u.displayed_name || '').trim() || `ID: ${u.id}`,
          totalBets,
          guessedBets,
          successRate
        };
      });

      merged.sort((a, b) => b.points - a.points);
      setLeaders(merged);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('load leaders aborted');
      } else {
        console.error(e);
        toast({ variant: 'destructive', title: "Ошибка загрузки лидеров", description: "Попробуйте обновить страницу позже", duration: 3500, icon: 'error' as any });
      }
    } finally {
      setLeadersLoading(false);
    }
  };

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    if (!pb.authStore.isValid) {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate("/");
        return;
      }
      const u = JSON.parse(userData) as PBUser;
      setUser(u);
      loadUserBets(u.id);
      loadStats();
      const name = u.display_name || u.email || 'Игрок';
      toast({ title: `Добро пожаловать, ${name}`, description: 'Делайте ваши прогнозы.', duration: 3000, variant: 'default', icon: 'success' as any });
    } else {
      const rec = pb.authStore.record as unknown as PBUser | null;
      setUser(rec);
      if (rec?.id) loadUserBets(rec.id);
      loadStats();
      if (rec) {
        const name = rec.display_name || rec.email || 'Игрок';
        toast({ title: `Добро пожаловать, ${name}`, description: 'Делайте ваши прогнозы.', duration: 3000, variant: 'default', icon: 'success' as any });
      }
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);

    if (activeTab === "leaders") {
      loadLeaders();
    }
  }, [activeTab]);

  useEffect(() => {
    // Загружаем матчи, отсортированные по starts_at, только видимые
    const load = async () => {
      try {
        setLoading(true);
        const list = await pb.collection('matches').getList<Match>(1, 200, {
          sort: 'starts_at',
          filter: 'is_visible = true',
        });
        const items = list.items.slice().sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        setMatches(items);
        // Группировка по лиге и туру (ключ: "Лига • Тур X")
        const g: Record<string, Match[]> = {};
        for (const m of items) {
          const k = `${m.league} • Тур ${m.tour}`;
          if (!g[k]) g[k] = [];
          g[k].push(m);
        }
        setGroups(g);
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') {
          console.warn('load matches aborted');
        } else {
          console.error(e);
          toast({ variant: 'destructive', title: "Ошибка загрузки матчей", description: "Попробуйте обновить страницу позже", duration: 3500, icon: 'error' as any });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    // Очистка локальной авторизации, но НЕ стираем ставки и активную вкладку
    pb.authStore.clear();
    localStorage.removeItem('user');
    navigate("/");
  };

  const handlePick = async (match: Match, pick: "H" | "D" | "A") => {
    if (!user) return;
    const uid = user.id ?? user?.id;
    const current = bets[match.id];
    try {
      setSaving((s) => ({ ...s, [match.id]: true }));
      if (current) {
        // find and update existing record
        // first, find record id
        const found: { id: string } = await pb.collection('bets').getFirstListItem(`user_id = "${uid}" && match_id = "${match.id}"`);
        await pb.collection('bets').update(found.id as string, { pick });
        // persist id locally
        setBets((prev) => ({
          ...prev,
          [match.id]: { ...(prev[match.id] || {} as any), id: found.id, match_id: match.id, user_id: uid, pick },
        }));
        localStorage.setItem('bets', JSON.stringify({
          ...bets,
          [match.id]: { ...(bets[match.id] || {} as any), id: found.id, match_id: match.id, user_id: uid, pick },
        }));
      } else {
        const created = await pb.collection('bets').create({
          match_id: match.id,
          user_id: uid,
          pick,
        });
        // persist id locally
        setBets((prev) => ({
          ...prev,
          [match.id]: {
            id: (created as any)?.id || "",
            match_id: match.id,
            user_id: uid,
            pick,
          },
        }));
        localStorage.setItem('bets', JSON.stringify({
          ...bets,
          [match.id]: {
            id: (created as any)?.id || "",
            match_id: match.id,
            user_id: uid,
            pick,
          }
        }));
      }
     const pickLabel = pick === 'H' ? 'П1' : pick === 'D' ? 'Х' : 'П2';
      const odd = pick === 'H' ? match.odd_home : pick === 'D' ? match.odd_draw : match.odd_away;
      const suffix = odd != null ? ` • ${pickLabel} (${odd.toFixed(2)})` : ` • ${pickLabel}`;
      toast({ title: `${match.home_team} — ${match.away_team}${suffix}`, description: 'Ваш выбор учтен. Удачи.', duration: 2500, icon: 'success' as any });
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('bet save aborted');
      } else {
        console.error(e);
        toast({ variant: 'destructive', title: "Не удалось сохранить ставку", description: "Повторите попытку через минуту", duration: 3500, icon: 'error' as any });
      }
    } finally {
      setSaving((s) => ({ ...s, [match.id]: false }));
    }
  };

  const StatCard = ({ value, label }: { value: number | string; label: string }) => (
    <div className="flex flex-col items-center justify-center w-20 h-20 bg-background border border-border rounded-lg overflow-hidden">
      <div className="flex-1 flex items-center justify-center w-full">
        <span className="text-xl">{statsLoading ? "..." : value}</span>
      </div>
      <Separator />
      <div className="w-full bg-muted/30 px-2 py-1 flex items-center justify-center">
        <span className="text-xs text-muted-foreground ">{label}</span>
      </div>
    </div>
  );

  const Header = () => (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-3 py-1 text-[10px] font-semibold uppercase tracking-wide bg-foreground text-background border border-foreground [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]">
          почувствуй разницу
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2">
          <StatCard value={stats.users} label="Игроки" />
          <StatCard value={stats.matches} label="События" />
          <StatCard value={stats.liveMatches} label="LIVE" />
          <StatCard value={stats.bets} label="Ставки" />
          <StatCard value={stats.correctBets} label="Верные" />
          <StatCard value={`${stats.successRate}%`} label="Успех" />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );

const Chip = ({
  label,
  selected,
  onClick,
  disabled,
  odd,
}: { label: string; selected: boolean; onClick: () => void; disabled?: boolean; odd?: number }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "px-4 py-3 rounded-md border transition-colors h-10 w-10 flex flex-col items-center justify-center", // Увеличил размеры
      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <span className="text-base">{label}</span> {/* Увеличил текст */}
    {odd != null && (
      <span className="text-xs text-muted-foreground mt-1">{odd.toFixed(2)}</span> // Добавил отступ сверху
    )}
  </button>
);

  const MatchRow = ({ m, index }: { m: Match; index?: number }) => {
    const selected = bets[m.id]?.pick;
    const disabled = (m.is_locked ?? false) || (m.status ? m.status !== 'upcoming' : false);
    const isSaving = !!saving[m.id];

    // Результат матча
    const hasResult = ['live','completed'].includes((m.status||'').toLowerCase()) && typeof m.home_score === 'number' && typeof m.away_score === 'number';
    const result = hasResult ? `${m.home_score} — ${m.away_score}` : null;

    // Прогноз пользователя
    const forecast = selected ? (selected === 'H' ? 'П1' : selected === 'D' ? 'Х' : 'П2') : '—';

    return (
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-2">
          <div className="flex flex-col gap-0">
            {/* Строка 1: Номер | Дата/Лига/Тур | Статус */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {typeof index === 'number' ? `${index + 1} • М${m.id}` : `М${m.id}`}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {formatMsk(m.starts_at)}
                </span>
                <span className="text-muted-foreground">︙</span>
                <span className="text-xs text-muted-foreground">
                  {m.league}{typeof m.tour === 'number' ? ` Тур ${m.tour}` : ''}
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded",
                statusClass(m.status)
              )}>
                {statusLabel(m.status)}
              </span>
            </div>

            {/* Строка 2: Команды */}
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-center truncate">
                {m.home_team} ～ {m.away_team}
              </span>
            </div>

            {/* Строка 3: Результат (только если есть) */}
            {hasResult && (
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-center">
                  {result}
                </span>
              </div>
            )}

            {/* Строка 4: Прогноз */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {!disabled ? (
                <>
                  <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={isSaving} onClick={() => handlePick(m, 'H')} />
                  <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={isSaving} onClick={() => handlePick(m, 'D')} />
                  <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={isSaving} onClick={() => handlePick(m, 'A')} />
                </>
              ) : (
                <span className="text-sm text-center text-muted-foreground">
                  {forecast}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const LeaderRow = ({ row, index }: { row: { user_id: string; points: number; name: string; totalBets: number; guessedBets: number; successRate: number }; index: number }) => (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-2">
        <div className="flex flex-col gap-0">
          {/* Строка 1: Имя игрока | Номер | Очки */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {row.name || `Игрок ${row.user_id.slice(-6)}`}
            </span>
            <span className="text-xs text-muted-foreground">
              #{index + 1}
            </span>
            <span className="text-xs font-medium text-green-600">
              {row.points} очков
            </span>
          </div>

          {/* Строка 2: ID игрока */}
          <div className="flex items-center justify-center">
            <span className="text-xs text-center text-muted-foreground">
              ID: {row.user_id.slice(-6)}
            </span>
          </div>

          {/* Строка 3: Статистика */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
              {row.totalBets} ставок
            </span>
            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
              {row.guessedBets} точных
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
              {row.successRate}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BetRow = ({ b, index, m }: { b: Bet; index: number; m?: Match }) => {
    // Результат матча
    const hasResult = ['completed'].includes((m?.status||'').toLowerCase()) && typeof m?.home_score === 'number' && typeof m?.away_score === 'number';
    const result = hasResult ? `${m?.home_score} — ${m?.away_score}` : null;

    // Прогноз из ставки
    const forecast = b.pick === 'H' ? 'П1' : b.pick === 'D' ? 'Х' : 'П2';

    return (
      <Card key={b.match_id} className="transition-colors hover:bg-muted/50">
        <CardContent className="p-2">
          <div className="flex flex-col gap-0">
            {/* Строка 1: Номер | Дата/Лига/Тур | Статус */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {index + 1} • С{b.id?.slice(-6) || '—'}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {m ? formatMsk(m.starts_at) : '—'}
                </span>
                <span className="text-muted-foreground">︙</span>
                <span className="text-xs text-muted-foreground">
                  {(m?.league || typeof m?.tour === 'number') ?
                    `${m?.league}${typeof m?.tour === 'number' ? ` Тур ${m?.tour}` : ''}` :
                    '—'
                  }
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded",
                m?.status ? statusClass(m.status) : "bg-slate-100 text-slate-700"
              )}>
                {m?.status ? statusLabel(m.status) : '—'}
              </span>
            </div>

            {/* Строка 2: Команды */}
            <div className="flex items-center justify-center mt-1">
              <span className="text-sm font-medium text-center truncate">
                {m?.home_team && m?.away_team ? `${m.home_team} — ${m.away_team}` : '—'}
              </span>
            </div>

            {/* Строка 3: Результат (только если есть) */}
            {hasResult && (
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-center">
                  {result}
                </span>
              </div>
            )}

            {/* Строка 4: Прогноз */}
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-secondary text-foreground text-xs rounded">
                {forecast}
              </span>
              {typeof b.points === 'number' && b.points > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                  +{b.points} очков
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Получаем уникальные лиги для фильтра
  const uniqueLeagues = Array.from(new Set(matches.map(m => m.league))).sort();

  // Получаем уникальные туры для фильтра
  const uniqueTours = Array.from(new Set(matches.map(m => m.tour))).sort((a, b) => a - b);

  // Фильтруем матчи по лиге и туру
  const filteredGroups = Object.fromEntries(
    Object.entries(groups).filter(([key]) => {
      if (leagueFilter !== "all" && !key.includes(leagueFilter)) return false;
      if (tourFilter !== "all" && !key.includes(`Тур ${tourFilter}`)) return false;
      return true;
    })
  );

  // Пагинация для матчей
  const allMatches = Object.values(filteredGroups).flat();
  const totalMatchesPages = Math.ceil(allMatches.length / itemsPerPage);
  const paginatedMatches = allMatches.slice(
    (matchesPage - 1) * itemsPerPage,
    matchesPage * itemsPerPage
  );

  // Загрузка всех ставок для отображения в истории
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [allBetsLoading, setAllBetsLoading] = useState<boolean>(false);

  const loadAllBets = async () => {
    try {
      setAllBetsLoading(true);
      const betsList = await pb.collection('bets').getList<Bet>(1, 1000, {});
      setAllBets(betsList.items as Bet[]);
    } catch (e) {
      console.error('Ошибка загрузки всех ставок:', e);
    } finally {
      setAllBetsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "all-bets" && showAllBets) {
      loadAllBets();
    }
  }, [activeTab, showAllBets]);

  // Фильтрация ставок для истории
  const betsToShow = showAllBets ? allBets : Object.values(bets);

  const filteredBets = betsToShow.filter((b) => {
    if (!historyFilter) return true;
    const q = historyFilter.toLowerCase();
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
    return historySortDesc ? db - da : da - db;
  });

  const totalHistoryPages = Math.ceil(filteredBets.length / itemsPerPage);
  const paginatedBets = filteredBets.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-3xl mx-auto">
        <Header />
        <Separator className="mb-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Матчи</TabsTrigger>
            <TabsTrigger value="leaders">Лидеры</TabsTrigger>
            <TabsTrigger value="all-bets">История</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="text-center text-muted-foreground py-6">
                  Загрузка…
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Фильтр по лиге и туру */}
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Выбор</Label>
                  <div className="flex gap-2">
                    <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                      <SelectTrigger className="w-[140px] h-9">
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
                    <Select value={tourFilter} onValueChange={setTourFilter}>
                      <SelectTrigger className="w-[100px] h-9">
                        <SelectValue placeholder="Тур" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все туры</SelectItem>
                        {uniqueTours.map(tour => (
                          <SelectItem key={tour} value={tour.toString()}>
                            Тур {tour}
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
                    <MatchRow key={m.id} m={m} index={idx} />
                  ))}
                </div>

                {totalMatchesPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setMatchesPage(prev => Math.max(1, prev - 1))}
                          className={matchesPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalMatchesPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === matchesPage}
                            onClick={() => setMatchesPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setMatchesPage(prev => Math.min(totalMatchesPages, prev + 1))}
                          className={matchesPage === totalMatchesPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaders" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Таблица лидеров</h3>
              <Button
                variant="outline"
                onClick={loadLeaders}
                disabled={leadersLoading}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${leadersLoading ? 'animate-spin' : ''}`} />
                {leadersLoading ? "Обновление..." : "Обновить"}
              </Button>
            </div>

            {leadersLoading ? (
              <Card>
                <CardContent className="text-center text-muted-foreground py-8">
                  Загрузка лидеров…
                </CardContent>
              </Card>
            ) : leaders.length === 0 ? (
              <Card>
                <CardContent className="text-center text-muted-foreground py-6">
                  Пока нет данных по лидерам
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {leaders.map((row, idx) => (
                  <LeaderRow key={row.user_id} row={row} index={idx} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-bets" className="mt-4">
            <div className="flex justify-between items-center mb-3 gap-2">
              <input
                type="text"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="Поиск по командам"
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary h-9"
              />
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Все игроки:</Label>
                <Button
                  variant={showAllBets ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllBets(!showAllBets)}
                  className="h-9"
                >
                  {showAllBets ? "Да" : "Нет"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {allBetsLoading ? (
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
                    return <BetRow key={`${b.id}-${b.user_id}`} b={b} index={idx} m={m} />;
                  })}
                </>
              )}
            </div>

            {totalHistoryPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      className={historyPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === historyPage}
                        onClick={() => setHistoryPage(page)}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                      className={historyPage === totalHistoryPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}