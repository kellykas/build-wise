import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileSignature, Receipt, CalendarClock, CreditCard, CheckCircle2, XCircle,
  Clock, Plus, Wallet, History,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { StripePaymentForm, PaymentSuccess } from "@/components/app/StripePaymentForm";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { recordAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/app/client-space")({
  head: () => ({
    meta: [
      { title: "Espace client — Devis, factures et rendez-vous" },
      { name: "description", content: "Consultez vos devis, suivez vos factures, réglez vos paiements et planifiez vos rendez-vous." },
    ],
  }),
  component: ClientSpacePage,
});

type Client = { id: string; name: string; company_id: string };
type Quote = {
  id: string; quote_number: string | null; title: string; description: string | null;
  amount: number; tax: number; total: number; currency: string; status: string;
  issue_date: string | null; valid_until: string | null; notes: string | null;
  client_response_note: string | null; project_id: string | null;
};
type QuoteItem = { id: string; description: string; unit: string | null; quantity: number; unit_price: number; position: number };
type Invoice = {
  id: string; invoice_number: string | null; amount: number; paid_amount: number | null;
  status: string; issue_date: string | null; due_date: string | null; client_id: string | null;
};
type Payment = { id: string; invoice_id: string; amount: number; method: string; reference: string | null; note: string | null; paid_at: string };
type Appointment = {
  id: string; title: string; description: string | null; scheduled_at: string;
  duration_minutes: number; location: string | null; status: string; staff_note: string | null;
};

const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function quoteTone(status: string) {
  if (status === "accepted") return "default";
  if (status === "rejected" || status === "expired") return "destructive";
  return "secondary";
}

