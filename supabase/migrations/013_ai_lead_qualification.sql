-- AI lead qualification (hot / warm / cold) on deals + config

ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_temperature TEXT
  CHECK (lead_temperature IS NULL OR lead_temperature IN ('hot', 'warm', 'cold'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_score INTEGER
  CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_budget_inr INTEGER;

CREATE INDEX IF NOT EXISTS idx_deals_lead_temperature ON deals(user_id, lead_temperature)
  WHERE status = 'open' AND lead_temperature IS NOT NULL;

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_qualify_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_hot_budget_inr INTEGER NOT NULL DEFAULT 30000;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_timeline_max_days INTEGER NOT NULL DEFAULT 60;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_qualify_min_messages INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_qualify_cooldown_minutes INTEGER NOT NULL DEFAULT 5;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_auto_tag BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_hot_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_warm_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS lead_cold_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
