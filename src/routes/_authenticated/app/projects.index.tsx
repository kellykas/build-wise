import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditDialog, type Field } from "@/components/app/EditDialog";

export const Route = createFileRoute("/_authenticated/app/projects/")({
  component: ProjectsPage,
});

type Project = {
  id: string; name: string; project_number: string | null;
  location: string | null; status: string; priority: string;
  budget: number; progress: number; start_date: string | null; end_date: string | null;
};

const statusColors: Record<string, string> = {
  planning: "bg-muted text-foreground",
  pending: "bg-warning/15 text-warning",
  in_progress: "bg-primary/15 text-primary",
  on_hold: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const fields: Field[] = [
  { key: "name", label: "Project name", required: true, span: 2 },
  { key: "location", label: "Location" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "planning", label: "Planning" }, { value: "in_progress", label: "In progress" },
    { value: "on_hold", label: "On hold" }, { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ] },
  { key: "priority", label: "Priority", type: "select", options: [
    { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
    { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
  ] },
  { key: "progress", label: "Progress %", type: "number", min: "0", step: "1" },
  { key: "budget", label: "Budget", type: "number", min: "0", step: "0.01" },
  { key: "start_date", label: "Start date", type: "date" },
  { key: "end_date", label: "End date", type: "date" },
  { key: "description", label: "Description", type: "textarea" },
];

function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const navigate = useNavigate();

  const columns: Column<Project>[] = [
    { key: "name", label: "Project", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant="secondary" className={statusColors[r.status] ?? ""}>{r.status?.replace("_", " ")}</Badge>
    )},
    { key: "budget", label: "Budget", render: (r) => `$${Number(r.budget).toLocaleString()}` },
    { key: "progress", label: "Progress", render: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.progress}%` }} /></div>
        <span className="text-xs text-muted-foreground">{r.progress}%</span>
      </div>
    )},
    { key: "_actions", label: "", render: (r) => (
      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        <button className="text-xs text-primary hover:underline" onClick={() => setEditing(r)}>Edit</button>
      </div>
    )},
  ];

  return (
    <>
      <ModulePage<Project>
        title="Projects"
        description="All projects across your portfolio. Click a row to open details."
        table="projects"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FolderKanban className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setOpen(true); }}
        onRowClick={(r) => navigate({ to: "/app/projects/$id", params: { id: r.id } })}
      />
      <EditDialog
        open={open || !!editing}
        onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}
        table="projects"
        title="project"
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
