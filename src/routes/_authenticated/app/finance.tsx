import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/app/finance")({
  component: FinancePage,
});

function FinancePage() {
  const { data } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const [{ data: invoices }, { data: pos }] = await Promise.all([
        supabase.from("invoices").select("amount,status,issue_date"),
        supabase.from("purchase_orders").select("total_amount,status,request_date"),
      ]);
      const revenue = (invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
      const pending = (invoices ?? []).filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
      const expenses = (pos ?? []).reduce((s, p) => s + Number(p.total_amount || 0), 0);
      return { revenue, pending, expenses, profit: revenue - expenses };
    },
  });

  const trend = [
    { m: "Jan", v: 12 }, { m: "Feb", v: 18 }, { m: "Mar", v: 22 }, { m: "Apr", v: 19 }, { m: "May", v: 28 }, { m: "Jun", v: 34 },
  ];

  const cards = [
    { l: "Revenue", v: `$${(data?.revenue ?? 0).toLocaleString()}` },
    { l: "Pending", v: `$${(data?.pending ?? 0).toLocaleString()}` },
    { l: "Expenses", v: `$${(data?.expenses ?? 0).toLocaleString()}` },
    { l: "Profit", v: `$${(data?.profit ?? 0).toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">Revenue, expenses, and profitability.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.l}><CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.l}</div>
            <div className="mt-1 text-2xl font-bold">{c.v}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Cash flow trend</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
