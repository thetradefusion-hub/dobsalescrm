"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Settings as SettingsIcon, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
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

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/contacts": "Contacts",
  "/pipelines": "Pipelines",
  "/broadcasts": "Broadcasts",
  "/automations": "Automations",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "Dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
  className?: string;
}

export function Header({ onOpenSidebar, className }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const title = getPageTitle(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-wa-border bg-wa-deep px-4 lg:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-wa-text/90 transition-colors hover:bg-wa-surface hover:text-wa-text lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-wa-text sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-wa-surface/70 focus:bg-wa-surface/70 focus:outline-none data-popup-open:bg-wa-surface/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label="Open account menu"
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
              />
            ) : null}
            <AvatarFallback className="bg-wa-green/10 text-sm font-medium text-wa-green">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-wa-text sm:inline">
            {profile?.full_name ?? "User"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-wa-panel text-wa-text ring-wa-border"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-wa-text">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-wa-muted">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-wa-surface" />
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=profile"
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
                className="text-wa-text focus:bg-wa-surface focus:text-wa-text"
              />
            }
          >
            <SettingsIcon className="size-4" />
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
    </header>
  );
}
