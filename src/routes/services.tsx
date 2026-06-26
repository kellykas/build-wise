import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Building2, Users, Boxes, Wrench, FileText, BarChart3, Calendar, MessageSquare, ShieldCheck } from "lucide-react";

const modules = [
  { i: Building2, t: "Project Management", d: "Schedules, milestones, daily logs, site reports." },
  { i: Users, t: "Human Resources", d: "Employees, attendance, leave, payroll." },
  { i: Boxes, t: "Inventory", d: "Stock in/out, transfers, low-stock alerts." },
  { i: Wrench, t: "Equipment", d: "Assignment, maintenance, fuel & repair logs." },
  { i: FileText, t: "Invoicing & Finance", d: "Quotes, invoices, expenses, budgets, P&L." },
  { i: BarChart3, t: "Analytics", d: "KPIs, project P&L, exportable reports." },
  { i: Calendar, t: "Calendar", d: "Meetings, deadlines, site visits in one view." },
  { i: MessageSquare, t: "Messaging", d: "Internal chat and client communications." },
  { i: ShieldCheck, t: "Roles & Permissions", d: "Granular access for 11 built-in roles." },
];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Modules — BuildFlow ERP" },
      { name: "description", content: "Explore all BuildFlow modules: project, HR, procurement, inventory, equipment, finance, documents, analytics." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">A complete construction operating system</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Every module you need to run a contracting business, integrated and ready on day one.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.t} className="rounded-xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent"><m.i className="h-5 w-5" /></div>
              <div className="mt-4 font-semibold">{m.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{m.d}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