function ClientSpacePage() {
  const { t } = useTranslation();
  const { profile, user, isAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const isClient = hasRole("client");
  const isStaff = isAdmin || hasRole("project_manager", "director", "accountant", "company_owner", "super_admin");
  const [selectedClient, setSelectedClient] = useState("");
  const [tab, setTab] = useState("quotes");
  const [quoteDetail, setQuoteDetail] = useState<Quote | null>(null);
  const [payOnline, setPayOnline] = useState<Invoice | null>(null);
  const [declare, setDeclare] = useState<Invoice | null>(null);
  const [rdvOpen, setRdvOpen] = useState(false);

  // Which client record are we viewing?
  const { data: myClient } = useQuery({
    queryKey: ["cs-my-client", profile?.id],
    enabled: !!profile?.id && isClient,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, company_id").eq("user_id", profile!.id).maybeSingle();
      return (data ?? null) as Client | null;
    },
  });

  const { data: allClients } = useQuery({
    queryKey: ["cs-clients"],
    enabled: isStaff && !isClient,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, company_id").order("name");
      return (data ?? []) as Client[];
    },
  });

  const clientId = isClient ? myClient?.id ?? "" : selectedClient || allClients?.[0]?.id || "";
  const clientName = isClient ? myClient?.name : allClients?.find((c) => c.id === clientId)?.name;

  const { data: quotes } = useQuery({
    queryKey: ["cs-quotes", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").eq("client_id", clientId).order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  const { data: quoteItems } = useQuery({
    queryKey: ["cs-quote-items", quoteDetail?.id],
    enabled: !!quoteDetail?.id,
    queryFn: async () => {
      const { data } = await supabase.from("quote_items").select("*").eq("quote_id", quoteDetail!.id).order("position");
      return (data ?? []) as QuoteItem[];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["cs-invoices", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("id, invoice_number, amount, paid_amount, status, issue_date, due_date, client_id").eq("client_id", clientId).order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["cs-payments", clientId, invoices?.length],
    enabled: !!invoices?.length,
    queryFn: async () => {
      const { data } = await supabase.from("invoice_payments").select("*").in("invoice_id", (invoices ?? []).map((i) => i.id)).order("paid_at", { ascending: false });
      return (data ?? []) as Payment[];
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["cs-appointments", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("client_id", clientId).order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });

  const pending = useMemo(() => (quotes ?? []).filter((q) => q.status === "sent" || q.status === "under_review"), [quotes]);
  const outstanding = useMemo(
    () => (invoices ?? []).reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0)), 0),
    [invoices],
  );
  const paidTotal = useMemo(() => (invoices ?? []).reduce((s, i) => s + Number(i.paid_amount || 0), 0), [invoices]);
  const nextRdv = useMemo(
    () => (appointments ?? []).find((a) => new Date(a.scheduled_at) >= new Date() && a.status !== "cancelled"),
    [appointments],
  );
  const invoiceLabel = (id: string) => invoices?.find((i) => i.id === id)?.invoice_number ?? "—";

  const respondQuote = async (quote: Quote, accepted: boolean) => {
    const { error } = await supabase
      .from("quotes")
      .update({ status: accepted ? "accepted" : "rejected", responded_at: new Date().toISOString() })
      .eq("id", quote.id);
    if (error) return toast.error(error.message);
    await recordAudit({ action: accepted ? "quote.accepted" : "quote.rejected", entity_type: "quote", entity_id: quote.id, metadata: { total: quote.total } });
    toast.success(accepted ? t("d.espace.quote_accepted") : t("d.espace.quote_rejected"));
    setQuoteDetail(null);
    qc.invalidateQueries({ queryKey: ["cs-quotes", clientId] });
  };

  if (isClient && !myClient) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">{t("d.espace.no_client_title")}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("d.espace.no_client_desc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{t("d.espace.title")}</h1>
            <p className="truncate text-sm text-muted-foreground">{clientName ?? t("d.espace.subtitle")}</p>
          </div>
        </div>
        {!isClient && (allClients?.length ?? 0) > 0 && (
          <Select value={clientId} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(allClients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<FileSignature className="h-5 w-5" />} tone="bg-primary/10 text-primary" value={String(pending.length)} label={t("d.espace.pending_quotes")} />
        <StatCard icon={<Receipt className="h-5 w-5" />} tone="bg-orange-500/10 text-orange-600" value={money(outstanding)} label={t("d.espace.outstanding")} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-green-500/10 text-green-600" value={money(paidTotal)} label={t("d.espace.paid_total")} />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          tone="bg-blue-500/10 text-blue-600"
          value={nextRdv ? new Date(nextRdv.scheduled_at).toLocaleDateString() : "—"}
          label={t("d.espace.next_appointment")}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="mb-4 w-max">
            <TabsTrigger value="quotes">{t("d.espace.quotes")} ({quotes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="pending">{t("d.espace.in_progress")} ({pending.length})</TabsTrigger>
            <TabsTrigger value="invoices">{t("d.espace.invoices")} ({invoices?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="payments">{t("d.espace.payments")} ({payments?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="appointments">{t("d.espace.appointments")} ({appointments?.length ?? 0})</TabsTrigger>
          </TabsList>
        </div>

        {/* Quotes */}
        <TabsContent value="quotes">
          <QuoteList list={quotes ?? []} onOpen={setQuoteDetail} emptyLabel={t("d.espace.no_quotes")} />
        </TabsContent>
        <TabsContent value="pending">
          <QuoteList list={pending} onOpen={setQuoteDetail} emptyLabel={t("d.espace.no_pending_quotes")} />
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> {t("d.espace.invoices")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(invoices ?? []).length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t("d.espace.no_invoices")}</p>
              )}
              {(invoices ?? []).map((inv) => {
                const due = Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0));
                return (
                  <div key={inv.id} className="rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{inv.invoice_number ?? "—"}</span>
                          <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>{inv.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "—"}
                          {inv.due_date && ` · ${t("d.espace.due")} ${new Date(inv.due_date).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <div className="text-right">
                          <div className="font-semibold">{money(inv.amount)}</div>
                          <div className="text-xs text-muted-foreground">{t("d.espace.remaining")}: {money(due)}</div>
                        </div>
                        {due > 0 && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setPayOnline(inv)}>
                              <CreditCard className="mr-1.5 h-3.5 w-3.5" />{t("d.espace.pay_online")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeclare(inv)}>{t("d.espace.declare_payment")}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment history */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> {t("d.espace.payment_history")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(payments ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t("d.espace.no_payments")}</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {(payments ?? []).map((p) => (
                      <div key={p.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{invoiceLabel(p.invoice_id)}</span>
                          <span className="font-semibold text-green-600">{money(p.amount)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(p.paid_at).toLocaleString()} · {p.method}
                          {p.reference && ` · ${p.reference}`}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="pb-2 pr-4">{t("d.espace.date")}</th>
                          <th className="pb-2 pr-4">{t("d.espace.invoice")}</th>
                          <th className="pb-2 pr-4">{t("d.espace.method")}</th>
                          <th className="pb-2 pr-4">{t("d.espace.reference")}</th>
                          <th className="pb-2 text-right">{t("d.espace.amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payments ?? []).map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
                            <td className="py-3 pr-4 font-medium">{invoiceLabel(p.invoice_id)}</td>
                            <td className="py-3 pr-4 capitalize">{p.method}</td>
                            <td className="py-3 pr-4 text-muted-foreground">{p.reference ?? "—"}</td>
                            <td className="py-3 text-right font-semibold">{money(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> {t("d.espace.appointments")}</CardTitle>
                <Button size="sm" onClick={() => setRdvOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{t("d.espace.request_appointment")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(appointments ?? []).length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t("d.espace.no_appointments")}</p>
              )}
              {(appointments ?? []).map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant={a.status === "confirmed" ? "default" : a.status === "cancelled" ? "destructive" : "secondary"}>
                        {t(`d.espace.status_${a.status}`)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span><Clock className="mr-1 inline h-3 w-3" />{new Date(a.scheduled_at).toLocaleString()}</span>
                      <span>{a.duration_minutes} min</span>
                      {a.location && <span>📍 {a.location}</span>}
                    </div>
                    {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                    {a.staff_note && <p className="mt-1 text-xs text-primary">{a.staff_note}</p>}
                  </div>
                  {a.status !== "cancelled" && a.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={async () => {
                        const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", a.id);
                        if (error) return toast.error(error.message);
                        toast.success(t("d.espace.appointment_cancelled"));
                        qc.invalidateQueries({ queryKey: ["cs-appointments", clientId] });
                      }}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />{t("d.espace.cancel")}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote detail */}
      <Dialog open={!!quoteDetail} onOpenChange={(o) => !o && setQuoteDetail(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6">{quoteDetail?.quote_number ? `${quoteDetail.quote_number} · ` : ""}{quoteDetail?.title}</DialogTitle>
            <DialogDescription>
              {quoteDetail?.issue_date && new Date(quoteDetail.issue_date).toLocaleDateString()}
              {quoteDetail?.valid_until && ` · ${t("d.espace.valid_until")} ${new Date(quoteDetail.valid_until).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>
          {quoteDetail?.description && <p className="text-sm text-muted-foreground">{quoteDetail.description}</p>}
          {(quoteItems ?? []).length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("d.espace.designation")}</th>
                    <th className="px-3 py-2 text-right">{t("d.espace.qty")}</th>
                    <th className="px-3 py-2 text-right">{t("d.espace.unit_price")}</th>
                    <th className="px-3 py-2 text-right">{t("d.espace.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(quoteItems ?? []).map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{it.description}</td>
                      <td className="px-3 py-2 text-right">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
                      <td className="px-3 py-2 text-right">{money(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{money(it.quantity * it.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("d.espace.subtotal")}</span><span>{money(quoteDetail?.amount ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("d.espace.tax")}</span><span>{money(quoteDetail?.tax ?? 0)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>{t("d.espace.total")}</span><span>{money(quoteDetail?.total ?? 0)}</span></div>
          </div>
          {isClient && quoteDetail && (quoteDetail.status === "sent" || quoteDetail.status === "under_review") && (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => respondQuote(quoteDetail, false)}>
                <XCircle className="mr-1.5 h-4 w-4" />{t("d.espace.reject")}
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => respondQuote(quoteDetail, true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />{t("d.espace.accept")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <DeclarePaymentDialog
        invoice={declare}
        companyId={profile?.company_id ?? null}
        onClose={() => setDeclare(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["cs-payments", clientId] });
          qc.invalidateQueries({ queryKey: ["cs-invoices", clientId] });
        }}
      />

      <OnlinePayDialog
        invoice={payOnline}
        companyId={profile?.company_id ?? null}
        userId={user?.id ?? null}
        onClose={() => setPayOnline(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["cs-payments", clientId] });
          qc.invalidateQueries({ queryKey: ["cs-invoices", clientId] });
        }}
      />

      <RequestAppointmentDialog
        open={rdvOpen}
        onOpenChange={setRdvOpen}
        clientId={clientId}
        companyId={(isClient ? myClient?.company_id : allClients?.find((c) => c.id === clientId)?.company_id) ?? profile?.company_id ?? null}
        userId={user?.id ?? null}
        onDone={() => qc.invalidateQueries({ queryKey: ["cs-appointments", clientId] })}
      />
    </div>
  );
}

function StatCard({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 ${tone}`}>{icon}</div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold sm:text-2xl">{value}</div>
            <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteList({ list, onOpen, emptyLabel }: { list: Quote[]; onOpen: (q: Quote) => void; emptyLabel: string }) {
  const { t } = useTranslation();
  if (list.length === 0) {
    return (
      <Card><CardContent className="p-6">
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      </CardContent></Card>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((q) => (
        <button key={q.id} type="button" onClick={() => onOpen(q)} className="rounded-lg border p-4 text-left transition hover:border-primary hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{q.title}</div>
              <div className="text-xs text-muted-foreground">{q.quote_number ?? "—"} · {q.issue_date ? new Date(q.issue_date).toLocaleDateString() : "—"}</div>
            </div>
            <Badge variant={quoteTone(q.status)} className="shrink-0">{t(`d.espace.status_${q.status}`)}</Badge>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-lg font-semibold">{money(q.total)}</span>
            {q.valid_until && <span className="text-xs text-muted-foreground">{t("d.espace.valid_until")} {new Date(q.valid_until).toLocaleDateString()}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

function DeclarePaymentDialog({
  invoice, companyId, onClose, onDone,
}: { invoice: Invoice | null; companyId: string | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!invoice || !companyId) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error(t("d.espace.enter_amount"));
    setSaving(true);
    const { error } = await supabase.from("invoice_payments").insert({
      company_id: companyId, invoice_id: invoice.id, amount: amt, method, reference: reference || null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    await recordAudit({ action: "invoice.payment.declared", entity_type: "invoice", entity_id: invoice.id, metadata: { amount: amt, method } });
    toast.success(t("d.espace.payment_declared"));
    setAmount(""); setReference("");
    onDone(); onClose();
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>{t("d.espace.declare_payment")} · {invoice?.invoice_number}</DialogTitle>
          <DialogDescription>{t("d.espace.declare_hint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("d.espace.amount")}</Label>
            <Input type="number" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>{t("d.espace.method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">{t("d.espace.bank_transfer")}</SelectItem>
                <SelectItem value="cash">{t("d.espace.cash")}</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cheque">{t("d.espace.cheque")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("d.espace.reference")}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="w-full sm:w-auto">{t("d.espace.send")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnlinePayDialog({
  invoice, companyId, userId, onClose, onDone,
}: { invoice: Invoice | null; companyId: string | null; userId: string | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { clientSecret, loading, error, createPaymentIntent, reset } = useStripePayment();
  const [step, setStep] = useState<"form" | "success">("form");
  const due = invoice ? Number(invoice.amount) - Number(invoice.paid_amount || 0) : 0;

  const close = () => { reset(); setStep("form"); onClose(); };

  const onSuccess = async () => {
    if (!invoice) return;
    const newPaid = Number(invoice.paid_amount || 0) + due;
    await supabase.from("invoices").update({ paid_amount: newPaid, status: "paid" }).eq("id", invoice.id);
    if (companyId) {
      await supabase.from("invoice_payments").insert({
        company_id: companyId, invoice_id: invoice.id, amount: due, method: "stripe", recorded_by: userId,
      } as never);
    }
    onDone();
    setStep("success");
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && close()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        {step === "success" ? (
          <PaymentSuccess onDone={close} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t("d.espace.pay_online")} {invoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{t("d.espace.amount_due")}</div>
                <div className="text-2xl font-bold">{money(due)}</div>
              </div>
              {clientSecret ? (
                <StripePaymentForm clientSecret={clientSecret} onSuccess={onSuccess} onError={(m) => toast.error(m)} />
              ) : (
                <div className="space-y-3">
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button className="w-full" disabled={loading} onClick={() => invoice && createPaymentIntent(due, invoice.invoice_number ?? invoice.id)}>
                    <CreditCard className="mr-2 h-4 w-4" />{loading ? t("d.espace.setting_up") : t("d.espace.continue_payment")}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RequestAppointmentDialog({
  open, onOpenChange, clientId, companyId, userId, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; clientId: string;
  companyId: string | null; userId: string | null; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!clientId || !companyId) return toast.error(t("d.espace.no_client_title"));
    if (!title.trim() || !date) return toast.error(t("d.espace.fill_required"));
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      company_id: companyId, client_id: clientId, title: title.trim(),
      description: description || null, location: location || null,
      scheduled_at: new Date(`${date}T${time}`).toISOString(),
      status: "requested", requested_by: userId,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("d.espace.appointment_requested"));
    setTitle(""); setDate(""); setLocation(""); setDescription("");
    onDone(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>{t("d.espace.request_appointment")}</DialogTitle>
          <DialogDescription>{t("d.espace.request_hint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("d.espace.subject")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("d.espace.date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>{t("d.espace.time")}</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div><Label>{t("d.espace.location")}</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><Label>{t("d.espace.note")}</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="w-full sm:w-auto">{t("d.espace.send_request")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
