import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { TaskListView } from "@/components/app/TaskListView";

export const Route = createFileRoute("/_authenticated/app/tasks/execution")({
  component: ExecutionTasks,
});

function ExecutionTasks() {
  const { user } = useAuth();
  return (
    <TaskListView
      queryKey={`exec-${user?.id}`}
      filter={(q) => q.eq("assigned_to", user?.id ?? "").in("status", ["pending", "in_progress"])}
      emptyText="Aucune tâche en exécution ne vous est assignée."
    />
  );
}
