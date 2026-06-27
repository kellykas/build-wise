import { createFileRoute } from "@tanstack/react-router";
import { TaskListView } from "@/components/app/TaskListView";

export const Route = createFileRoute("/_authenticated/app/tasks/supervision")({
  component: SupervisionTasks,
});

function SupervisionTasks() {
  return (
    <TaskListView
      queryKey="supervision-all"
      filter={(q) => q}
      emptyText="Aucune tâche à superviser dans votre périmètre."
    />
  );
}
