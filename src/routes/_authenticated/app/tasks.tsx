import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksLayout,
});

const tabs = [
  { to: "/app/tasks", label: "Mes tâches", exact: true },
  { to: "/app/tasks/execution", label: "Exécution" },
  { to: "/app/tasks/supervision", label: "Supervision" },
  { to: "/app/tasks/approval", label: "Approbation" },
  { to: "/app/tasks/urgent", label: "Urgences" },
];

function TasksLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestionnaire des tâches</h1>
          <p className="text-sm text-muted-foreground">Exécution, supervision, approbation et urgences.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t.label}</Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
