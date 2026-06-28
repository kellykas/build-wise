import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Receipt } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/invoices")({
  component: InvoicesPage,
});

type Inv = { id: string; invoice_number: string; amount: number; paid_amount: number; status: string; issue_date: string; due_date: string };

const fields: Field[] = [
  { key: "invoice_number", label: "Invoice #", required: true },
  { key: "amount", label: "Amount", type: "number", step: "0.01", required: true },
  { key: "paid_amount", label: "Paid", type: "number", step: "0.01" },
  { key: "issue_date", label: "Issue date", type: "date" },
  { key: "due_date", label: "Due date", type: "date" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" },
    { value: "paid", label: "Paid" }, { value: "overdue", label: "Overdue" }, { value: "cancelled", label: "Cancelled" },
  ] },
  { key: "notes", label: "Notes", type: "textarea" },
];

function InvoicesPage() {
  const [editing, setEditing] = useState<Inv | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [paying, setPaying] = useState<Inv | null>(null);

  const columns: Column<Inv>[] = [
    { key: "invoice_number", label: "Invoice", render: (r) => <span className="font-medium">{r.invoice_number}</span> },
    { key: "amount", label: "Amount", render: (r) => `$${Number(r.amount).toLocaleString()}` },
    { key: "paid_amount", label: "Paid", render: (r) => `$${Number(r.paid_amount || 0).toLocaleString()}` },
    { key: "due_date", label: "Due" },
    { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.status}</Badge> },
    { key: "_actions", label: "", render: (r) => (
      <div className="text-right" onClick={(e) => e.stopPropagation()}>
        {r.status !== "paid" && <Button size="sm" variant="outline" onClick={() => setPaying(r)}>Record payment</Button>}
      </div>
    )},
  ];

  return (
    <>
      <ModulePage<Inv>
        title="Invoices"
        description="Issue, track and collect payments. Recording payment posts income to Finance."
        table="invoices"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Receipt className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="invoices" title="invoice" fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
      <PaymentDialog inv={paying} onClose={() => setPaying(null)} />
    </>
  );
}

function PaymentDialog({ inv, onClose }: { inv: Inv | null; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const { profile } = useAuth();
  const qc = useQueryClient();
  const save = async () => {
    if (!inv) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    const newPaid = Number(inv.paid_amount || 0) + amt;
    const status = newPaid >= Number(inv.amount) ? "paid" : "sent";
    await supabase.from("invoices").update({ paid_amount: newPaid, status }).eq("id", inv.id);
    if (profile?.company_id) {
      await supabase.from("transactions").insert({
        company_id: profile.company_id, type: "income", category: "Invoice payment",
        amount: amt, description: `Payment for ${inv.invoice_number}`, invoice_id: inv.id,
      });
    }
    qc.invalidateQueries({ queryKey: ["module", "invoices"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Payment recorded · income posted");
    setAmount(""); onClose();
  };
  return (
    <Dialog open={!!inv} onOpenChange={(o) => !o && (setAmount(""), onClose())}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment · {inv?.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Outstanding: ${(Number(inv?.amount || 0) - Number(inv?.paid_amount || 0)).toLocaleString()}</div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
