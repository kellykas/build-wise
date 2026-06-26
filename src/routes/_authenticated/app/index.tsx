import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight, FolderKanban, Users, Receipt, Boxes, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

const revenueData = [
  { m: "Jan", revenue: 120000, expenses: 80000 },
  { m: "Feb", revenue: 145000, expenses: 92000 },
  { m: "Mar", revenue: 168000, expenses: 110000 },
  { m: "Apr", revenue: 154000, expenses: 95000 },
  { m: "May", revenue: 192000, expenses: 121000 },
  { m: "Jun", revenue: 218000, expenses: 138000 },
];
const statusData = [
  { name: "In Progress", value: 12, fill: "var(--chart-1)" },
  { name: "Planning", value: 5, fill: "var(--chart-2)" },
  { name: "On Hold", value: 2, fill: "var(--chart-4)" },
  { name: "Completed", value: 18, fill: "var(--chart-3)" },
];
const taskData = [
  { d: "Mon", done: 12, open: 6 },
  { d: "Tue", done: 16, open: 8 },
  { d: "Wed", done: 14, open: 9 },
  { d: "Thu", done: 20, open: 5 },
  { d: "Fri", done: 18, open: 7 },
  { d: "Sat", done: 8, open: 3 },
  { d: "Sun", done: 4, open: 2 },
];

function Kpi({ icon: Icon, label, value, delta, tone = "primary" }: {
  icon: typeof FolderKanban; label: string; value: string | number; delta?: string; tone?: "primary" | "accent" | "success" | "warning";
}) {
  const toneCls = { primary: "bg-primary/10 text-primary", accent: "bg-accent/10 text-accent", success: "bg-success/10 text-success", warning: "bg-warning/15 text-warning" }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            {delta && <div className="mt-1 inline-flex items-center gap-1 text-xs text-success"><ArrowUpRight className="h-3 w-3" />{delta}</div>}
          </div>
          <span className={`grid h-10 w-10 place-items-center rounded-md ${toneCls}`}><Icon className="h-5 w-5" /></span>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [proj, emp, inv, lowStock] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("amount"),
        supabase.from("inventory_items").select("id, quantity, min_quantity"),
      ]);
      const invoiceTotal = (inv.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const low = (lowStock.data ?? []).filter((r) => Number(r.quantity) <= Number(r.min_quantity)).length;
      return {
        projects: proj.count ?? 0,
        employees: emp.count ?? 0,
        revenue: invoiceTotal,
        lowStock: low,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operations overview across all active projects.</p>
        </div>
        <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> Live</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={FolderKanban} label="Projects" value={counts?.projects ?? 0} delta="+3 this month" tone="primary" />
        <Kpi icon={Users} label="Employees" value={counts?.employees ?? 0} delta="+8 hired" tone="accent" />
        <Kpi icon={Receipt} label="Invoiced" value={`$${(counts?.revenue ?? 0).toLocaleString()}`} delta="+12.4%" tone="success" />
        <Kpi icon={Boxes} label="Low stock items" value={counts?.lowStock ?? 0} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" stroke="var(--chart-2)" fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Project status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {statusData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tasks this week</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={taskData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="done" fill="var(--chart-1)" radius={[4,4,0,0]} />
                <Bar dataKey="open" fill="var(--chart-2)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { t: "Cement stock below threshold", c: "Inventory" },
              { t: "Excavator EX-12 due for service", c: "Equipment" },
              { t: "Invoice #2041 overdue", c: "Finance" },
              { t: "3 leave requests pending", c: "HR" },
            ].map((a) => (
              <div key={a.t} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-warning/15 text-warning">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.c}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
