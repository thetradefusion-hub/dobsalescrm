'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, MessageSquare, Tag, User, Bot } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { SimulationModeCard } from '@/components/settings/simulation-mode-card';
import { TemplateManager } from '@/components/settings/template-manager';
import { TagManager } from '@/components/settings/tag-manager';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsCard } from '@/components/settings/sessions-card';
import { AiConfig } from '@/components/settings/ai-config';

const TAB_VALUES = ['profile', 'whatsapp', 'ai', 'templates', 'tags'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the active tab — no
  // local state, no sync effect. A previous revision duplicated this
  // into `useState` + a sync effect, which tripped React 19's
  // set-state-in-effect rule and was also redundant.
  const queryTab = searchParams.get('tab');
  const tab: TabValue = isTabValue(queryTab) ? queryTab : 'profile';

  const onChange = (next: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-wa-text">Settings</h1>
        <p className="text-sm text-wa-muted mt-1">
          Manage your profile, WhatsApp® integration, message templates, and
          tags.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => onChange(v as TabValue)}>
        <TabsList className="bg-wa-panel border border-wa-border">
          <TabsTrigger
            value="profile"
            className="data-active:bg-wa-surface data-active:text-wa-green text-wa-muted"
          >
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="data-active:bg-wa-surface data-active:text-wa-green text-wa-muted"
          >
            <Settings className="size-4" />
            WhatsApp Config
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="data-active:bg-wa-surface data-active:text-wa-green text-wa-muted"
          >
            <Bot className="size-4" />
            AI
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-active:bg-wa-surface data-active:text-wa-green text-wa-muted"
          >
            <MessageSquare className="size-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="data-active:bg-wa-surface data-active:text-wa-green text-wa-muted"
          >
            <Tag className="size-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileForm />
          <PasswordForm />
          <SessionsCard />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <SimulationModeCard />
          <WhatsAppConfig />
        </TabsContent>

        <TabsContent value="ai">
          <AiConfig />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="tags">
          <TagManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
