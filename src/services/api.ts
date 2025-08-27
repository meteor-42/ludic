import PocketBase from "pocketbase";
import type { Match, Bet, Stats, LeaderData, PBUser, PBUserRecord } from "@/types/dashboard";
import { API_URL } from "@/config/api.config";

// Используем конфигурацию из api.config.ts для правильного проксирования
const pb = new PocketBase(API_URL);
pb.autoCancellation(false);

export class ApiService {
  static async loadMatches(): Promise<Match[]> {
    const list = await pb.collection('matches').getList<Match>(1, 200, {
      sort: 'starts_at',
    });
    return list.items.slice().sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }

static async loadUserBets(userId: string): Promise<Record<string, Bet>> {
  try {
    const list = await pb.collection('bets').getList<Bet>(1, 200, {
      filter: `user_id = "${userId}"`,
    });

    // Вместо запроса к коллекции users, используем данные из authStore
    // или кэшируем имена пользователей отдельно
    let displayName = `Игрок ${userId.slice(-6)}`;

    // Если пользователь авторизован и это текущий пользователь, используем его данные
    if (pb.authStore.model && pb.authStore.model.id === userId) {
      displayName = (pb.authStore.model.display_name || '').trim() || displayName;
    }

    const mapped: Record<string, Bet> = {};
    for (const item of list.items) {
      if (item.match_id) {
        mapped[item.match_id] = {
          id: item.id as string,
          match_id: item.match_id as string,
          user_id: item.user_id as string,
          display_name: displayName,
          pick: item.pick as "H" | "D" | "A",
          points: item.points as number | undefined,
        };
      }
    }
    return mapped;
  } catch (error) {
    console.error('Error loading user bets:', error);
    return {};
  }
}

  static async loadAllBets(): Promise<Bet[]> {
    const betsList = await pb.collection('bets').getList<Bet>(1, 1000, {});

    // Загружаем список пользователей для получения их имен
    const usersList = await pb.collection('users').getList<PBUserRecord>(1, 1000, {});
    const usersMap = new Map<string, string>();

    // Создаем карту соответствия ID пользователя и его имени
    for (const user of usersList.items) {
      const name = (user.display_name || '').trim() || `Игрок ${user.id.slice(-6)}`;
      usersMap.set(user.id, name);
    }

    // Добавляем имена пользователей к ставкам
    const betsWithNames = betsList.items.map(bet => ({
      ...bet,
      display_name: usersMap.get(bet.user_id as string) || `Игрок ${(bet.user_id as string || '').slice(-6)}`
    }));

    return betsWithNames as Bet[];
  }

  static async loadStats(): Promise<Stats> {
    const [usersList, matchesList, betsList] = await Promise.all([
      pb.collection('users').getList(1, 1),
      pb.collection('matches').getList(1, 1000),
      pb.collection('bets').getList(1, 1000)
    ]);

    const liveMatches = matchesList.items.filter(match => match.status === 'live').length;
    const correctBets = betsList.items.filter(bet => (bet.points || 0) > 0).length;
    const successRate = betsList.totalItems > 0 ? Math.round((correctBets / betsList.totalItems) * 100) : 0;

    return {
      users: usersList.totalItems,
      matches: matchesList.totalItems,
      liveMatches,
      bets: betsList.totalItems,
      correctBets,
      successRate
    };
  }

  static async loadLeaders(): Promise<LeaderData[]> {
    const betsList = await pb.collection('bets').getList<Bet>(1, 1000, {});
    const aggPoints = new Map<string, number>();
    const aggTotal = new Map<string, number>();
    const aggGuessed = new Map<string, number>();

    for (const item of betsList.items) {
      const uid = item.user_id as string;
      const pts = Number(item.points || 0);
      aggPoints.set(uid, (aggPoints.get(uid) || 0) + pts);
      aggTotal.set(uid, (aggTotal.get(uid) || 0) + 1);
      if (pts > 0) aggGuessed.set(uid, (aggGuessed.get(uid) || 0) + 1);
    }

    const usersList = await pb.collection('users').getList<PBUserRecord>(1, 1000, {});
    const merged = usersList.items.map((u) => {
      const totalBets = aggTotal.get(u.id) || 0;
      const guessedBets = aggGuessed.get(u.id) || 0;
      const successRate = totalBets > 0 ? Math.round((guessedBets / totalBets) * 100) : 0;

      return {
        user_id: u.id,
        points: aggPoints.get(u.id) || 0,
        name: (u.display_name || '').trim() || `ID: ${u.id}`,
        totalBets,
        guessedBets,
        successRate,
        created: u.created // Добавляем дату регистрации
      };
    });

    merged.sort((a, b) => b.points - a.points);
    return merged;
  }

  static async saveBet(userId: string, matchId: string, pick: "H" | "D" | "A"): Promise<Bet> {
    try {
      // Попробуем найти существующую ставку
      const existing = await pb.collection('bets').getFirstListItem(`user_id = "${userId}" && match_id = "${matchId}"`);

      // Обновляем существующую ставку
      await pb.collection('bets').update(existing.id as string, { pick });
      return {
        id: existing.id as string,
        match_id: matchId,
        user_id: userId,
        pick,
      };
    } catch {
      // Создаем новую ставку
      const created = await pb.collection('bets').create({
        match_id: matchId,
        user_id: userId,
        pick,
      });

      return {
        id: created.id || "",
        match_id: matchId,
        user_id: userId,
        pick,
      };
    }
  }

  static get authStore() {
    return pb.authStore;
  }

  static get isAuthenticated() {
    return pb.authStore.isValid;
  }

  static logout() {
    pb.authStore.clear();
  }
}
