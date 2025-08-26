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
  id: string; // PB record id
  match_id: string;
  user_id: string;
  display_name?: string; // Имя пользователя
  pick: "H" | "D" | "A";
  points?: number;
};

export type PBUser = {
  id: string;
  email?: string;
  display_name?: string;
  created?: string;
};

export type PBUserRecord = {
  id: string;
  email?: string;
  display_name?: string;
  displayed_name?: string; // альтернативное поле для имени
  created?: string;
};

export type AuthUser = PBUser | null;

export type Stats = {
  users: number;
  matches: number;
  liveMatches: number;
  bets: number;
  correctBets: number;
  successRate: number;
};

export type LeaderData = {
  user_id: string;
  points: number;
  name: string;
  totalBets: number;
  guessedBets: number;
  successRate: number;
  created?: string; // Дата регистрации пользователя
};
