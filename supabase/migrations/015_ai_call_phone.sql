-- Phone number shared in AI WhatsApp replies (tap-to-call)

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS call_phone TEXT;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS call_phone_in_replies BOOLEAN NOT NULL DEFAULT TRUE;
