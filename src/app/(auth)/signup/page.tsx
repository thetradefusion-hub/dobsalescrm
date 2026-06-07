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
import { CheckCircle, Loader2, UserPlus } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { AuthShell } from "@/components/auth/auth-shell";

const fieldClass =
  "h-10 border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted focus-visible:border-wa-green focus-visible:ring-wa-green/25";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
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
              We&apos;ve sent a confirmation link to{" "}
              <span className="font-medium text-wa-text">{email}</span>. Please
              check your inbox and click the link to verify your account.
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
            <UserPlus className="h-7 w-7 text-wa-green" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold text-wa-text">
            Create account
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Get started with {BRAND_NAME}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="text-wa-text">
                Full name
              </Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={fieldClass}
              />
            </div>

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

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-wa-text">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-wa-text">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-wa-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-wa-teal hover:text-wa-green hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
