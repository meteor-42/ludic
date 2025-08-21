import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    if (!pb.authStore.isValid) {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate("/");
        return;
      }
      setUser(JSON.parse(userData));
    } else {
      setUser(pb.authStore.record);
    }
  }, [navigate]);

  const handleLogout = () => {
    pb.authStore.clear();
    localStorage.removeItem('user');
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Панель управления</h1>
            {user && (
              <p className="text-muted-foreground mt-1">
                Добро пожаловать, {user.display_name || user.email}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Выйти
          </Button>
        </header>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-minimal">
            <CardHeader>
              <CardTitle>Добро пожаловать!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Вы успешно вошли в систему. Это демонстрационная панель управления.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-minimal">
            <CardHeader>
              <CardTitle>Статистика ставок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Всего ставок:</span>
                  <span className="font-semibold">{user?.all_bets || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Выигранных:</span>
                  <span className="font-semibold text-green-600">{user?.won_bets || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-minimal">
            <CardHeader>
              <CardTitle>Профиль</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Статус:</span>
                  <span className={`text-sm ${user?.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {user?.verified ? 'Подтвержден' : 'Не подтвержден'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}