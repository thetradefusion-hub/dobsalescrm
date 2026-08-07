-- ============================================================
-- 021_rbac_roles_and_accounts.sql
-- Phase 1 RBAC foundation. Additive + backfill.
-- Does NOT change WhatsApp/AI business logic or send/webhook code.
-- Solo Admins keep auth.uid() = user_id data RLS (unchanged in Phase 1).
-- ============================================================

-- ------------------------------------------------------------
-- Roles tables FIRST (helpers reference them)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_system_slug
  ON public.roles (slug)
  WHERE account_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_account_slug
  ON public.roles (account_id, slug)
  WHERE account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
  ON public.role_permissions (role_id);

-- ------------------------------------------------------------
-- Profiles extensions
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_id UUID,
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

UPDATE public.profiles
SET account_id = user_id
WHERE account_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles (account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles (role_id);

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_account_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.user_id = auth.uid()
      AND (
        COALESCE(p.role, '') = 'admin'
        OR COALESCE(r.is_admin, false) = true
        OR p.account_id = p.user_id
      )
  );
$$;

-- ------------------------------------------------------------
-- Seed system role templates
-- ------------------------------------------------------------
INSERT INTO public.roles (account_id, name, slug, is_system, is_admin, description)
SELECT NULL, 'Admin', 'admin', true, true, 'Full account access'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE account_id IS NULL AND slug = 'admin');

INSERT INTO public.roles (account_id, name, slug, is_system, is_admin, description)
SELECT NULL, 'Sales Executive', 'sales_executive', true, false, 'Assigned leads, deals, tasks, WhatsApp'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE account_id IS NULL AND slug = 'sales_executive');

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, '*'
FROM public.roles r
WHERE r.account_id IS NULL AND r.slug = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_key = '*'
  );

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM public.roles r
CROSS JOIN (
  VALUES
    ('dashboard.view'),
    ('leads.view_assigned'),
    ('leads.create'),
    ('leads.edit_assigned'),
    ('deals.view_assigned'),
    ('deals.edit_assigned'),
    ('contacts.view_assigned'),
    ('contacts.create'),
    ('contacts.edit'),
    ('tasks.view_assigned'),
    ('tasks.create'),
    ('tasks.edit'),
    ('calendar.view_own'),
    ('whatsapp.inbox_assigned'),
    ('whatsapp.send'),
    ('settings.profile')
) AS p(permission_key)
WHERE r.account_id IS NULL AND r.slug = 'sales_executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_key = p.permission_key
  );

-- Existing owners → admin
UPDATE public.profiles p
SET role = 'admin'
WHERE p.account_id = p.user_id
  AND (p.role IS NULL OR p.role IN ('user', 'admin', ''));

-- Clone templates per existing account
INSERT INTO public.roles (account_id, name, slug, is_system, is_admin, description)
SELECT p.account_id, t.name, t.slug, true, t.is_admin, t.description
FROM (SELECT DISTINCT account_id FROM public.profiles) p
CROSS JOIN (
  SELECT name, slug, is_admin, description
  FROM public.roles
  WHERE account_id IS NULL AND slug IN ('admin', 'sales_executive')
) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.account_id = p.account_id AND r.slug = t.slug
);

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT ar.id, sp.permission_key
FROM public.roles ar
JOIN public.roles sr
  ON sr.account_id IS NULL AND sr.slug = ar.slug
JOIN public.role_permissions sp ON sp.role_id = sr.id
WHERE ar.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = ar.id AND rp.permission_key = sp.permission_key
  );

UPDATE public.profiles p
SET role_id = r.id,
    role = 'admin'
FROM public.roles r
WHERE r.account_id = p.account_id
  AND r.slug = 'admin'
  AND p.account_id = p.user_id;

-- ------------------------------------------------------------
-- Signup: new user = Admin of own account
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.roles WHERE account_id = NEW.id AND slug = 'admin'
  ) THEN
    INSERT INTO public.roles (account_id, name, slug, is_system, is_admin, description)
    SELECT NEW.id, name, slug, true, is_admin, description
    FROM public.roles
    WHERE account_id IS NULL AND slug = 'admin'
    LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.roles WHERE account_id = NEW.id AND slug = 'sales_executive'
  ) THEN
    INSERT INTO public.roles (account_id, name, slug, is_system, is_admin, description)
    SELECT NEW.id, name, slug, true, is_admin, description
    FROM public.roles
    WHERE account_id IS NULL AND slug = 'sales_executive'
    LIMIT 1;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT ar.id, sp.permission_key
  FROM public.roles ar
  JOIN public.roles sr ON sr.account_id IS NULL AND sr.slug = ar.slug
  JOIN public.role_permissions sp ON sp.role_id = sr.id
  WHERE ar.account_id = NEW.id
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = ar.id AND rp.permission_key = sp.permission_key
    );

  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE account_id = NEW.id AND slug = 'admin'
  LIMIT 1;

  INSERT INTO public.profiles (user_id, full_name, email, role, account_id, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'admin',
    NEW.id,
    admin_role_id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- ------------------------------------------------------------
-- RLS for roles / permissions
-- ------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account roles" ON public.roles;
CREATE POLICY "Users can view account roles" ON public.roles
  FOR SELECT USING (
    account_id IS NULL
    OR account_id = public.current_account_id()
  );

DROP POLICY IF EXISTS "Admins manage account roles" ON public.roles;
CREATE POLICY "Admins manage account roles" ON public.roles
  FOR ALL USING (
    account_id = public.current_account_id()
    AND public.is_account_admin()
  )
  WITH CHECK (
    account_id = public.current_account_id()
    AND public.is_account_admin()
  );

DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
CREATE POLICY "Users can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND (r.account_id IS NULL OR r.account_id = public.current_account_id())
    )
  );

DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.account_id = public.current_account_id()
        AND public.is_account_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.account_id = public.current_account_id()
        AND public.is_account_admin()
    )
  );

-- Teammates visible for assignee dropdowns (same account)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view account profiles" ON public.profiles;
CREATE POLICY "Users can view account profiles" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR account_id = public.current_account_id()
  );
