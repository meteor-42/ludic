import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border rounded-none shadow-none">
        <CardHeader className="pb-6 text-center">
          <CardTitle className="text-md">В Х О Д</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                required
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-none"
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border">
                {error}
              </div>
            )}
            <Button
              className="w-full rounded-none"
              disabled={loading}
              type="submit"
            >
              {loading ? "Входим..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}