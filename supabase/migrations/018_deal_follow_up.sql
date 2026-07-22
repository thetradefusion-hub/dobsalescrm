-- Manual follow-up date for sales agents (leads / open deals)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deals_follow_up_at ON deals(user_id, follow_up_at)
  WHERE status = 'open' AND follow_up_at IS NOT NULL;
