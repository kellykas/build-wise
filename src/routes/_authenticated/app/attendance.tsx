import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/attendance")({
  component: AttendancePage,
});

type Employee = { id: string; full_name: string; position: string | null; status: string; hourly_rate: number };
type Attendance = { id: string; employee_id: string; work_date: string; clock_in: string | null; clock_out: string | null; hours_worked: number };

function AttendancePage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees-attendance"],
    queryFn: async () => ((await supabase.from("employees").select("id,full_name,position,status,hourly_rate").eq("status", "active").order("full_name")).data ?? []) as Employee[],
  });
  const { data: records } = useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => ((await supabase.from("attendance").select("*").eq("work_date", date)).data ?? []) as Attendance[],
  });

  const byEmployee = new Map(records?.map((r) => [r.employee_id, r]));

  const clockIn = async (employeeId: string) => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from("attendance").insert({
      company_id: profile.company_id,
      employee_id: employeeId,
      work_date: date,
      clock_in: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance", date] });
    toast.success(t("d.attendance.clocked_in"));
  };

  const clockOut = async (rec: Attendance) => {
    const out = new Date().toISOString();
    const hours = rec.clock_in ? Math.max(0, (new Date(out).getTime() - new Date(rec.clock_in).getTime()) / 3600000) : 0;
    const { error } = await supabase.from("attendance").update({ clock_out: out, hours_worked: Math.round(hours * 100) / 100 }).eq("id", rec.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance", date] });
    toast.success(`${t("d.attendance.clocked_out")} · ${hours.toFixed(2)}h`);
  };

  const totalHoursToday = (records ?? []).reduce((s, r) => s + Number(r.hours_worked || 0), 0);
  const presentCount = (records ?? []).filter((r) => r.clock_in).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><ClipboardCheck className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("d.attendance.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("d.attendance.description")}</p>
          </div>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.attendance.active_employees")}</div><div className="mt-1 text-2xl font-bold">{employees?.length ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.attendance.present_today")}</div><div className="mt-1 text-2xl font-bold">{presentCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.attendance.total_hours")}</div><div className="mt-1 text-2xl font-bold">{totalHoursToday.toFixed(1)}h</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("d.attendance.daily_roster")} · {date}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("d.attendance.employee")}</th>
                <th className="px-4 py-3 text-left">{t("d.attendance.position")}</th>
                <th className="px-4 py-3 text-left">{t("d.attendance.clock_in")}</th>
                <th className="px-4 py-3 text-left">{t("d.attendance.clock_out")}</th>
                <th className="px-4 py-3 text-left">{t("d.attendance.hours")}</th>
                <th className="px-4 py-3 text-right">{t("d.attendance.action")}</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp) => {
                const rec = byEmployee.get(emp.id);
                return (
                  <tr key={emp.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.position}</td>
                    <td className="px-4 py-3">{rec?.clock_in ? format(new Date(rec.clock_in), "HH:mm") : "—"}</td>
                    <td className="px-4 py-3">{rec?.clock_out ? format(new Date(rec.clock_out), "HH:mm") : "—"}</td>
                    <td className="px-4 py-3">{rec?.hours_worked ? `${Number(rec.hours_worked).toFixed(2)}h` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {!rec ? <Button size="sm" onClick={() => clockIn(emp.id)}>{t("d.attendance.clock_in")}</Button>
                        : !rec.clock_out ? <Button size="sm" variant="outline" onClick={() => clockOut(rec)}>{t("d.attendance.clock_out")}</Button>
                        : <Badge variant="secondary">{t("d.attendance.done")}</Badge>}
                    </td>
                  </tr>
                );
              })}
              {(employees?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{t("d.attendance.no_active_employees")}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
