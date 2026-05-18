-- ============================================================
-- 010_ai_lead_sync.sql — Auto-create/update leads from AI chats
-- ============================================================

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
