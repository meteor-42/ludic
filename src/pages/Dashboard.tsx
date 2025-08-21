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

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

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
  match_id: string;
  user_id: string;
  pick: "H" | "D" | "A";
  points_earned?: number;
};

type PBUser = { id: string; email?: string; display_name?: string };

type AuthUser = PBUser | null;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser>(null);
  const [activeTab, setActiveTab] = useState<string>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bets, setBets] = useState<Record<string, Bet>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<Record<string, Match[]>>({});
  const [leaders, setLeaders] = useState<Array<{ user_id: string; points: number; user?: PBUser }>>([]);
  const [leadersLoading, setLeadersLoading] = useState<boolean>(false);

  const loadUserBets = async (uid: string) => {
    try {
      // fetch all bets for this user
      const list = await pb.collection('bets').getList<Bet>(1, 200, {
        filter: `user_id = "${uid}"`,
      });
      const mapped: Record<string, Bet> = {};
      for (const it of list.items) {
        if (it.match_id) mapped[it.match_id] = {
          match_id: it.match_id,
          user_id: it.user_id,
          pick: it.pick,
          points_earned: it.points_earned,
        };
      }
      setBets(mapped);
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
    } else {
      const rec = pb.authStore.record as unknown as PBUser | null;
      setUser(rec);
      if (rec?.id) loadUserBets(rec.id);
    }
  }, [navigate]);

  useEffect(() => {
    // Загружаем матчи, отсортированные по starts_at, только видимые
    const load = async () => {
      try {
        setLoading(true);
        toast?.message?.("Загрузка матчей…");
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
        toast?.success?.("Матчи загружены");
      } catch (e) {
        console.error(e);
        toast?.error?.("Ошибка загрузки матчей");
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
        // Грузим до 1000 ставок для агрегации (при необходимости сделаем пагинацию)
        const list = await pb.collection('bets').getList<Bet>(1, 1000, {});
        const agg = new Map<string, number>();
        for (const it of list.items) {
          const uid = it.user_id as string;
          const pts = Number(it.points_earned || 0);
          agg.set(uid, (agg.get(uid) || 0) + pts);
        }
        const entries = Array.from(agg.entries()).map(([user_id, points]) => ({ user_id, points }));
        // сортировка по очкам по убыванию
        entries.sort((a, b) => b.points - a.points);
        // подтянем пользователей (ограничим топ-100 для экономии запросов)
        const top = entries.slice(0, 100);
        // пробуем одним запросом через expand если bets имела relation — у нас только id, поэтому дернем по одному
        const withUsers: Array<{ user_id: string; points: number; user?: PBUser }> = [];
        for (const row of top) {
          try {
            // коллекция пользователей называется users (standard PB)
            const u = await pb.collection('users').getOne<PBUser>(row.user_id);
            withUsers.push({ ...row, user: u });
          } catch {
            withUsers.push(row);
          }
        }
        setLeaders(withUsers);
      } catch (e) {
        console.error(e);
      } finally {
        setLeadersLoading(false);
      }
    };
    loadLeaders();
  }, []);

  const handleLogout = () => {
    // Очистка локальной авторизации
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
      } else {
        await pb.collection('bets').create({
          match_id: match.id,
          user_id: uid,
          pick,
        });
      }
      setBets((prev) => ({
        ...prev,
        [match.id]: {
          match_id: match.id,
          user_id: uid,
          pick,
        },
      }));
      toast?.success?.("Сохранено");
    } catch (e) {
      console.error(e);
      toast?.error?.("Не удалось сохранить ставку");
    } finally {
      setSaving((s) => ({ ...s, [match.id]: false }));
    }
  };

  const Header = () => (
    <header className="flex items-center justify-between py-4">
      <div className="text-xl font-semibold">Матчи</div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => setActiveTab('all-bets')} title="Все ставки">
          <span className="i-lucide-list size-5" aria-hidden />
          <span className="sr-only">Все ставки</span>
        </Button>
        <Button variant="ghost" onClick={handleLogout} title="Выйти">
          <span className="i-lucide-log-out size-5" aria-hidden />
          <span className="sr-only">Выйти</span>
        </Button>
        <Avatar>
          <AvatarFallback>{(user?.display_name || user?.email || "U").slice(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
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

  const MatchRow = ({ m }: { m: Match }) => {
    const selected = bets[m.id]?.pick;
    const disabled = m.is_locked || m.status !== 'upcoming';
    const isSaving = !!saving[m.id];
    return (
      <Card className="shadow-minimal">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{m.league} • Тур {m.tour}</div>
              <div className="font-medium">{m.home_team} — {m.away_team}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(m.starts_at).toLocaleString()}
              </div>
              {m.status !== 'upcoming' && (
                <div className="text-xs text-muted-foreground">Счет: {m.home_score} — {m.away_score}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="text-xs text-muted-foreground animate-pulse mr-2">Сохранение…</div>
              )}
              <Chip
                label="Home"
                odd={m.odd_home}
                selected={selected === 'H'}
                disabled={disabled || isSaving}
                onClick={() => handlePick(m, 'H')}
              />
              <Chip
                label="Draw"
                odd={m.odd_draw}
                selected={selected === 'D'}
                disabled={disabled || isSaving}
                onClick={() => handlePick(m, 'D')}
              />
              <Chip
                label="Away"
                odd={m.odd_away}
                selected={selected === 'A'}
                disabled={disabled || isSaving}
                onClick={() => handlePick(m, 'A')}
              />
            </div>
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
            <TabsTrigger value="stats">Моя статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Загрузка…</div>
            ) : (
              <div className="space-y-6">
                {Object.keys(groups).length === 0 && (
                  <div className="text-center text-muted-foreground">Нет матчей</div>
                )}
                {Object.entries(groups).map(([groupTitle, arr]) => (
                  <div key={groupTitle} className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">{groupTitle}</div>
                    {arr.map((m) => (
                      <MatchRow key={m.id} m={m} />
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
                  <div key={row.user_id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center">
                        {idx < 3 ? (
                          idx === 0 ? (
                            <span title="1 место" className="i-lucide-crown text-yellow-500" />
                          ) : idx === 1 ? (
                            <span title="2 место" className="i-lucide-crown text-gray-400" />
                          ) : (
                            <span title="3 место" className="i-lucide-crown text-amber-600" />
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {row.user?.display_name || row.user?.email || row.user_id}
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {row.user_id}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{row.points}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="text-muted-foreground">Личная статистика (подготовлено).</div>
          </TabsContent>
        </Tabs>

        {activeTab === 'all-bets' && (
          <div className="mt-6 space-y-3">
            <div className="text-lg font-medium">Все ставки</div>
            {Object.values(bets).length === 0 ? (
              <div className="text-muted-foreground">Пока нет ставок.</div>
            ) : (
              Object.values(bets).map((b) => {
                const m = matches.find(mm => mm.id === b.match_id);
                return (
                  <Card key={b.match_id} className="shadow-minimal">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">{m?.league} • Тур {m?.tour}</div>
                          <div className="font-medium">{m?.home_team} — {m?.away_team}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{m ? new Date(m.starts_at).toLocaleString() : ''}</div>
                          <div>{m?.league} • Тур {m?.tour}</div>
                          <div>Статус: {m?.status}</div>
                        </div>
                        <div className="text-sm">Выбор: {b.pick === 'H' ? 'Home' : b.pick === 'D' ? 'Draw' : 'Away'}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
