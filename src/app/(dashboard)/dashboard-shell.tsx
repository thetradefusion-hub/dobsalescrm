"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useIsDesktopLayout } from "@/hooks/use-media-query";
import { SidebarRail, SidebarDrawer } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PushInitializer } from "@/components/layout/push-initializer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { cn } from "@/lib/utils";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktopLayout();

  const isMobileAppDashboard = pathname === "/dashboard";
  const isInbox = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const inboxChatOpen = isInbox && Boolean(searchParams.get("c"));
  const hideMobileHeader = isMobileAppDashboard || isInbox;
  const showPwaBanner =
    (isMobileAppDashboard || isInbox) && !inboxChatOpen && !isDesktop;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-wa-deep">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-wa-green border-t-transparent" />
          <p className="text-sm text-wa-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-dvh w-full max-w-[100dvw] overflow-hidden bg-wa-deep">
      <PushInitializer />

      {isDesktop ? (
        <div className="shrink-0">
          <SidebarRail />
        </div>
      ) : (
        <SidebarDrawer open={sidebarOpen} onClose={closeSidebar} />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          className={cn(hideMobileHeader && !isDesktop && "hidden")}
        />
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overscroll-y-contain",
            isDesktop ? "overflow-y-auto" : "overflow-y-auto",
            isInbox
              ? isDesktop
                ? "overflow-hidden px-6 pb-6 pt-0"
                : "overflow-hidden px-0 pt-0"
              : isMobileAppDashboard
                ? isDesktop
                  ? "px-6 pt-0"
                  : "px-0 pt-0"
                : isDesktop
                  ? "p-6"
                  : "p-4 sm:p-6",
            !isDesktop && !inboxChatOpen
              ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
              : isDesktop
                ? "pb-6"
                : inboxChatOpen
                  ? "pb-0"
                  : undefined,
          )}
        >
          {children}
        </main>
        {showPwaBanner && <PwaInstallBanner />}
        {!isDesktop && (
          <MobileBottomNav
            onOpenSidebar={() => setSidebarOpen(true)}
            className={cn(inboxChatOpen && "hidden")}
          />
        )}
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
