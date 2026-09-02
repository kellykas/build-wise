import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { ShoppingCart, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/procurement")({
  component: ProcurementPage,
});

type PO = { id: string; po_number: string; supplier_id: string | null; total_amount: number; status: string; request_date: string; approved_at: string | null; rejection_reason: string | null };
type Supplier = { id: string; name: string };

function ProcurementPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PO | null>(null);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-pick"],
    queryFn: async () => ((await supabase.from("suppliers").select("id,name")).data ?? []) as Supplier[],
  });

  const setStatus = async (id: string, status: string, reason?: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === "approved") { patch.approved_by = profile?.id; patch.approved_at = new Date().toISOString(); }
    if (status === "rejected") { patch.rejection_reason = reason ?? "Rejected"; }
    const { error } = await supabase.from("purchase_orders").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      const po = (await supabase.from("purchase_orders").select("total_amount, po_number, project_id, company_id").eq("id", id).single()).data;
      if (po) await supabase.from("transactions").insert({
        company_id: po.company_id, type: "expense", category: "Procurement",
        amount: Number(po.total_amount ?? 0), description: `PO ${po.po_number}`, purchase_order_id: id, project_id: po.project_id,
      });
    }
    qc.invalidateQueries({ queryKey: ["module", "purchase_orders"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success(`Status: ${status}`);
  };

  const columns: Column<PO>[] = [
    { key: "po_number", label: t("d.procurement.po_number"), render: (r: PO) => <span className="font-medium">{r.po_number}</span> },
    { key: "supplier_id", label: t("d.procurement.supplier"), render: (r: PO) => suppliers?.find((s) => s.id === r.supplier_id)?.name ?? "—" },
    { key: "total_amount", label: t("d.procurement.total"), render: (r: PO) => `$${Number(r.total_amount).toLocaleString()}` },
    { key: "request_date", label: t("d.procurement.requested") },
    { key: "status", label: t("d.procurement.status"), render: (r: PO) => <Badge variant="secondary">{r.status}</Badge> },
    { key: "_actions", label: t("d.procurement.action"), render: (r: PO) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        {r.status === "pending" && (
          <>
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "approved")}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => { const reason = prompt("Rejection reason?"); if (reason) setStatus(r.id, "rejected", reason); }}><X className="h-3.5 w-3.5" /></Button>
          </>
        )}
        {r.status === "approved" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "received")}>{t("d.procurement.mark_received")}</Button>}
      </div>
    )},
  ];

  return (
    <>
      <ModulePage<PO>
        title={t("d.procurement.title")}
        description={t("d.procurement.description")}
        table="purchase_orders"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><ShoppingCart className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <PODialog open={open || !!editing} onClose={() => { setOpen(false); setEditing(null); }} row={editing} suppliers={suppliers ?? []} />
    </>
  );
}

function PODialog({ open, onClose, row, suppliers }: { open: boolean; onClose: () => void; row: PO | null; suppliers: Supplier[] }) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState<Record<string, unknown>>({});
  // initial fill
  if (open && row && Object.keys(v).length === 0) setV({ po_number: row.po_number, supplier_id: row.supplier_id, total_amount: row.total_amount, status: row.status, request_date: row.request_date });

  const save = async () => {
    const payload = { ...v };
    if (!row) {
      payload.company_id = profile?.company_id;
      if (!payload.status) payload.status = "pending";
    }
    const q = row ? supabase.from("purchase_orders").update(payload as never).eq("id", row.id) : supabase.from("purchase_orders").insert(payload as never);
    const { error } = await q;
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["module", "purchase_orders"] });
    toast.success("Saved");
    setV({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setV({}); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? t("d.procurement.edit_po") : t("d.procurement.new_po")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>{t("d.procurement.po_number_label")}</Label><Input value={String(v.po_number ?? "")} onChange={(e) => setV({ ...v, po_number: e.target.value })} /></div>
          <div><Label>{t("d.procurement.supplier")}</Label>
            <Select value={String(v.supplier_id ?? "")} onValueChange={(val) => setV({ ...v, supplier_id: val })}>
              <SelectTrigger><SelectValue placeholder={t("d.procurement.select_supplier")} /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{t("d.procurement.total_amount")}</Label><Input type="number" value={String(v.total_amount ?? "")} onChange={(e) => setV({ ...v, total_amount: Number(e.target.value) })} /></div>
          <div><Label>{t("d.procurement.request_date")}</Label><Input type="date" value={String(v.request_date ?? "")} onChange={(e) => setV({ ...v, request_date: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>{t("d.common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
