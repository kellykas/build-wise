import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Printer, Wallet, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { StatusBadge, requisitionStatusMeta, lineStatusMeta } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/requisitions/$id")({
  component: RequisitionDetail,
});

function RequisitionDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [disbOpen, setDisbOpen] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ["requisition", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisitions")
        .select("*, projects(name), demandeur:profiles!requisitions_demandeur_id_fkey(full_name,email), tarificateur:profiles!requisitions_tarificateur_id_fkey(full_name,email), validateur:profiles!requisitions_validateur_id_fkey(full_name,email), caissier:profiles!requisitions_caissier_id_fkey(full_name,email)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lines } = useQuery({
    queryKey: ["requisition-lines", id],
    queryFn: async () => (await supabase.from("requisition_lines").select("*").eq("requisition_id", id).order("position")).data ?? [],
  });

  const { data: disbursements } = useQuery({
    queryKey: ["requisition-disb", id],
    queryFn: async () => (await supabase.from("requisition_disbursements").select("*, paid:profiles!requisition_disbursements_paid_by_fkey(full_name)").eq("requisition_id", id).order("paid_at", { ascending: false })).data ?? [],
  });

  const updateLine = useMutation({
    mutationFn: async ({ lineId, patch }: { lineId: string; patch: any }) => {
      const { error } = await supabase.from("requisition_lines").update(patch).eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisition-lines", id] });
      qc.invalidateQueries({ queryKey: ["requisition", id] });
    },
  });

  const updateReqStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("requisitions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requisition", id] }),
  });

  if (isLoading || !req) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  const allDisbursed = (lines ?? []).length > 0 && lines!.every((l: any) => l.status === "disbursed");
  const allValidated = (lines ?? []).length > 0 && lines!.every((l: any) => ["validated","disbursed"].includes(l.status));
  const meta = requisitionStatusMeta[req.status] ?? { label: req.status, tone: "neutral" as const };

  const banner = allDisbursed
    ? { tone: "success" as const, icon: CheckCircle2, text: "Cet état de besoin a été complètement appuré." }
    : !allValidated
    ? { tone: "warning" as const, icon: AlertTriangle, text: "Cet état de besoin n'est pas encore validé par la personne attitrée." }
    : { tone: "danger" as const, icon: AlertTriangle, text: "Cet état de besoin n'est pas appuré dans sa totalité." };

  const totalAmount = (lines ?? []).reduce((s, l: any) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/requisitions"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{req.title}</h1>
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{req.reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDisbOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Sortie des fonds</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 print:block">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2 print:col-span-3">
          <Card className={`border-l-4 ${banner.tone === "success" ? "border-l-success" : banner.tone === "warning" ? "border-l-warning" : "border-l-destructive"}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <banner.icon className={`h-5 w-5 ${banner.tone === "success" ? "text-success" : banner.tone === "warning" ? "text-warning" : "text-destructive"}`} />
              <div className="text-sm font-medium">{banner.text}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Besoins</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-3 w-3" /> Ajouter un besoin</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium w-10">#</th>
                    <th className="px-4 py-2 font-medium">Besoin</th>
                    <th className="px-4 py-2 font-medium">Unité</th>
                    <th className="px-4 py-2 font-medium text-right">Quantité</th>
                    <th className="px-4 py-2 font-medium text-right">P.U.</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                    <th className="px-4 py-2 font-medium">État</th>
                    <th className="px-4 py-2 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {(lines ?? []).length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">Aucun besoin. Cliquez sur "Ajouter un besoin".</td></tr>
                  ) : lines!.map((l: any, i: number) => {
                    const lm = lineStatusMeta[l.status] ?? { label: l.status, tone: "neutral" as const };
                    return (
                      <tr key={l.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}.</td>
                        <td className="px-4 py-2 font-medium">{l.besoin}</td>
                        <td className="px-4 py-2">{l.unit ?? "—"}</td>
                        <td className="px-4 py-2 text-right">{l.quantity}</td>
                        <td className="px-4 py-2 text-right">{l.unit_price ? `$${Number(l.unit_price).toFixed(2)}` : "—"}</td>
                        <td className="px-4 py-2 text-right font-medium">{l.unit_price ? `$${(Number(l.quantity) * Number(l.unit_price)).toFixed(2)}` : "—"}</td>
                        <td className="px-4 py-2"><StatusBadge tone={lm.tone}>{lm.label}</StatusBadge></td>
                        <td className="px-4 py-2 print:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="sm" variant="secondary" className="h-7">Action <ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                const p = prompt("Prix unitaire (USD)", l.unit_price ?? "");
                                if (p !== null) updateLine.mutate({ lineId: l.id, patch: { unit_price: Number(p), status: "priced" } });
                              }}>Tarifer</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLine.mutate({ lineId: l.id, patch: { status: "validated" } })}>Valider</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLine.mutate({ lineId: l.id, patch: { status: "disbursed" } })}>Marquer décaissé</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => updateLine.mutate({ lineId: l.id, patch: { status: "rejected" } })}>Rejeter</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {(lines ?? []).length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/40 font-medium">
                      <td colSpan={5} className="px-4 py-2 text-right">Total</td>
                      <td className="px-4 py-2 text-right">${totalAmount.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>

          {/* Workflow actions */}
          <Card className="print:hidden">
            <CardHeader><CardTitle className="text-base">Circuit de validation</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => updateReqStatus.mutate("pending_pricing")}>Soumettre au tarificateur</Button>
              <Button size="sm" variant="outline" onClick={() => updateReqStatus.mutate("in_progress")}>Marquer en cours</Button>
              <Button size="sm" variant="outline" onClick={() => updateReqStatus.mutate("closed")}>Clôturer</Button>
              <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => updateReqStatus.mutate("rejected")}>Rejeter</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Historique de décaissement</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Opération</th>
                    <th className="px-4 py-2 font-medium">Besoin</th>
                    <th className="px-4 py-2 font-medium text-right">Quantité</th>
                    <th className="px-4 py-2 font-medium text-right">Montant</th>
                    <th className="px-4 py-2 font-medium">Bénéficiaire</th>
                    <th className="px-4 py-2 font-medium">Décaisseur</th>
                  </tr>
                </thead>
                <tbody>
                  {(disbursements ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">Aucun décaissement.</td></tr>
                  ) : disbursements!.map((d: any) => (
                    <tr key={d.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 text-muted-foreground">{new Date(d.paid_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{d.operation ?? "Sortie"}</td>
                      <td className="px-4 py-2">{d.besoin ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{d.quantity ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium">${Number(d.amount).toFixed(2)}</td>
                      <td className="px-4 py-2">{d.beneficiary ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{d.paid?.full_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Voucher preview */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-6">
            <div className="border-b border-border pb-4 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">BuildFlow</div>
              <div className="mt-1 text-2xl font-bold">État de besoin</div>
            </div>
            <dl className="mt-4 divide-y divide-border text-sm">
              {[
                ["Projet", req.projects?.name ?? "—"],
                ["Étape", req.stage ?? "—"],
                ["Date", new Date(req.created_at).toLocaleDateString()],
                ["Classeur", req.classeur ?? "—"],
                ["Référence", req.reference],
                ["Demandeur", req.demandeur?.full_name ?? "—"],
                ["Tarificateur", req.tarificateur?.full_name ?? "—"],
                ["Validateur", req.validateur?.full_name ?? "—"],
                ["Caisse", req.caissier?.full_name ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <AddLineDialog open={addOpen} onOpenChange={setAddOpen} reqId={id} companyId={req.company_id} />
      <DisbursementDialog open={disbOpen} onOpenChange={setDisbOpen} reqId={id} companyId={req.company_id} userId={user?.id} lines={lines ?? []} />
    </div>
  );
}

function AddLineDialog({ open, onOpenChange, reqId, companyId }: { open: boolean; onOpenChange: (v: boolean) => void; reqId: string; companyId: string }) {
  const qc = useQueryClient();
  const [besoin, setBesoin] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("1");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("requisition_lines").insert({
        company_id: companyId, requisition_id: reqId, besoin, unit: unit || null, quantity: Number(quantity),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Besoin ajouté");
      qc.invalidateQueries({ queryKey: ["requisition-lines", reqId] });
      onOpenChange(false);
      setBesoin(""); setUnit(""); setQuantity("1");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un besoin</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2"><Label>Besoin *</Label><Input value={besoin} onChange={(e) => setBesoin(e.target.value)} placeholder="ex. Mastic" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Unité</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Kg, pièce, Forfait…" /></div>
            <div className="grid gap-2"><Label>Quantité</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => m.mutate()} disabled={!besoin || m.isPending}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisbursementDialog({ open, onOpenChange, reqId, companyId, userId, lines }: any) {
  const qc = useQueryClient();
  const [lineId, setLineId] = useState("");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const line = lines.find((l: any) => l.id === lineId);
      const { error } = await supabase.from("requisition_disbursements").insert({
        company_id: companyId, requisition_id: reqId, line_id: lineId || null,
        besoin: line?.besoin, quantity: line?.quantity, amount: Number(amount),
        beneficiary, paid_by: userId, operation: "Sortie de caisse",
      });
      if (error) throw error;
      if (lineId) await supabase.from("requisition_lines").update({ status: "disbursed" }).eq("id", lineId);
    },
    onSuccess: () => {
      toast.success("Sortie enregistrée");
      qc.invalidateQueries({ queryKey: ["requisition-disb", reqId] });
      qc.invalidateQueries({ queryKey: ["requisition-lines", reqId] });
      onOpenChange(false);
      setLineId(""); setAmount(""); setBeneficiary("");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sortie des fonds</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Besoin lié</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={lineId} onChange={(e) => setLineId(e.target.value)}>
              <option value="">— Aucun —</option>
              {lines.map((l: any) => <option key={l.id} value={l.id}>{l.besoin} ({l.quantity} {l.unit ?? ""})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Montant (USD)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Bénéficiaire</Label><Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => m.mutate()} disabled={!amount || m.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
