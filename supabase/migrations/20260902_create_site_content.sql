-- Site content management table
-- Stores all editable frontend content as JSONB for flexibility
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL,           -- e.g. 'hero', 'services', 'about', 'contact'
  key text NOT NULL,               -- e.g. 'title', 'subtitle', 'items'
  value jsonb NOT NULL,            -- flexible JSON value (string, array, object)
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key, company_id)
);

-- RLS policies
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Admins/PMs can manage all site content
CREATE POLICY "Admins can manage site content"
  ON public.site_content
  FOR ALL
  USING (
    public.is_staff_user(auth.uid()) = true
  );

-- Anyone can read published content (for public pages)
CREATE POLICY "Public can read site content"
  ON public.site_content
  FOR SELECT
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_site_content_section ON public.site_content(section, company_id);

-- Seed default content for the landing page
INSERT INTO public.site_content (section, key, value, company_id) VALUES
  ('hero', 'badge', '"Licensed · Bonded · Insured · OSHA Compliant"', NULL),
  ('hero', 'title', '"Engagés pour construire vos rêves"', NULL),
  ('hero', 'subtitle', '"Scer-L/Construct Sarl — a full-service general contractor delivering commercial, residential, industrial and infrastructure projects across the region."', NULL),
  ('hero', 'cta_quote', '"Request a free quote"', NULL),
  ('hero', 'cta_projects', '"View our projects"', NULL),
  ('hero', 'phone_label', '"Speak to a project manager today:"', NULL),
  ('hero', 'phone_number', '"+1 (555) 240-8800"', NULL),
  ('stats', 'items', '[{"v":"500+","l":"Projects delivered"},{"v":"25 yrs","l":"In business"},{"v":"$2.4B","l":"Built value"},{"v":"98%","l":"On-time milestones"}]', NULL),
  ('services', 'title', '"What we build"', NULL),
  ('services', 'subtitle', '"From custom homes to multi-tower campuses, our self-perform teams cover every trade in-house."', NULL),
  ('services', 'items', '[{"title":"Commercial","desc":"Offices, retail, hotels and mixed-use towers."},{"title":"Residential","desc":"Custom homes, multi-family and renovations."},{"title":"Industrial","desc":"Warehouses, plants and distribution hubs."},{"title":"Renovation","desc":"Restoration, refits and adaptive reuse."}]', NULL),
  ('featured', 'title', '"Featured projects"', NULL),
  ('featured', 'subtitle', '"A glimpse of recent builds. Explore the full portfolio for case studies and metrics."', NULL),
  ('featured', 'items', '[{"title":"Riverside Tower","tag":"Commercial · 480k sqft"},{"title":"Maple Heights Residences","tag":"Residential · 186 units"},{"title":"Northgate Logistics Hub","tag":"Industrial · 620k sqft"}]', NULL),
  ('why_us', 'title', '"Why owners choose Scer-L/Construct"', NULL),
  ('why_us', 'subtitle', '"We''re hands-on, transparent and predictable. The team that wins the work is the team that builds it — no hand-offs, no surprises."', NULL),
  ('why_us', 'points', '["Self-perform crews for concrete, framing, finishes and MEP coordination","Weekly cost & schedule reports, with no hidden line items","Dedicated project manager from kickoff to 24-month warranty","Industry-leading safety record (EMR of 0.62)","Owner-portal access to drawings, RFIs, invoices and photos"]', NULL),
  ('testimonials', 'items', '[{"quote":"BuildFlow delivered our HQ two weeks early and under budget. Their PM kept us informed every single week.","author":"Sandra Hill, COO · Northwind Logistics"},{"quote":"Craftsmanship you can feel. Every detail of our home was thoughtful and built to last.","author":"Daniel & Mia Foster · Hillview Estates"},{"quote":"A safety record and quality discipline that''s rare in this industry. We''ve awarded them three projects in a row.","author":"Robert Sanchez, Director · Civic Authority"}]', NULL),
  ('cta', 'title', '"Ready to start your project?"', NULL),
  ('cta', 'subtitle', '"Tell us about your build. You''ll get a response from a project manager within 24 hours."', NULL),
  ('cta', 'quote_btn', '"Request a quote"', NULL),
  ('cta', 'hi_btn', '"Just say hi"', NULL),
  ('contact', 'phone', '"+1 (555) 240-8800"', NULL),
  ('contact', 'email', '"hello@scer-lconstruct.com"', NULL),
  ('contact', 'address', '"240 Riverside Ave, Suite 1100"', NULL),
  ('contact', 'hours', '"Mon-Fri 7AM-6PM"', NULL),
  ('about', 'title', '"About Scer-L/Construct Sarl"', NULL),
  ('about', 'mission', '"We are committed to building your dreams with excellence, integrity, and innovation. For over 25 years, we have delivered commercial, residential, industrial, and infrastructure projects on time and on budget."', NULL),
  ('about', 'values', '["Quality craftsmanship in every detail","Transparent communication and pricing","Safety-first culture with industry-leading record","Sustainable building practices"]', NULL),
  ('footer', 'description', '"Full-service general contractor delivering commercial, residential, industrial and infrastructure projects. Engagés pour construire vos rêves."', NULL),
  ('footer', 'copyright', '"© 2024 Scer-L/Construct Sarl. All rights reserved."', NULL),
  ('certifications', 'items', '["ENR Top 400 Contractor","OSHA SHARP Certified","LEED Gold Builder","ISO 9001:2015","AGC Member"]', NULL)
ON CONFLICT (section, key, company_id) DO NOTHING;
