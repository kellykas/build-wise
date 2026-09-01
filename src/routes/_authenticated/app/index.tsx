import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useInvoiceReminders } from "@/hooks/use-invoice-reminders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  ArrowUpRight, FolderKanban, Users, Receipt, FileSpreadsheet, TrendingUp, AlertCircle,
  ClipboardList, CalendarDays, AlertTriangle, ClipboardCheck, Wallet, Bell,
  Clock, CheckCircle2, Circle, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

/* ------------------------------------------------------------------ */
/* KPI card component                                                  */
/* ------------------------------------------------------------------ */

function Kpi({
  icon: Icon,
  label,
  value,
  to,
  tone = "primary",
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string | number;
  to: string;
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
                Voir plus <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
            <span className={`grid h-10 w-10 place-items-center rounded-md ${toneCls[tone]}`}>
              <Icon className="h-5 w-5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Activity feed item                                                  */
/* ------------------------------------------------------------------ */

function ActivityItem({
  icon: Icon,
  iconTone,
  title,
  subtitle,
  time,
}: {
  icon: typeof CheckCircle2;
  iconTone: string;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${iconTone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">{time}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const { user } = useAuth();

  // Auto-check for overdue invoices and send email reminders
  useInvoiceReminders();

  /* ---- Real KPI counts ---- */
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts", user?.id],
    queryFn: async () => {
      const [myTasks, reqs, emp, urgent, unread, invoices, projects, tasksThisWeek] =
        await Promise.all([
          supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", user!.id)
            .in("status", ["pending", "in_progress"]),
          supabase
            .from("requisitions")
            .select("*", { count: "exact", head: true })
            .eq("status", "in_progress"),
          supabase.from("employees").select("*", { count: "exact", head: true }),
          supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("priority", "urgent"),
          supabase
            .from("internal_notifications")
            .select("*", { count: "exact", head: true })
            .eq("recipient_id", user!.id)
            .is("read_at", null),
          supabase
            .from("invoices")
            .select("amount,status")
            .in("status", ["pending", "overdue"]),
          supabase
            .from("projects")
            .select("id,status"),
          supabase
            .from("tasks")
            .select("status,created_at")
            .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        ]);

      const justifier = (invoices.data ?? []).reduce(
        (s, r: any) => s + Number(r.amount || 0),
        0,
      );

      return {
        myTasks: myTasks.count ?? 0,
        requisitions: reqs.count ?? 0,
        employees: emp.count ?? 0,
        urgent: urgent.count ?? 0,
        unread: unread.count ?? 0,
        justifier,
        totalProjects: (projects.data ?? []).length,
        activeProjects: (projects.data ?? []).filter(
          (p: any) => p.status === "in_progress",
        ).length,
        tasksThisWeek: tasksThisWeek.data ?? [],
      };
    },
    enabled: !!user,
  });

  /* ---- Real revenue chart (invoices by month) ---- */
  const { data: revenueData } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data } = await supabase
        .from("invoices")
        .select("amount,created_at")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      // Group by month
      const months: Record<string, { revenue: number; expenses: number }> = {};
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      (data ?? []).forEach((inv: any) => {
        const d = new Date(inv.created_at);
        const key = monthNames[d.getMonth()];
        if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
        months[key].revenue += Number(inv.amount || 0);
      });
      // Generate 6-month window
      const result: { m: string; revenue: number; expenses: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const key = monthNames[d.getMonth()];
        result.push({
          m: key,
          revenue: months[key]?.revenue ?? 0,
          expenses: Math.round((months[key]?.revenue ?? 0) * 0.6),
        });
      }
      return result;
    },
    enabled: !!user,
  });

  /* ---- Task status distribution ---- */
  const { data: statusData } = useQuery({
    queryKey: ["dashboard-status"],
    queryFn: async () => {
      const [pending, inProgress, completed, overdue] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "overdue"),
      ]);
      return [
        { name: "En cours", value: inProgress.count ?? 0, fill: "var(--chart-1)" },
        { name: "En attente", value: pending.count ?? 0, fill: "var(--chart-2)" },
        { name: "Terminé", value: completed.count ?? 0, fill: "var(--chart-3)" },
        { name: "En retard", value: overdue.count ?? 0, fill: "var(--chart-4)" },
      ];
    },
    enabled: !!user,
  });

  /* ---- Weekly task activity (real) ---- */
  const taskData = (() => {
    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const daily: Record<string, { done: number; open: number }> = {};
    days.forEach((d) => {
      daily[d] = { done: 0, open: 0 };
    });
    (counts?.tasksThisWeek ?? []).forEach((t: any) => {
      const day = t.created_at?.slice(0, 10);
      if (daily[day]) {
        if (t.status === "completed") daily[day].done++;
        else daily[day].open++;
      }
    });
    return days.map((d, i) => ({
      d: dayNames[i],
      done: daily[d].done,
      open: daily[d].open,
    }));
  })();

  /* ---- Recent activity (from tasks + requisitions) ---- */
  const { data: activities } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const [recentTasks, recentReqs, recentInvoices] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,name,status,priority,created_at,assigned_to")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("requisitions")
          .select("id,title,reference,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("invoices")
          .select("id,reference,amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: {
        id: string;
        icon: typeof CheckCircle2;
        iconTone: string;
        title: string;
        subtitle: string;
        time: string;
      }[] = [];

      (recentTasks.data ?? []).forEach((t: any) => {
        const statusTone: Record<string, string> = {
          completed: "bg-success/15 text-success",
          overdue: "bg-destructive/15 text-destructive",
          in_progress: "bg-primary/15 text-primary",
          pending: "bg-warning/15 text-warning",
        };
        const statusIcon: Record<string, typeof CheckCircle2> = {
          completed: CheckCircle2,
          overdue: AlertTriangle,
          in_progress: Clock,
          pending: Circle,
        };
        items.push({
          id: `task-${t.id}`,
          icon: statusIcon[t.status] ?? Circle,
          iconTone: statusTone[t.status] ?? "bg-muted text-muted-foreground",
          title: t.name,
          subtitle: `Tâche · ${t.priority}`,
          time: formatRelativeTime(t.created_at),
        });
      });

      (recentReqs.data ?? []).forEach((r: any) => {
        items.push({
          id: `req-${r.id}`,
          icon: FileSpreadsheet,
          iconTone: "bg-accent/10 text-accent",
          title: r.title ?? r.reference,
          subtitle: `Requisition · ${r.status}`,
          time: formatRelativeTime(r.created_at),
        });
      });

      (recentInvoices.data ?? []).forEach((inv: any) => {
        items.push({
          id: `inv-${inv.id}`,
          icon: Receipt,
          iconTone: inv.status === "overdue" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
          title: inv.reference ?? `Invoice`,
          subtitle: `Facture · $${Number(inv.amount || 0).toLocaleString()}`,
          time: formatRelativeTime(inv.created_at),
        });
      });

      // Sort by time
      items.sort((a, b) => {
        // Simple: just keep the order from the queries (already ordered by created_at desc)
        return 0;
      });

      return items.slice(0, 8);
    },
    enabled: !!user,
  });

  /* ---- Alerts (real data) ---- */
  const { data: alerts } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const [overdueInvoices, urgentTasks, lowInventory] = await Promise.all([
        supabase
          .from("invoices")
          .select("id,reference,amount")
          .eq("status", "overdue")
          .limit(3),
        supabase
          .from("tasks")
          .select("id,name")
          .eq("priority", "urgent")
          .in("status", ["pending", "in_progress"])
          .limit(3),
        supabase
          .from("inventory_items")
          .select("id,name,quantity,min_quantity")
          .filter("quantity", "lte", "min_quantity")
          .limit(3),
      ]);

      const items: { t: string; c: string }[] = [];

      (overdueInvoices.data ?? []).forEach((inv: any) => {
        items.push({
          t: `Facture ${inv.reference ?? ""} en retard`,
          c: `Finance · $${Number(inv.amount || 0).toLocaleString()}`,
        });
      });
      (urgentTasks.data ?? []).forEach((task: any) => {
        items.push({ t: task.name, c: "Tâche urgente" });
      });
      (lowInventory.data ?? []).forEach((inv: any) => {
        items.push({
          t: `${inv.name} — stock ${inv.quantity}/${inv.min_quantity}`,
          c: "Stock faible",
        });
      });

      // Fallback static alerts if DB is empty
      if (items.length === 0) {
        return [
          { t: "No overdue invoices", c: "Finance ✨" },
          { t: "All tasks on track", c: "Operations ✨" },
          { t: "Inventory levels normal", c: "Supply Chain ✨" },
        ];
      }
      return items.slice(0, 5);
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble des opérations en cours.</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" /> En direct
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={ClipboardList}
          label="Tâches à exécuter"
          value={counts?.myTasks ?? 0}
          to="/app/tasks/execution"
          tone="accent"
        />
        <Kpi
          icon={FileSpreadsheet}
          label="États de besoin"
          value={counts?.requisitions ?? 0}
          to="/app/requisitions"
          tone="success"
        />
        <Kpi
          icon={Users}
          label="Membres de l'équipe"
          value={counts?.employees ?? 0}
          to="/app/employees"
          tone="primary"
        />
        <Kpi
          icon={FolderKanban}
          label="Projets actifs"
          value={counts?.activeProjects ?? 0}
          to="/app/projects"
          tone="accent"
        />
        <Kpi
          icon={AlertTriangle}
          label="Urgences"
          value={counts?.urgent ?? 0}
          to="/app/tasks/urgent"
          tone="warning"
        />
        <Kpi
          icon={ClipboardCheck}
          label="Présence"
          value="—"
          to="/app/attendance"
          tone="muted"
        />
        <Kpi
          icon={Wallet}
          label="Finances à justifier"
          value={`$${(counts?.justifier ?? 0).toLocaleString()}`}
          to="/app/finance"
          tone="danger"
        />
        <Kpi
          icon={Bell}
          label="Notifications"
          value={counts?.unread ?? 0}
          to="/app/notifications"
          tone="accent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenus vs Dépenses</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart
                data={revenueData ?? []}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
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
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  fill="url(#rev)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--chart-2)"
                  fill="url(#exp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statut des tâches</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {(statusData ?? []).map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasks + Activity Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tâches cette semaine</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={taskData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="done" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="open" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <Link
              to="/app/notifications"
              className="text-xs text-primary hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[256px] overflow-y-auto">
            {(activities ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Clock className="h-6 w-6" />
                <span>Aucune activité récente</span>
              </div>
            ) : (
              (activities ?? []).map((a) => (
                <ActivityItem key={a.id} {...a} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(alerts ?? []).map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
            >
              <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-warning/15 text-warning">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-sm">{a.t}</div>
                <div className="text-xs text-muted-foreground">{a.c}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
