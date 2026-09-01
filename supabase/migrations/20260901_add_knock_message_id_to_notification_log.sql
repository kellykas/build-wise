-- Add knock_message_id to notification_log for matching Knock webhook delivery events
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS knock_message_id TEXT;

COMMENT ON COLUMN public.notification_log.knock_message_id
  IS 'Knock message ID used to match webhook delivery/engagement events back to log entries';

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_knock_message_id
  ON public.notification_log (knock_message_id)
  WHERE knock_message_id IS NOT NULL;
