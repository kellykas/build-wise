-- ============================================================
-- Granular per-user permission system
-- ============================================================

-- 1. Permission keys table (reference data)
CREATE TABLE IF NOT EXISTS public.permission_keys (
  key         TEXT PRIMARY KEY,
  module      TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT
);

-- 2. User permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permission_keys(key) ON DELETE CASCADE,
  granted        BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id, permission_key)
);

-- 3. RLS policies
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all permissions
CREATE POLICY "super_admin manage permissions"
  ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users can read their own permissions
CREATE POLICY "users read own permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Seed permission keys
INSERT INTO public.permission_keys (key, module, label, description) VALUES
  -- Dashboard
  ('dashboard.view', 'dashboard', 'View Dashboard', 'Access the main dashboard'),
  ('dashboard.analytics', 'dashboard', 'View Analytics', 'See analytics and charts'),
  
  -- Projects
  ('projects.view', 'projects', 'View Projects', 'See the projects list'),
  ('projects.create', 'projects', 'Create Projects', 'Create new projects'),
  ('projects.edit', 'projects', 'Edit Projects', 'Edit project details'),
  ('projects.delete', 'projects', 'Delete Projects', 'Delete projects'),
  
  -- Tasks
  ('tasks.view', 'tasks', 'View Tasks', 'See the task board'),
  ('tasks.create', 'tasks', 'Create Tasks', 'Create new tasks'),
  ('tasks.edit', 'tasks', 'Edit Tasks', 'Edit task details'),
  ('tasks.delete', 'tasks', 'Delete Tasks', 'Delete tasks'),
  ('tasks.assign', 'tasks', 'Assign Tasks', 'Assign tasks to team members'),
  
  -- Clients
  ('clients.view', 'clients', 'View Clients', 'See the clients list'),
  ('clients.create', 'clients', 'Create Clients', 'Create new clients'),
  ('clients.edit', 'clients', 'Edit Clients', 'Edit client details'),
  ('clients.delete', 'clients', 'Delete Clients', 'Delete clients'),
  
  -- Employees
  ('employees.view', 'employees', 'View Employees', 'See the employees list'),
  ('employees.create', 'employees', 'Create Employees', 'Create new employee records'),
  ('employees.edit', 'employees', 'Edit Employees', 'Edit employee details'),
  ('employees.delete', 'employees', 'Delete Employees', 'Delete employee records'),
  
  -- Attendance
  ('attendance.view', 'attendance', 'View Attendance', 'See attendance records'),
  ('attendance.mark', 'attendance', 'Mark Attendance', 'Clock in/out employees'),
  
  -- Payroll
  ('payroll.view', 'payroll', 'View Payroll', 'See payroll data'),
  ('payroll.edit', 'payroll', 'Edit Payroll', 'Modify payroll rules and run payroll'),
  
  -- Finance
  ('finance.view', 'finance', 'View Finance', 'See financial data'),
  ('finance.invoices', 'finance', 'Manage Invoices', 'Create and edit invoices'),
  ('finance.transactions', 'finance', 'View Transactions', 'See transaction history'),
  
  -- Procurement
  ('procurement.view', 'procurement', 'View Procurement', 'See procurement data'),
  ('procurement.create', 'procurement', 'Create Purchases', 'Create purchase orders'),
  ('procurement.approve', 'procurement', 'Approve Purchases', 'Approve purchase orders'),
  
  -- Inventory
  ('inventory.view', 'inventory', 'View Inventory', 'See inventory levels'),
  ('inventory.edit', 'inventory', 'Edit Inventory', 'Manage inventory items'),
  
  -- Equipment
  ('equipment.view', 'equipment', 'View Equipment', 'See equipment list'),
  ('equipment.edit', 'equipment', 'Edit Equipment', 'Manage equipment records'),
  
  -- Documents
  ('documents.view', 'documents', 'View Documents', 'See document library'),
  ('documents.upload', 'documents', 'Upload Documents', 'Upload new documents'),
  ('documents.delete', 'documents', 'Delete Documents', 'Delete documents'),
  
  -- Requisitions
  ('requisitions.view', 'requisitions', 'View Requisitions', 'See requisition requests'),
  ('requisitions.create', 'requisitions', 'Create Requisitions', 'Create new requisitions'),
  ('requisitions.approve', 'requisitions', 'Approve Requisitions', 'Approve/reject requisitions'),
  
  -- Suppliers
  ('suppliers.view', 'suppliers', 'View Suppliers', 'See suppliers list'),
  ('suppliers.create', 'suppliers', 'Create Suppliers', 'Add new suppliers'),
  ('suppliers.edit', 'suppliers', 'Edit Suppliers', 'Edit supplier details'),
  
  -- Notifications
  ('notifications.view', 'notifications', 'View Notifications', 'See notifications'),
  ('notifications.send', 'notifications', 'Send Notifications', 'Send notifications to users'),
  
  -- Settings
  ('settings.view', 'settings', 'View Settings', 'Access settings page'),
  ('settings.company', 'settings', 'Edit Company', 'Edit company details'),
  ('settings.users', 'settings', 'Manage Users', 'Create users and assign roles'),
  ('settings.permissions', 'settings', 'Manage Permissions', 'Configure user permissions'),
  
  -- Calendar
  ('calendar.view', 'calendar', 'View Calendar', 'See the calendar'),
  ('calendar.create', 'calendar', 'Create Events', 'Create calendar events'),
  
  -- Client Portal
  ('client_portal.view', 'client_portal', 'View Client Portal', 'Access client portal'),
  ('client_portal.photos', 'client_portal', 'Upload Progress Photos', 'Upload progress photos')
ON CONFLICT (key) DO NOTHING;

-- 5. Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id UUID,
  _permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    -- Super admins always have all permissions
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    -- Company owners have all permissions for their company
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = _user_id 
        AND ur.role = 'company_owner'
        AND p.company_id = public.current_company_id()
    )
    OR
    -- Check explicit permission
    EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id
        AND permission_key = _permission_key
        AND granted = true
        AND company_id = public.current_company_id()
    )
  );
$function$;

-- 6. Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_key TEXT, granted BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Super admins or company owners get all permissions
  SELECT pk.key, true
  FROM public.permission_keys pk
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'company_owner')
  )
  -- Everyone else gets their explicit permissions
  UNION
  SELECT up.permission_key, up.granted
  FROM public.user_permissions up
  WHERE up.user_id = _user_id
    AND up.company_id = public.current_company_id()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('super_admin', 'company_owner')
    );
$function$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
