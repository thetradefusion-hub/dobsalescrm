"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Settings,
  LogOut,
  User,
  X,
  Target,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/pipelines", label: "Pipelines", icon: GitBranch },
  { href: "/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/automations", label: "Automations", icon: Zap },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarPanelProps {
  onClose?: () => void;
  showClose?: boolean;
}

function SidebarPanel({ onClose, showClose = false }: SidebarPanelProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-wa-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wa-green">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="max-w-[9.5rem] text-xs font-semibold leading-snug text-wa-text">
            {BRAND_NAME}
          </span>
        </Link>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-wa-muted hover:bg-wa-surface hover:text-wa-text"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const showUnreadDot =
              item.href === "/inbox" && totalUnread > 0 && !isActive;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-wa-green/10 text-wa-green"
                      : "text-wa-muted hover:bg-wa-surface hover:text-wa-text",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {showUnreadDot && (
                    <span
                      aria-label={`${totalUnread} unread conversation${totalUnread === 1 ? "" : "s"}`}
                      className="relative flex h-2 w-2"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wa-green opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-wa-green" />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 border-t border-wa-border" />

        <ul className="flex flex-col gap-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-wa-green/10 text-wa-green"
                      : "text-wa-muted hover:bg-wa-surface hover:text-wa-text",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-wa-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-wa-surface/60 focus:bg-wa-surface/60 focus:outline-none data-popup-open:bg-wa-surface/60">
            <Avatar className="size-8 shrink-0">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Avatar"}
                />
              ) : null}
              <AvatarFallback className="bg-wa-green/10 text-sm font-medium text-wa-green">
                {profile?.full_name?.charAt(0)?.toUpperCase() ??
                  profile?.email?.charAt(0)?.toUpperCase() ??
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-wa-text">
                {profile?.full_name ?? "User"}
              </p>
              <p className="truncate text-xs text-wa-muted">
                {profile?.email ?? ""}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={6}
            className="min-w-56 bg-wa-panel text-wa-text ring-wa-border"
          >
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
                  onClick={onClose}
                  className="text-wa-text focus:bg-wa-surface focus:text-wa-text"
                />
              }
            >
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=whatsapp"
                  onClick={onClose}
                  className="text-wa-text focus:bg-wa-surface focus:text-wa-text"
                />
              }
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-wa-surface" />
            <DropdownMenuItem
              onClick={signOut}
              className="text-wa-text focus:bg-wa-surface focus:text-wa-text"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

/** Fixed left rail — desktop only, always visible in the flex layout. */
export function SidebarRail() {
  return (
    <aside
      className="relative z-0 flex h-full w-60 shrink-0 flex-col border-r border-wa-border bg-wa-panel"
      aria-label="Primary"
    >
      <SidebarPanel />
    </aside>
  );
}

interface SidebarDrawerProps {
  open?: boolean;
  onClose?: () => void;
}

/** Off-canvas drawer — mobile/tablet only, never occupies layout width. */
export function SidebarDrawer({ open = false, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-wa-deep/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-[min(85vw,18rem)] flex-col border-r border-wa-border bg-wa-panel lg:hidden",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        aria-label="Primary"
        aria-hidden={!open}
      >
        <SidebarPanel onClose={onClose} showClose />
      </aside>
    </>
  );
}

/** @deprecated Use SidebarRail + SidebarDrawer in the shell. */
export function Sidebar(props: SidebarDrawerProps) {
  return <SidebarDrawer {...props} />;
}
