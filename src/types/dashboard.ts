export type Match = {
  id: string;
  league: string;
  tour: number;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  home_score?: number;
  away_score?: number;
  odd_home?: number;
  odd_draw?: number;
  odd_away?: number;
};

export type Bet = {
  id: string;
  match_id: string;
  user_id: string;
  display_name?: string;
  pick: "H" | "D" | "A";
  points?: number;
  created?: string;  // Время создания ставки
};

export type PBUser = {
  id: string;
  email?: string;
  display_name?: string;
  balance?: number;
  created?: string;
};

export type PBUserRecord = {
  id: string;
  display_name?: string;
  balance?: number;
  created?: string;
};

export type AuthUser = PBUser | null;

export type Stats = {
  users: number;           // Общее количество пользователей
  matches: number;         // Общее количество матчей
  liveMatches: number;     // Количество матчей в статусе LIVE
  totalBets: number;       // Общее количество ставок
  bets: number;           // Количество рассчитанных ставок (1 или 3 очка)
  correctBets: number;    // Количество угаданных ставок (только 3 очка)
  successRate: number;    // Процент успеха (угаданные/рассчитанные * 100)
};

export type LeagueStats = {
  league: string;
  totalBets: number;
  guessedBets: number;
  successRate: number;
  points: number;
  allBets: number;
};

export type LeaderData = {
  user_id: string;
  points: number;
  name: string;
  totalBets: number;
  guessedBets: number;
  successRate: number;
  created?: string;
  allBets?: number;
  leagueStats?: LeagueStats[];
};

export type LeagueFilter = {
  leagues: string[];
  showAll: boolean;
};
