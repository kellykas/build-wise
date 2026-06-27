import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/tasks/")({
  component: MyTasks,
});

type Task = { id: string; name: string; status: "pending" | "in_progress" | "completed" | "overdue"; priority: string; due_date: string | null };

const columns: { key: Task["status"]; label: string; tone: string }[] = [
  { key: "pending", label: "En attente", tone: "bg-warning/15 text-warning" },
  { key: "in_progress", label: "En cours", tone: "bg-primary/15 text-primary" },
  { key: "completed", label: "Terminés", tone: "bg-success/15 text-success" },
  { key: "overdue", label: "En retard", tone: "bg-destructive/15 text-destructive" },
];

function MyTasks() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["tasks-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id,name,status,priority,due_date").eq("assigned_to", user!.id);
      return (data ?? []) as Task[];
    },
    enabled: !!user,
  });

  const grouped = Object.fromEntries(columns.map((c) => [c.key, [] as Task[]]));
  (data ?? []).forEach((t) => { grouped[t.status]?.push(t); });

  return (
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
              <Card key={t.id}><CardContent className="p-3">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t.due_date ?? "—"}</span>
                  <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
