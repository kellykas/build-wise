import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalIcon, Plus } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

const eventFields: Field[] = [
  { key: "title", label: "Title", required: true, span: 2 },
  { key: "event_date", label: "Date", type: "date", required: true },
  { key: "start_time", label: "Start", type: "time" },
  { key: "end_time", label: "End", type: "time" },
  { key: "location", label: "Location" },
  { key: "description", label: "Notes", type: "textarea" },
];

type Event = { id: string; title: string; event_date: string; start_time: string | null; location: string | null };
type Task = { id: string; name: string; due_date: string | null; status: string; priority: string };

function CalendarPage() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const qc = useQueryClient();

  const { data: events } = useQuery({
    queryKey: ["agenda-events"],
    queryFn: async () => ((await supabase.from("agenda_events").select("*").order("event_date")).data ?? []) as Event[],
  });
  const { data: tasks } = useQuery({
    queryKey: ["agenda-tasks"],
    queryFn: async () => ((await supabase.from("tasks").select("id,name,due_date,status,priority").not("due_date", "is", null)).data ?? []) as Task[],
  });

  const dayKey = format(selected, "yyyy-MM-dd");
  const todayEvents = (events ?? []).filter((e) => e.event_date === dayKey);
  const todayTasks = (tasks ?? []).filter((t) => t.due_date === dayKey);

  const upcoming = [...(events ?? []).map((e) => ({ kind: "event" as const, date: e.event_date, title: e.title, id: e.id })),
                    ...(tasks ?? []).map((t) => ({ kind: "task" as const, date: t.due_date!, title: t.name, id: t.id }))]
    .filter((x) => x.date >= dayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 30);

  const eventDays = new Set([...(events ?? []).map((e) => e.event_date), ...(tasks ?? []).map((t) => t.due_date!).filter(Boolean)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><CalIcon className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
            <p className="text-sm text-muted-foreground">Everything happening today and in the days ahead.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New event</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              modifiers={{ has: (day) => eventDays.has(format(day, "yyyy-MM-dd")) }}
              modifiersClassNames={{ has: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary" }}
              className="pointer-events-auto"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{format(selected, "EEEE, MMMM d")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayEvents.length === 0 && todayTasks.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing scheduled for this day.</div>
              )}
              {todayEvents.map((e) => (
                <button key={e.id} onClick={() => setEditing(e)} className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted/40">
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.start_time ?? "All day"} · {e.location ?? "—"}</div>
                  </div>
                  <Badge variant="secondary">Event</Badge>
                </button>
              ))}
              {todayTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">Task · {t.priority}</div>
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && <div className="text-sm text-muted-foreground">Nothing on the horizon.</div>}
              {upcoming.map((x) => (
                <div key={`${x.kind}-${x.id}`} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{x.title}</div>
                    <div className="text-xs text-muted-foreground">{x.date}</div>
                  </div>
                  <Badge variant={x.kind === "event" ? "secondary" : "outline"}>{x.kind}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <EditDialog
        open={open || !!editing}
        onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } qc.invalidateQueries({ queryKey: ["agenda-events"] }); }}
        table="agenda_events"
        title="event"
        fields={eventFields}
        row={editing as unknown as Record<string, unknown> | null}
        extra={!editing ? { event_date: dayKey, created_by: profile?.id } : undefined}
        invalidate={["agenda-events"]}
      />
    </div>
  );
}
