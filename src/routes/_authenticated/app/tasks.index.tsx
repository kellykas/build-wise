import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/tasks/")({
  component: MyTasks,
});

type Task = {
  id: string; name: string; status: "pending" | "in_progress" | "completed" | "overdue";
  priority: string; due_date: string | null; description: string | null;
  assigned_to: string | null; project_id: string | null; progress: number;
};
type Employee = { id: string; user_id: string | null; full_name: string };
type Project = { id: string; name: string };

const columns: { key: Task["status"]; label: string; tone: string }[] = [
  { key: "pending", label: "En attente", tone: "bg-warning/15 text-warning" },
  { key: "in_progress", label: "En cours", tone: "bg-primary/15 text-primary" },
  { key: "completed", label: "Terminés", tone: "bg-success/15 text-success" },
  { key: "overdue", label: "En retard", tone: "bg-destructive/15 text-destructive" },
];

function MyTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Task | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*");
      return (data ?? []) as Task[];
    },
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-pick"],
    queryFn: async () => ((await supabase.from("employees").select("id,user_id,full_name")).data ?? []) as Employee[],
  });
  const { data: projects } = useQuery({
    queryKey: ["projects-pick"],
    queryFn: async () => ((await supabase.from("projects").select("id,name")).data ?? []) as Project[],
  });

  const grouped = Object.fromEntries(columns.map((c) => [c.key, [] as Task[]]));
  (data ?? []).forEach((t) => { grouped[t.status]?.push(t); });

  const fields: Field[] = [
    { key: "name", label: "Task", required: true, span: 2 },
    { key: "description", label: "Description", type: "textarea" },
    { key: "status", label: "Status", type: "select", options: [
      { value: "pending", label: "Pending" }, { value: "in_progress", label: "In progress" },
      { value: "completed", label: "Completed" }, { value: "overdue", label: "Overdue" },
    ] },
    { key: "priority", label: "Priority", type: "select", options: [
      { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
      { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
    ] },
    { key: "assigned_to", label: "Assignee", type: "select",
      options: (employees ?? []).filter((e) => e.user_id).map((e) => ({ value: e.user_id!, label: e.full_name })) },
    { key: "project_id", label: "Project", type: "select",
      options: (projects ?? []).map((p) => ({ value: p.id, label: p.name })) },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "progress", label: "Progress %", type: "number", min: "0" },
  ];

  const onStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as Task["status"] }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks-all"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setNewOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ New task</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="text-sm font-semibold">{c.label}</div>
              <Badge variant="secondary">{grouped[c.key].length}</Badge>
            </div>
            <div className="space-y-2 p-3 min-h-[120px]">
              {grouped[c.key].length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Aucune tâche</div>
              ) : grouped[c.key].map((t) => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md" onClick={() => setEditing(t)}>
                  <CardContent className="p-3">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.due_date ?? "—"}</span>
                      <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                    </div>
                    {typeof t.progress === "number" && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                      </div>
                    )}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <Select value={t.status} onValueChange={(v) => onStatusChange(t.id, v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {columns.map((c2) => <SelectItem key={c2.key} value={c2.key}>{c2.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } qc.invalidateQueries({ queryKey: ["tasks-all"] }); }}
        table="tasks"
        title="task"
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
        invalidate={["tasks-all"]}
      />
    </div>
  );
}
