"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getSupabasePublicConfig,
  isSupabaseConfigError,
} from "@/lib/supabase/config";
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
import { PasswordInput } from "@/components/auth/password-input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const configError = useMemo(() => {
    const config = getSupabasePublicConfig();
    return isSupabaseConfigError(config) ? config.error : null;
  }, []);

  const supabase = useMemo(() => {
    if (configError) return null;
    try {
      return createClient();
    } catch (err) {
      return null;
    }
  }, [configError]);

  useEffect(() => {
    if (searchParams.get("error") === "supabase_unreachable") {
      setError(
        "Cannot reach Supabase. Your project URL may be wrong, or the project is paused/deleted. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (or Vercel env vars), then restart the dev server.",
      );
    } else if (configError) {
      setError(configError);
    }
  }, [searchParams, configError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError(
        configError ??
          "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL in your environment.",
      );
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(
          signInError.message.includes("fetch")
            ? "Cannot reach Supabase. Verify your project URL in Supabase Dashboard → Project Settings → API, then update .env.local and restart."
            : signInError.message,
        );
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError(
        "Network error — cannot reach Supabase. Check your internet connection and that the Supabase project is active.",
      );
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="border-wa-border bg-wa-panel shadow-lg ring-wa-border/80">
        <CardHeader className="items-center space-y-1 text-center pb-2">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-green/10 ring-1 ring-wa-green/20">
            <LogIn className="h-7 w-7 text-wa-green" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold text-wa-text">
            Welcome
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
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
