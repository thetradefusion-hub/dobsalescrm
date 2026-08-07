'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Settings,
  MessageSquare,
  Tag,
  User,
  Bot,
  Users,
  Shield,
  KeyRound,
  Bell,
  Building2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { WhatsAppConfig } from '@/components/settings/whatsapp-config'
import { TemplateManager } from '@/components/settings/template-manager'
import { TagManager } from '@/components/settings/tag-manager'
import { ProfileForm } from '@/components/settings/profile-form'
import { PasswordForm } from '@/components/settings/password-form'
import { SessionsCard } from '@/components/settings/sessions-card'
import { PushNotificationsCard } from '@/components/settings/push-notifications-card'
import { AiConfig } from '@/components/settings/ai-config'
import { TeamMembersCard } from '@/components/settings/team-members-card'
import { RolesPermissionsCard } from '@/components/settings/roles-permissions-card'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission } from '@/lib/auth/permissions'
import { cn } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

const TAB_VALUES = [
  'profile',
  'security',
  'notifications',
  'whatsapp',
  'ai',
  'templates',
  'tags',
  'team',
  'roles',
] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v)
}

type NavItem = {
  id: TabValue
  label: string
  description: string
  icon: LucideIcon | typeof WhatsAppIcon
  group: 'account' | 'workspace' | 'team'
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, isAdmin, permissions } = useAuth()

  const canFullSettings =
    isAdmin ||
    hasPermission(permissions, '*') ||
    hasPermission(permissions, 'settings.view')
  const canTeam =
    isAdmin ||
    hasPermission(permissions, 'team.manage') ||
    hasPermission(permissions, '*')
  const canRoles =
    isAdmin ||
    hasPermission(permissions, 'roles.manage') ||
    hasPermission(permissions, '*')
  const canOwnWhatsApp =
    hasPermission(permissions, 'whatsapp.own_number') ||
    hasPermission(permissions, '*')

  const navItems = useMemo(() => {
    const account: NavItem[] = [
      {
        id: 'profile',
        label: 'Profile',
        description: 'Name, email & photo',
        icon: User,
        group: 'account',
      },
      {
        id: 'security',
        label: 'Security',
        description: 'Password & sessions',
        icon: KeyRound,
        group: 'account',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Push alerts',
        icon: Bell,
        group: 'account',
      },
    ]

    const workspace: NavItem[] = []
    if (canFullSettings || canOwnWhatsApp) {
      workspace.push({
        id: 'whatsapp',
        label: canFullSettings ? 'Company WhatsApp' : 'My WhatsApp',
        description: canFullSettings
          ? 'Shared Meta connection'
          : 'Your personal number',
        icon: WhatsAppIcon,
        group: 'workspace',
      })
    }
    if (canFullSettings) {
      workspace.push(
        {
          id: 'ai',
          label: 'AI Assistant',
          description: 'Auto-reply & qualify',
          icon: Bot,
          group: 'workspace',
        },
        {
          id: 'templates',
          label: 'Templates',
          description: 'Message templates',
          icon: MessageSquare,
          group: 'workspace',
        },
        {
          id: 'tags',
          label: 'Tags',
          description: 'Contact labels',
          icon: Tag,
          group: 'workspace',
        },
      )
    }

    const team: NavItem[] = []
    if (canTeam) {
      team.push({
        id: 'team',
        label: 'Team members',
        description: 'Invite executives',
        icon: Users,
        group: 'team',
      })
    }
    if (canRoles) {
      team.push({
        id: 'roles',
        label: 'Roles & access',
        description: 'Permissions matrix',
        icon: Shield,
        group: 'team',
      })
    }

    return [...account, ...workspace, ...team]
  }, [canFullSettings, canOwnWhatsApp, canTeam, canRoles])

  const queryTab = searchParams.get('tab')
  // Legacy: old "profile" tab included password — map unknown to profile
  let tab: TabValue = isTabValue(queryTab)
    ? queryTab
    : queryTab === 'password'
      ? 'security'
      : 'profile'

  if (!navItems.some((n) => n.id === tab)) {
    tab = 'profile'
  }

  const active = navItems.find((n) => n.id === tab) ?? navItems[0]

  const onChange = (next: TabValue) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`/settings?${params.toString()}`, { scroll: false })
  }

  const roleLabel =
    profile?.role === 'sales_executive'
      ? 'Sales Executive'
      : profile?.role === 'admin' || isAdmin
        ? 'Admin'
        : profile?.role?.replace(/_/g, ' ') || 'Member'

  const initial = (
    profile?.full_name ||
    profile?.email ||
    'U'
  )
    .charAt(0)
    .toUpperCase()

  const groups: { key: NavItem['group']; title: string; icon: typeof User }[] =
    [
      { key: 'account', title: 'Your account', icon: User },
      { key: 'workspace', title: 'Workspace', icon: Building2 },
      { key: 'team', title: 'Team & access', icon: Shield },
    ]

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 overflow-x-hidden pb-8 sm:gap-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm sm:p-6 dark:border-saas-border dark:from-saas-card dark:via-saas-card dark:to-saas-bg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 ring-2 ring-white shadow-md">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="bg-sky-600 text-lg font-bold text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-saas-text">
                  Settings
                </h1>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    isAdmin
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-sky-100 text-sky-700',
                  )}
                >
                  {roleLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin || canFullSettings
                  ? 'Workspace, WhatsApp, AI, and team access — all in one place.'
                  : 'Update your profile, security, and personal preferences.'}
              </p>
              {profile?.email ? (
                <p className="mt-0.5 text-xs text-slate-400">{profile.email}</p>
              ) : null}
            </div>
          </div>
          {(isAdmin || canFullSettings) && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange('team')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
              >
                <Users className="size-3.5" />
                Manage team
              </button>
              <button
                type="button"
                onClick={() => onChange('ai')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
              >
                <Sparkles className="size-3.5" />
                AI settings
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
        {/* Mobile: horizontal tab scroller */}
        <div className="-mx-1 overflow-x-auto px-1 lg:hidden">
          <div className="flex w-max gap-1.5 pb-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition',
                    selected
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-saas-card dark:text-saas-muted dark:ring-saas-border',
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Desktop side nav */}
        <aside className="hidden h-fit rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm lg:block dark:border-saas-border dark:bg-saas-card">
          {groups.map((g) => {
            const items = navItems.filter((n) => n.group === g.key)
            if (items.length === 0) return null
            return (
              <div key={g.key} className="mb-2 last:mb-0">
                <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <g.icon className="size-3" />
                  {g.title}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const selected = tab === item.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onChange(item.id)}
                          className={cn(
                            'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                            selected
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50 dark:text-saas-muted dark:hover:bg-saas-bg',
                          )}
                        >
                          <Icon
                            className={cn(
                              'mt-0.5 size-4 shrink-0',
                              selected ? 'text-white' : 'text-slate-400',
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                'block text-[10px]',
                                selected ? 'text-white/80' : 'text-slate-400',
                              )}
                            >
                              {item.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-saas-border dark:bg-saas-card">
            <div className="flex items-center gap-2">
              {active ? (
                <active.icon className="size-4 text-sky-600" />
              ) : (
                <Settings className="size-4 text-sky-600" />
              )}
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-saas-text">
                  {active?.label ?? 'Settings'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {active?.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {tab === 'profile' ? <ProfileForm /> : null}
            {tab === 'security' ? (
              <div className="space-y-4">
                <PasswordForm />
                <SessionsCard />
              </div>
            ) : null}
            {tab === 'notifications' ? <PushNotificationsCard /> : null}
            {tab === 'whatsapp' && (canFullSettings || canOwnWhatsApp) ? (
              <WhatsAppConfig />
            ) : null}
            {tab === 'ai' && canFullSettings ? <AiConfig /> : null}
            {tab === 'templates' && canFullSettings ? <TemplateManager /> : null}
            {tab === 'tags' && canFullSettings ? <TagManager /> : null}
            {tab === 'team' && canTeam ? <TeamMembersCard /> : null}
            {tab === 'roles' && canRoles ? <RolesPermissionsCard /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
