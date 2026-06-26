
CREATE TYPE public.inquiry_type AS ENUM ('quote', 'contact');
CREATE TYPE public.inquiry_status AS ENUM ('new', 'in_review', 'responded', 'closed');

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.inquiry_type NOT NULL DEFAULT 'contact',
  status public.inquiry_status NOT NULL DEFAULT 'new',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  project_type text,
  budget_range text,
  location text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.inquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an inquiry"
  ON public.inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can view inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can update inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);
