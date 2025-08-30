export interface Match {
  id: string;
  league: string;
  tour: number;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  home_score?: number;
  away_score?: number;
  odd_home?: number;
  odd_draw?: number;
  odd_away?: number;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  is_admin?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled';

export interface EditMatchPayload {
  home_score?: number;
  away_score?: number;
  status?: MatchStatus;
  odd_home?: number;
  odd_draw?: number;
  odd_away?: number;
}
