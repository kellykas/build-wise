import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Receipt, CreditCard } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  StripePaymentForm,
  PaymentSuccess,
} from "@/components/app/StripePaymentForm";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { useManualInvoiceReminders } from "@/hooks/use-invoice-reminders";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/invoices")({
  component: InvoicesPage,
});

type Inv = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
};

function useInvoiceFields() {
  const { t } = useTranslation();
  return [
    { key: "invoice_number", label: t("d.invoices.invoice_number"), required: true },
    { key: "amount", label: t("d.common.amount"), type: "number" as const, step: "0.01", required: true },
    { key: "paid_amount", label: t("d.invoices.paid_amount"), type: "number" as const, step: "0.01" },
    { key: "issue_date", label: t("d.invoices.issue_date"), type: "date" as const },
    { key: "due_date", label: t("d.invoices.due_date"), type: "date" as const },
    { key: "status", label: t("d.common.status"), type: "select" as const, options: [
      { value: "draft", label: t("d.invoices.draft") }, { value: "sent", label: t("d.invoices.sent") },
      { value: "paid", label: t("d.common.paid") }, { value: "overdue", label: t("d.invoices.overdue") },
      { value: "cancelled", label: t("d.invoices.cancelled") },
    ] },
    { key: "notes", label: t("d.invoices.notes"), type: "textarea" as const },
  ];
}

function InvoicesPage() {
  const { t } = useTranslation();
  const fields = useInvoiceFields();
  const [editing, setEditing] = useState<Inv | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [paying, setPaying] = useState<Inv | null>(null);
  const [payingOnline, setPayingOnline] = useState<Inv | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { sendReminders } = useManualInvoiceReminders();

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const result = await sendReminders();
      if (result.sent > 0) {
        toast.success(`${result.sent} reminder(s) sent successfully`);
      } else {
        toast.info("No overdue invoices to remind about");
      }
    } catch {
      toast.error("Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const columns: Column<Inv>[] = [
    {
      key: "invoice_number",
      label: t("d.invoices.invoice"),
      render: (r: Inv) => (
        <span className="font-medium">{r.invoice_number}</span>
      ),
    },
    {
      key: "amount",
      label: t("d.common.amount"),
      render: (r: Inv) => `$${Number(r.amount).toLocaleString()}`,
    },
    {
      key: "paid_amount",
      label: t("d.common.paid"),
      render: (r: Inv) => `$${Number(r.paid_amount || 0).toLocaleString()}`,
    },
    { key: "due_date", label: t("d.invoices.due") },
    {
      key: "status",
      label: t("d.common.status"),
      render: (r: Inv) => <Badge variant="secondary">{r.status}</Badge>,
    },
    {
      key: "_actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {r.status !== "paid" && (
            <>
              <Button
                size="sm"
                onClick={() => setPayingOnline(r)}
                className="bg-primary"
              >
                <CreditCard className="mr-1 h-3 w-3" /> {t("d.invoices.pay_online")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaying(r)}
              >
                {t("d.invoices.record")}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <ModulePage<Inv>
        title={t("d.invoices.title")}
        description={t("d.invoices.description")}
        table="invoices"
        columns={columns}
        icon={
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendReminders}
            disabled={sendingReminders}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {sendingReminders ? t("d.invoices.sending") : t("d.invoices.send_reminders")}
          </Button>
        }
        onNew={() => {
          setEditing(null);
          setNewOpen(true);
        }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setNewOpen(false);
            setEditing(null);
          }
        }}
        table="invoices"
        title={t("d.invoices.invoice")}
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
      {/* Manual payment dialog */}
      <PaymentDialog inv={paying} onClose={() => setPaying(null)} />
      {/* Online payment dialog */}
      <OnlinePaymentDialog
        inv={payingOnline}
        onClose={() => setPayingOnline(null)}
      />
    </>
  );
}

function PaymentDialog({
  inv,
  onClose,
}: {
  inv: Inv | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const { profile } = useAuth();
  const qc = useQueryClient();
  const save = async () => {
    if (!inv) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    const newPaid = Number(inv.paid_amount || 0) + amt;
    const status: "paid" | "pending" =
      newPaid >= Number(inv.amount) ? "paid" : "pending";
    await supabase
      .from("invoices")
      .update({ paid_amount: newPaid, status })
      .eq("id", inv.id);
    if (profile?.company_id) {
      await supabase.from("transactions").insert({
        company_id: profile.company_id,
        type: "income",
        category: "Invoice payment",
        amount: amt,
        description: `Payment for ${inv.invoice_number}`,
        invoice_id: inv.id,
      });
      await supabase.from("invoice_payments").insert({
        company_id: profile.company_id,
        invoice_id: inv.id,
        amount: amt,
        method: "manual",
        recorded_by: profile.id,
      } as never);
    }
    qc.invalidateQueries({ queryKey: ["module", "invoices"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["invoice-payments"] });
    toast.success("Payment recorded · income posted");
    setAmount("");
    onClose();
  };
  return (
    <Dialog open={!!inv} onOpenChange={(o) => !o && (setAmount(""), onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("d.invoices.record_payment")} · {inv?.invoice_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {t("d.invoices.outstanding")}: $
            {(
              Number(inv?.amount || 0) - Number(inv?.paid_amount || 0)
            ).toLocaleString()}
          </div>
          <div>
            <Label>{t("d.common.amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>{t("d.invoices.record")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnlinePaymentDialog({
  inv,
  onClose,
}: {
  inv: Inv | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { clientSecret, loading, error, createPaymentIntent, reset } =
    useStripePayment();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<"form" | "success">("form");

  const outstanding = inv
    ? Number(inv.amount) - Number(inv.paid_amount || 0)
    : 0;

  const handlePay = async () => {
    if (!inv) return;
    await createPaymentIntent(outstanding, inv.invoice_number);
  };

  const handlePaymentSuccess = async () => {
    if (!inv) return;
    const newPaid = Number(inv.paid_amount || 0) + outstanding;
    await supabase
      .from("invoices")
      .update({ paid_amount: newPaid, status: "paid" })
      .eq("id", inv.id);
    if (profile?.company_id) {
      await supabase.from("transactions").insert({
        company_id: profile.company_id,
        type: "income",
        category: "Stripe payment",
        amount: outstanding,
        description: `Online payment for ${inv.invoice_number}`,
        invoice_id: inv.id,
      });
      await supabase.from("invoice_payments").insert({
        company_id: profile.company_id,
        invoice_id: inv.id,
        amount: outstanding,
        method: "stripe",
        recorded_by: profile.id,
      } as never);
    }
    qc.invalidateQueries({ queryKey: ["module", "invoices"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["invoice-payments"] });
    setStep("success");
  };

  const handleClose = () => {
    reset();
    setStep("form");
    onClose();
  };

  return (
    <Dialog open={!!inv} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === "success" ? (
          <PaymentSuccess onDone={handleClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("d.invoices.pay_invoice")} {inv?.invoice_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="text-muted-foreground">{t("d.invoices.amount_due")}</div>
                <div className="text-2xl font-bold">
                  ${outstanding.toLocaleString()}
                </div>
              </div>
              {loading && !clientSecret ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  {t("d.invoices.setting_up")}
                </div>
              ) : clientSecret ? (
                <StripePaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={(msg) => toast.error(msg)}
                />
              ) : (
                <div className="space-y-3">
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {loading ? t("d.invoices.setting_up") : t("d.invoices.continue_to_payment")}
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
