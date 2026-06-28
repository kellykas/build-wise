import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/finance")({
  component: FinancePage,
});

type Tx = { id: string; type: "income" | "expense"; category: string | null; amount: number; transaction_date: string; description: string | null };

function FinancePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");

  const { data: tx } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => ((await supabase.from("transactions").select("*").order("transaction_date", { ascending: false })).data ?? []) as Tx[],
  });
  const { data: invoices } = useQuery({
    queryKey: ["finance-invoices"],
    queryFn: async () => ((await supabase.from("invoices").select("amount,paid_amount,status,issue_date")).data ?? []),
  });

  const income = (tx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (tx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const profit = income - expense;
  const ar = (invoices ?? []).reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount || 0)), 0);

  // Trend by month
  const byMonth = new Map<string, { income: number; expense: number }>();
  (tx ?? []).forEach((t) => {
    const m = (t.transaction_date ?? "").slice(0, 7);
    const cur = byMonth.get(m) ?? { income: 0, expense: 0 };
    cur[t.type] += Number(t.amount);
    byMonth.set(m, cur);
  });
  const trend = Array.from(byMonth.entries()).sort().map(([m, v]) => ({ m, income: v.income, expense: v.expense, profit: v.income - v.expense }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
            <p className="text-sm text-muted-foreground">Income, expenses, invoices and payments — all syncing with the dashboard.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setType("expense"); setOpen(true); }}><TrendingDown className="mr-1 h-4 w-4" /> Add expense</Button>
          <Button onClick={() => { setType("income"); setOpen(true); }}><TrendingUp className="mr-1 h-4 w-4" /> Add income</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Income", v: income, tone: "text-success" },
          { l: "Expenses", v: expense, tone: "text-destructive" },
          { l: "Net profit", v: profit, tone: profit >= 0 ? "text-success" : "text-destructive" },
          { l: "Accounts receivable", v: ar, tone: "text-warning" },
        ].map((c) => (
          <Card key={c.l}><CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.l}</div>
            <div className={`mt-1 text-2xl font-bold ${c.tone}`}>${c.v.toLocaleString()}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cash flow</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="income" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        {(["all", "income", "expense"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(tx ?? []).filter((t) => tab === "all" || t.type === tab).map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{t.transaction_date}</td>
                      <td className="px-4 py-3"><Badge variant={t.type === "income" ? "secondary" : "outline"}>{t.type}</Badge></td>
                      <td className="px-4 py-3">{t.category ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.description ?? "—"}</td>
                      <td className={`px-4 py-3 text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "−"}${Number(t.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs text-destructive hover:underline" onClick={async () => {
                          if (!confirm("Delete transaction?")) return;
                          await supabase.from("transactions").delete().eq("id", t.id);
                          qc.invalidateQueries({ queryKey: ["transactions"] });
                        }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {(tx?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No transactions yet.</td></tr>}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>
        ))}
      </Tabs>

      <TxDialog open={open} onClose={() => setOpen(false)} type={type} />
    </div>
  );
}

function TxDialog({ open, onClose, type }: { open: boolean; onClose: () => void; type: "income" | "expense" }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState<Record<string, unknown>>({ transaction_date: format(new Date(), "yyyy-MM-dd") });
  const save = async () => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from("transactions").insert({ ...v, type, company_id: profile.company_id } as never);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success(`${type === "income" ? "Income" : "Expense"} added`);
    setV({ transaction_date: format(new Date(), "yyyy-MM-dd") });
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New {type}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Amount</Label><Input type="number" step="0.01" value={String(v.amount ?? "")} onChange={(e) => setV({ ...v, amount: Number(e.target.value) })} /></div>
          <div><Label>Category</Label>
            <Select value={String(v.category ?? "")} onValueChange={(val) => setV({ ...v, category: val })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(type === "income" ? ["Invoice payment", "Other"] : ["Payroll", "Procurement", "Materials", "Equipment", "Utilities", "Other"]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={String(v.transaction_date ?? "")} onChange={(e) => setV({ ...v, transaction_date: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={String(v.description ?? "")} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Add {type}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
