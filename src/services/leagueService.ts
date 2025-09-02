import PocketBase from "pocketbase";
import type { Match, Bet, LeaderData, PBUserRecord, LeagueStats, LeagueFilter } from "@/types/dashboard";
import { API_URL } from "@/config/api.config";

const pb = new PocketBase(API_URL);
pb.autoCancellation(false);

export class LeagueService {
  static async loadLeadersWithLeagueStats(): Promise<LeaderData[]> {
    const [betsList, matchesList] = await Promise.all([
      pb.collection('bets').getList<Bet>(1, 1000, {}),
      pb.collection('matches').getList<Match>(1, 1000, {})
    ]);

    // Создаем карту матчей для быстрого доступа к лиге
    const matchesMap = new Map<string, Match>();
    matchesList.items.forEach(match => {
      matchesMap.set(match.id, match);
    });

    // Агрегируем данные по пользователям и лигам
    const userStats = new Map<string, {
      points: number;
      totalBets: number;
      guessedBets: number;
      allBets: number;
      leagueStats: Map<string, LeagueStats>;
    }>();

    for (const bet of betsList.items) {
      const uid = bet.user_id as string;
      const match = matchesMap.get(bet.match_id as string);

      if (!match) continue;

      const league = match.league;
      const pts = Number(bet.points || 0);

      // Инициализируем пользователя если нужно
      if (!userStats.has(uid)) {
        userStats.set(uid, {
          points: 0,
          totalBets: 0,
          guessedBets: 0,
          allBets: 0,
          leagueStats: new Map()
        });
      }

      const user = userStats.get(uid)!;

      // Инициализируем лигу для пользователя если нужно
      if (!user.leagueStats.has(league)) {
        user.leagueStats.set(league, {
          league,
          totalBets: 0,
          guessedBets: 0,
          successRate: 0,
          points: 0,
          allBets: 0
        });
      }

      const leagueStats = user.leagueStats.get(league)!;

      // Увеличиваем счетчик всех ставок
      user.allBets += 1;
      leagueStats.allBets += 1;

      // Обрабатываем очки за угаданные исходы (3 очка)
      if (pts === 3) {
        user.points += pts;
        user.guessedBets += 1;
        leagueStats.points += pts;
        leagueStats.guessedBets += 1;
      }

      // Считаем рассчитанные ставки (1 или 3 очка)
      if (pts === 1 || pts === 3) {
        user.totalBets += 1;
        leagueStats.totalBets += 1;
      }
    }

    // Загружаем пользователей
    const usersList = await pb.collection('users').getList<PBUserRecord>(1, 1000, {});

    const result = usersList.items.map(user => {
      const stats = userStats.get(user.id) || {
        points: 0,
        totalBets: 0,
        guessedBets: 0,
        allBets: 0,
        leagueStats: new Map()
      };

      // Конвертируем Map в массив и вычисляем проценты
      const leagueStatsArray = Array.from(stats.leagueStats.values()).map(league => ({
        ...league,
        successRate: league.totalBets > 0 ? Math.round((league.guessedBets / league.totalBets) * 100) : 0
      }));

      const successRate = stats.totalBets > 0 ? Math.round((stats.guessedBets / stats.totalBets) * 100) : 0;

      return {
        user_id: user.id,
        points: stats.points,
        name: (user.display_name || '').trim() || `ID: ${user.id}`,
        totalBets: stats.totalBets,
        allBets: stats.allBets,
        guessedBets: stats.guessedBets,
        successRate,
        created: user.created,
        leagueStats: leagueStatsArray.sort((a, b) => b.points - a.points)
      };
    });

    return result.sort((a, b) => b.points - a.points);
  }

  static async getAvailableLeagues(): Promise<string[]> {
    const matchesList = await pb.collection('matches').getList<Match>(1, 1000, {});
    const leagues = new Set<string>();

    matchesList.items.forEach(match => {
      if (match.league) {
        leagues.add(match.league);
      }
    });

    return Array.from(leagues).sort();
  }

  static filterLeadersByLeagues(leaders: LeaderData[], filter: LeagueFilter): LeaderData[] {
    console.log('filterLeadersByLeagues called');
    console.log('Filter:', filter);
    console.log('Leaders count before filter:', leaders.length);

    if (filter.showAll || filter.leagues.length === 0) {
      console.log('Returning all leaders (showAll or no leagues selected)');
      return leaders;
    }

    const result = leaders.map(leader => {
      if (!leader.leagueStats) {
        console.log(`Leader ${leader.name} has no league stats`);
        return leader;
      }

      // Фильтруем статистику по выбранным лигам
      const filteredLeagueStats = leader.leagueStats.filter(league =>
        filter.leagues.includes(league.league)
      );

      console.log(`Leader ${leader.name}: ${filteredLeagueStats.length} leagues matched out of ${leader.leagueStats.length}`);

      // Пересчитываем общую статистику на основе выбранных лиг
      const totalPoints = filteredLeagueStats.reduce((sum, league) => sum + league.points, 0);
      const totalBets = filteredLeagueStats.reduce((sum, league) => sum + league.totalBets, 0);
      const totalGuessed = filteredLeagueStats.reduce((sum, league) => sum + league.guessedBets, 0);
      const totalAllBets = filteredLeagueStats.reduce((sum, league) => sum + league.allBets, 0);
      const successRate = totalBets > 0 ? Math.round((totalGuessed / totalBets) * 100) : 0;

      return {
        ...leader,
        points: totalPoints,
        totalBets,
        guessedBets: totalGuessed,
        allBets: totalAllBets,
        successRate,
        leagueStats: filteredLeagueStats
      };
    }).filter(leader => leader.points > 0 || leader.totalBets > 0) // Показываем только игроков с активностью в выбранных лигах
      .sort((a, b) => b.points - a.points);

    console.log('Leaders count after filter:', result.length);
    return result;
  }

  // Сохранение фильтра в localStorage
  static saveLeagueFilter(filter: LeagueFilter): void {
    try {
      localStorage.setItem('ludic_league_filter', JSON.stringify(filter));
    } catch (error) {
      console.error('Failed to save league filter:', error);
    }
  }

  // Загрузка фильтра из localStorage
  static loadLeagueFilter(): LeagueFilter {
    try {
      const saved = localStorage.getItem('ludic_league_filter');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load league filter:', error);
    }

    return { leagues: [], showAll: true };
  }
}
