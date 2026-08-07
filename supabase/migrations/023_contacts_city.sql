-- Add city on contacts for lead capture forms.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_city ON public.contacts (city)
  WHERE city IS NOT NULL;
