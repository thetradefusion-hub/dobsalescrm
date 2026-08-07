'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarPlus,
  ListTodo,
  Radio,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';

type Action = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  href?: string;
  onClick?: () => void;
};

/** One-tap shortcuts for the actions reps repeat all day. */
export function QuickActionsBar({
  onAddLead,
  className,
}: {
  onAddLead: () => void;
  className?: string;
}) {
  const actions: Action[] = [
    {
      label: 'Add Lead',
      icon: UserPlus,
      tone: 'bg-violet-50 text-violet-600 ring-violet-200/70',
      onClick: onAddLead,
    },
    {
      label: 'WhatsApp',
      icon: WhatsAppIcon,
      tone: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
      href: '/inbox',
    },
    {
      label: 'Create Task',
      icon: ListTodo,
      tone: 'bg-sky-50 text-sky-600 ring-sky-200/70',
      href: '/tasks',
    },
    {
      label: 'Schedule',
      icon: CalendarPlus,
      tone: 'bg-amber-50 text-amber-600 ring-amber-200/70',
      href: '/tasks?filter=due_today',
    },
    {
      label: 'Campaign',
      icon: Radio,
      tone: 'bg-rose-50 text-rose-600 ring-rose-200/70',
      href: '/broadcasts',
    },
    {
      label: 'Contacts',
      icon: Users,
      tone: 'bg-indigo-50 text-indigo-600 ring-indigo-200/70',
      href: '/contacts',
    },
    {
      label: 'Reports',
      icon: BarChart3,
      tone: 'bg-teal-50 text-teal-600 ring-teal-200/70',
      href: '/reports',
    },
    {
      label: 'AI Assistant',
      icon: Sparkles,
      tone: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-200/70',
      href: '/settings?tab=ai',
    },
  ];

  const inner = (action: Action) => (
    <>
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-xl ring-1 transition ring-inset group-hover:scale-105',
          action.tone
        )}
      >
        <action.icon className="size-4" />
      </span>
      <span className="dark:text-saas-muted truncate text-[10px] font-semibold text-slate-500 group-hover:text-slate-800">
        {action.label}
      </span>
    </>
  );

  return (
    <div
      className={cn(
        'premium-panel grid grid-cols-4 gap-1 p-2 sm:grid-cols-8',
        className
      )}
    >
      {actions.map((action) =>
        action.href ? (
          <Link
            key={action.label}
            href={action.href}
            className="group dark:hover:bg-saas-bg flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition hover:bg-slate-50"
          >
            {inner(action)}
          </Link>
        ) : (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="group dark:hover:bg-saas-bg flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition hover:bg-slate-50"
          >
            {inner(action)}
          </button>
        )
      )}
    </div>
  );
}
