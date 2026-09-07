-- Allow users to delete internal notifications they sent or received within their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'internal_notifications'
      AND policyname = 'internal_notif_delete'
  ) THEN
    CREATE POLICY internal_notif_delete ON public.internal_notifications
      FOR DELETE
      USING (
        company_id = current_company_id()
        AND (recipient_id = auth.uid() OR sender_id = auth.uid())
      );
  END IF;
END
$$;
