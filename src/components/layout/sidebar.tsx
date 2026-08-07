'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BRAND_ICON, BRAND_NAME, BRAND_SHORT_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/hooks/use-auth';
import { useTotalUnread } from '@/hooks/use-total-unread';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
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
  ChevronsUpDown,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkline } from '@/components/enterprise/sparkline';
import { permissionForNav } from '@/lib/auth/roles';
import { hasPermission } from '@/lib/auth/permissions';

type NavGroup = 'Overview' | 'Sales' | 'Engage' | 'Insights' | 'System';

/** Flat premium nav — labels match mockup; hrefs are existing routes only. */
const primaryNav: {
  href: string;
  label: string;
  seLabel?: string;
  icon: LucideIcon | typeof WhatsAppIcon;
  group: NavGroup;
  badge?: 'unread';
  /** Extra gate beyond permissionForNav(path) */
  adminOnly?: boolean;
}[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    href: '/leads',
    label: 'Leads',
    seLabel: 'My Leads',
    icon: Target,
    group: 'Sales',
  },
  {
    href: '/pipelines',
    label: 'Deals',
    seLabel: 'My Deals',
    icon: GitBranch,
    group: 'Sales',
  },
  {
    href: '/tasks',
    label: 'Tasks',
    seLabel: 'My Tasks',
    icon: ListTodo,
    group: 'Sales',
  },
  { href: '/contacts', label: 'Contacts', icon: Users, group: 'Sales' },
  {
    href: '/inbox',
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    badge: 'unread',
    group: 'Engage',
  },
  { href: '/broadcasts', label: 'Campaigns', icon: Radio, group: 'Engage' },
  { href: '/automations', label: 'Automation', icon: Zap, group: 'Engage' },
  { href: '/reports', label: 'Reports', icon: BarChart3, group: 'Insights' },
  {
    href: '/settings?tab=ai',
    label: 'AI Assistant',
    icon: Sparkles,
    adminOnly: true,
    group: 'Insights',
  },
  {
    href: '/settings',
    label: 'Settings',
    seLabel: 'Profile',
    icon: Settings,
    group: 'System',
  },
];

const NAV_GROUP_ORDER: NavGroup[] = [
  'Overview',
  'Sales',
  'Engage',
  'Insights',
  'System',
];

