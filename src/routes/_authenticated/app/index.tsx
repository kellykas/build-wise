import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight, FolderKanban, Users, Receipt, FileSpreadsheet, TrendingUp, AlertCircle,
  ClipboardList, CalendarDays, AlertTriangle, ClipboardCheck, Wallet, Bell,
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
  { name: "En cours", value: 12, fill: "var(--chart-1)" },
  { name: "Planifié", value: 5, fill: "var(--chart-2)" },
  { name: "En attente", value: 2, fill: "var(--chart-4)" },
  { name: "Terminé", value: 18, fill: "var(--chart-3)" },
];
const taskData = [
  { d: "Lun", done: 12, open: 6 },
  { d: "Mar", done: 16, open: 8 },
  { d: "Mer", done: 14, open: 9 },
  { d: "Jeu", done: 20, open: 5 },
  { d: "Ven", done: 18, open: 7 },
  { d: "Sam", done: 8, open: 3 },
  { d: "Dim", done: 4, open: 2 },
];

function Kpi({ icon: Icon, label, value, to, tone = "primary" }: {
  icon: typeof FolderKanban; label: string; value: string | number; to: string;
  tone?: "primary" | "accent" | "success" | "warning" | "danger" | "muted";
}) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Link to={to} className="group">
      <Card className="transition-all hover:shadow-md hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-1 text-3xl font-bold">{value}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Afficher plus <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
            <span className={`grid h-10 w-10 place-items-center rounded-md ${toneCls[tone]}`}><Icon className="h-5 w-5" /></span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const { user, profile } = useAuth();
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts", user?.id],
    queryFn: async () => {
      const [myTasks, reqs, emp, urgent, unread, invoices, requisitionsPending] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("assigned_to", user!.id).in("status", ["pending", "in_progress"]),
        supabase.from("requisitions").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("priority", "urgent"),
        supabase.from("internal_notifications").select("*", { count: "exact", head: true }).eq("recipient_id", user!.id).is("read_at", null),
        supabase.from("invoices").select("amount,status").in("status", ["pending", "overdue"]),
        supabase.from("requisitions").select("id,title,reference,total_amount,status").in("status", ["pending_pricing", "in_progress"]).order("created_at", { ascending: false }).limit(5),
      ]);
      const justifier = (invoices.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      return {
        myTasks: myTasks.count ?? 0,
        requisitions: reqs.count ?? 0,
        employees: emp.count ?? 0,
        urgent: urgent.count ?? 0,
        unread: unread.count ?? 0,
        justifier,
        pendingReqs: requisitionsPending.data ?? [],
      };
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble des opérations en cours.</p>
        </div>
        <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> En direct</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ClipboardList} label="Tâches à exécuter" value={counts?.myTasks ?? 0} to="/app/tasks/execution" tone="accent" />
        <Kpi icon={FileSpreadsheet} label="États de besoin en cours" value={counts?.requisitions ?? 0} to="/app/requisitions" tone="success" />
        <Kpi icon={Users} label="Membres de l'équipe" value={counts?.employees ?? 0} to="/app/employees" tone="primary" />
        <Kpi icon={CalendarDays} label="Évènements prévus" value="—" to="/app/calendar" tone="muted" />
        <Kpi icon={AlertTriangle} label="Urgences attendues" value={counts?.urgent ?? 0} to="/app/tasks/urgent" tone="warning" />
        <Kpi icon={ClipboardCheck} label="Statut de présence" value="—" to="/app/attendance" tone="muted" />
        <Kpi icon={Wallet} label="Finances à justifier" value={`$${(counts?.justifier ?? 0).toLocaleString()}`} to="/app/finance" tone="danger" />
        <Kpi icon={Bell} label="Notifications" value={counts?.unread ?? 0} to="/app/notifications" tone="accent" />
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
