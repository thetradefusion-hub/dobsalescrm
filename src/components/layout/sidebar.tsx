"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { BRAND_ICON, BRAND_NAME } from "@/lib/brand";
import { BrandLogo } from "@/components/brand-logo";
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
  BarChart3,
  ListTodo,
  PanelLeftClose,
  PanelLeft,
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

const navGroups: {
  label: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/leads", label: "Leads", icon: Target },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/pipelines", label: "Pipelines", icon: GitBranch },
    ],
  },
  {
    label: "Engage",
    items: [
      { href: "/inbox", label: "Inbox", icon: MessageSquare },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/broadcasts", label: "Broadcasts", icon: Radio },
    ],
  },
  {
    label: "Ops",
    items: [
      { href: "/automations", label: "Automations", icon: Zap },
    ],
  },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export const SIDEBAR_COLLAPSED_KEY = "wacrm_sidebar_collapsed";

interface SidebarPanelProps {
  onClose?: () => void;
  showClose?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  showUnreadDot,
  totalUnread,
  collapsed,
  onClose,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  isActive: boolean
  showUnreadDot?: boolean
  totalUnread?: number
  collapsed?: boolean
  onClose?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-wa-green/10 text-wa-green"
          : "text-wa-muted hover:bg-wa-surface hover:text-wa-text",
      )}
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {showUnreadDot && collapsed && (
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-wa-green" />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {showUnreadDot && (
            <span
              aria-label={`${totalUnread} unread conversation${totalUnread === 1 ? "" : "s"}`}
              className="relative flex h-2 w-2"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wa-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-wa-green" />
            </span>
          )}
        </>
      )}
    </Link>
  )
}

function SidebarPanel({
  onClose,
  showClose = false,
  collapsed = false,
  onToggleCollapse,
}: SidebarPanelProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-wa-border",
          collapsed ? "h-14 justify-center px-2" : "h-16 justify-between gap-2 px-3",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center",
            collapsed ? "justify-center" : "flex-1 gap-2",
          )}
          onClick={onClose}
        >
          {collapsed ? (
            <Image
              src={BRAND_ICON}
              alt={BRAND_NAME}
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
          ) : (
            <BrandLogo
              width={220}
              height={48}
              className="h-11 w-auto max-w-full"
              priority
            />
          )}
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
        {onToggleCollapse && !showClose && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-wa-muted hover:bg-wa-surface hover:text-wa-text"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3",
          collapsed ? "px-1.5" : "px-3",
        )}
      >
        <div className="flex flex-col gap-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-wa-muted/80">
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div
                  className="mx-auto mb-1.5 h-px w-6 bg-wa-border/80"
                  aria-hidden
                />
              )}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  const showUnreadDot =
                    item.href === "/inbox" && totalUnread > 0 && !isActive;

                  return (
                    <li key={item.href}>
                      <NavLink
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={isActive}
                        showUnreadDot={showUnreadDot}
                        totalUnread={totalUnread}
                        collapsed={collapsed}
                        onClose={onClose}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="my-4 border-t border-wa-border" />

        <ul className="flex flex-col gap-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClose={onClose}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {onToggleCollapse && !showClose && collapsed && (
        <div className="shrink-0 border-t border-wa-border p-1.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex w-full items-center justify-center rounded-lg py-2.5 text-wa-muted hover:bg-wa-surface hover:text-wa-text"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "shrink-0 border-t border-wa-border",
          collapsed ? "p-1.5" : "p-3",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center rounded-lg text-left transition-colors hover:bg-wa-surface/60 focus:bg-wa-surface/60 focus:outline-none data-popup-open:bg-wa-surface/60",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
            )}
          >
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
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-wa-text">
                  {profile?.full_name ?? "User"}
                </p>
                <p className="truncate text-xs text-wa-muted">
                  {profile?.email ?? ""}
                </p>
              </div>
            )}
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

interface SidebarRailProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/** Fixed left rail — desktop only. Supports icon-only collapsed mode. */
export function SidebarRail({
  collapsed = false,
  onToggleCollapse,
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "relative z-0 flex h-full shrink-0 flex-col border-r border-wa-border bg-wa-panel transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.25rem]" : "w-64",
      )}
      aria-label="Primary"
      data-collapsed={collapsed || undefined}
    >
      <SidebarPanel
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
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
