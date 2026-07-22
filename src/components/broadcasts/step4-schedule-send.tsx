'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Send, Loader2, Users, Save } from 'lucide-react';

interface AudienceConfig {
  type: string;
  contactIds?: string[];
  tagIds?: string[];
  csvContacts?: { phone: string; name?: string }[];
}

interface Step4Props {
  name: string;
  onNameChange: (name: string) => void;
  template: MessageTemplate;
  audience: AudienceConfig;
  onSend: () => void;
  onSaveDraft?: () => void;
  onBack: () => void;
  isProcessing: boolean;
  progress: number;
}

export function Step4ScheduleSend({
  name,
  onNameChange,
  template,
  audience,
  onSend,
  onSaveDraft,
  onBack,
  isProcessing,
  progress,
}: Step4Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState<number>(0);
  const [loadingReach, setLoadingReach] = useState(true);

  useEffect(() => {
    async function calculateReach() {
      setLoadingReach(true);
      try {
        const supabase = createClient();

        if (audience.type === 'all') {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
          setEstimatedReach(count ?? 0);
        } else if (
          audience.type === 'contacts' &&
          audience.contactIds &&
          audience.contactIds.length > 0
        ) {
          setEstimatedReach(audience.contactIds.length);
        } else if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
          const { data: contactTags } = await supabase
            .from('contact_tags')
            .select('contact_id')
            .in('tag_id', audience.tagIds);

          const uniqueIds = new Set((contactTags ?? []).map((ct) => ct.contact_id));
          setEstimatedReach(uniqueIds.size);
        } else if (audience.type === 'csv' && audience.csvContacts) {
          setEstimatedReach(audience.csvContacts.length);
        } else {
          setEstimatedReach(0);
        }
      } finally {
        setLoadingReach(false);
      }
    }

    calculateReach();
  }, [audience]);

  const audienceLabel =
    audience.type === 'all'
      ? 'All Contacts'
      : audience.type === 'contacts'
        ? `Selected Contacts (${audience.contactIds?.length ?? 0})`
        : audience.type === 'tags'
          ? `Tags (${audience.tagIds?.length ?? 0} selected)`
          : audience.type === 'csv'
            ? 'CSV Upload'
            : 'Custom';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-wa-text">Review & Send</h2>
        <p className="mt-1 text-sm text-wa-muted">
          Name your broadcast, review the details, and send.
        </p>
      </div>

      {/* Broadcast Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-wa-text">Broadcast Name</label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Summer Sale Announcement"
          className="border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted/80"
        />
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-wa-border bg-wa-panel/50 p-4 space-y-3">
        <p className="text-sm font-medium text-wa-text">Summary</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-wa-muted">Template</p>
            <p className="text-wa-text">{template.name}</p>
          </div>
          <div>
            <p className="text-xs text-wa-muted">Audience</p>
            <p className="text-wa-text">{audienceLabel}</p>
          </div>
          <div>
            <p className="text-xs text-wa-muted">Estimated Reach</p>
            <div className="flex items-center gap-1.5">
              {loadingReach ? (
                <Loader2 className="h-3 w-3 animate-spin text-wa-green" />
              ) : (
                <>
                  <Users className="h-3.5 w-3.5 text-wa-green" />
                  <p className="font-medium text-wa-text">{estimatedReach.toLocaleString()}</p>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-wa-muted">Language</p>
            <p className="text-wa-text">{template.language ?? 'en_US'}</p>
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="rounded-xl border border-wa-green/20 bg-wa-green/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-wa-green" />
              <p className="text-sm font-medium text-wa-text">Sending broadcast...</p>
            </div>
            <span className="text-xs font-medium text-wa-green">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-wa-surface">
            <div
              className="h-1.5 rounded-full bg-wa-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-wa-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="border-wa-border text-wa-text/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={!name.trim() || isProcessing}
              className="border-wa-border text-wa-text/90 hover:bg-wa-surface disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </Button>
          )}

          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogTrigger
            render={
              <Button
                disabled={!name.trim() || isProcessing}
                className="bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white disabled:opacity-50"
              />
            }
          >
            <Send className="h-4 w-4" />
            Send Broadcast
          </DialogTrigger>
          <DialogContent className="border-wa-border bg-wa-panel sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-wa-text">Confirm Broadcast</DialogTitle>
              <DialogDescription className="text-wa-muted">
                You are about to send this broadcast to{' '}
                <span className="font-medium text-wa-text">{estimatedReach.toLocaleString()}</span>{' '}
                contacts using the{' '}
                <span className="font-medium text-wa-text">{template.name}</span> template.
                This will send real WhatsApp messages and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="border-wa-border text-wa-text/90"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirm(false);
                  onSend();
                }}
                className="bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white"
              >
                <Send className="h-4 w-4" />
                Confirm & Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}
