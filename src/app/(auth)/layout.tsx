import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

// Shared metadata for auth pages (login / signup / forgot-password).
// None of these should be indexed — they'd compete with the marketing
// landing in SERPs and offer nothing to a searcher who hasn't already
// signed up. Each page still gets its own <title> via its own
// metadata.title override below the route group layout.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-wa-deep">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-wa-green border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
