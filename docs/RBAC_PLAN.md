# RBAC Plan — Admin, Sales Executive & Custom Roles

> **Status:** Phases 1–5 largely complete; smoke-test Admin WhatsApp/AI recommended  
> **WhatsApp model:** Option C — shared company number by default; SE may connect own number only with `whatsapp.own_number`  
> **Safety rule:** Do **not** change WhatsApp send/webhook/automation engine or AI reply engine unless a phase explicitly requires a minimal, reviewed touch. Prefer permission gates + query filters around existing APIs.

---

## Goals

1. Frontend signup → **Admin** (account owner).
2. Admin creates **Sales Executive** and **custom roles** with permission checkboxes.
3. UI (sidebar, screens, settings) shows only allowed features.
4. Data scoped by account + permissions (`view_all` vs `view_assigned`).
5. Admin can see **all** team leads + WhatsApp under the account.
6. Existing WhatsApp, AI auto-reply, broadcasts, automations keep working for Admin exactly as today.

---

## Non-goals (v1)

- Full CRM redesign / new login page.
- Changing Meta webhook crypto or send pipeline.
- Separate multi-tenant SaaS billing.

---

## Architecture

### Account

| Concept | Storage |
|---------|---------|
| Account root | `profiles.account_id` = Admin’s `auth.users.id` |
| Admin | `account_id = user_id`, system admin role |
| Team member | same `account_id`, non-admin role |

CRM rows (`deals`, `contacts`, `conversations`, …) stay owned by **account** (`user_id` = Admin / account root) so existing data and WhatsApp config continue to work.

### Roles & permissions

```
roles (per account + system templates)
role_permissions (role_id, permission_key)
profiles.role_id → roles
profiles.role text kept in sync for display ('admin' | 'sales_executive' | custom slug)
```

### WhatsApp (Option C)

| Mode | Who | Behavior |
|------|-----|----------|
| Shared (default) | Admin connects company number on account owner | Team replies on assigned chats; Admin sees all |
| Own number | SE with `whatsapp.own_number` | SE connects own `whatsapp_config`; Admin can still access account-scoped data |

**Do not break:** `whatsapp_config` UNIQUE(user_id), webhook routing by `phone_number_id`, AI auto-reply on inbound.

---

## Permission keys

See `src/lib/auth/permissions.ts` (source of truth after Phase 1).

Defaults for **Sales Executive**: assigned leads/deals/tasks/chats; notes/follow-up/WhatsApp send; **no** reports, broadcast, automation, team settings, delete/assign/import.

**Admin**: all permissions (locked system role).

---

## Screen matrix

| Screen | Admin | Sales Executive (default) |
|--------|-------|---------------------------|
| Dashboard | Team + all KPIs | Personal only |
| Leads | All + assign/import/delete | Assigned; edit status/notes/follow-up |
| Pipelines / Deals | All | Assigned |
| Contacts | All | Linked to assigned lead/chat |
| Tasks / Calendar | Team | Own |
| WhatsApp Inbox | All account chats | Assigned (+ own number if allowed) |
| Broadcast / Automation / Reports | Yes | Hidden + route blocked |
| Settings | Full + Team & Roles + Company WA | Profile (+ My WhatsApp if allowed) |

---

## Phases

### Phase 1 — Foundation (DB + signup Admin)
- [x] Migration: `account_id`, `roles`, `role_permissions`, backfill Admins (`021_rbac_roles_and_accounts.sql`)
- [x] `handle_new_user` → Admin + account + default permissions
- [x] App helpers: `permissions.ts`, `roles.ts`, typed profile in `useAuth`
- [x] **No** WhatsApp/AI route changes
- [ ] Verify: existing Admin login, inbox, AI config still load

### Phase 2 — Nav & route gates
- [x] Sidebar / mobile nav filtered by permissions
- [x] Middleware: protect `/tasks`; block SE from reports/broadcasts/automations/admin settings tabs
- [x] Soft redirects in dashboard shell

### Phase 3 — Team & Roles UI
- [x] Settings → Team (create SE)
- [x] Settings → Roles (custom role + checkboxes)
- [x] API `/api/team/members` (service role create user)
- [x] API `/api/team/roles`

### Phase 4 — Data scoping
- [x] RLS account-scoped deals/contacts/tasks/conversations/pipelines (`022_rbac_account_scoped_rls.sql`)
- [x] Leads UI forces assignee filter for non–view_all
- [x] Tasks UI forces assignee filter for non–view_all
- [x] Inbox UI filters assigned chats for SE
- [x] `createLeadFromContact` uses account owner + auto-assign SE
- [ ] Contacts page polish (RLS already scopes)
- [ ] Regression: Admin still sees all own historical data

### Phase 5 — WhatsApp Option C (minimal)
- [x] Inbox filter polish: Admin all / SE assigned
- [x] Permission gate for Broadcast/Automation UI (Phase 2)
- [x] My WhatsApp settings tab if `whatsapp.own_number`
- [x] **Still avoid** editing `src/lib/whatsapp/**` send/webhook

### Phase 6 — Polish & verify
- [x] Typecheck (`tsc --noEmit`) passed
- [ ] Full `npm run build` + manual smoke: login, leads, WhatsApp send, AI config
- [x] Update this checklist

---

## Safety checklist (every phase)

- [ ] No edits to WhatsApp webhook verification / decrypt / message persist flow unless unavoidable
- [ ] No edits to AI `tryGlobalAiAutoReply` await contract
- [ ] Automations engine untouched
- [ ] Build passes
- [ ] Single-user Admin account behaves like pre-RBAC

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-08-06 | WhatsApp model **C** |
| 2026-08-06 | Signup = Admin; custom roles allowed |
| 2026-08-06 | Implement via this plan, phase by phase |
