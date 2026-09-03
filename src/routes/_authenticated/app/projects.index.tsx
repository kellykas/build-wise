import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { GanttChart } from "@/components/app/GanttChart";
import { FolderKanban, BarChart3, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { useTranslation } from "react-i18next";

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

function getFields(t: (key: string) => string): Field[] {
  return [
    { key: "name", label: t("d.projects.project_name"), required: true, span: 2 },
    { key: "location", label: t("d.projects.location") },
    { key: "status", label: t("d.projects.status_label"), type: "select", options: [
      { value: "planning", label: t("d.projects.planning") }, { value: "in_progress", label: t("d.projects.in_progress") },
      { value: "on_hold", label: t("d.projects.on_hold") }, { value: "completed", label: t("d.projects.completed") },
      { value: "cancelled", label: t("d.projects.cancelled") },
    ] },
    { key: "priority", label: t("d.projects.priority"), type: "select", options: [
      { value: "low", label: t("d.projects.low") }, { value: "medium", label: t("d.projects.medium") },
      { value: "high", label: t("d.projects.high") }, { value: "urgent", label: t("d.projects.urgent") },
    ] },
    { key: "progress", label: t("d.projects.progress_pct"), type: "number", min: "0", step: "1" },
    { key: "budget", label: t("d.projects.budget"), type: "number", min: "0", step: "0.01" },
    { key: "start_date", label: t("d.projects.start_date"), type: "date" },
    { key: "end_date", label: t("d.projects.end_date"), type: "date" },
    { key: "description", label: t("d.projects.description"), type: "textarea" },
  ];
}

function ProjectsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [view, setView] = useState<"list" | "gantt">("list");
  const navigate = useNavigate();

  // Fetch projects for Gantt view
  const { data: projects } = useQuery({
    queryKey: ["module", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const columns: Column<Project>[] = [
    { key: "name", label: t("d.projects.project"), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "location", label: t("d.projects.location") },
    { key: "status", label: t("d.projects.status_label"), render: (r) => (
      <Badge variant="secondary" className={statusColors[r.status] ?? ""}>{r.status?.replace("_", " ")}</Badge>
    )},
    { key: "budget", label: t("d.projects.budget"), render: (r) => `$${Number(r.budget).toLocaleString()}` },
    { key: "progress", label: t("d.projects.progress_pct"), render: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.progress}%` }} /></div>
        <span className="text-xs text-muted-foreground">{r.progress}%</span>
      </div>
    )},
    { key: "_actions", label: "", render: (r) => (
      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        <button className="text-xs text-primary hover:underline" onClick={() => setEditing(r)}>{t("d.projects.edit")}</button>
      </div>
    )},
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Header with view toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FolderKanban className="h-5 w-5" /></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("d.projects.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("d.projects.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setView("list")}
              ><List className="h-3.5 w-3.5" /> {t("d.projects.list")}</button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${view === "gantt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setView("gantt")}
              ><BarChart3 className="h-3.5 w-3.5" /> {t("d.projects.timeline")}</button>
            </div>
          </div>
        </div>

        {view === "list" ? (
          <ModulePage<Project>
            title=""
            description=""
            table="projects"
            columns={columns}
            onNew={() => { setEditing(null); setOpen(true); }}
            onRowClick={(r) => navigate({ to: "/app/projects/$id", params: { id: r.id } })}
          />
        ) : (
          <GanttChart
            title={t("d.projects.project_timeline")}
            items={(projects ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              start_date: p.start_date,
              end_date: p.end_date,
              progress: p.progress,
              status: p.status,
              priority: p.priority,
            }))}
            onItemClick={(item) => navigate({ to: "/app/projects/$id", params: { id: item.id } })}
          />
        )}
      </div>
      <EditDialog
        open={open || !!editing}
        onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}
        table="projects"
        title={t("d.projects.project")}
        fields={getFields(t)}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
