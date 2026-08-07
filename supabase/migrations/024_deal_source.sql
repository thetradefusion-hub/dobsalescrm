-- Lead acquisition source on deals (Meta Ads, Website, Manual, etc.)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_deals_source
  ON public.deals (user_id, source)
  WHERE source IS NOT NULL;

COMMENT ON COLUMN public.deals.source IS
  'Lead source key: manual, meta_ads, google_ads, website, whatsapp, referral, csv_import, other, or custom.';
