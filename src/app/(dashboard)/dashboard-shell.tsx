"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useIsDesktopLayout } from "@/hooks/use-media-query";
import { SidebarRail, SidebarDrawer, SIDEBAR_COLLAPSED_KEY } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PushInitializer } from "@/components/layout/push-initializer";
import { FcmForegroundListener } from "@/components/layout/fcm-foreground-listener";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { PwaNotificationBanner } from "@/components/pwa/pwa-notification-banner";
import { cn } from "@/lib/utils";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, permissions, isAdmin, profile } = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Client-side permission redirect after profile loads (backup to middleware).
  useEffect(() => {
    if (loading || !profile) return;
    if (isAdmin || permissions.includes("*")) return;

    const blocked =
      pathname.startsWith("/reports") ||
      pathname.startsWith("/broadcasts") ||
      pathname.startsWith("/automations");

    if (blocked) {
      router.replace("/dashboard");
      return;
    }

    if (pathname.startsWith("/settings")) {
      const tab = searchParams.get("tab");
      const canOwnWa =
        permissions.includes("whatsapp.own_number") ||
        permissions.includes("*");
      if (
        tab === "ai" ||
        tab === "templates" ||
        tab === "tags" ||
        tab === "team" ||
        tab === "roles" ||
        (tab === "whatsapp" && !canOwnWa)
      ) {
        router.replace("/settings?tab=profile");
      }
    }
  }, [
    loading,
    profile,
    isAdmin,
    permissions,
    pathname,
    searchParams,
    router,
  ]);

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
    <div className="flex h-dvh w-full max-w-[100dvw] overflow-hidden bg-[#f8fafc] dark:bg-saas-bg">
      <PushInitializer />
      <FcmForegroundListener />

      {isDesktop ? (
        <div className="shrink-0">
          <SidebarRail
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
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
            "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden overscroll-y-contain",
            "overflow-y-auto",
            isInbox
              ? isDesktop
                ? "overflow-hidden p-0 bg-wa-deep"
                : "overflow-hidden px-0 pt-0 bg-wa-deep"
              : isMobileAppDashboard
                ? isDesktop
                  ? "w-full px-0 pt-0"
                  : "px-0 pt-0"
                : isDesktop
                  ? "w-full p-4 xl:p-6"
                  : "w-full p-3 sm:p-5",
            isInbox
              ? isDesktop
                ? "pb-0"
                : !inboxChatOpen
                  ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
                  : "pb-0"
              : !isDesktop && !inboxChatOpen
                ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
                : isDesktop
                  ? "pb-6"
                  : inboxChatOpen
                    ? "pb-0"
                    : undefined,
          )}
        >
          <div className="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col">
            {children}
          </div>
        </main>
        {showPwaBanner && <PwaInstallBanner />}
        <PwaNotificationBanner />
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
