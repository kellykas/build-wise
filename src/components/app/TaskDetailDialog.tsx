import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays, User, FolderKanban, Clock, Flag,
  CheckCircle2, Circle, AlertTriangle, ArrowUpCircle,
} from "lucide-react";

type Task = {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: string;
  due_date: string | null;
  description: string | null;
  assigned_to: string | null;
  project_id: string | null;
  progress: number;
  created_at: string;
};

type Employee = { id: string; user_id: string | null; full_name: string };
type Project = { id: string; name: string };

const statusLabel: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
  overdue: "En retard",
};

const priorityConfig: Record<string, { label: string; icon: typeof Flag; tone: "neutral" | "info" | "warning" | "danger" }> = {
  low: { label: "Basse", icon: Circle, tone: "neutral" },
  medium: { label: "Moyenne", icon: Flag, tone: "info" },
  high: { label: "Haute", icon: ArrowUpCircle, tone: "warning" },
  urgent: { label: "Urgente", icon: AlertTriangle, tone: "danger" },
};

const statusActions: { from: Task["status"][]; to: Task["status"]; label: string; variant: "default" | "outline" | "destructive" | "secondary" }[] = [
  { from: ["pending"], to: "in_progress", label: "Commencer", variant: "default" },
  { from: ["in_progress"], to: "completed", label: "Terminer", variant: "default" },
  { from: ["pending", "in_progress"], to: "overdue", label: "En retard", variant: "destructive" },
  { from: ["overdue"], to: "in_progress", label: "Reprendre", variant: "outline" },
  { from: ["completed"], to: "pending", label: " rouvrir", variant: "outline" },
];

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  employees,
  projects,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  employees: Employee[];
  projects: Project[];
}) {
  const qc = useQueryClient();

  const assignee = employees.find((e) => e.user_id === task?.assigned_to);
  const project = projects.find((p) => p.id === task?.project_id);
  const priority = priorityConfig[task?.priority ?? "low"] ?? priorityConfig.low;
  const PriorityIcon = priority.icon;

  const availableActions = task
    ? statusActions.filter((a) => a.from.includes(task.status))
    : [];

  const onStatusChange = async (newStatus: Task["status"]) => {
    if (!task) return;
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success(`Tâche déplacée vers "${statusLabel[newStatus]}"`);
    qc.invalidateQueries({ queryKey: ["tasks-all"] });
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{task.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={task.status === "completed" ? "success" : task.status === "overdue" ? "danger" : task.status === "in_progress" ? "info" : "warning"}>
              {statusLabel[task.status]}
            </StatusBadge>
            <Badge variant="outline" className="gap-1">
              <PriorityIcon className="h-3 w-3" />
              {priority.label}
            </Badge>
          </div>

          {/* Progress */}
          {typeof task.progress === "number" && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progression</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {task.description}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Échéance</div>
                <div className="font-medium text-foreground">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Non définie"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Assigné à</div>
                <div className="font-medium text-foreground">
                  {assignee?.full_name ?? "Non assigné"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderKanban className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Projet</div>
                <div className="font-medium text-foreground">
                  {project?.name ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Créé le</div>
                <div className="font-medium text-foreground">
                  {new Date(task.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          {availableActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {availableActions.map((action) => (
                <Button
                  key={action.to}
                  variant={action.variant}
                  size="sm"
                  onClick={() => onStatusChange(action.to)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
