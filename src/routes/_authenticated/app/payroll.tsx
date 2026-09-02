import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/payroll")({
  component: PayrollPage,
});

type Employee = { id: string; full_name: string; salary: number; hourly_rate: number };
type Rules = { standard_hours_per_day: number; working_days_per_month: number; overtime_multiplier: number; absence_deduction_per_day: number; tax_rate: number; currency: string };
type Payslip = { id: string; employee_id: string; base_salary: number; hours_worked: number; overtime_pay: number; bonus: number; deductions: number; tax: number; net_pay: number; status: string };

function PayrollPage() {
  const { t } = useTranslation();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees-payroll"],
    queryFn: async () => ((await supabase.from("employees").select("id,full_name,salary,hourly_rate").eq("status", "active")).data ?? []) as Employee[],
  });
  const { data: rules } = useQuery({
    queryKey: ["payroll-rules"],
    queryFn: async () => ((await supabase.from("payroll_rules").select("*").maybeSingle()).data) as Rules | null,
  });
  const { data: payslips } = useQuery({
    queryKey: ["payslips", month, year],
    queryFn: async () => ((await supabase.from("payslips").select("*").eq("period_month", month).eq("period_year", year)).data ?? []) as Payslip[],
  });

  const generate = async () => {
    if (!profile?.company_id || !employees) return;
    const r: Rules = rules ?? { standard_hours_per_day: 8, working_days_per_month: 22, overtime_multiplier: 1.5, absence_deduction_per_day: 0, tax_rate: 0, currency: "USD" };
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    for (const emp of employees) {
      const { data: att } = await supabase.from("attendance").select("hours_worked").eq("employee_id", emp.id).gte("work_date", start).lte("work_date", endDate);
      const totalHours = (att ?? []).reduce((s, a) => s + Number(a.hours_worked || 0), 0);
      const standard = r.standard_hours_per_day * r.working_days_per_month;
      const overtime = Math.max(0, totalHours - standard);
      const otPay = overtime * (Number(emp.hourly_rate) || 0) * Number(r.overtime_multiplier);
      const base = Number(emp.salary || 0);
      const tax = (base + otPay) * (Number(r.tax_rate) / 100);
      const net = base + otPay - tax;
      await supabase.from("payslips").upsert({
        company_id: profile.company_id,
        employee_id: emp.id,
        period_month: month,
        period_year: year,
        base_salary: base,
        hours_worked: totalHours,
        overtime_hours: overtime,
        overtime_pay: otPay,
        bonus: 0,
        deductions: 0,
        tax,
        net_pay: net,
        status: "draft",
      }, { onConflict: "employee_id,period_month,period_year" });
    }
    qc.invalidateQueries({ queryKey: ["payslips", month, year] });
    toast.success("Payslips generated");
  };

  const markPaid = async (p: Payslip) => {
    await supabase.from("payslips").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", p.id);
    if (profile?.company_id) {
      await supabase.from("transactions").insert({
        company_id: profile.company_id, type: "expense", category: "Payroll",
        amount: p.net_pay, description: `Payslip ${month}/${year}`, payslip_id: p.id,
      });
    }
    qc.invalidateQueries({ queryKey: ["payslips", month, year] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Marked paid · expense posted to Finance");
  };

  const totalNet = (payslips ?? []).reduce((s, p) => s + Number(p.net_pay || 0), 0);
  const empById = new Map((employees ?? []).map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("d.payroll.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("d.payroll.description")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20" min={1} max={12} />
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
          <Button onClick={generate}>{t("d.payroll.generate_payslips")}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.payroll.payslips")}</div><div className="mt-1 text-2xl font-bold">{payslips?.length ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.payroll.total_net")}</div><div className="mt-1 text-2xl font-bold">${totalNet.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t("d.payroll.paid")}</div><div className="mt-1 text-2xl font-bold">{(payslips ?? []).filter((p) => p.status === "paid").length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Period · {format(new Date(year, month - 1), "MMMM yyyy")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("d.payroll.employee")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.base")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.hours")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.overtime_pay")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.tax")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.net_pay")}</th>
                <th className="px-4 py-3 text-left">{t("d.payroll.status")}</th>
                <th className="px-4 py-3 text-right">{t("d.payroll.action")}</th>
              </tr>
            </thead>
            <tbody>
              {(payslips ?? []).map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{empById.get(p.employee_id)?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">${Number(p.base_salary).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(p.hours_worked).toFixed(1)}h</td>
                  <td className="px-4 py-3">${Number(p.overtime_pay).toFixed(2)}</td>
                  <td className="px-4 py-3">${Number(p.tax).toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">${Number(p.net_pay).toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={p.status === "paid" ? "secondary" : "outline"}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "paid" ? (
                      <Button size="sm" onClick={() => markPaid(p)}>{t("d.payroll.mark_paid")}</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /></Button>
                    )}
                  </td>
                </tr>
              ))}
              {(payslips?.length ?? 0) === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">{t("d.payroll.no_payslips")}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
