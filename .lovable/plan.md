
# Full edit, detail & workflow pass across BuildFlow ERP

This turns every module from a read-only list into a working operational tool. All writes go through Supabase with RLS, and the dashboard re-reads the same tables so changes propagate everywhere automatically.

## 1. Projects — detail page + inline editing
- New route `app/projects/$id` with tabs: **Overview, Tasks, Documents, Invoices, Team, Activity**.
- Inline-editable fields: name, status, priority, budget, progress (slider), start/end dates, location, description, client.
- Status pill is a dropdown that updates `projects.status` immediately.
- Right rail: KPIs (spent vs budget, % tasks done, days remaining), recent activity.
- "Delete project" with confirmation; soft-archive option.

## 2. Agenda (Calendar) — day & future view
- Replace stub with a real calendar:
  - **Today** panel listing every task `due_date = today` + meetings/site visits.
  - **Upcoming** list grouped by day (next 14 days).
  - Month grid (shadcn Calendar) with dots on days that have items.
- "+ New event" dialog → writes to a new `agenda_events` table (title, date, time, location, project_id, attendees, notes), editable & deletable.
- Clicking a task on the agenda opens it in the task drawer.

## 3. Tasks — modify, assign, track progress
- Click any task → side drawer with edit form: name, description, status, priority, assignee (employee picker), project, due date, **progress %** slider, checklist.
- Drag-and-drop between Kanban columns updates `status` live.
- Assigning writes to `task_assignments`; bell notifies assignee.
- Progress shows in project KPI automatically.

## 4. Employees — full CRUD
- Row click → edit dialog: all fields (name, email, phone, position, department, salary, hire date, status, hourly rate).
- "+ New employee", delete with confirm.
- Bulk actions: deactivate / change department.

## 5. Attendance + Payroll + Payslips
- New table `payroll_rules` (overtime multiplier, standard hours/day, late penalty, absence deduction, currency).
- Attendance page: every active employee listed for the selected date with **Clock in / Clock out** buttons (super_admin can do it on their behalf); auto-computes hours worked.
- New module **Payroll**:
  - Period selector (month).
  - Generates `payslips` per employee from attendance × rules (base salary, hours worked, overtime, deductions, net pay).
  - Edit individual payslip lines (bonus, deduction).
  - Mark **Paid** → posts an expense to Finance.
  - Download / print payslip view.
- Settings → editable payroll rules.

## 6. Procurement — approval workflow
- PO detail drawer with line items, supplier, total.
- Status transitions: `draft → pending → approved / rejected → ordered → received`.
- Only `super_admin` / `company_owner` / `finance_manager` see Approve/Reject buttons.
- Approval writes `approved_by`, `approved_at`; approved POs feed Finance expenses.

## 7. Stock / Equipment / Invoices — editable
- Row click → edit dialog for every field.
- Status dropdowns inline (in stock / low / out, available / in use / maintenance, draft / sent / paid / overdue).
- Invoices: record payment dialog → updates `paid_amount`, auto-flips to paid; feeds Finance income.

## 8. Finance — full ledger
- New tables: `transactions` (type: income | expense, source, amount, date, category, project_id, reference), `payments`, `credits`.
- Tabs: **Overview, Income, Expenses, Invoices, Payments, Credits**.
- Add / edit / delete transactions; auto-entries from invoice payments and approved POs.
- KPIs (revenue, expenses, profit, AR, AP) recompute from `transactions` + invoices.
- All dashboard cards read the same source → stays in sync.

## 9. Parameters (Settings) — users & roles
- **Users tab** (super_admin only):
  - List every profile in the company with their roles.
  - "+ Invite user" (email + role) → uses Supabase admin API via a protected server fn.
  - Change role, deactivate, delete.
- **My profile tab** (everyone):
  - Edit name, phone, avatar, locale — but NOT role.
- **Payroll rules tab**, **Company info tab**.

## 10. Realtime sync
- Subscribe dashboard + agenda + finance to Supabase realtime channels on `projects`, `tasks`, `invoices`, `transactions`, `attendance` → instant refresh anywhere.

---

## Technical notes
- Migration adds: `agenda_events`, `payroll_rules`, `payslips`, `payslip_lines`, `transactions`, `payments`, `credits`; adds `approved_by`, `approved_at`, `rejected_reason` to `purchase_orders`; adds `paid_amount` to `invoices`. All with GRANTs + RLS scoped by `current_company_id()`.
- Reusable `EditDialog` + `InlineStatusSelect` + `DetailDrawer` components keep code DRY.
- User invitation server fn uses `requireSupabaseAuth` + `has_role('super_admin')` then `supabaseAdmin.auth.admin.inviteUserByEmail`.
- Dashboard queries switched to live tables (no mock numbers) so every edit is reflected.

This is a large slice — I'll deliver it in one pass, but if you want it phased (e.g. Projects+Tasks+Agenda first, then Payroll, then Finance/Users) say the word.
