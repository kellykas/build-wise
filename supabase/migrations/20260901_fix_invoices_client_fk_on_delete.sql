-- Fix: invoices.client_id was created without ON DELETE SET NULL,
-- which blocks deletion of clients that have invoices.
-- Drop the old constraint and recreate with ON DELETE SET NULL.

DO $$
BEGIN
  -- Drop the existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_client_id_fkey'
    AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      DROP CONSTRAINT invoices_client_id_fkey;
  END IF;

  -- Recreate with ON DELETE SET NULL
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.clients(id)
    ON DELETE SET NULL;
END
$$;
