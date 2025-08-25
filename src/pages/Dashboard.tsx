import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

// Types
import type { Match, Bet, AuthUser, Stats, LeaderData } from "@/types/dashboard";

// Components
import { Header } from "@/components/dashboard/Header";
import { MatchesTab } from "@/components/dashboard/MatchesTab";
import { LeadersTab } from "@/components/dashboard/LeadersTab";
import { AllBetsTab } from "@/components/dashboard/AllBetsTab";

// Services
import { ApiService } from "@/services/api";



export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [user, setUser] = useState<AuthUser>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('activeTab') || "matches");

  // Data state
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Record<string, Bet>>(() => {
    try {
      const raw = localStorage.getItem('bets');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [leaders, setLeaders] = useState<LeaderData[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, matches: 0, liveMatches: 0, bets: 0, correctBets: 0, successRate: 0 });

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [leadersLoading, setLeadersLoading] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [allBetsLoading, setAllBetsLoading] = useState<boolean>(false);

  // Filter states
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [showAllBets, setShowAllBets] = useState<boolean>(false);

  // Pagination states
  const [matchesPage, setMatchesPage] = useState<number>(1);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Data loading functions
  const loadUserBets = useCallback(async (uid: string) => {
    try {
      const mapped = await ApiService.loadUserBets(uid);
      setBets(mapped);
      localStorage.setItem('bets', JSON.stringify(mapped));
    } catch (e) {
      console.error('Ошибка загрузки ставок пользователя:', e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const stats = await ApiService.loadStats();
      setStats(stats);
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadLeaders = useCallback(async () => {
    try {
      setLeadersLoading(true);
      const leaders = await ApiService.loadLeaders();
      setLeaders(leaders);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('load leaders aborted');
      } else {
        console.error(e);
        toast({ variant: 'destructive', title: "Ошибка загрузки лидеров", description: "Попробуйте обновить страницу позже", duration: 3500 });
      }
    } finally {
      setLeadersLoading(false);
    }
  }, [toast]);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const matches = await ApiService.loadMatches();
      setMatches(matches);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('load matches aborted');
      } else {
        console.error(e);
        toast({ variant: 'destructive', title: "Ошибка загрузки матчей", description: "Попробуйте обновить страницу позже", duration: 3500 });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAllBets = useCallback(async () => {
    try {
      setAllBetsLoading(true);
      const allBets = await ApiService.loadAllBets();
      setAllBets(allBets);
    } catch (e) {
      console.error('Ошибка загрузки всех ставок:', e);
    } finally {
      setAllBetsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    if (!ApiService.isAuthenticated) {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate("/");
        return;
      }
      const u = JSON.parse(userData) as AuthUser;
      setUser(u);
      if (u?.id) {
        loadUserBets(u.id);
        const name = u.display_name || u.email || 'Игрок';
        toast({ title: `Добро пожаловать, ${name}`, description: 'Делайте ваши прогнозы.', duration: 3000, variant: 'default' });
      }
    } else {
      const rec = ApiService.authStore.record as unknown as AuthUser;
      setUser(rec);
      if (rec?.id) {
        loadUserBets(rec.id);
        const name = rec.display_name || rec.email || 'Игрок';
        toast({ title: `Добро пожаловать, ${name}`, description: 'Делайте ваши прогнозы.', duration: 3000, variant: 'default' });
      }
    }

    // Загружаем начальные данные
    loadStats();
    loadMatches();
  }, [navigate, toast, loadStats, loadMatches, loadUserBets]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);

    if (activeTab === "leaders") {
      loadLeaders();
    }
  }, [activeTab, loadLeaders]);

  useEffect(() => {
    if (activeTab === "all-bets" && showAllBets) {
      loadAllBets();
    }
  }, [activeTab, showAllBets, loadAllBets]);

  // Event handlers
  const handleLogout = () => {
    ApiService.logout();
    localStorage.removeItem('user');
    navigate("/");
  };

  const handlePick = async (match: Match, pick: "H" | "D" | "A") => {
    if (!user?.id) return;

    try {
      setSaving((s) => ({ ...s, [match.id]: true }));

      const savedBet = await ApiService.saveBet(user.id, match.id, pick);

      // Update local state
      setBets((prev) => ({
        ...prev,
        [match.id]: savedBet,
      }));

      const updatedBets = { ...bets, [match.id]: savedBet };
      localStorage.setItem('bets', JSON.stringify(updatedBets));

      const pickLabel = pick === 'H' ? 'П1' : pick === 'D' ? 'Х' : 'П2';
      const odd = pick === 'H' ? match.odd_home : pick === 'D' ? match.odd_draw : match.odd_away;
      const suffix = odd != null ? ` • ${pickLabel} (${odd.toFixed(2)})` : ` • ${pickLabel}`;
      toast({
        title: `${match.home_team} — ${match.away_team}${suffix}`,
        description: 'Ваш выбор учтен. Удачи.',
        duration: 2500
      });
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        console.warn('bet save aborted');
      } else {
        console.error(e);
        toast({
          variant: 'destructive',
          title: "Не удалось сохранить ставку",
          description: "Повторите попытку через минуту",
          duration: 3500
        });
      }
    } finally {
      setSaving((s) => ({ ...s, [match.id]: false }));
    }
  };

  // Prepare data for tabs
  const betsToShow = showAllBets ? allBets : Object.values(bets);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-3xl mx-auto">
        <Header
          stats={stats}
          statsLoading={statsLoading}
          onLogout={handleLogout}
        />
        <Separator className="mb-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Матчи</TabsTrigger>
            <TabsTrigger value="leaders">Лидеры</TabsTrigger>
            <TabsTrigger value="all-bets">История</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4">
            <MatchesTab
              matches={matches}
              bets={bets}
              saving={saving}
              loading={loading}
              leagueFilter={leagueFilter}
              tourFilter={tourFilter}
              page={matchesPage}
              itemsPerPage={itemsPerPage}
              onLeagueFilterChange={setLeagueFilter}
              onTourFilterChange={setTourFilter}
              onPageChange={setMatchesPage}
              onPick={handlePick}
            />
          </TabsContent>

          <TabsContent value="leaders" className="mt-4">
            <LeadersTab
              leaders={leaders}
              loading={leadersLoading}
              onRefresh={loadLeaders}
            />
          </TabsContent>

          <TabsContent value="all-bets" className="mt-4">
            <AllBetsTab
              bets={betsToShow}
              matches={matches}
              loading={allBetsLoading}
              filter={historyFilter}
              showAllBets={showAllBets}
              page={historyPage}
              itemsPerPage={itemsPerPage}
              onFilterChange={setHistoryFilter}
              onShowAllBetsToggle={() => setShowAllBets(!showAllBets)}
              onPageChange={setHistoryPage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
