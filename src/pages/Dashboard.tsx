import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Панель управления</h1>
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
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">Активных пользователей</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-minimal">
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">Новых сообщений</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}