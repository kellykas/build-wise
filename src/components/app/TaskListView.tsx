import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/app/StatusBadge";
import { CalendarDays, Inbox } from "lucide-react";

type Task = { id: string; name: string; status: string; priority: string; due_date: string | null; assigned_to: string | null; project_id: string | null };

const statusTone: Record<string, "warning" | "info" | "success" | "danger"> = {
  pending: "warning", in_progress: "info", completed: "success", overdue: "danger",
};
const statusLabel: Record<string, string> = {
  pending: "En attente", in_progress: "En cours", completed: "Terminé", overdue: "En retard",
};
const priorityTone: Record<string, "neutral" | "warning" | "danger" | "info"> = {
  low: "neutral", medium: "info", high: "warning", urgent: "danger",
};

export function TaskListView({ queryKey, filter, emptyText }: {
  queryKey: string;
  filter: (q: any) => any;
  emptyText: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", queryKey],
    queryFn: async () => {
      const { data, error } = await filter(supabase.from("tasks").select("id,name,status,priority,due_date,assigned_to,project_id")).order("due_date", { ascending: true, nullsFirst: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (!data || data.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-6 w-6" /></span>
        <div className="text-lg font-semibold">Rien à afficher</div>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent className="p-0">
      <div className="divide-y divide-border">
        {data.map((t) => (
          <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{t.name}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {t.due_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(t.due_date).toLocaleDateString()}</span>}
                <StatusBadge tone={priorityTone[t.priority] ?? "neutral"}>{t.priority}</StatusBadge>
              </div>
            </div>
            <StatusBadge tone={statusTone[t.status] ?? "neutral"}>{statusLabel[t.status] ?? t.status}</StatusBadge>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
