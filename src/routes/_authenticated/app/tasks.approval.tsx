import { createFileRoute } from "@tanstack/react-router";
import { TaskListView } from "@/components/app/TaskListView";

export const Route = createFileRoute("/_authenticated/app/tasks/approval")({
  component: ApprovalTasks,
});

function ApprovalTasks() {
  return (
    <TaskListView
      queryKey="approval"
      filter={(q) => q.eq("status", "completed")}
      emptyText="Aucune tâche en attente d'approbation."
    />
  );
}
