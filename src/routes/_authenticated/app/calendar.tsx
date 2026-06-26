import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const offset = start.getDay();
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) =>
    i < offset ? null : i - offset + 1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Meetings, deadlines, and site visits.</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{today.toLocaleString("en", { month: "long", year: "numeric" })}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs font-medium uppercase text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="p-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {cells.map((d, i) => (
              <div key={i} className={`aspect-square rounded-md border border-border p-2 text-sm ${d === today.getDate() ? "border-primary bg-primary/5 font-semibold text-primary" : "bg-card"}`}>
                {d ?? ""}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
