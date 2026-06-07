"use client";

import { useState } from "react";
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
import { ArrowLeft, CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const fieldClass =
  "h-10 border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted focus-visible:border-wa-green focus-visible:ring-wa-green/25";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <AuthShell>
        <Card className="border-wa-border bg-wa-panel shadow-lg ring-wa-border/80">
          <CardHeader className="items-center space-y-1 text-center pb-2">
            <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-green/10 ring-1 ring-wa-green/20">
              <CheckCircle className="h-7 w-7 text-wa-green" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-bold text-wa-text">
              Check your email
            </CardTitle>
            <CardDescription className="text-wa-muted">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-wa-text">{email}</span>. Please
              check your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button
                variant="outline"
                className="h-11 w-full border-wa-border text-wa-text hover:bg-wa-surface"
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border-wa-border bg-wa-panel shadow-lg ring-wa-border/80">
        <CardHeader className="items-center space-y-1 text-center pb-2">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-green/10 ring-1 ring-wa-green/20">
            <KeyRound className="h-7 w-7 text-wa-green" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold text-wa-text">
            Reset password
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="flex flex-col gap-4">
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
                className={fieldClass}
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
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-wa-muted transition-colors hover:text-wa-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
