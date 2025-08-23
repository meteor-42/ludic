import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, List, LogOut } from "lucide-react";

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');
pb.autoCancellation(false);

const formatMsk = (iso: string) => {
  try {
    const d = new Date(iso);
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const wd = weekdays[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${wd} ${dd}.${mm} ${hh}:${min} (UTC)`;
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
  points_earned?: number;
};

type PBUser = { id: string; email?: string; display_name?: string; displayed_name?: string };
type PBUserRecord = { id: string; email?: string; display_name?: string; displayed_name?: string };

type AuthUser = PBUser | null;

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
  const [leaders, setLeaders] = useState<Array<{ user_id: string; points: number; name: string; totalBets: number; guessedBets: number }>>([]);
  const [leadersLoading, setLeadersLoading] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historySortDesc, setHistorySortDesc] = useState<boolean>(true);

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
          points_earned: it.points_earned as number | undefined,
        };
      }
      setBets(mapped);
      localStorage.setItem('bets', JSON.stringify(mapped));
    } catch (e) {
      console.error(e);
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
      const name = u.display_name || u.email || 'Игрок';
      toast.success(`Добро пожаловать, ${name}`, { description: 'Делайте ваши прогнозы.' , duration: 3000});
    } else {
      const rec = pb.authStore.record as unknown as PBUser | null;
      setUser(rec);
      if (rec?.id) loadUserBets(rec.id);
      if (rec) {
        const name = rec.display_name || rec.email || 'Игрок';
        toast.success(`Добро пожаловать, ${name}`, { description: 'Делайте ваши прогнозы.', duration: 3000 });
      }
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Загружаем матчи, отсортированные по starts_at, только видимые
    const load = async () => {
      try {
        setLoading(true);
        toast.success("Загрузка матчей…", { description: "Подтягиваем список матчей", duration: 2000 });
        const list = await pb.collection('matches').getList<Match>(1, 200, {
          sort: 'starts_at',
          filter: 'is_visible = true',
        });
        const items = list.items.slice().sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        console.log('[matches] loaded:', items.length, items[0]);
        setMatches(items);
        // Группировка по лиге и туру (ключ: "Лига • Тур X")
        const g: Record<string, Match[]> = {};
        for (const m of items) {
          const k = `${m.league} • Тур ${m.tour}`;
          if (!g[k]) g[k] = [];
          g[k].push(m);
        }
        setGroups(g);
        toast.success("Матчи загружены", { description: `Найдено: ${items.length}`, duration: 2500 });
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') {
          console.warn('load matches aborted');
        } else {
          console.error(e);
          toast.error("Ошибка загрузки матчей", { description: "Попробуйте обновить страницу позже", duration: 3500 });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadLeaders = async () => {
      try {
        setLeadersLoading(true);
        const betsList = await pb.collection('bets').getList<Bet>(1, 1000, {});
        const aggPoints = new Map<string, number>();
        const aggTotal = new Map<string, number>();
        const aggGuessed = new Map<string, number>();
        for (const it of betsList.items) {
          const uid = it.user_id as string;
          const pts = Number(it.points_earned || 0);
          aggPoints.set(uid, (aggPoints.get(uid) || 0) + pts);
          aggTotal.set(uid, (aggTotal.get(uid) || 0) + 1);
          if (pts > 0) aggGuessed.set(uid, (aggGuessed.get(uid) || 0) + 1);
        }
        // load all users and merge, show 0 points if absent
        const usersList = await pb.collection('users').getList<PBUserRecord>(1, 1000, {});
        const merged = usersList.items.map((u) => ({
          user_id: u.id,
          points: aggPoints.get(u.id) || 0,
          name: (u.display_name || u.displayed_name || '').trim() || `ID: ${u.id}`,
          totalBets: aggTotal.get(u.id) || 0,
          guessedBets: aggGuessed.get(u.id) || 0,
        }));
        merged.sort((a, b) => b.points - a.points);
        setLeaders(merged);
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') {
          console.warn('load leaders aborted');
        } else {
          console.error(e);
        }
      } finally {
        setLeadersLoading(false);
      }
    };
    loadLeaders();
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
      toast.success(`${match.home_team} — ${match.away_team}${suffix}`, { description: 'Ваш выбор учтен. Удачи.', duration: 2500 });
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('bet save aborted');
      } else {
        console.error(e);
        toast.error("Не удалось сохранить ставку", { description: "Повторите попытку через минуту", duration: 3500 });
      }
    } finally {
      setSaving((s) => ({ ...s, [match.id]: false }));
    }
  };

  const Header = () => (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-foreground text-background border border-foreground [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]">
          чувствуй разницу
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" title="Профиль">
          <User className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Список">
          <List className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
          <LogOut className="h-5 w-5" />
        </Button>
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
        "px-3 py-1.5 rounded-md border text-sm transition-colors",
        selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span>{label}</span>
      {odd != null && (
        <span className="ml-2 text-xs text-muted-foreground">{odd.toFixed(2)}</span>
      )}
    </button>
  );

  const MatchRow = ({ m, index }: { m: Match; index?: number }) => {
    const selected = bets[m.id]?.pick;
    const disabled = (m.is_locked ?? false) || (m.status ? m.status !== 'upcoming' : false);
    const isSaving = !!saving[m.id];
    return (
      <Card className="shadow-minimal transition-colors hover:bg-muted/50 hover:border-muted">
        <CardContent className="p-4 min-h-[92px] flex items-stretch">
          <div className="flex items-stretch justify-between gap-3 w-full">
            {/* Left ordinal badge */}
            <div className="w-8 shrink-0 flex items-center justify-center">
              {typeof index === 'number' && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {index + 1}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {(m.league || typeof m.tour === 'number') && (
                    <span className="truncate">{m.league}{typeof m.tour === 'number' ? ` • Тур ${m.tour}` : ''}</span>
                  )}
                  <span className="h-4 w-px bg-border" aria-hidden></span>
                  <span className="truncate">Событие #{m.id}</span>
                  <span className="h-4 w-px bg-border" aria-hidden></span>
                  <span className="truncate">{formatMsk(m.starts_at)}</span>
                </div>
                <div className="mt-1 font-medium line-clamp-3 text-[13px] flex items-center gap-2">
                  <span>{m.home_team} — {m.away_team}</span>
                  {m.status && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      statusClass(m.status)
                    )}>{statusLabel(m.status)}</span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 self-center">
                {/* Score: show only for live or completed and when both present */}
                {(['live','completed'].includes((m.status||'').toLowerCase()) && typeof m.home_score === 'number' && typeof m.away_score === 'number') && (
                  <div className="text-sm text-muted-foreground tabular-nums">{m.home_score} — {m.away_score}</div>
                )}
                {isSaving && (
                  <div className="text-xs text-muted-foreground animate-pulse">Сохранение…</div>
                )}
                <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'H')} />
                <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'D')} />
                <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'A')} />
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:hidden">
            {(['live','completed'].includes((m.status||'').toLowerCase()) && typeof m.home_score === 'number' && typeof m.away_score === 'number') && (
              <div className="col-span-3 text-center text-sm text-muted-foreground tabular-nums">{m.home_score} — {m.away_score}</div>
            )}
            <Chip label="П1" odd={m.odd_home} selected={selected === 'H'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'H')} />
            <Chip label="Х" odd={m.odd_draw} selected={selected === 'D'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'D')} />
            <Chip label="П2" odd={m.odd_away} selected={selected === 'A'} disabled={disabled || isSaving} onClick={() => handlePick(m, 'A')} />
          </div>
        </CardContent>
      </Card>
    );
  };

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
              <div className="text-center text-muted-foreground py-8">Загрузка…</div>
            ) : (
              <div className="space-y-4">
                {Object.keys(groups).length === 0 && (
                  <div className="text-center text-muted-foreground">
                    Нет матчей. Проверьте доступность PocketBase и поле is_visible в коллекции matches.
                  </div>
                )}
                {Object.entries(groups).map(([groupTitle, arr]) => (
                  <div key={groupTitle} className="space-y-3">
                    {arr.map((m, idx) => (
                      <MatchRow key={m.id} m={m} index={idx} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaders" className="mt-4">
            {leadersLoading ? (
              <div className="text-center text-muted-foreground py-8">Загрузка лидеров…</div>
            ) : leaders.length === 0 ? (
              <div className="text-center text-muted-foreground">Пока нет данных по лидерам</div>
            ) : (
              <div className="space-y-2">
                {leaders.map((row, idx) => (
                  <div key={row.user_id} className="flex items-stretch rounded-md border overflow-hidden min-h-[92px]">
                    <div className="flex items-center gap-3 p-3 flex-1">
                      <div className="w-8 flex items-center justify-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">{idx + 1}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{row.name || `ID: ${row.user_id}`}</div>
                        <div className="text-xs text-muted-foreground">{row.totalBets} ставок • {row.guessedBets} угаданных • {row.totalBets > 0 ? ((row.guessedBets / row.totalBets) * 100).toFixed(1) : (0).toFixed(1)}% точности</div>
                      </div>
                    </div>
                    <div className="w-28 shrink-0 grid place-items-center bg-muted border-l">
                      <div className="text-xl font-bold leading-none">+{row.points}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-bets" className="mt-4">
            <div className="mb-3">
              <input
                type="text"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="Поиск по командам"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-3">
              {Object.values(bets).length === 0 ? (
                <div className="text-muted-foreground">Пока нет ставок.</div>
              ) : (
                Object.values(bets)
                  .filter((b) => {
                    if (!historyFilter) return true;
                    const q = historyFilter.toLowerCase();
                    const m = matches.find(mm => mm.id === b.match_id);
                    const teamMatch = m ? (
                      (m.home_team || '').toLowerCase().includes(q) ||
                      (m.away_team || '').toLowerCase().includes(q) ||
                      (m.league || '').toLowerCase().includes(q)
                    ) : false;
                    return teamMatch; // убрали поиск по игрокам
                  })
                  .sort((a, b) => {
                    const ma = matches.find(mm => mm.id === a.match_id);
                    const mb = matches.find(mm => mm.id === b.match_id);
                    const da = ma ? new Date(ma.starts_at).getTime() : 0;
                    const db = mb ? new Date(mb.starts_at).getTime() : 0;
                    return historySortDesc ? db - da : da - db; // Последняя дата сверху
                  })
                  .map((b, idx) => {
                    const m = matches.find(mm => mm.id === b.match_id);
                    return (
                      <Card key={b.match_id} className="shadow-minimal">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-8 shrink-0 flex items-center justify-center self-center">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                                {idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {(m?.league || typeof m?.tour === 'number') && (
                                    <span className="truncate">{m?.league}{typeof m?.tour === 'number' ? ` • Тур ${m?.tour}` : ''}</span>
                                  )}
                                  <span className="h-4 w-px bg-border" aria-hidden></span>
                                  <span className="truncate">Ставка #{b.id || '—'}</span>
                                  <span className="h-4 w-px bg-border" aria-hidden></span>
                                  <span className="truncate">{m ? formatMsk(m.starts_at) : ''}</span>
                                </div>
                                <div className="mt-1 font-medium line-clamp-3 text-[13px] flex items-center gap-2">
                                  <span>{m?.home_team} — {m?.away_team}</span>
                                  {m?.status && (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-medium text-center",
                                      statusClass(m?.status)
                                    )}>{statusLabel(m?.status)}</span>
                                  )}
                                  {typeof b.points_earned === 'number' && b.points_earned > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-black">Очки: +{b.points_earned}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-center whitespace-nowrap">
                                {(['completed'].includes((m?.status||'').toLowerCase()) && typeof m?.home_score === 'number' && typeof m?.away_score === 'number') && (
                                  <span className="text-sm text-muted-foreground tabular-nums">{m?.home_score} — {m?.away_score}</span>
                                )}
                                <span className="px-2 py-1 rounded-md bg-secondary text-foreground text-sm">
                                  {b.pick === 'H' ? 'П1' : b.pick === 'D' ? 'Х' : 'П2'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
