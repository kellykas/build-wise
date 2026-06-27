## What I see in the reference (sigop.fr)

The portal centers on three flows we don't yet have in BuildFlow:

1. **Etats de besoin** — internal purchase-requisition workflow with a 4-role chain: **Demandeur → Tarificateur → Validateur → Décaisseur (Caisse)**, status tabs (`À compléter`, `À traiter`, `Encours`, `Cloturés`), line items (besoin / unité / quantité / état), fund disbursement history, and a printable A4 voucher with company letterhead.
2. **Tasks workspace** — split into sub-modules: **Mes tâches, Exécution, Supervision, Approbation, Urgences**, each with its own list + detail pane.
3. **Notification interne** — in-app notifications targeted at specific recipients with a Destinataire / Historique split.

Plus a refreshed dashboard with the KPI tiles that link into these flows (Tâches à exécuter, États de besoin encours, Membres de mon équipe, Évenements prévus, Urgences attendues, Statut de présence, Finances à justifier, Transactions à confirmer).

We will build all of this — but cleaner, denser, and more modern than the reference (proper typography, real status pills, no neon flat blocks, keyboard-friendly, dark-mode native, printable voucher).

## Plan

### 1. Database (one migration)

New enums & tables, all multi-tenant (`company_id`) with RLS + GRANTs:

- `requisition_status` enum: `draft` (À compléter), `pending_pricing` (À traiter), `in_progress` (Encours), `closed` (Cloturés), `rejected`.
- `requisition_line_status` enum: `pending`, `priced`, `validated`, `disbursed`, `rejected`.
- `requisitions` — title, project_id, stage (e.g. "Carrelage"), folder/classeur, demandeur_id, tarificateur_id, validateur_id, caissier_id, status, total_amount, notes.
- `requisition_lines` — requisition_id, besoin (label), unit, quantity, unit_price, status, validated_at, etc.
- `requisition_disbursements` — line_id, amount, beneficiary, paid_by, date, notes (the "Historique de décaissement").
- `internal_notifications` extension on existing `notifications` — add `recipient_user_id`, `type` (info/task/requisition/approval), `link`, `read_at`. (Existing `notifications` becomes the broadcast feed; per-user inbox uses these fields.)
- `task_role` enum + `task_assignments` (executor / supervisor / approver) so Tasks can be split into Exécution / Supervision / Approbation views off the existing `tasks` table.

RLS scoped to `current_company_id()`; sensitive transitions (validate, disburse) gated by helper functions `can_price()`, `can_validate()`, `can_disburse()` reading `user_roles`.

### 2. New module: Etats de besoin (`/app/requisitions`)

- **List page** with the 4 status tabs as a segmented control, search by title, filter by date, "Classeurs" side panel.
- **New requisition dialog** — title, project, stage, classeur, assign tarificateur / validateur / caissier from employees.
- **Detail page** `/app/requisitions/$id`:
  - Left: header card (status banner: yellow "pas encore validé", red "pas appuré dans sa totalité", green "complètement appuré"), line-items table with inline "Action" dropdown (Set price, Validate, Reject, Disburse — visible per role), "Sortie des fonds" button, "Ajouter un besoin" for draft state, disbursement history table.
  - Right: sticky voucher preview (Projet, Étape, Date, Classeur, n°, Demandeur, Tarificateur, Validateur, Caisse) styled like the printed form.
- **Print view** `/app/requisitions/$id/print` — clean A4 layout with company letterhead block, opens browser print dialog. CSS `@media print`.

### 3. Tasks workspace upgrade

Restructure `/app/tasks` as a layout with sub-routes:
- `/app/tasks` — Mes tâches (assigned to me)
- `/app/tasks/execution` — tasks where I'm executor
- `/app/tasks/supervision` — tasks I supervise (with Exécutants + Exécution columns)
- `/app/tasks/approval` — tasks awaiting my approval
- `/app/tasks/urgent` — priority = urgent across the company

Master-detail layout (list on the left, detail pane on the right) instead of the current Kanban-only view. Kanban stays available as a toggle on Supervision.

### 4. Notification interne (`/app/notifications`)

- Composer card: type selector (Info, Task assignment, Requisition update, Approval request), title, message, recipients (multi-select employees), optional link.
- Right pane tabs: **Destinataires** (with read/unread state per recipient) and **Historique** (sent log).
- Top-bar bell badge wired to unread `internal_notifications` for the current user.

### 5. Dashboard refresh

Replace current tiles with 8 KPI cards matching the reference set, each linking to its module:
Tâches à exécuter • États de besoin en cours • Membres de mon équipe • Évènements prévus • Urgences • Statut de présence • Finances à justifier • Transactions à confirmer.
Keep the charts row, add three list cards underneath: **Finances à justifier**, **États de besoin (à traiter)**, **Transactions à confirmer**.

### 6. Sidebar

Add **États de besoin** group entry, expand **Tasks** into a collapsible group with the 5 sub-items, add **Notifications** under Workspace.

### Visual direction

Keep the plum/teal Odoo-leaning theme. Status colors: amber = pending pricing, blue = in progress, emerald = closed, red = rejected/urgent. Dense table rows, semantic tokens only, no flat-color hero blocks.

### Out of scope for this slice

- Mobile-specific layouts (works responsive, not redesigned).
- Email/SMS delivery for notifications (in-app only).
- Multi-currency on requisitions (USD only, like the reference).
- Calendar/Agenda redesign (KPI links to existing calendar).

### Order of work

1. Migration (enums, tables, RLS, GRANTs, helper fns).
2. Sidebar + routes scaffolding.
3. Requisitions list → detail → print.
4. Tasks sub-modules with master-detail.
5. Internal notifications + bell badge.
6. Dashboard refresh.
7. Seed sample requisitions + notifications into the existing mock data.
