import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { TaskDetailDialog } from "@/components/app/TaskDetailDialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { notifyTaskAssigned, notifyTaskStatusChanged } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/app/tasks/")({
  component: KanbanBoard,
});

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

const columns: { key: Task["status"]; label: string; tone: string }[] = [
  { key: "pending", label: "En attente", tone: "bg-warning/15 text-warning" },
  { key: "in_progress", label: "En cours", tone: "bg-primary/15 text-primary" },
  { key: "completed", label: "Terminés", tone: "bg-success/15 text-success" },
  { key: "overdue", label: "En retard", tone: "bg-destructive/15 text-destructive" },
];

/* ------------------------------------------------------------------ */
/* Sortable task card                                                  */
/* ------------------------------------------------------------------ */

function SortableTaskCard({
  task,
  onDetail,
}: {
  task: Task;
  onDetail: (t: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="cursor-pointer hover:shadow-md group"
        onClick={() => onDetail(task)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <button
              className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{task.name}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{task.due_date ?? "—"}</span>
                <Badge variant="outline" className="text-[10px]">
                  {task.priority}
                </Badge>
              </div>
              {typeof task.progress === "number" && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drag overlay card (follows cursor during drag)                      */
/* ------------------------------------------------------------------ */

function DragOverlayCard({ task }: { task: Task }) {
  return (
    <Card className="shadow-lg border-primary/40 rotate-2">
      <CardContent className="p-3">
        <div className="text-sm font-medium">{task.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {task.due_date ?? "—"} · {task.priority}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main board component                                                */
/* ------------------------------------------------------------------ */

function KanbanBoard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Task | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { data } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*");
      return (data ?? []) as Task[];
    },
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-pick"],
    queryFn: async () =>
      ((await supabase.from("employees").select("id,user_id,full_name"))
        .data ?? []) as Employee[],
  });
  const { data: projects } = useQuery({
    queryKey: ["projects-pick"],
    queryFn: async () =>
      ((await supabase.from("projects").select("id,name")).data ?? []) as Project[],
  });

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = Object.fromEntries(
      columns.map((c) => [c.key, []]),
    );
    (data ?? []).forEach((t) => {
      g[t.status]?.push(t);
    });
    return g;
  }, [data]);

  /* ---- DnD handlers ---- */

  const handleDragStart = (event: DragStartEvent) => {
    const task = (data ?? []).find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = String(active.id);
    const fromStatus = String(
      typeof active.data.current?.status === "string"
        ? active.data.current.status
        : "",
    );

    // Determine target column: either dropped on a column header or on another card in a column
    let toStatus = "";
    if (columns.some((c) => c.key === over.id)) {
      toStatus = String(over.id);
    } else {
      const overTask = (data ?? []).find((t) => t.id === over.id);
      if (overTask) toStatus = overTask.status;
    }

    if (!toStatus || fromStatus === toStatus) return;

    const task = (data ?? []).find((t) => t.id === taskId);
    const { error } = await supabase
      .from("tasks")
      .update({ status: toStatus as Task["status"] })
      .eq("id", taskId);
    if (error) return;

    // Send notification to assignee if task status changed
    if (task?.assigned_to && user?.id) {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
      if (profile?.company_id) {
        await notifyTaskStatusChanged({
          companyId: profile.company_id,
          senderId: user.id,
          recipientId: task.assigned_to,
          taskName: task.name,
          oldStatus: fromStatus,
          newStatus: toStatus,
        });
      }
    }

    qc.invalidateQueries({ queryKey: ["tasks-all"] });
  };

  /* ---- Fields for EditDialog ---- */

  const fields: Field[] = [
    { key: "name", label: "Task", required: true, span: 2 },
    {
      key: "description",
      label: "Description",
      type: "textarea",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "overdue", label: "Overdue" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "urgent", label: "Urgent" },
      ],
    },
    {
      key: "assigned_to",
      label: "Assignee",
      type: "select",
      options: (employees ?? [])
        .filter((e) => e.user_id)
        .map((e) => ({ value: e.user_id!, label: e.full_name })),
    },
    {
      key: "project_id",
      label: "Project",
      type: "select",
      options: (projects ?? []).map((p) => ({ value: p.id, label: p.name })),
    },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "progress", label: "Progress %", type: "number", min: "0" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setNewOpen(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nouvelle tâche
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <DroppableColumn key={col.key} column={col} tasks={grouped[col.key] ?? []} onDetail={setDetailTask} />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <DragOverlayCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Edit dialog */}
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setNewOpen(false);
            setEditing(null);
          }
          qc.invalidateQueries({ queryKey: ["tasks-all"] });
        }}
        table="tasks"
        title="tâche"
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
        invalidate={["tasks-all"]}
      />

      {/* Detail dialog */}
      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={(v) => {
          if (!v) setDetailTask(null);
          qc.invalidateQueries({ queryKey: ["tasks-all"] });
        }}
        task={detailTask}
        employees={employees ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Droppable column                                                    */
/* ------------------------------------------------------------------ */

function DroppableColumn({
  column,
  tasks,
  onDetail,
}: {
  column: { key: string; label: string; tone: string };
  tasks: Task[];
  onDetail: (t: Task) => void;
}) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="text-sm font-semibold">{column.label}</div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 p-3 min-h-[120px]">
          {tasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Aucune tâche
            </div>
          ) : (
            tasks.map((t) => (
              <SortableTaskCard key={t.id} task={t} onDetail={onDetail} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