export const SIDEBAR_COLLAPSED_KEY = 'wacrm_sidebar_collapsed';

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
  unreadCount,
  collapsed,
  onClose,
}: {
  href: string;
  label: string;
  icon: LucideIcon | typeof WhatsAppIcon;
  isActive: boolean;
  unreadCount?: number;
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const showBadge = typeof unreadCount === 'number' && unreadCount > 0;

  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2.5',
        isActive
          ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-[0_10px_20px_-12px_rgba(91,33,182,0.9)]'
          : 'dark:text-saas-muted dark:hover:bg-saas-bg dark:hover:text-saas-text text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
      )}
    >
      {/* Rail indicator sits flush against the sidebar edge */}
      {isActive && !collapsed ? (
        <span
          className="absolute top-1/2 -left-2.5 h-5 w-1 -translate-y-1/2 rounded-r-full bg-violet-600"
          aria-hidden
        />
      ) : null}

      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-lg transition-all duration-200',
          collapsed ? 'size-8' : 'size-7',
          isActive
            ? 'bg-white/20 text-white'
            : 'dark:group-hover:bg-saas-card text-slate-400 group-hover:bg-white group-hover:text-violet-600 group-hover:shadow-sm'
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
        {showBadge && collapsed && (
          <span className="dark:ring-saas-card absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount! > 9 ? '9+' : unreadCount}
          </span>
        )}
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {showBadge && (
            <span
              aria-label={`${unreadCount} unread`}
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                isActive
                  ? 'bg-white/25 text-white'
                  : 'bg-emerald-500 text-white'
              )}
            >
              {unreadCount! > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function SidebarHealthMini({ collapsed }: { collapsed?: boolean }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const db = createClient();
    void (async () => {
      try {
        const { data } = await db
          .from('deals')
          .select('status, lead_temperature, follow_up_at, value')
          .eq('status', 'open');
        if (cancelled) return;
        const rows = data ?? [];
        const hot = rows.filter((r) => r.lead_temperature === 'hot').length;
        const overdue = rows.filter((r) => {
          if (!r.follow_up_at) return false;
          return new Date(r.follow_up_at).getTime() < Date.now();
        }).length;
        const base = 72;
        const bonus = Math.min(18, hot * 3);
        const penalty = Math.min(30, overdue * 6);
        setScore(Math.max(35, Math.min(98, base + bonus - penalty)));
      } catch {
        if (!cancelled) setScore(78);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (collapsed || score === null) return null;

  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone =
    score >= 75
      ? { color: '#10b981', label: 'Healthy', text: 'text-emerald-600' }
      : score >= 55
        ? { color: '#f59e0b', label: 'Needs attention', text: 'text-amber-600' }
        : { color: '#f43f5e', label: 'At risk', text: 'text-rose-600' };

  return (
    <Link
      href="/reports"
      className="group dark:border-saas-border dark:bg-saas-bg mx-2.5 mb-2 block overflow-hidden rounded-2xl border border-slate-200/70 bg-[linear-gradient(140deg,#f5f3ff_0%,#ffffff_60%,#eef2ff_100%)] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(76,29,149,0.6)]"
    >
      <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
        Sales Health Score
      </p>
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 72 72" className="size-full -rotate-90">
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke={tone.color}
              strokeWidth="6"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="dark:text-saas-text text-sm font-bold text-slate-800 tabular-nums">
              {score}%
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-semibold',
              tone.text
            )}
          >
            <TrendingUp className="size-3" />
            {tone.label}
          </div>
          <div className="mt-1">
            <Sparkline
              values={[62, 68, 65, 72, 70, 78, score]}
              stroke={tone.color}
              fill={tone.color}
              height={22}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SidebarPanel({
  onClose,
  showClose = false,
  collapsed = false,
  onToggleCollapse,
}: SidebarPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, signOut, permissions, isAdmin } = useAuth();
  const totalUnread = useTotalUnread();
  const settingsTab = searchParams.get('tab');

  const visibleNav = (
    !profile || isAdmin || permissions.includes('*')
      ? primaryNav
      : primaryNav.filter((item) => {
          if (item.adminOnly) {
            return (
              hasPermission(permissions, 'settings.view') ||
              hasPermission(permissions, '*')
            );
          }
          return permissionForNav(item.href.split('?')[0], permissions);
        })
  ).map((item) => ({
    ...item,
    label: !isAdmin && item.seLabel ? item.seLabel : item.label,
  }));

  function isNavActive(href: string) {
    const pathOnly = href.split('?')[0];
    const isAiNav = href.includes('tab=ai');

    if (pathOnly === '/settings') {
      if (!pathname.startsWith('/settings')) return false;
      return isAiNav ? settingsTab === 'ai' : settingsTab !== 'ai';
    }

    return (
      pathname === pathOnly ||
      (pathOnly !== '/dashboard' && pathname.startsWith(pathOnly))
    );
  }

  return (
    <>
      <div
        className={cn(
          'dark:border-saas-border relative flex shrink-0 items-center border-b border-slate-200/70',
          collapsed
            ? 'h-14 justify-center px-2'
            : 'h-16 justify-between gap-2 px-3'
        )}
      >
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent"
          aria-hidden
        />
        <Link
          href="/dashboard"
          className={cn(
            'flex min-w-0 items-center',
            collapsed ? 'justify-center' : 'flex-1 gap-2'
          )}
          onClick={onClose}
        >
          {collapsed ? (
            <Image
              src={BRAND_ICON}
              alt={BRAND_NAME}
              width={40}
              height={40}
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200/80"
              priority
            />
          ) : (
            <BrandLogo
              width={220}
              height={48}
              className="h-10 w-auto max-w-full"
              priority
            />
          )}
        </Link>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav
        className={cn(
          'flex-1 overflow-y-auto py-2',
          collapsed ? 'px-1.5' : 'px-2.5'
        )}
      >
        {NAV_GROUP_ORDER.map((group) => ({
          group,
          items: visibleNav.filter((item) => item.group === group),
        }))
          .filter((entry) => entry.items.length > 0)
          .map(({ group, items }, groupIndex) => (
            <div key={group} className="mb-1 last:mb-0">
              {collapsed ? (
                groupIndex > 0 ? (
                  <div
                    className="dark:bg-saas-border mx-auto my-2 h-px w-6 bg-slate-200"
                    aria-hidden
                  />
                ) : null
              ) : (
                <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  {group}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.href + item.label}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isNavActive(item.href)}
                      unreadCount={
                        item.badge === 'unread' ? totalUnread : undefined
                      }
                      collapsed={collapsed}
                      onClose={onClose}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </nav>

      <SidebarHealthMini collapsed={collapsed} />

      {onToggleCollapse && !showClose && collapsed && (
        <div className="dark:border-saas-border shrink-0 border-t border-slate-100 p-1.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex w-full items-center justify-center rounded-xl py-2.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'dark:border-saas-border shrink-0 border-t border-slate-200/70',
          collapsed ? 'p-1.5' : 'p-2.5'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex w-full items-center rounded-xl text-left transition focus:outline-none',
              collapsed
                ? 'justify-center px-0 py-2 hover:bg-slate-100/80'
                : 'dark:border-saas-border dark:bg-saas-bg gap-2.5 border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-violet-200 hover:shadow-[0_10px_22px_-18px_rgba(76,29,149,0.7)]'
            )}
          >
            <span className="relative shrink-0">
              <Avatar className="size-8 ring-2 ring-violet-100 dark:ring-violet-500/25">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? 'Avatar'}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold text-white">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    'U'}
                </AvatarFallback>
              </Avatar>
              <span
                className="dark:ring-saas-card absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                aria-hidden
              />
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="dark:text-saas-text truncate text-sm font-semibold text-slate-800">
                  {profile?.full_name ?? BRAND_SHORT_NAME}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {profile?.role === 'sales_executive'
                    ? 'Sales Executive'
                    : profile?.role === 'admin'
                      ? 'Admin'
                      : (profile?.role ?? 'Admin')}
                </p>
              </div>
            )}
            {!collapsed && (
              <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={6}
            className="min-w-56 bg-white text-slate-800 ring-slate-200"
          >
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
                  onClick={onClose}
                  className="focus:bg-slate-50"
                />
              }
            >
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  href="/settings"
                  onClick={onClose}
                  className="focus:bg-slate-50"
                />
              }
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
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

export function SidebarRail({
  collapsed = false,
  onToggleCollapse,
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        'dark:border-saas-border dark:bg-saas-card relative z-0 flex h-full shrink-0 flex-col border-r border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#fcfcff_55%,#f7f7fd_100%)] shadow-[1px_0_0_rgba(15,23,42,0.03)] transition-[width] duration-200 ease-out',
        collapsed ? 'w-[4.5rem]' : 'w-[17.5rem]'
      )}
      aria-label="Primary"
      data-collapsed={collapsed || undefined}
    >
      <SidebarPanel collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}

interface SidebarDrawerProps {
  open?: boolean;
  onClose?: () => void;
}

export function SidebarDrawer({ open = false, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'dark:border-saas-border dark:bg-saas-card fixed inset-y-0 left-0 z-40 flex h-full w-[min(85vw,18rem)] flex-col border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcfcff_55%,#f7f7fd_100%)] shadow-2xl lg:hidden',
          'transition-transform duration-200 ease-out will-change-transform',
          open ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
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
