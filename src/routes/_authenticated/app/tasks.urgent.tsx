import { createFileRoute } from "@tanstack/react-router";
import { TaskListView } from "@/components/app/TaskListView";

export const Route = createFileRoute("/_authenticated/app/tasks/urgent")({
  component: UrgentTasks,
});

function UrgentTasks() {
  return (
    <TaskListView
      queryKey="urgent"
      filter={(q) => q.eq("priority", "urgent")}
      emptyText="Aucune urgence en cours. 🎉"
    />
  );
}
