-- ============================================================
-- 022_rbac_account_scoped_rls.sql
-- Phase 4: shared account data access for team members.
-- WhatsApp config RLS unchanged (company number stays on Admin user_id).
-- Conversations/deals/contacts/tasks: account + assignee rules.
-- ============================================================

-- Deals / Leads
DROP POLICY IF EXISTS "Users can manage own deals" ON public.deals;
CREATE POLICY "Account members access deals" ON public.deals
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_to = public.current_profile_id()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_to = public.current_profile_id()
      )
    )
  );

-- Contacts
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
CREATE POLICY "Account members access contacts" ON public.contacts
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.contact_id = contacts.id
            AND d.user_id = public.current_account_id()
            AND d.assigned_to = public.current_profile_id()
        )
        OR EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.contact_id = contacts.id
            AND c.user_id = public.current_account_id()
            AND c.assigned_agent_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_id = public.current_account_id()
  );

-- Tasks
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Account members access tasks" ON public.tasks
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_to = public.current_profile_id()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_to = public.current_profile_id()
        OR assigned_to IS NULL
      )
    )
  );

-- Conversations (shared company inbox + own)
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
CREATE POLICY "Account members access conversations" ON public.conversations
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_agent_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id = public.current_account_id()
      AND (
        public.is_account_admin()
        OR assigned_agent_id = auth.uid()
      )
    )
  );

-- Pipelines (team reads Admin account pipelines)
DROP POLICY IF EXISTS "Users can manage own pipelines" ON public.pipelines;
CREATE POLICY "Account members access pipelines" ON public.pipelines
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id = public.current_account_id()
  );
CREATE POLICY "Account admins write pipelines" ON public.pipelines
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR (user_id = public.current_account_id() AND public.is_account_admin())
  );
CREATE POLICY "Account admins update pipelines" ON public.pipelines
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (user_id = public.current_account_id() AND public.is_account_admin())
  );
CREATE POLICY "Account admins delete pipelines" ON public.pipelines
  FOR DELETE USING (
    user_id = auth.uid()
    OR (user_id = public.current_account_id() AND public.is_account_admin())
  );

-- Pipeline stages follow pipelines
DROP POLICY IF EXISTS "Users can manage pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Account members access pipeline stages" ON public.pipeline_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pipelines p
      WHERE p.id = pipeline_stages.pipeline_id
        AND (
          p.user_id = auth.uid()
          OR p.user_id = public.current_account_id()
        )
    )
  );
CREATE POLICY "Account admins write pipeline stages" ON public.pipeline_stages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pipelines p
      WHERE p.id = pipeline_stages.pipeline_id
        AND (
          p.user_id = auth.uid()
          OR (p.user_id = public.current_account_id() AND public.is_account_admin())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pipelines p
      WHERE p.id = pipeline_stages.pipeline_id
        AND (
          p.user_id = auth.uid()
          OR (p.user_id = public.current_account_id() AND public.is_account_admin())
        )
    )
  );
