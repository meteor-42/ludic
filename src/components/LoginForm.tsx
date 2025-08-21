import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

export default function LoginForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const authData = await pb.collection('users').authWithPassword(email, password);

      toast({
        title: "Успешный вход",
        description: `Добро пожаловать, ${authData.record.display_name || authData.record.email}!`,
      });

      // Сохраняем данные пользователя в localStorage для доступа на других страницах
      localStorage.setItem('user', JSON.stringify(authData.record));

      navigate("/dashboard");
    } catch (err: unknown) {
      console.error('Login error:', err);
      const e = err as { status?: number };
      if (e && e.status === 400) {
        setError("Неверный email или пароль");
      } else {
        setError("Произошла ошибка при входе");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
      <Card className="w-full max-w-sm shadow-elevated border-0 backdrop-blur-sm">
        <CardHeader className="pb-6 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Вход в систему</CardTitle>
          <CardDescription className="text-muted-foreground">
            Введите email и пароль для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 transition-smooth focus:ring-2 focus:ring-primary/20"
                placeholder="example@domain.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 transition-smooth focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <Button
              className="w-full h-11 mt-6 transition-smooth hover:scale-[0.98] active:scale-[0.96]"
              disabled={loading}
              type="submit"
            >
              {loading ? "Входим..." : "Войти"}
            </Button>
            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                Введите ваши учетные данные для входа
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
