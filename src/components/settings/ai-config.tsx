'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bot, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { Pipeline, PipelineStage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AiProvider } from '@/types';

const MASKED_KEY = '••••••••••••••••';

const DEFAULT_PROMPT =
  'You are a helpful WhatsApp business assistant. Reply concisely in the same language the customer uses. Be polite and professional. Read the full conversation history. Never repeat questions the customer already answered — move the conversation forward.';

export function AiConfig() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);

  const [provider, setProvider] = useState<AiProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [autoReply, setAutoReply] = useState(false);
  const [skipIfAssigned, setSkipIfAssigned] = useState(true);
  const [maxHistory, setMaxHistory] = useState(20);
  const [leadSync, setLeadSync] = useState(false);
  const [leadQualify, setLeadQualify] = useState(true);
  const [leadHotBudget, setLeadHotBudget] = useState(30000);
  const [leadTimelineDays, setLeadTimelineDays] = useState(60);
  const [leadMinMessages, setLeadMinMessages] = useState(1);
  const [leadCooldown, setLeadCooldown] = useState(5);
  const [leadAutoTag, setLeadAutoTag] = useState(true);
  const [leadPipelineId, setLeadPipelineId] = useState('');
  const [leadStageId, setLeadStageId] = useState('');
  const [leadHotStageId, setLeadHotStageId] = useState('');
  const [leadWarmStageId, setLeadWarmStageId] = useState('');
  const [leadColdStageId, setLeadColdStageId] = useState('');
  const [leadHotAutoAssign, setLeadHotAutoAssign] = useState(true);
  const [leadHotAssignAgentId, setLeadHotAssignAgentId] = useState('');
  const [leadAlertEnabled, setLeadAlertEnabled] = useState(true);
  const [leadAlertPhone, setLeadAlertPhone] = useState('');
  const [callPhone, setCallPhone] = useState('');
  const [callPhoneInReplies, setCallPhoneInReplies] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [testReply, setTestReply] = useState<string | null>(null);
  const supabase = createClient();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setConfigured(!!data.configured);
      setProvider(data.provider === 'gemini' ? 'gemini' : 'openai');
      setModel(data.model ?? (data.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'));
      setSystemPrompt(data.system_prompt ?? DEFAULT_PROMPT);
      setAutoReply(!!data.auto_reply_enabled);
      setSkipIfAssigned(data.skip_if_assigned !== false);
      setMaxHistory(data.max_history_messages ?? 20);
      setLeadSync(!!data.lead_sync_enabled);
      setLeadQualify(data.lead_qualify_enabled !== false);
      setLeadHotBudget(data.lead_hot_budget_inr ?? 30000);
      setLeadTimelineDays(data.lead_timeline_max_days ?? 60);
      setLeadMinMessages(data.lead_qualify_min_messages ?? 1);
      setLeadCooldown(data.lead_qualify_cooldown_minutes ?? 5);
      setLeadAutoTag(data.lead_auto_tag !== false);
      setLeadPipelineId(data.lead_pipeline_id ?? '');
      setLeadStageId(data.lead_stage_id ?? '');
      setLeadHotStageId(data.lead_hot_stage_id ?? '');
      setLeadWarmStageId(data.lead_warm_stage_id ?? '');
      setLeadColdStageId(data.lead_cold_stage_id ?? '');
      setLeadHotAutoAssign(data.lead_hot_auto_assign !== false);
      setLeadHotAssignAgentId(data.lead_hot_assign_agent_id ?? '');
      setLeadAlertEnabled(data.lead_alert_enabled !== false);
      setLeadAlertPhone(data.lead_alert_phone ?? '');
      setCallPhone(data.call_phone ?? '');
      setCallPhoneInReplies(data.call_phone_in_replies !== false);
      setApiKey(data.configured ? MASKED_KEY : '');
      setKeyEdited(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchConfig();
  }, [authLoading, user, fetchConfig]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('pipelines').select('*').order('created_at');
      setPipelines((data ?? []) as Pipeline[]);
    })();
  }, [user, supabase]);

  useEffect(() => {
    if (!leadPipelineId) {
      setStages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', leadPipelineId)
        .order('position');
      setStages((data ?? []) as PipelineStage[]);
    })();
  }, [leadPipelineId, supabase]);

  useEffect(() => {
    if (provider === 'gemini' && model.startsWith('gpt')) {
      setModel('gemini-2.0-flash');
    }
    if (provider === 'openai' && model.startsWith('gemini')) {
      setModel('gpt-4o-mini');
    }
  }, [provider, model]);

  async function handleSave() {
    if (!configured && !apiKey.trim()) {
      toast.error('API key is required');
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        provider,
        model: model.trim(),
        system_prompt: systemPrompt,
        auto_reply_enabled: autoReply,
        skip_if_assigned: skipIfAssigned,
        max_history_messages: maxHistory,
        lead_sync_enabled: leadSync,
        lead_qualify_enabled: leadQualify,
        lead_hot_budget_inr: leadHotBudget,
        lead_timeline_max_days: leadTimelineDays,
        lead_qualify_min_messages: leadMinMessages,
        lead_qualify_cooldown_minutes: leadCooldown,
        lead_auto_tag: leadAutoTag,
        lead_pipeline_id: leadPipelineId || null,
        lead_stage_id: leadStageId || null,
        lead_hot_stage_id: leadHotStageId || null,
        lead_warm_stage_id: leadWarmStageId || null,
        lead_cold_stage_id: leadColdStageId || null,
        lead_hot_auto_assign: leadHotAutoAssign,
        lead_hot_assign_agent_id: leadHotAssignAgentId || null,
        lead_alert_enabled: leadAlertEnabled,
        lead_alert_phone: leadAlertPhone.trim() || null,
        call_phone: callPhone.trim() || null,
        call_phone_in_replies: callPhoneInReplies,
      };
      if (keyEdited && apiKey !== MASKED_KEY) {
        payload.api_key = apiKey.trim();
      } else if (!configured) {
        toast.error('API key is required');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success('AI settings saved');
      setConfigured(true);
      setApiKey(MASKED_KEY);
      setKeyEdited(false);
      await fetchConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleBackfill() {
    if (!leadSync) {
      toast.error('Turn on lead sync first');
      return;
    }
    try {
      setBackfilling(true);
      const res = await fetch('/api/ai/qualify-backfill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ send_hot_alerts: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Backfill failed');
      toast.success(
        `Done: ${data.processed} qualified, ${data.skipped} skipped, ${data.failed} failed`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  }

  async function handleTest() {
    try {
      setTesting(true);
      setTestReply(null);
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Reply with exactly: AI test OK' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Test failed');
      setTestReply(data.reply);
      toast.success('AI connection works');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-wa-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-wa-border bg-wa-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <Bot className="h-5 w-5 text-wa-green" />
            AI Auto-Reply
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Connect ChatGPT (OpenAI) or Gemini to reply intelligently on WhatsApp.
            Use a system prompt to define your brand voice and rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-wa-text/90">Provider</Label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
              >
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div>
              <Label className="text-wa-text/90">Model</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'}
                className="mt-1 bg-wa-surface text-wa-text"
              />
            </div>
          </div>

          <div>
            <Label className="text-wa-text/90">API key</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyEdited(true);
                }}
                placeholder={provider === 'gemini' ? 'AIza…' : 'sk-…'}
                className="bg-wa-surface pr-10 text-wa-text"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-wa-muted hover:text-wa-text"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-wa-muted/80">
              Encrypted at rest. OpenAI: platform.openai.com — Gemini: aistudio.google.com
            </p>
          </div>

          <div>
            <Label className="text-wa-text/90">System prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="mt-1 min-h-32 bg-wa-surface text-wa-text"
              placeholder="Describe how the AI should behave, your business, tone, and limits…"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-wa-border p-4">
            <div>
              <p className="font-medium text-wa-text">Call number in AI replies</p>
              <p className="mt-1 text-xs text-wa-muted">
                Customers can tap the number in WhatsApp to call you directly.
              </p>
            </div>
            <div>
              <Label className="text-wa-text/90">Your business phone</Label>
              <Input
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value)}
                placeholder="+919876543210 or 9876543210"
                className="mt-1 bg-wa-surface text-wa-text"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-wa-text/90">Include in every AI reply</p>
              <Switch checked={callPhoneInReplies} onCheckedChange={setCallPhoneInReplies} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-wa-border p-4">
            <div>
              <p className="font-medium text-wa-text">Sync & qualify leads from AI chats</p>
              <p className="text-xs text-wa-muted mt-1">
                After each AI reply, create/update a deal, score Hot/Warm/Cold (₹30k+ budget, 60-day
                timeline rules), tag the contact, and move pipeline stage.
              </p>
            </div>
            <Switch checked={leadSync} onCheckedChange={setLeadSync} />
          </div>

          {leadSync && (
            <div className="space-y-3 rounded-lg border border-wa-border p-4">
              <div>
                <Label className="text-wa-text/90">Pipeline for new leads</Label>
                <select
                  value={leadPipelineId}
                  onChange={(e) => {
                    setLeadPipelineId(e.target.value);
                    setLeadStageId('');
                  }}
                  className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
                >
                  <option value="">First pipeline (default)</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {leadPipelineId && stages.length > 0 && (
                <div>
                  <Label className="text-wa-text/90">Stage</Label>
                  <select
                    value={leadStageId}
                    onChange={(e) => setLeadStageId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
                  >
                    <option value="">First stage (default)</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {pipelines.length === 0 && (
                <p className="text-xs text-amber-400">
                  Create a pipeline under Pipelines first, or leave empty to use your first pipeline.
                </p>
              )}

              <div className="flex items-center justify-between rounded-md border border-wa-border/80 p-3">
                <div>
                  <p className="text-sm font-medium text-wa-text">AI lead qualification</p>
                  <p className="text-xs text-wa-muted/80 mt-0.5">
                    Hot = budget ≥ threshold, timeline ≤ days, serious buyer, clear requirements
                  </p>
                </div>
                <Switch checked={leadQualify} onCheckedChange={setLeadQualify} />
              </div>

              {leadQualify && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-wa-text/90">Hot lead min budget (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={leadHotBudget}
                        onChange={(e) => setLeadHotBudget(Number(e.target.value))}
                        className="mt-1 bg-wa-surface text-wa-text"
                      />
                    </div>
                    <div>
                      <Label className="text-wa-text/90">Hot timeline max (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={leadTimelineDays}
                        onChange={(e) => setLeadTimelineDays(Number(e.target.value))}
                        className="mt-1 bg-wa-surface text-wa-text"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-wa-text/90">Min customer messages</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={leadMinMessages}
                        onChange={(e) => setLeadMinMessages(Number(e.target.value))}
                        className="mt-1 bg-wa-surface text-wa-text"
                      />
                    </div>
                    <div>
                      <Label className="text-wa-text/90">Re-qualify cooldown (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        value={leadCooldown}
                        onChange={(e) => setLeadCooldown(Number(e.target.value))}
                        className="mt-1 bg-wa-surface text-wa-text"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-wa-text/90">Auto-tag Hot / Warm / Cold on contact</p>
                    <Switch checked={leadAutoTag} onCheckedChange={setLeadAutoTag} />
                  </div>
                  {stages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-wa-muted/80">
                        Optional stage per temperature (empty = auto-match by stage name)
                      </p>
                      <div>
                        <Label className="text-wa-text/90">🔥 Hot stage</Label>
                        <select
                          value={leadHotStageId}
                          onChange={(e) => setLeadHotStageId(e.target.value)}
                          className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
                        >
                          <option value="">Auto</option>
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-wa-text/90">Warm stage</Label>
                        <select
                          value={leadWarmStageId}
                          onChange={(e) => setLeadWarmStageId(e.target.value)}
                          className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
                        >
                          <option value="">Auto</option>
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-wa-text/90">Cold stage</Label>
                        <select
                          value={leadColdStageId}
                          onChange={(e) => setLeadColdStageId(e.target.value)}
                          className="mt-1 w-full rounded-md border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text"
                        >
                          <option value="">Auto</option>
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-md border border-orange-500/20 bg-orange-500/5 p-3">
                    <p className="text-sm font-medium text-orange-200">🔥 Hot lead actions</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-wa-text/90">Auto-assign conversation & deal</p>
                      <Switch checked={leadHotAutoAssign} onCheckedChange={setLeadHotAutoAssign} />
                    </div>
                    {leadHotAutoAssign && user && (
                      <div>
                        <Label className="text-wa-text/90">Assign to agent (optional)</Label>
                        <Input
                          value={leadHotAssignAgentId}
                          onChange={(e) => setLeadHotAssignAgentId(e.target.value)}
                          placeholder={`Empty = you (${user.id.slice(0, 8)}…)`}
                          className="mt-1 bg-wa-surface font-mono text-xs text-wa-text"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-wa-text/90">WhatsApp alert to your phone</p>
                      <Switch checked={leadAlertEnabled} onCheckedChange={setLeadAlertEnabled} />
                    </div>
                    {leadAlertEnabled && (
                      <div>
                        <Label className="text-wa-text/90">Alert phone (E.164)</Label>
                        <Input
                          value={leadAlertPhone}
                          onChange={(e) => setLeadAlertPhone(e.target.value)}
                          placeholder="+919876543210"
                          className="mt-1 bg-wa-surface text-wa-text"
                        />
                        <p className="mt-1 text-xs text-wa-muted/80">
                          Number must be in Meta test recipients. Sent when a lead becomes Hot.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {configured && (
                <div className="rounded-md border border-wa-green/30 bg-wa-green/5 p-3">
                  <p className="text-sm font-medium text-wa-green/90">Existing chats</p>
                  <p className="mt-1 mb-3 text-xs text-wa-muted">
                    Re-qualify all past conversations (Hot/Warm/Cold). No new AI messages sent.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={backfilling}
                    onClick={handleBackfill}
                  >
                    {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Re-qualify all existing chats
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-wa-border p-4">
            <div>
              <p className="font-medium text-wa-text">Auto-reply to every inbound message</p>
              <p className="text-xs text-wa-muted mt-1">
                When on, AI replies globally. For keyword-only replies, turn this off and use an
                Automation with the &quot;AI Reply&quot; step.
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-wa-border p-4">
            <div>
              <p className="font-medium text-wa-text">Skip when conversation is assigned</p>
              <p className="text-xs text-wa-muted mt-1">Do not AI-reply if an agent owns the chat</p>
            </div>
            <Switch checked={skipIfAssigned} onCheckedChange={setSkipIfAssigned} />
          </div>

          <div>
            <Label className="text-wa-text/90">Conversation history (messages)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxHistory}
              onChange={(e) => setMaxHistory(Number(e.target.value))}
              className="mt-1 w-32 bg-wa-surface text-wa-text"
            />
            <p className="mt-1 text-xs text-wa-muted/80">
              How many past messages the AI sees for context (max 50).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save AI settings
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !configured}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Test connection
            </Button>
          </div>

          {testReply && (
            <Alert className="border-wa-green/30 bg-wa-green/10">
              <AlertTitle className="text-wa-green/90">Test reply</AlertTitle>
              <AlertDescription className="text-wa-text/90 whitespace-pre-wrap">{testReply}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
