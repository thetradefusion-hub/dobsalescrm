-- Hot lead: auto-assign agent + WhatsApp alert to owner phone

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_hot_auto_assign BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_hot_assign_agent_id UUID;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_alert_phone TEXT;
