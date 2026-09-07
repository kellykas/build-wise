-- Fix: Several FK constraints referencing projects.id use ON DELETE NO ACTION,
-- which blocks deletion of projects that have related rows.
-- Change them to ON DELETE SET NULL so child rows are unlinked rather than blocked.

DO $$
DECLARE
  fks_to_fix text[] := ARRAY[
    'purchase_orders_project_id_fkey',
    'invoices_project_id_fkey',
    'equipment_assigned_project_id_fkey'
  ];
  fk_name text;
BEGIN
  FOREACH fk_name IN ARRAY fks_to_fix LOOP
    -- Drop existing constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = fk_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS %I',
        fk_name
      );
    END IF;
  END LOOP;
END $$;

-- Recreate with ON DELETE SET NULL

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_project_id_fkey,
  ADD CONSTRAINT purchase_orders_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_project_id_fkey,
  ADD CONSTRAINT invoices_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_assigned_project_id_fkey,
  ADD CONSTRAINT equipment_assigned_project_id_fkey
    FOREIGN KEY (assigned_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
