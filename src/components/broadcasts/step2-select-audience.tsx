'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contact, CustomField, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  Tags,
  Filter,
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';

type AudienceType = 'all' | 'contacts' | 'tags' | 'custom_field' | 'csv';
type CustomFieldOperator = 'is' | 'is_not' | 'contains';

interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

interface AudienceConfig {
  type: AudienceType;
  contactIds?: string[];
  tagIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  excludeTagIds?: string[];
}

interface Step2Props {
  audience: AudienceConfig;
  onUpdate: (audience: AudienceConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

const audienceOptions: {
  type: AudienceType;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    type: 'all',
    label: 'All Contacts',
    description: 'Send to every contact in your database',
    icon: Users,
  },
  {
    type: 'contacts',
    label: 'Select Contacts',
    description: 'Pick specific contacts from your list',
    icon: UserCheck,
  },
  {
    type: 'tags',
    label: 'Filter by Tags',
    description: 'Target contacts with specific tags',
    icon: Tags,
  },
  {
    type: 'custom_field',
    label: 'Custom Field',
    description: 'Filter by a custom field value',
    icon: Filter,
  },
  {
    type: 'csv',
    label: 'Upload CSV',
    description: 'Upload a list of phone numbers',
    icon: Upload,
  },
];

const OPERATOR_OPTIONS: { value: CustomFieldOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
];

export function Step2SelectAudience({
  audience,
  onUpdate,
  onNext,
  onBack,
}: Step2Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Tags are used both by the primary "Filter by Tags" audience type
  // AND by the exclude-list below — so always load once on mount.
  useEffect(() => {
    async function fetchTags() {
      setLoadingTags(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        setTags(data ?? []);
      } finally {
        setLoadingTags(false);
      }
    }
    fetchTags();
  }, []);

  // Load contacts when "Select Contacts" is active.
  useEffect(() => {
    if (audience.type !== 'contacts') return;
    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('contacts')
          .select('id, name, phone, email, company')
          .order('name', { ascending: true });
        setContacts((data as Contact[]) ?? []);
      } finally {
        setLoadingContacts(false);
      }
    }
    fetchContacts();
  }, [audience.type]);

  // Lazy-load custom fields only when that audience type is active.
  useEffect(() => {
    if (audience.type !== 'custom_field') return;
    async function fetchFields() {
      setLoadingFields(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('custom_fields')
          .select('*')
          .order('field_name');
        setCustomFields(data ?? []);
      } finally {
        setLoadingFields(false);
      }
    }
    fetchFields();
  }, [audience.type]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const hay = `${c.name ?? ''} ${c.phone} ${c.email ?? ''} ${c.company ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, contactSearch]);

  const selectedContactIds = audience.contactIds ?? [];

  const fetchEstimatedCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const supabase = createClient();

      // Base query — produces the superset before exclude is applied.
      let baseIds: Set<string> | null = null; // null means "all contacts"

      if (audience.type === 'all') {
        // Handled below — full-table count adjusted by excludes.
      } else if (audience.type === 'contacts') {
        if (!audience.contactIds || audience.contactIds.length === 0) {
          setEstimatedCount(null);
          return;
        }
        baseIds = new Set(audience.contactIds);
      } else if (
        audience.type === 'tags' &&
        audience.tagIds &&
        audience.tagIds.length > 0
      ) {
        const { data } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.tagIds);
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (
        audience.type === 'custom_field' &&
        audience.customField?.fieldId &&
        audience.customField.value
      ) {
        const { fieldId, operator, value } = audience.customField;
        let q = supabase
          .from('contact_custom_values')
          .select('contact_id')
          .eq('custom_field_id', fieldId);
        if (operator === 'is') q = q.eq('value', value);
        else if (operator === 'is_not') q = q.neq('value', value);
        else q = q.ilike('value', `%${value}%`);
        const { data } = await q;
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (
        audience.type === 'csv' &&
        audience.csvContacts &&
        audience.csvContacts.length > 0
      ) {
        setEstimatedCount(audience.csvContacts.length);
        return;
      } else {
        // Partially-configured audience — wait for the user to finish.
        setEstimatedCount(null);
        return;
      }

      // Apply exclude tags
      let excludeSet: Set<string> | null = null;
      if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
        const { data: excludeRows } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.excludeTagIds);
        excludeSet = new Set((excludeRows ?? []).map((r) => r.contact_id));
      }

      if (baseIds) {
        const effective = [...baseIds].filter(
          (id) => !excludeSet?.has(id),
        );
        setEstimatedCount(effective.length);
      } else {
        // "All" — fetch the total, then subtract exclude set if any.
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });
        const total = count ?? 0;
        setEstimatedCount(excludeSet ? Math.max(0, total - excludeSet.size) : total);
      }
    } finally {
      setLoadingCount(false);
    }
  }, [
    audience.type,
    audience.contactIds,
    audience.tagIds,
    audience.customField,
    audience.csvContacts,
    audience.excludeTagIds,
  ]);

  useEffect(() => {
    fetchEstimatedCount();
  }, [fetchEstimatedCount]);

  function toggleTag(tagId: string) {
    const current = audience.tagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, tagIds: updated });
  }

  function toggleExcludeTag(tagId: string) {
    const current = audience.excludeTagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, excludeTagIds: updated });
  }

  function toggleContact(contactId: string) {
    const current = audience.contactIds ?? [];
    const updated = current.includes(contactId)
      ? current.filter((id) => id !== contactId)
      : [...current, contactId];
    onUpdate({ ...audience, contactIds: updated });
  }

  function selectAllFiltered() {
    const ids = new Set(audience.contactIds ?? []);
    for (const c of filteredContacts) ids.add(c.id);
    onUpdate({ ...audience, contactIds: [...ids] });
  }

  function clearContactSelection() {
    onUpdate({ ...audience, contactIds: [] });
  }

  function updateCustomField(patch: Partial<CustomFieldFilter>) {
    const prev = audience.customField ?? {
      fieldId: '',
      operator: 'is' as CustomFieldOperator,
      value: '',
    };
    onUpdate({ ...audience, customField: { ...prev, ...patch } });
  }

  const isValid =
    audience.type === 'all' ||
    (audience.type === 'contacts' &&
      audience.contactIds &&
      audience.contactIds.length > 0) ||
    (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) ||
    (audience.type === 'custom_field' &&
      !!audience.customField?.fieldId &&
      audience.customField.value.length > 0) ||
    (audience.type === 'csv' &&
      audience.csvContacts &&
      audience.csvContacts.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-wa-text">Select Audience</h2>
        <p className="mt-1 text-sm text-wa-muted">
          Choose who will receive this broadcast.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {audienceOptions.map((option) => {
          const isSelected = audience.type === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() =>
                onUpdate({
                  ...audience,
                  type: option.type,
                  // Wipe shape fields from other types to avoid stale
                  // config leaking across selections.
                  contactIds:
                    option.type === 'contacts' ? audience.contactIds : undefined,
                  tagIds: option.type === 'tags' ? audience.tagIds : undefined,
                  customField:
                    option.type === 'custom_field'
                      ? audience.customField
                      : undefined,
                  csvContacts:
                    option.type === 'csv' ? audience.csvContacts : undefined,
                })
              }
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-wa-green bg-wa-green/5 ring-1 ring-wa-green/30'
                  : 'border-wa-border bg-wa-panel/50 hover:border-wa-border'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-wa-green/10 text-wa-green'
                    : 'bg-wa-surface text-wa-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-wa-text">{option.label}</p>
                <p className="mt-0.5 text-xs text-wa-muted">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {audience.type === 'contacts' && (
        <div className="space-y-3 rounded-xl border border-wa-border bg-wa-panel/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-wa-text">
              Select Contacts
              {selectedContactIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-wa-green">
                  {selectedContactIds.length} selected
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                disabled={loadingContacts || filteredContacts.length === 0}
                className="h-8 border-wa-border text-xs text-wa-text/90"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearContactSelection}
                disabled={selectedContactIds.length === 0}
                className="h-8 border-wa-border text-xs text-wa-text/90"
              >
                <Square className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wa-muted" />
            <Input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search by name, phone, email…"
              className="h-9 border-wa-border bg-wa-surface pl-9 text-sm text-wa-text placeholder:text-wa-muted/80"
            />
          </div>

          {loadingContacts ? (
            <div className="flex items-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-wa-green" />
              <span className="text-xs text-wa-muted">Loading contacts…</span>
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-4 text-xs text-wa-muted">
              No contacts found. Add contacts first from the Contacts page.
            </p>
          ) : filteredContacts.length === 0 ? (
            <p className="py-4 text-xs text-wa-muted">
              No contacts match “{contactSearch}”.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-wa-border bg-wa-surface">
              <ul className="divide-y divide-wa-border">
                {filteredContacts.map((contact) => {
                  const checked = selectedContactIds.includes(contact.id);
                  return (
                    <li key={contact.id}>
                      <button
                        type="button"
                        onClick={() => toggleContact(contact.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          checked
                            ? 'bg-wa-green/10'
                            : 'hover:bg-wa-panel/80'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? 'border-wa-green bg-wa-green text-white'
                              : 'border-wa-border bg-wa-surface'
                          }`}
                          aria-hidden
                        >
                          {checked ? (
                            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                              <path
                                d="M2.5 6.5 5 9l4.5-5.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-wa-text">
                            {contact.name?.trim() || 'Unnamed'}
                          </span>
                          <span className="block truncate text-xs text-wa-muted">
                            {contact.phone}
                            {contact.company ? ` · ${contact.company}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {audience.type === 'tags' && (
        <div className="rounded-xl border border-wa-border bg-wa-panel/50 p-4">
          <p className="mb-3 text-sm font-medium text-wa-text">Select Tags</p>
          {loadingTags ? (
            <Loader2 className="h-5 w-5 animate-spin text-wa-green" />
          ) : tags.length === 0 ? (
            <p className="text-xs text-wa-muted">
              No tags found. Create tags in Settings.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = audience.tagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-wa-green/30 bg-wa-green/10 text-wa-green'
                        : 'border-wa-border bg-wa-surface text-wa-text/90 hover:border-wa-border'
                    }`}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {audience.type === 'custom_field' && (
        <div className="space-y-3 rounded-xl border border-wa-border bg-wa-panel/50 p-4">
          <p className="text-sm font-medium text-wa-text">Custom Field Filter</p>
          {loadingFields ? (
            <Loader2 className="h-5 w-5 animate-spin text-wa-green" />
          ) : customFields.length === 0 ? (
            <p className="text-xs text-wa-muted">
              No custom fields defined. Create one in Settings → Custom Fields.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
              <select
                value={audience.customField?.fieldId ?? ''}
                onChange={(e) => updateCustomField({ fieldId: e.target.value })}
                className="h-9 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green focus:ring-1 focus:ring-wa-green"
              >
                <option value="">Select field…</option>
                {customFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.field_name}
                  </option>
                ))}
              </select>
              <select
                value={audience.customField?.operator ?? 'is'}
                onChange={(e) =>
                  updateCustomField({
                    operator: e.target.value as CustomFieldOperator,
                  })
                }
                className="h-9 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green focus:ring-1 focus:ring-wa-green"
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={audience.customField?.value ?? ''}
                onChange={(e) => updateCustomField({ value: e.target.value })}
                placeholder="Value"
                className="h-9 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none placeholder:text-wa-muted/80 focus:border-wa-green focus:ring-1 focus:ring-wa-green"
              />
            </div>
          )}
        </div>
      )}

      {/* Exclude list — applies regardless of audience type */}
      <div className="rounded-xl border border-wa-border bg-wa-panel/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <X className="h-4 w-4 text-red-400" />
          <p className="text-sm font-medium text-wa-text">
            Exclude contacts with these tags
          </p>
          <span className="text-xs text-wa-muted/80">(optional)</span>
        </div>
        {tags.length === 0 ? (
          <p className="text-xs text-wa-muted/80">No tags available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isExcluded = audience.excludeTagIds?.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleExcludeTag(tag.id)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    isExcluded
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-wa-border bg-wa-surface text-wa-text/90 hover:border-wa-border'
                  }`}
                >
                  <span
                    className="mr-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Audience Summary */}
      <div className="rounded-xl border border-wa-border bg-wa-panel/50 p-4">
        <p className="mb-2 text-sm font-medium text-wa-text">Audience Summary</p>
        {loadingCount ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-wa-green" />
            <span className="text-xs text-wa-muted">Calculating…</span>
          </div>
        ) : estimatedCount !== null ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-wa-green" />
            <span className="text-sm text-wa-text">
              {estimatedCount.toLocaleString()}
            </span>
            <span className="text-xs text-wa-muted">estimated recipients</span>
          </div>
        ) : (
          <p className="text-xs text-wa-muted/80">
            Select an audience type to see the estimate.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-wa-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-wa-border text-wa-text/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white disabled:opacity-50"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
