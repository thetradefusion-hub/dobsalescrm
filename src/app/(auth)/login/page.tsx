"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <AuthShell>
      <Card className="border-wa-border bg-wa-panel shadow-lg ring-wa-border/80">
        <CardHeader className="items-center space-y-1 text-center pb-2">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-green/10 ring-1 ring-wa-green/20">
            <LogIn className="h-7 w-7 text-wa-green" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold text-wa-text">
            Welcome back
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Sign in to {BRAND_NAME}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-wa-text">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted focus-visible:border-wa-green focus-visible:ring-wa-green/25"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-wa-text">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-wa-teal hover:text-wa-green hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted focus-visible:border-wa-green focus-visible:ring-wa-green/25"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full bg-wa-green text-white hover:bg-wa-teal hover:text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-wa-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-wa-teal hover:text-wa-green hover:underline"
            >
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
