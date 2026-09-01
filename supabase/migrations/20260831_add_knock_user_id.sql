-- Add knock_user_id to profiles for Knock notification mapping
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS knock_user_id TEXT;

COMMENT ON COLUMN public.profiles.knock_user_id IS 'External Knock user ID for notification delivery';
