-- ============================================================
-- 009_ai_config.sql — AI auto-reply (OpenAI / Gemini)
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai'
    CHECK (provider IN ('openai', 'gemini')),
  api_key_encrypted TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful WhatsApp business assistant. Reply concisely in the same language the customer uses. Be polite and professional. Read the full conversation history. Never repeat questions the customer already answered — move the conversation forward.',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  skip_if_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  max_history_messages INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON ai_config(user_id);

ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ai config" ON ai_config;
CREATE POLICY "Users can manage own ai config" ON ai_config FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON ai_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
