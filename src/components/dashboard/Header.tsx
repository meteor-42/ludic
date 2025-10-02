import { Button } from "@/components/ui/button";
import { LogOut, Key } from "lucide-react";
import { StatCard } from "./StatCard";
import type { Stats } from "@/types/dashboard";

interface HeaderProps {
  stats: Stats;
  statsLoading: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
}

export const Header = ({ stats, statsLoading, onLogout, onChangePassword }: HeaderProps) => (
  <header className="flex items-center justify-between py-4">
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center px-4 py-2 text-sm font-bold uppercase tracking-wide bg-black text-white border-none">
        ЛУДИК.РФ
      </span>
    </div>

    <div className="flex items-center gap-4">
      <div className="hidden md:flex items-center gap-2">
        <StatCard value={stats.users} label="Эксперты" loading={statsLoading} />
        <StatCard value={`${stats.liveMatches}/${stats.matches}`} label="Live" loading={statsLoading} />
        <StatCard value={`${stats.bets}/${stats.totalBets}`} label="Рассчитано" loading={statsLoading} />
        <StatCard value={stats.correctBets} label="Угадано" loading={statsLoading} />
        <StatCard value={`${stats.successRate}%`} label="Точность" loading={statsLoading} />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onChangePassword} title="Изменить пароль">
          <Key className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Выйти">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  </header>
);
