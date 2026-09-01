import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/StatusBadge";
import { History, Search, Download, Filter, Loader2, Mail, Bell, AlertCircle, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resendNotification } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/app/notification-log")({
  component: NotificationLogPage,
});

type NotificationLogEntry = {
  id: string;
  company_id: string;
  sender_id: string | null;
  recipient_id: string;
  type: string;
  template_key: string | null;
  title: string;
  message: string | null;
  link: string | null;
  channel: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  updated_at: string;
  sender?: { full_name: string | null; email: string | null };
  recipient?: { full_name: string | null; email: string | null };
};

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "task", label: "Task" },
  { value: "info", label: "Information" },
  { value: "urgent", label: "Urgent" },
  { value: "approval", label: "Approval" },
  { value: "requisition", label: "Requisition" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" },
];

const CHANNEL_OPTIONS = [
  { value: "all", label: "All Channels" },
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "knock", label: "Knock" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  task_assigned: "Task Assignment",
  task_status_changed: "Task Status Change",
  invoice_due: "Invoice Due",
  invoice_overdue: "Invoice Overdue",
  requisition_approval: "Requisition Approval",
};

function NotificationLogPage() {
  const { isAdmin } = useAuth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const pageSize = 50;

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Log</h1>
            <p className="text-sm text-muted-foreground">Admin access required.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p>You need admin privileges to view the notification log.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["notification-log", typeFilter, statusFilter, channelFilter, searchQuery, dateFrom, dateTo, page],
    queryFn: async () => {
      let query = supabase
        .from("notification_log" as never)
        .select("*, sender:profiles!notification_log_sender_id_fkey(full_name, email), recipient:profiles!notification_log_recipient_id_fkey(full_name, email)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo + "T23:59:59Z");
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { entries: (data ?? []) as NotificationLogEntry[], total: count ?? 0 };
    },
  });

  // Real-time subscription: auto-refetch when notification_log rows are updated (e.g. Knock webhooks)
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("notification-log-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_log",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refetch]);

  const stats = useMemo(() => {
    if (!logs?.entries) return { total: logs?.total ?? 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    const entries = logs.entries;
    return {
      total: logs.total,
      sent: entries.filter((e) => e.status === "sent").length,
      delivered: entries.filter((e) => e.status === "delivered").length,
      read: entries.filter((e) => e.status === "read").length,
      failed: entries.filter((e) => e.status === "failed").length,
    };
  }, [logs]);

  const exportCSV = () => {
    if (!logs?.entries?.length) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date", "Type", "Template", "Channel", "Status", "Title", "Sender", "Recipient", "Error"];
    const rows = logs.entries.map((e) => [
      new Date(e.created_at).toLocaleString(),
      e.type,
      e.template_key ?? "",
      e.channel,
      e.status,
      e.title,
      e.sender?.full_name ?? e.sender?.email ?? "System",
      e.recipient?.full_name ?? e.recipient?.email ?? "Unknown",
      e.error_message ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notification-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "read":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "knock":
        return <Badge variant="secondary" className="gap-1">🔔 Knock</Badge>;
      case "email":
        return <Badge variant="secondary" className="gap-1">📧 Email</Badge>;
      case "in_app":
        return <Badge variant="outline" className="gap-1">📱 In-App</Badge>;
      default:
        return <Badge variant="outline">{channel}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Log</h1>
            <p className="text-sm text-muted-foreground">
              Complete audit trail of all sent notifications. {stats.total} total entries.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!logs?.entries?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Total Sent</div>
            <div className="mt-1 text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Delivered</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Read</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{stats.read}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Failed</div>
            <div className="mt-1 text-2xl font-bold text-destructive">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search title, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !logs?.entries?.length ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p>No notifications match your filters.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setChannelFilter("all"); setSearchQuery(""); setDateFrom(""); setDateTo(""); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            entry.type === "urgent"
                              ? "danger"
                              : entry.type === "approval"
                              ? "warning"
                              : "info"
                          }
                        >
                          {entry.type}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.template_key ? (
                          <Badge variant="outline" className="text-[10px]">
                            {TEMPLATE_LABELS[entry.template_key] ?? entry.template_key}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getChannelBadge(entry.channel)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(entry.status)}
                          <span className="text-xs capitalize">{entry.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="truncate font-medium">{entry.title}</div>
                        {entry.message && (
                          <div className="truncate text-xs text-muted-foreground mt-0.5">
                            {entry.message}
                          </div>
                        )}
                        {entry.error_message && (
                          <div className="truncate text-xs text-destructive mt-0.5">
                            Error: {entry.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.sender?.full_name ?? entry.sender?.email ?? (
                          <span className="text-muted-foreground italic">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.recipient?.full_name ?? entry.recipient?.email ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={resendingId === entry.id}
                            onClick={async () => {
                              setResendingId(entry.id);
                              try {
                                const result = await resendNotification(entry.id);
                                if (result.success) {
                                  toast.success("Notification resent successfully");
                                  refetch();
                                } else {
                                  toast.error(result.error ?? "Failed to resend");
                                }
                              } finally {
                                setResendingId(null);
                              }
                            }}
                          >
                            {resendingId === entry.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            Resend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {logs && logs.total > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, logs.total)} of {logs.total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * pageSize >= logs.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
